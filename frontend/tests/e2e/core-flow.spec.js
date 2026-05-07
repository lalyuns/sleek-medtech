import { expect, test } from '@playwright/test'

test('admin can review model, add feedback, open traceability, and add BOM cost', async ({ page }) => {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill('admin@sleek.com')
  await page.locator('input[type="password"]').fill('admin1234')
  await page.getByRole('button', { name: '登入' }).click()

  await expect(page.getByRole('heading', { name: '專案' })).toBeVisible()
  await page.locator('button').filter({ hasText: 'MR-2026-041' }).first().click()
  await expect(page.getByRole('button', { name: '3D 檢視' })).toBeVisible()

  await page.getByRole('button', { name: '3D 檢視' }).click()
  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.getByRole('button', { name: '旋轉' })).toBeVisible()
  await expect(page.getByRole('button', { name: '平移' })).toBeVisible()

  await page.getByRole('textbox', { name: '新增回饋...' }).fill('E2E feedback from browser flow')
  await page.getByRole('button', { name: '送出' }).click()
  await expect(page.getByText('E2E feedback from browser flow')).toBeVisible()

  await page.getByRole('button', { name: '溯源圖' }).click()
  await expect(page.getByText('溯源圖')).toBeVisible()
  await expect(page.getByText('模型版本').first()).toBeVisible()

  await page.getByRole('button', { name: '返回' }).click()
  await page.getByRole('button', { name: 'BOM' }).click()
  await page.getByPlaceholder('金額').fill('123.45')
  await page.getByPlaceholder('說明').fill(`E2E cost ${Date.now()}`)
  await page.getByRole('button', { name: '新增' }).click()
  await expect(page.getByText('$123.45')).toBeVisible()
})
