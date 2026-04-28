# 睿程生醫 — 輕量級雲端協作平台

醫療器材研發專用雲端協作平台，解決合規、溝通盲區與參數溯源問題。
取代 LINE 傳遞重要檔案，提供具版本控制、稽核日誌與 3D 檢視的專屬 Web 系統。

---

## 必要服務與網址

| 服務 | 網址 | 說明 |
|------|------|------|
| 前端介面 | http://localhost:5173 | React 使用者介面 |
| 後端 API | http://localhost:8000 | FastAPI |
| API 文件 | http://localhost:8000/docs | Swagger UI |
| MinIO 控制台 | http://localhost:9001 | 物件儲存管理 |
| MySQL | localhost:3307 | 資料庫（本機 3306 已被佔用） |
| Redis | localhost:6379 | 任務佇列 |

---

## 啟動順序

### 1. 啟動基礎設施

```bash
cd C:\Users\User\sleek-medtech
docker compose up -d
docker compose ps   # 確認三個容器都是 running
```

### 2. 啟動後端 API（Terminal 1）

```bash
cd C:\Users\User\sleek-medtech\backend
venv\Scripts\activate
uvicorn app.main:app --reload
```

### 3. 啟動 RQ Worker（Terminal 2，新開視窗）

```bash
cd C:\Users\User\sleek-medtech\backend
venv\Scripts\activate
rq worker --url redis://localhost:6379/0
```

確認看到 `*** Listening on default...` 即可。

### 4. 啟動前端（Terminal 3，新開視窗）

```bash
cd C:\Users\User\sleek-medtech\frontend
npm run dev
```

打開 http://localhost:5173

---

## 使用者操作流程

### 登入

打開 http://localhost:5173，使用管理員帳號：
- Email: `admin@sleek.com`
- 密碼: `admin1234`

### 建立材料規格（需先做，建立版本時必填）

1. 打開 http://localhost:8000/docs
2. 點右上角 **Authorize**，貼入登入後取得的 `access_token`
3. 找到 `POST /api/v1/materials/`，點 **Try it out**
4. **清空**預設範本，只貼入：
   ```json
   {
     "name": "鈦合金 Ti-6Al-4V",
     "physical_parameters": {
       "density": 4.43,
       "tensile_strength": 950.0,
       "unit_price": 450.0
     }
   }
   ```
5. 執行，記下回傳的 `material_id`

### 建立專案

前端「專案列表」頁，輸入名稱點「建立」，再點卡片進入詳情。

### 建立模型版本

在專案詳情頁左側「版本歷史」點「+」，填入 Material ID 與描述，點「建立版本」。

### 3D 檢視與標註

| 操作 | 方式 |
|------|------|
| 旋轉 | 滑鼠左鍵拖拉 |
| 縮放 | 滑鼠滾輪 |
| 平移 | 滑鼠右鍵拖拉 |
| 剖面切割 | 左下角 X/Y/Z 開關 + 滑桿 |
| 新增標註 | 點擊模型表面 → 輸入文字 → Enter |
| 刪除標註 | 點擊黃色標籤 |

### 新增回饋意見

右側「回饋意見」欄輸入文字，點「送出」。

### 版本簽核鎖定

點頁面頂部「✓ 簽核鎖定」，狀態變 `locked` 後不可再修改。

### 查看溯源圖

點右上角「溯源圖」，可切換版本、縮放拖拉節點（藍=draft，綠=locked）。

### 匯出稽核日誌（管理員）

- 查詢：Swagger `GET /api/v1/audit/logs`
- 匯出 CSV：`GET /api/v1/audit/logs/export.csv`

---

## 專案結構

