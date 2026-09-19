const currencyByCountry: Record<string, string> = {
  algérie: 'DZD',
  algeria: 'DZD',
  belgique: 'EUR',
  benin: 'XOF',
  bénin: 'XOF',
  burkinafaso: 'XOF',
  cameroun: 'XAF',
  cameroon: 'XAF',
  canada: 'CAD',
  comoros: 'KMF',
  comores: 'KMF',
  'cote divoire': 'XOF',
  'côte divoire': 'XOF',
  'côte d ivoire': 'XOF',
  'cote d ivoire': 'XOF',
  france: 'EUR',
  ghana: 'GHS',
  guinee: 'GNF',
  guinée: 'GNF',
  guinea: 'GNF',
  kenya: 'KES',
  madagascar: 'MGA',
  mali: 'XOF',
  maurice: 'MUR',
  mauritius: 'MUR',
  maroc: 'MAD',
  morocco: 'MAD',
  niger: 'XOF',
  nigeria: 'NGN',
  rwanda: 'RWF',
  senegal: 'XOF',
  sénégal: 'XOF',
  'sierra leone': 'SLE',
  'sud afrique': 'ZAR',
  'south africa': 'ZAR',
  tanzanie: 'TZS',
  tanzania: 'TZS',
  togo: 'XOF',
  tunisie: 'TND',
  tunisia: 'TND',
  'etats unis': 'USD',
  'états unis': 'USD',
  'united states': 'USD',
  'royaume uni': 'GBP',
  'united kingdom': 'GBP',
  zambie: 'ZMW',
  zambia: 'ZMW',
  zimbabwe: 'ZWG',
}

export const INITIAL_WALLET_BALANCE = 100000

export function getCurrencyForCountry(country?: string): string {
  const normalizedCountry = country
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

  if (!normalizedCountry) return 'EUR'

  const compactCountry = normalizedCountry.replace(/\s/g, '')
  return currencyByCountry[normalizedCountry] ?? currencyByCountry[compactCountry] ?? 'EUR'
}