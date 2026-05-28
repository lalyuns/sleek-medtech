# 資料庫第一性原理整理

## 結論

現有 `sleek-medtech` 的資料庫不是沒有道理，但它把「醫材 3D 專案 MVP」和「企業級治理後台」一次展開，所以表很多、入口很多，使用者會先看到管理成本，而不是工作流程。

`rc_medtech` 建議先回到一個核心問題：

> 使用者每天真正要完成什麼事？

答案不是「管理資料庫」，而是：

1. 建立一個醫材專案。
2. 上傳與比較 3D 模型版本。
3. 記錄材料、報告、回饋與簽核。
4. 讓不同角色看到自己該看的資訊。
5. 保留必要追蹤紀錄，之後可以交代誰在何時做了什麼。

因此資料庫應該先服務「專案工作流」，再逐步長出產品型錄、BOM、成本、完整稽核等進階功能。

## 現有架構的複雜來源

目前後端模型大致包含：

| 模組 | 目前用途 | 複雜度評估 |
| --- | --- | --- |
| `users` | 使用者、角色 | 必要 |
| `projects` | 專案主體 | 必要 |
| `user_project_mappings` | 專案成員權限 | 必要，但可簡化命名 |
| `model_versions` | STL/3D 檔版本 | 必要 |
| `materials` | 材料參數 | MVP 可以先簡化成查表或 JSON |
| `feedbacks` | 醫師/工程回饋 | 必要 |
| `reports` | 測試報告與文件 | 必要，但可併入 attachments |
| `reference_edges` | 版本、報告、回饋追溯圖 | 進階功能 |
| `audit_logs` | 全域操作稽核 | 進階功能，MVP 可降級成 events |
| `costs` | 成本 | 進階功能 |
| `products` / `components` / `product_bom_items` / `product_requests` | 產品型錄、BOM、詢價 | 另一條產品/銷售流程，不該壓在核心專案入口 |

使用者覺得眼花撩亂，主要不是資料表太多本身，而是「每張表都被做成一個可見管理入口」。這會讓系統看起來像 ERP，而不是醫材協作工具。

## 建議的 MVP 核心資料模型

第一階段只保留 6 個核心概念：

| 建議表 | 對應現有表 | 保存的事實 |
| --- | --- | --- |
| `users` | `users` | 誰在使用系統，以及他的全域角色 |
| `projects` | `projects` | 一個醫材案件或設計任務 |
| `project_members` | `user_project_mappings` | 誰可以進入哪個專案，權限為何 |
| `project_files` | `model_versions` + `reports` | 專案中的 STL、報告、證書、附件 |
| `comments` | `feedbacks` | 針對專案或某個檔案的回饋 |
| `events` | `audit_logs` + `reference_edges` | 重要操作時間線與基本追溯 |

這樣做的好處是：使用者看到的是「專案、檔案、留言、事件」，而不是「材料後台、產品後台、稽核後台、BOM 後台、使用者後台」。

## 建議 schema 草案

```sql
users (
  id,
  name,
  email,
  password_hash,
  role,
  created_at
)

projects (
  id,
  name,
  description,
  status,
  owner_id,
  product_name,
  material_name,
  created_at,
  updated_at
)

project_members (
  id,
  project_id,
  user_id,
  access_level
)

project_files (
  id,
  project_id,
  uploaded_by,
  file_type,        -- model, report, certificate, image, other
  version_number,   -- only meaningful for model files
  name,
  file_url,
  hash_value,
  metadata_json,    -- volume, material params, signoff snapshot, etc.
  status,
  created_at
)

comments (
  id,
  project_id,
  file_id,
  author_id,
  body,
  coordinates_json,
  status,
  created_at,
  resolved_at
)

events (
  id,
  project_id,
  actor_id,
  event_type,
  target_type,
  target_id,
  summary,
  payload_json,
  created_at
)
```

## 什麼先不要做成表

這些資料可以先變成欄位、JSON、或後台設定，不急著獨立成完整 CRUD：

| 功能 | MVP 做法 | 之後何時拆表 |
| --- | --- | --- |
| 材料參數 | `projects.material_name` + `project_files.metadata_json` | 需要材料版本控管、審核、批號追蹤時 |
| 報告 | `project_files.file_type = report` | 報告有獨立流程、模板、簽核時 |
| 簽核 | 寫入 `project_files.status` 和 `events` | 需要多人簽核或法規稽核時 |
| 追溯圖 | 從 `events` 產生 | 需要跨版本、跨報告、跨回饋的圖狀查詢時 |
| 產品型錄/BOM | 暫時放在專案描述或 `metadata_json` | 系統真的要支援銷售型錄、採購、成本估算時 |
| 成本 | 暫不進核心流程 | 要做報價或內部成本分析時 |

## UI 原則

後台應該降噪：

1. 第一畫面只顯示「專案列表」和「建立專案」。
2. 專案內只分成「3D 模型」、「回饋」、「文件」、「時間線」、「成員」。
3. Admin 功能收進單一「系統設定」，不要攤平成多個主導航按鈕。
4. 產品型錄、BOM、成本、完整稽核先放到進階模式或第二階段。
5. 資料表名稱不直接暴露給使用者，使用者只看到工作語言。

## 推薦改造順序

1. 先改 UI 導航：把 admin/material/product/audit 入口收斂，讓專案流程成為主畫面。
2. 新增 `events` 概念，用它取代使用者需要直接理解的 `audit_logs` 和 `reference_edges`。
3. 將 `reports` 逐步併入 `project_files`，讓「檔案」成為使用者理解的單一概念。
4. 第二階段再決定是否保留 `products`、`components`、`product_bom_items`。
5. 若要真正簡化資料庫，新增一條乾淨 Alembic migration，而不是直接把舊 migration 改爛。

## 判斷標準

之後每次想新增資料表，先問：

1. 這是不是使用者日常流程中的核心名詞？
2. 如果不用獨立表，只用欄位或 JSON，會不會真的造成查詢或一致性問題？
3. 這筆資料是否需要獨立權限、獨立生命週期、獨立審核？
4. 這個功能現在真的會用，還是只是「以後可能需要」？

只有前面答案足夠明確時，才值得新增資料表。
