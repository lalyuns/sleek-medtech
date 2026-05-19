import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(frontendRoot, '..')
const assetsDir = path.join(repoRoot, 'demo-assets')
const baseURL = 'http://localhost:5173'

const terminalText = `PS C:\\Projects\\ruicheng-bio> docker compose ps
SERVICE   STATUS          PORTS
backend   Up              0.0.0.0:8000->8000/tcp
minio     Up              0.0.0.0:9000-9001->9000-9001/tcp
db        Up (healthy)    0.0.0.0:3307->3306/tcp
redis     Up              0.0.0.0:6379->6379/tcp

PS C:\\Projects\\ruicheng-bio> docker compose exec -T backend alembic current
e4f6a9201d4b (head)

PS C:\\Projects\\ruicheng-bio> docker compose exec -T backend python reset_demo_data.py
Scenario seed complete.
Accounts:
  admin@ruichengbio.example / admin1234
  engineer.chen@ruichengbio.example / engineer1234
  doctor.lin@hospital.example / doctor1234
  vendor.wu@supplier.example / vendor1234
Projects updated: 下顎重建固定板 MR-2026-041, 顱骨修補網片 CM-2026-017, 術前切割導板 SG-2026-009
Product catalog seed complete.
{'scenario_projects': 3, 'scenario_versions': 5, 'product_requests': 5}`

async function isServerReady() {
  try {
    const response = await fetch(baseURL)
    return response.ok
  } catch {
    return false
  }
}

async function ensureVite() {
  if (await isServerReady()) return null
  const server = await createServer({
    root: frontendRoot,
    server: { host: 'localhost', port: 5173, strictPort: true },
  })
  await server.listen()
  return server
}

async function screenshot(page, name, options = {}) {
  await page.screenshot({
    path: path.join(assetsDir, name),
    fullPage: options.fullPage ?? false,
  })
}

async function renderTerminal(browser) {
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } })
  await page.setContent(`
    <!doctype html>
    <html lang="zh-Hant">
      <head>
        <meta charset="UTF-8" />
        <style>
          body {
            margin: 0;
            background: #101828;
            color: #e5e7eb;
            font-family: Consolas, "Cascadia Mono", "Noto Sans Mono", monospace;
          }
          .bar {
            height: 38px;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0 14px;
            background: #1f2937;
            border-bottom: 1px solid #374151;
            color: #cbd5e1;
            font: 600 13px "Segoe UI", sans-serif;
          }
          .dot { width: 10px; height: 10px; border-radius: 999px; }
          .red { background: #ef4444; }
          .yellow { background: #f59e0b; }
          .green { background: #22c55e; }
          pre {
            margin: 0;
            padding: 22px;
            font-size: 16px;
            line-height: 1.42;
            white-space: pre-wrap;
          }
        </style>
      </head>
      <body>
        <div class="bar"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>後端控制台 - demo data reset</div>
        <pre>${escapeHtml(terminalText)}</pre>
      </body>
    </html>
  `)
  await screenshot(page, '00-backend-console.png', { fullPage: true })
  await page.close()
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char])
}

