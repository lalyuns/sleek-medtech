## 變更摘要

- 

## 驗證

- [ ] 後端 migration 已確認：`alembic upgrade head`
- [ ] Demo 測資可重建：`python reset_demo_data.py`
- [ ] 後端測試已通過：`pytest`
- [ ] 前端 lint 已通過：`npm run lint`
- [ ] 前端 build 已通過：`npm run build`
- [ ] 若改到主要流程，已跑 Playwright E2E

## 前後端與文件對齊

- [ ] API route、schema、前端呼叫路徑一致
- [ ] 若新增欄位，migration、seed、前端顯示與文件皆已更新
- [ ] 若影響產品/組件/BOM/需求申請，已確認 `/catalog`、`/product-admin`、專案 BOM 分頁

## 合規影響

- [ ] 不影響版本鎖定、稽核、簽核或溯源資料
- [ ] 若影響上述流程，已在 PR 描述中說明風險與驗證方式
