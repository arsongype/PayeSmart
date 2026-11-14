import { expect, test } from '@playwright/test'

test('login navigates to registration and shows optional first name', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('link', { name: "S'inscrire" }).click()

  await expect(page).toHaveURL(/\/register$/)
  await expect(page.getByRole('heading', { name: 'Créer un compte' })).toBeVisible()
  await expect(page.getByText('Prénom (facultatif)')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Prénom' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Admin' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: "S'inscrire" })).toBeVisible()
})
