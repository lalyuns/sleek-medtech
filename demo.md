# 睿程生醫 Demo 腳本

本文件用 demo 帳號扮演每一種使用者，說明啟動指令、可操作內容、畫面截圖與操作結果。

## 0. 啟動與後端確認

### 指令

```powershell
cd <專案根目錄>
docker compose up -d db redis minio backend
docker compose exec -T backend alembic upgrade head
docker compose exec -T backend python reset_demo_data.py

cd <專案根目錄>\frontend
npm run dev
```

### 後端控制台截圖

![後端控制台](demo-assets/00-backend-console.png)

後端服務、MySQL、Redis、MinIO 都已啟動；Alembic migration 在 `e4f6a9201d4b (head)`；`reset_demo_data.py` 會建立四種 demo 帳號、兩個主要 demo 專案，以及產品套組 BOM 測資。

### API 文件結果

![OpenAPI](demo-assets/01-backend-openapi.png)

OpenAPI JSON 顯示目前 API 標題為「睿程生醫 API」，表示後端使用者可見品牌已更新。

## 1. 外部申請人

### 使用者狀態

不需要帳號，不進入內部系統。

### 操作指令

```text
開啟 http://localhost:5173/catalog
選擇產品
填寫申請人、單位、Email、電話、數量、補充說明
按「送出申請」
```

### 可以操作的內容

- 查看公開產品套組。
- 查看每個套組包含哪些組件、來源、數量與文件需求。
- 送出需求申請；此動作只建立申請單，不會自動開通帳號。

### 畫面截圖

![公開型錄](demo-assets/02-public-catalog.png)

外部使用者可看到「下顎重建固定板套組」與「顱骨修補網片套組」，右側會顯示套組的組件 BOM。

### 操作結果截圖

![公開申請結果](demo-assets/03-public-request-result.png)

送出後顯示「已收到申請」，內部人員之後可在產品管理頁查看並更新申請狀態。

## 2. 系統管理員

### 帳號

```text
admin@ruichengbio.example / admin1234
```

### 操作指令

```text
開啟 http://localhost:5173/login
登入後進入 /projects
可前往 /product-admin、/admin/materials、/admin/users、/admin/audit
```

### 可以操作的內容

- 查看所有專案與專案統計。
- 建立專案，並選擇要連結的產品套組。
- 管理產品、組件、產品 BOM。
- 查看並更新外部需求申請狀態。
- 管理材料、使用者與全站稽核紀錄。

### 登入頁

![登入頁](demo-assets/04-login.png)

所有內部角色都由同一個登入頁進入。

### 專案管理畫面

![管理員專案列表](demo-assets/05-admin-projects.png)

管理員可看到所有專案，列表已顯示「產品套組」欄位；例如顱骨修補網片專案已連到顱骨套組。

### 產品管理畫面

![產品管理](demo-assets/06-admin-product-admin.png)

管理員可以新增產品、建立組件，並把自製、外購、委外或客供組件加入產品 BOM。

### 外部申請結果

![外部申請列表](demo-assets/07-admin-product-requests.png)

外部申請人送出的需求會出現在「外部申請」列表，管理員可將狀態改為新申請、審核中、已報價、已核准或已拒絕。

### 材料管理

![材料管理](demo-assets/08-admin-materials.png)

材料管理提供密度、抗拉強度、單價等 BOM 計算需要的參數。

### 使用者管理

![使用者管理](demo-assets/09-admin-users.png)

管理員可建立或刪除內部帳號，角色包含工程師、醫師、廠商與系統管理員。

### 稽核紀錄

![稽核紀錄](demo-assets/10-admin-audit.png)

稽核頁可篩選操作實體並匯出 CSV/PDF，用來回查誰在什麼時間對哪個資料做了什麼事。

## 3. 研發工程師

### 帳號

```text
engineer.chen@ruichengbio.example / engineer1234
```

### 操作指令

```text
開啟 http://localhost:5173/login
登入後進入 /projects
開啟專案
使用「上傳」「BOM」「報告」等分頁
```

### 可以操作的內容

- 查看自己被授權的專案。
- 上傳 STL 版本，選擇材料與父版本。
- 查看 worker 上傳狀態與版本鏈。
- 輸入工時成本、外部打樣成本與報價金額。
- 查看產品套組 BOM，確認哪些零件自製、外購或委外。
- 上傳材料、檢驗、合規等報告。

### STL 上傳工作台

![工程師上傳](demo-assets/11-engineer-upload.png)

工程師上傳 STL 前必須選材料與檔案；版本只能透過 STL 流程建立，避免沒有 hash、沒有體積的假版本。

### BOM 與套組零件

![工程師 BOM](demo-assets/12-engineer-bom.png)

BOM 分頁左側是 STL 材料成本，右側可新增工時或外部打樣成本；下方是顱骨修補網片套組 BOM，可看到微型固定螺釘 x8、滅菌包材與標籤等外購組件。

## 4. 醫師

### 帳號

```text
doctor.lin@hospital.example / doctor1234
```

### 操作指令

```text
開啟 http://localhost:5173/login
登入後進入 /projects
開啟專案
使用「3D 檢視」提出回饋
必要時填寫簽核理由與密碼完成簽核
```

### 可以操作的內容

- 查看授權專案與模型版本。
- 在 3D 檢視中旋轉、平移、剖面檢查模型。
- 針對版本留下文字回饋或 3D 座標註記。
- 對 draft 版本執行簽核，簽核後版本鎖定並留下稽核紀錄。

### 回饋操作結果

![醫師回饋](demo-assets/13-doctor-review-feedback.png)

醫師在 3D 檢視分頁送出 demo 回饋後，回饋會出現在右側清單，工程師可依此建立後續版本或處理紀錄。

## 5. 廠商

### 帳號

```text
vendor.wu@supplier.example / vendor1234
```

### 操作指令

```text
開啟 http://localhost:5173/login
登入後進入 /projects
開啟被授權專案
使用總覽與 3D 檢視
```

### 可以操作的內容

- 依專案授權查看資料。
- 預設唯讀，不顯示上傳、BOM 成本輸入、成員管理等內部操作。
- 可查看版本狀態、最近活動與 3D 模型。

### 唯讀專案畫面

![廠商唯讀總覽](demo-assets/14-vendor-readonly-project.png)

廠商進入專案後只看到允許的總覽與檢視功能，不會看到管理員或工程師的管理入口。

### 3D 檢視畫面

![廠商 3D 檢視](demo-assets/15-vendor-3d-view.png)

廠商可檢視模型與版本資訊，但不能進行內部成本、材料、成員或簽核管理。

