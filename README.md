# 睿程生醫醫材協作平台

這個專案是用來取代 LINE 傳遞重要醫材檔案的輕量級協作平台。系統目前涵蓋兩條主流程：

- 內部專案追溯：STL 模型版本、材料、醫師回饋、報告、BOM 成本、簽核與稽核紀錄。
- 產品與套組管理：公開產品型錄、內部產品/組件/BOM 管理、外部需求申請，以及專案連結產品套組與器材使用部位。

## 環境建置

本專案支援 Docker Compose 一鍵建置。從 GitHub clone 專案後，只需安裝 Docker Desktop、複製 `.env.example` 為 `.env`，即可啟動完整前端、後端、MySQL、Redis 與 MinIO 服務；demo 測資可透過一行 reset 指令建立。

| 工具 | 建議版本 | 用途 |
| --- | --- | --- |
| Docker Desktop | 最新版，需啟動 WSL2 backend | MySQL、Redis、MinIO、後端容器 |
| Python | 3.11.x | 本機後端、Alembic、pytest |
| Node.js | 20 LTS 或更新 LTS | 前端 Vite、Playwright、build |

第一次下載專案：

```powershell
cd C:\Projects
git clone <repo-url> ruicheng-bio
cd C:\Projects\ruicheng-bio
copy .env.example .env
docker compose up -d --build
docker compose exec -T backend python reset_demo_data.py
```

## 啟動方式

### 前後端容器 + 本機前端

這是目前最穩的開發與展示方式：

```powershell
cd <專案根目錄>
docker compose up -d db redis minio backend
docker compose exec -T backend alembic upgrade head
docker compose exec -T backend python reset_demo_data.py

cd <專案根目錄>\frontend
npm install
npm run dev
```

開啟位置：

| 項目 | URL |
| --- | --- |
| 公開產品型錄 | http://localhost:5173/catalog |
| AI 新手導覽 | http://localhost:5173/guide |
| 內部登入 | http://localhost:5173/login |
| 專案管理 | http://localhost:5173/projects |
| 產品內部管理 | http://localhost:5173/product-admin |
| API 文件 | http://localhost:8000/docs |
| MinIO Console | http://localhost:9001 |

### 完整容器模式

```powershell
cd <專案根目錄>
docker compose up -d --build
docker compose exec -T backend alembic upgrade head
docker compose exec -T backend python reset_demo_data.py
```

## Demo 帳號與測資

`reset_demo_data.py` 會重建使用者、專案、STL 版本、報告、材料、產品型錄、產品 BOM 與外部申請單。

| 角色 | Email | 密碼 |
| --- | --- | --- |
| 系統管理員 | admin@ruichengbio.example | admin1234 |
| 研發工程師 | engineer.chen@ruichengbio.example | engineer1234 |
| 醫師 | doctor.lin@hospital.example | doctor1234 |
| 廠商 | vendor.wu@supplier.example | vendor1234 |

重建後可看到三個產品套組範例：

- 下顎重建固定板套組 `KIT-MR-2026`：客製主體、鈦合金骨釘、定位導板、滅菌包材、委外表面處理。
- 顱骨修補網片套組 `KIT-CM-2026`：網片主體、微型固定螺釘 x8、滅菌包材與標籤。
- 術前切割導板套組 `KIT-SG-2026`：PEEK 導板、鑽孔導引套、試作胚料、治具固定測試與包材標籤。

demo 專案 `MR-2026-041`、`CM-2026-017` 與 `SG-2026-009` 會透過 `projects.product_id` 連到對應產品套組，所以在專案 BOM 分頁可同時看到器材用途/使用部位、目前 STL 版本、STL 材料成本與套組零件 BOM。外部申請列表也會建立新申請、審核中、已報價、已核准與已拒絕等狀態，方便 demo 時說明管理流程。

## 主要流程

1. 外部使用者可進入 `/catalog` 查看公開產品、組件來源與數量，並送出需求申請。
2. 新使用者可進入 `/guide` 依管理員、工程師、醫師或業務窗口角色查看上手路徑與 AI 交接摘要。
3. 管理員登入 `/product-admin` 維護產品、組件、套組 BOM，並處理外部申請狀態。
4. 內部使用者登入後進入 `/projects`，可建立專案並選擇要連結的產品套組。
5. 在專案「上傳」分頁選擇材料、父版本與 STL 檔案；版本只能透過 STL 上傳建立。
6. worker 完成後寫入檔案 URL、SHA-256、STL 體積與版本狀態。
7. 在「3D 檢視」分頁拖曳模型、使用剖面控制，點擊模型建立回饋 pin。
8. 在「BOM」分頁查看 STL 材料成本、工時/外部打樣成本、報價毛利，以及產品套組零件 BOM。
9. 在「報告」分頁上傳材料、檢驗或合規文件，系統會建立溯源關聯。
10. 在「溯源圖」檢查版本、回饋與報告的追蹤鏈。
11. 醫師或管理員完成簽核後，版本會鎖定並留下不可逆稽核紀錄。

## 驗證指令

後端：

```powershell
cd <專案根目錄>
docker compose build backend
docker compose up -d backend
docker compose exec -T backend alembic upgrade head
docker compose exec -T backend python reset_demo_data.py
docker compose run --rm backend python -m compileall app seed_scenario.py seed_product_catalog.py reset_demo_data.py worker.py cleanup.py cleanup_smoke_data.py
docker compose run --rm backend python -m pytest -q
```

前端：

```powershell
cd <專案根目錄>\frontend
npm run lint
npm run build
npm run test:e2e
```

## 設計原則

- 重要 STL、報告、簽核與成本資料不得透過聊天工具或手動假流程管理。
- 模型版本必須經 STL 上傳、SHA-256 驗證、STL 體積解析與物件儲存。
- 專案 BOM 分成三層：器材用途與身體部位脈絡、STL 材料/工時成本，以及產品套組的組件 BOM。
- 外部申請只建立需求紀錄；正式報價、文件權限與系統帳號需由內部審核後處理。
- 前端 UI 必須依角色與專案權限隱藏不可執行的操作。
- 所有建立、更新、刪除、上傳與簽核行為都必須可稽核。
