# Sleek MedTech 醫材協作平台

這個專案是用來取代 LINE 傳遞重要醫材檔案的輕量級協作平台。核心目標是把 STL 模型版本、材料參數、醫師回饋、報告、BOM 成本與稽核紀錄集中到可追溯、可控權限、可匯出的 Web 系統。

完整規格請看 [規格書.md](規格書.md)。

## 環境建置指引

第一次拿到專案的人，建議先裝好下列工具：

| 工具 | 建議版本 | 用途 |
| --- | --- | --- |
| Git | 最新版 | 下載專案與版本控制 |
| Docker Desktop | 最新版，需啟動 WSL2 backend | 啟 MySQL、Redis、MinIO，也可完整容器化部署 |
| Python | 3.11.x | 後端 FastAPI、Alembic、pytest |
| Node.js | 20 LTS 或更新 LTS | 前端 Vite、Playwright、build |

從 GitHub 下載專案：

```powershell
cd C:\Users\User
git clone https://github.com/lalyuns/sleek-medtech.git
cd C:\Users\User\sleek-medtech
copy .env.example .env
```

先啟動基礎服務：

```powershell
docker compose up -d db redis minio
```

如果只想看成果，不想分開開前後端，可用完整容器模式：

```powershell
docker compose up -d --build
```

完整容器模式啟動後開：

| 項目 | URL |
| --- | --- |
| 前端 | http://localhost:5173 |
| API 文件 | http://localhost:8000/docs |
| MinIO Console | http://localhost:9001 |

若要用本機開發模式，照下面「快速啟動」分別開 backend、worker、frontend。第一次建 Python venv 可執行：

```powershell
cd C:\Users\User\sleek-medtech\backend
py -3.11 -m venv venv
.\venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

常見問題：

- `docker compose` 連不上：先確認 Docker Desktop 已開啟，且左下角顯示 Engine running。
- `localhost:3307` 連不上：通常是 MySQL 容器還沒 ready，等 10 到 30 秒後重跑 `alembic upgrade head`。
- PowerShell 找不到 `python`：改用 `py -3.11`，或重新安裝 Python 並勾選 Add python.exe to PATH。
- 前端 `npm install` 失敗：確認 Node.js 已安裝，並在 `frontend/` 目錄執行。

## 快速啟動

啟動資料庫、Redis 與 MinIO：

```powershell
cd C:\Users\User\sleek-medtech
docker compose up -d db redis minio
```

啟動後端：

```powershell
cd C:\Users\User\sleek-medtech\backend
.\venv\Scripts\activate
alembic upgrade head
python seed.py
python reset_demo_data.py
uvicorn app.main:app --reload
```

另開一個終端啟動 worker：

```powershell
cd C:\Users\User\sleek-medtech\backend
.\venv\Scripts\activate
rq worker --url redis://localhost:6379/0
```

啟動前端：

```powershell
cd C:\Users\User\sleek-medtech\frontend
npm install
npm run dev
```

## 開啟位置

| 項目 | URL |
| --- | --- |
| 前端 | http://localhost:5173 |
| API 文件 | http://localhost:8000/docs |
| MinIO Console | http://localhost:9001 |

## Demo 帳號

`python reset_demo_data.py` 會建立一組符合「下顎重建固定板」情境的測資。

| 角色 | Email | 密碼 |
| --- | --- | --- |
| 系統管理員 | admin@sleek.com | admin1234 |
| 研發工程師 | engineer.chen@sleek.com | engineer1234 |
| 醫師 | doctor.lin@hospital.example | doctor1234 |
| 廠商 | vendor.wu@supplier.example | vendor1234 |

## 主要流程

1. 登入後進入專案列表，開啟 demo 專案。
2. 在「上傳」分頁選擇材料、父版本與 STL 檔案，版本只能透過 STL 上傳建立。
3. worker 完成後，系統會寫入檔案 URL、SHA-256、STL 體積與版本狀態。
4. 在「3D 檢視」分頁拖曳模型、使用剖面控制，點擊模型建立回饋 pin。
5. 在「BOM」分頁輸入報價、幣別、工時與外部打樣成本。
6. 在「報告」分頁上傳材料、檢驗或合規文件，系統會建立溯源關聯。
7. 在「溯源圖」檢查版本、回饋與報告的完整追蹤鏈。
8. 醫師或管理員完成簽核後，版本會鎖定並留下不可逆稽核紀錄。

## 驗證指令

後端：

```powershell
cd C:\Users\User\sleek-medtech\backend
.\venv\Scripts\python.exe -m compileall app seed_scenario.py reset_demo_data.py worker.py cleanup.py cleanup_smoke_data.py
.\venv\Scripts\python.exe -m pytest -q
```

前端：

```powershell
cd C:\Users\User\sleek-medtech\frontend
npm run lint
npm run build
npm run test:e2e
```

## 已知後續優化

這些項目不是目前缺失，功能與驗證都已通過；它們是之後若要再 polish 可處理的技術債：

- `ModelViewer` bundle 仍偏大，主因是 Three.js / React Three Fiber 本體較大。功能正常，若要再優化可拆更細的 vendor chunk。
- `pytest` 目前會出現一個 Pydantic v2 deprecation warning，來自舊式 `model_config` / `Config` 用法周邊；目前相容，之後可整理成純 Pydantic v2 寫法。
- GitHub repo 建議設定 branch protection，避免直接把 `main` 改亂；建議要求 PR review 後才能 merge。

## 設計原則

- 重要檔案不得透過聊天工具或手動假資料流程管理。
- 模型版本必須經 STL 上傳、SHA-256 驗證、STL 體積解析與物件儲存。
- BOM 使用 `volume_mm3 / 1000 * density_g_per_cm3 * unit_price_per_g` 計算材料成本。
- 前端 UI 必須依角色與專案權限隱藏不可執行的操作。
- 所有建立、更新、刪除、上傳與簽核行為都必須可稽核。