async function login(browser, email, password) {
  const context = await browser.newContext({ viewport: { width: 1365, height: 768 } })
  const page = await context.newPage()
  await page.goto(`${baseURL}/login`)
  await page.locator('input[inputmode="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: '登入' }).click()
  await page.getByRole('heading', { name: '專案管理' }).waitFor()
  await page.getByText('MR-2026-041').first().waitFor()
  return { context, page }
}

async function openFirstProject(page) {
  await openProjectByCode(page, 'MR-2026-041')
}

async function openProjectByCode(page, code) {
  await page.goto(`${baseURL}/projects`)
  await page.getByRole('heading', { name: '專案管理' }).waitFor()
  await page.getByText(code).first().waitFor()
  const row = page.locator('tbody tr').filter({ hasText: code }).first()
  await row.getByRole('button', { name: '查看詳情' }).click()
  await page.getByRole('button', { name: '3D 檢視' }).waitFor()
}

async function openProjectTab(page, tabName, headingName) {
  await page.getByRole('button', { name: tabName }).click()
  await page.getByRole('heading', { name: headingName, exact: true }).waitFor()
}

async function main() {
  await fs.mkdir(assetsDir, { recursive: true })
  const server = await ensureVite()
  const browser = await chromium.launch()

  try {
    await renderTerminal(browser)

    const backendPage = await browser.newPage({ viewport: { width: 1365, height: 768 } })
    await backendPage.goto('http://localhost:8000/openapi.json')
    await screenshot(backendPage, '01-backend-openapi.png')
    await backendPage.close()

    const publicContext = await browser.newContext({ viewport: { width: 1365, height: 768 } })
    const publicPage = await publicContext.newPage()
    await publicPage.goto(`${baseURL}/catalog`)
    await publicPage.getByRole('heading', { name: '可申請產品' }).waitFor()
    await publicPage.getByText('下顎重建固定板套組').first().waitFor()
    await publicPage.getByText('術前切割導板套組').first().waitFor()
    await publicPage.locator('.catalog-product').filter({ hasText: '術前切割導板套組' }).click()
    await screenshot(publicPage, '02-public-catalog.png')
    await publicPage.getByPlaceholder('申請人姓名').fill('王小明')
    await publicPage.getByPlaceholder('單位/公司').fill('示範醫院')
    await publicPage.getByPlaceholder('Email').fill('demo.requester@example.com')
    await publicPage.getByPlaceholder('電話').fill('02-1234-5678')
    await publicPage.getByPlaceholder('規格、交期或補充說明').fill('Demo 申請：請協助評估術前切割導板套組，並確認 PEEK 試作與鑽孔導引套交期。')
    await publicPage.getByRole('button', { name: '送出申請' }).click()
    await publicPage.getByText('已收到申請').waitFor()
    await screenshot(publicPage, '03-public-request-result.png')
    await publicContext.close()

    const loginPage = await browser.newPage({ viewport: { width: 1365, height: 768 } })
    await loginPage.goto(`${baseURL}/login`)
    await loginPage.getByRole('heading', { name: '登入' }).waitFor()
    await screenshot(loginPage, '04-login.png')
    await loginPage.close()

    const admin = await login(browser, 'admin@ruichengbio.example', 'admin1234')
    await screenshot(admin.page, '05-admin-projects.png')
    await admin.page.goto(`${baseURL}/product-admin`)
    await admin.page.getByRole('heading', { name: '產品與組件管理' }).waitFor()
    await admin.page.getByText('產品 BOM').waitFor()
    await screenshot(admin.page, '06-admin-product-admin.png')
    await admin.page.getByRole('heading', { name: '外部申請' }).scrollIntoViewIfNeeded()
    await screenshot(admin.page, '07-admin-product-requests.png')
    await admin.page.goto(`${baseURL}/admin/materials`)
    await admin.page.getByRole('heading', { name: '材料管理' }).waitFor()
    await admin.page.getByText('Titanium').first().waitFor()
    await screenshot(admin.page, '08-admin-materials.png')
    await admin.page.goto(`${baseURL}/admin/users`)
    await admin.page.getByRole('heading', { name: '使用者管理' }).waitFor()
    await admin.page.getByText('admin@ruichengbio.example').waitFor()
    await screenshot(admin.page, '09-admin-users.png')
    await admin.page.goto(`${baseURL}/admin/audit`)
    await admin.page.getByRole('heading', { name: '稽核紀錄' }).waitFor()
    await screenshot(admin.page, '10-admin-audit.png')
    await openProjectByCode(admin.page, 'SG-2026-009')
    await screenshot(admin.page, '16-admin-project-overview.png')
    await openProjectTab(admin.page, '報告', '報告')
    await admin.page.getByText('供應商 PEEK 試作報價摘要').waitFor()
    await screenshot(admin.page, '17-admin-project-reports.png')
    await openProjectTab(admin.page, '成員', '成員')
    await admin.page.locator('strong').filter({ hasText: '陳研發工程師' }).waitFor()
    await screenshot(admin.page, '18-admin-project-members.png')
    await admin.page.goto(admin.page.url().replace(/\/projects\/\d+$/, (match) => `${match}/traceability`))
    await admin.page.getByText('/ 溯源圖').waitFor()
    await admin.page.locator('.react-flow__node').first().waitFor()
    await screenshot(admin.page, '19-admin-traceability.png')
    await admin.context.close()

    const engineer = await login(browser, 'engineer.chen@ruichengbio.example', 'engineer1234')
    await openProjectByCode(engineer.page, 'SG-2026-009')
    await engineer.page.getByRole('button', { name: '上傳' }).click()
    await engineer.page.getByRole('heading', { name: '上傳 STL 版本' }).waitFor()
    await screenshot(engineer.page, '11-engineer-upload.png')
    await engineer.page.getByRole('button', { name: 'BOM' }).click()
    await engineer.page.getByRole('heading', { name: '套組零件 BOM' }).waitFor()
    await screenshot(engineer.page, '12-engineer-bom.png', { fullPage: true })
    await engineer.context.close()

    const doctor = await login(browser, 'doctor.lin@hospital.example', 'doctor1234')
    await openFirstProject(doctor.page)
    await doctor.page.getByRole('button', { name: '3D 檢視' }).click()
    const doctorFeedback = 'Demo 醫師回饋：請確認螺釘孔位與下齒槽神經距離。'
    const feedbackResponse = doctor.page.waitForResponse((response) => (
      response.url().includes('/feedbacks') &&
      response.request().method() === 'POST' &&
      response.status() === 201
    ))
    await doctor.page.getByPlaceholder('新增回饋...').fill(doctorFeedback)
    await doctor.page.getByRole('button', { name: '送出' }).click()
    await feedbackResponse
    const feedbackItem = doctor.page.getByText(doctorFeedback).last()
    await feedbackItem.scrollIntoViewIfNeeded()
    await feedbackItem.waitFor()
    await screenshot(doctor.page, '13-doctor-review-feedback.png')
    await doctor.context.close()

    const vendor = await login(browser, 'vendor.wu@supplier.example', 'vendor1234')
    await openFirstProject(vendor.page)
    await screenshot(vendor.page, '14-vendor-readonly-project.png')
    await vendor.page.getByRole('button', { name: '3D 檢視' }).click()
    await screenshot(vendor.page, '15-vendor-3d-view.png')
    await vendor.context.close()
  } finally {
    await browser.close()
    if (server) await server.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
