# Sleek MedTech 醫材協作平台

這個專案是用來取代 LINE 傳遞重要醫材檔案的輕量級協作平台。核心目標是把 STL 模型版本、材料參數、醫師回饋、報告、BOM 成本與稽核紀錄集中到可追溯、可控權限、可匯出的 Web 系統。

完整規格請看 [規格書.md](規格書.md)。

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

## 設計原則

- 重要檔案不得透過聊天工具或手動假資料流程管理。
- 模型版本必須經 STL 上傳、SHA-256 驗證、STL 體積解析與物件儲存。
- BOM 使用 `volume_mm3 / 1000 * density_g_per_cm3 * unit_price_per_g` 計算材料成本。
- 前端 UI 必須依角色與專案權限隱藏不可執行的操作。
- 所有建立、更新、刪除、上傳與簽核行為都必須可稽核。
