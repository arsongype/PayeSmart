export function isSandboxCardExpiryValid(expiry: string, currentDate = new Date()): boolean {
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) return false

  const [monthText, yearText] = expiry.split('/')
  const year = 2000 + Number(yearText)
  const month = Number(monthText)
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1
  return year > currentYear || (year === currentYear && month >= currentMonth)
}

export function isSandboxCardCvvValid(cvv: string): boolean {
  return /^\d{3,4}$/.test(cvv)
}

export function getSandboxDynamicCvv(userId: number, timestamp = Date.now()): string {
  const thirtyMinuteWindow = Math.floor(timestamp / (30 * 60 * 1000))
  const accountOffset = Math.abs(userId) * 17
  return String(100 + ((thirtyMinuteWindow + accountOffset) % 900))
}
