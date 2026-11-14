import { expect, test } from '@playwright/test'

test('an anonymous visitor is redirected from payments to login', async ({ page }) => {
  await page.goto('/payments')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible()
})
