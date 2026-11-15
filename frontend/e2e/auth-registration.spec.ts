import { expect, test, type Page } from '@playwright/test'

async function completeRegistrationSteps(page: Page) {
  await page.getByRole('textbox', { name: 'Nom', exact: true }).fill('Dupont')
  await page.getByLabel('Date de naissance').fill('1990-01-01')
  await page.getByRole('button', { name: 'Suivant' }).click()

  await page.getByPlaceholder('email@example.com').fill('client@example.com')
  await page.getByPlaceholder('+261 38 00 000 00').fill('+26138000000')
  await page.getByRole('button', { name: 'Suivant' }).click()

  await page.getByPlaceholder('Adresse').fill('12 rue de Paris')
  await page.getByPlaceholder('Ville').fill('Antananarivo')
  await page.getByPlaceholder('Code postal').fill('101')
  await page.getByPlaceholder('MG').fill('MG')
  await page.getByRole('button', { name: 'Suivant' }).click()

  await page.getByRole('textbox', { name: 'Mot de passe', exact: true }).fill('SecurePass123')
  await page.getByRole('textbox', { name: 'Confirmer le mot de passe', exact: true }).fill('SecurePass123')
  await page.getByRole('button', { name: 'Suivant' }).click()
}

test('login navigates to registration and shows optional first name', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('link', { name: "S'inscrire" }).click()

  await expect(page).toHaveURL(/\/register$/)
  await expect(page.getByRole('heading', { name: 'Créer un compte' })).toBeVisible()
  await expect(page.getByText('Prénom (facultatif)')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Prénom' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Admin' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Suivant' })).toBeVisible()
})

test('registration asks about Visa without collecting the card number', async ({ page }) => {
  let registrationPayload: Record<string, unknown> | undefined
  await page.route('**/auth/register', async (route) => {
    registrationPayload = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 1,
          email: 'client@example.com',
          accountStatus: 'PENDING_VERIFICATION',
          accountExpiresAt: '2027-01-01T00:00:00.000Z',
        },
      }),
    })
  })
  await page.goto('/register')

  await completeRegistrationSteps(page)

  await expect(page.getByRole('group')).toContainText('Avez-vous déjà une carte Visa ?')
  await expect(page.getByText('Si vous avez une carte Visa, vous la confirmerez dans le formulaire sécurisé Stripe.')).toBeVisible()
  await expect(page.locator('input[name="cardNumber"]')).toHaveCount(0)
  await page.getByRole('button', { name: "S'inscrire" }).click()
  await expect(page.getByRole('alert')).toHaveText('Veuillez sélectionner une réponse.')

  await page.getByRole('radio', { name: 'Non, pas pour l’instant' }).check()
  await expect(page.getByText('Votre compte sera créé sans carte bancaire, comme d’habitude.')).toBeVisible()
  await page.getByRole('button', { name: "S'inscrire" }).click()
  await expect.poll(() => registrationPayload).toBeDefined()
  expect(registrationPayload).toHaveProperty('hasVisa', false)
  expect(registrationPayload).not.toHaveProperty('stripeSetupIntentId')
})

test('Visa registration waits for Stripe card confirmation', async ({ page }) => {
  let registrationRequests = 0
  await page.route('**/auth/signup-card/setup-intent', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Le paiement par carte n’est pas configuré' }),
    })
  })
  await page.route('**/auth/register', async (route) => {
    registrationRequests += 1
    await route.fulfill({ status: 201, body: '{}' })
  })
  await page.goto('/register')
  await completeRegistrationSteps(page)

  await page.getByRole('radio', { name: 'Oui, j’en ai déjà une' }).check()
  await expect(page.getByText('Le paiement par carte n’est pas configuré')).toBeVisible()
  await page.getByRole('button', { name: "S'inscrire" }).click()

  await expect(page.getByText('Veuillez confirmer votre carte Visa avant de créer le compte.')).toBeVisible()
  expect(registrationRequests).toBe(0)
})