```
sleek-medtech/
├── docker-compose.yml          # MySQL 3307, MinIO 9000, Redis 6379
├── .env                        # 環境變數（不進 git）
├── .env.example                # 環境變數範本
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI 入口 + middleware 掛載
│   │   ├── models/             # ORM 模型（12 個資料表）
│   │   ├── schemas/            # Pydantic 驗證
│   │   ├── routers/            # API 路由（auth/materials/projects/
│   │   │                       #   versions/feedbacks/costs/
│   │   │                       #   upload/audit）
│   │   ├── dependencies/       # JWT auth, RBAC
│   │   ├── middleware/audit.py # 自動稽核日誌 middleware
│   │   ├── storage.py          # MinIO client
│   │   └── tasks.py            # RQ enqueue
│   ├── alembic/                # DB migration
│   ├── worker.py               # RQ Worker（合併分塊 / SHA-256 / STL 體積）
│   ├── supervisord.conf        # 部署用行程管理
│   └── seed.py                 # 建立初始 admin 帳號
└── frontend/
    └── src/
        ├── api/client.js       # Axios（自動帶 Bearer token）
        ├── store/              # Zustand（auth / viewer）
        ├── components/viewer/  # 3D 引擎（R3F + Clipping + 標註）
        ├── components/         # BOMPanel, FeedbackPanel
        └── pages/              # Login, Projects, ProjectDetail, Traceability
```

---

## 規格書完成狀態

### ✅ 已完成

| 主線 | 項目 |
|------|------|
| A1 | Docker Compose（MySQL / MinIO / Redis） |
| A2–A4 | SQLAlchemy 2.0 + Alembic + 12 個資料表 Migration |
| A5 | JWT 登入 / 登出 / Token 驗證 + Redis 黑名單 |
| A6 | RBAC Dependency（User_Project_Mapping） |
| A7 | Materials CRUD、Projects CRUD、Feedbacks API |
| A8 | 版本建立 API + Reference Edge API |
| A9 | BOM 結算 + 遞迴溯源 API（React Flow 格式） |
| A10 | Audit Trail Middleware + CSV 匯出 |
| B1–B4 | React/Vite + R3F Canvas + 三軸剖面 + 點擊標註 |
| B5 | Zustand 標註狀態管理 |
| C1 | 登入頁 + JWT 流程 + PrivateRoute |
| C2–C3 | React Flow 溯源圖 + API 串接 |
| C5 | BOM 成本面板（材料費 + 其他費用 + 總計） |
| C6 | 數位簽核按鈕（鎖定版本） |
| D1–D3 | MinIO Client + 分塊上傳 + 合併觸發 |
| D4 | RQ Worker（合併 / SHA-256 / numpy-stl / MinIO 推送） |
| D5 | supervisord.conf |

### ❌ 尚未完成

| 項目 | 說明 |
|------|------|
| D6 | `cleanup.py` + cron job（每日清除孤立暫存分塊） |
| D7 | `GET /upload/status/{job_id}` 上傳進度輪詢端點 |
| C4 | 前端分塊上傳表單 + 進度條（依賴 D7） |
| B5 GSAP | 點擊側邊欄標註時平滑移動相機 |
| B6 | 從 MinIO URL 直接載入上傳的 .stl（現為 demo box） |
| `/admin/materials` | 材料管理前端頁面（目前需用 Swagger） |
| Reports API | `reports` 表已建，但無路由與前端 |
| 使用者管理 | 新增成員、修改角色 API |
| PDF 匯出 | 目前只有 CSV，規格書要求 CSV/PDF |

---

## 環境變數（`.env`）

```env
MYSQL_USER=sleekuser
MYSQL_PASSWORD=sleekpass
MYSQL_DATABASE=sleekmedtech
MYSQL_ROOT_PASSWORD=rootpass
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=your-secret-key-here
```

---

## 初次建置（從零開始）

```bash
# 1. 啟動 Docker 服務
docker compose up -d

# 2. 安裝後端依賴
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# 3. 建立資料表
alembic upgrade head

# 4. 建立管理員帳號
python seed.py

# 5. 安裝前端依賴
cd ../frontend
npm install
```
