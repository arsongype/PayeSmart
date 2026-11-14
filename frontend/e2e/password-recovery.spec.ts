import { expect, test } from '@playwright/test'

test('password recovery validates email before sending a request', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('link', { name: 'Mot de passe oublié ?' }).click()

  await expect(page).toHaveURL(/\/forgot-password$/)
  const emailInput = page.getByRole('textbox', { name: 'Email' })
  await emailInput.fill('invalid-email')
  await page.getByRole('button', { name: 'Envoyer le lien' }).click()

  await expect.poll(() => emailInput.evaluate((input) => (input as HTMLInputElement).validity.typeMismatch)).toBe(true)
  await expect(page).toHaveURL(/\/forgot-password$/)
})
