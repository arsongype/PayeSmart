const currencyByCountry: Record<string, string> = {
  dz: 'DZD',
  algérie: 'DZD',
  algeria: 'DZD',
  be: 'EUR',
  belgique: 'EUR',
  bj: 'XOF',
  benin: 'XOF',
  bénin: 'XOF',
  bf: 'XOF',
  burkinafaso: 'XOF',
  cm: 'XAF',
  cameroun: 'XAF',
  cameroon: 'XAF',
  ca: 'CAD',
  canada: 'CAD',
  km: 'KMF',
  comoros: 'KMF',
  comores: 'KMF',
  ci: 'XOF',
  'cote divoire': 'XOF',
  'côte divoire': 'XOF',
  'côte d ivoire': 'XOF',
  'cote d ivoire': 'XOF',
  fr: 'EUR',
  france: 'EUR',
  gh: 'GHS',
  ghana: 'GHS',
  gn: 'GNF',
  guinee: 'GNF',
  guinée: 'GNF',
  guinea: 'GNF',
  ke: 'KES',
  kenya: 'KES',
  mg: 'MGA',
  madagascar: 'MGA',
  ml: 'XOF',
  mali: 'XOF',
  mu: 'MUR',
  maurice: 'MUR',
  mauritius: 'MUR',
  ma: 'MAD',
  maroc: 'MAD',
  morocco: 'MAD',
  ne: 'XOF',
  niger: 'XOF',
  ng: 'NGN',
  nigeria: 'NGN',
  rw: 'RWF',
  rwanda: 'RWF',
  sn: 'XOF',
  senegal: 'XOF',
  sénégal: 'XOF',
  sl: 'SLE',
  'sierra leone': 'SLE',
  za: 'ZAR',
  'sud afrique': 'ZAR',
  'south africa': 'ZAR',
  tz: 'TZS',
  tanzanie: 'TZS',
  tanzania: 'TZS',
  tg: 'XOF',
  togo: 'XOF',
  tn: 'TND',
  tunisie: 'TND',
  tunisia: 'TND',
  us: 'USD',
  'etats unis': 'USD',
  'états unis': 'USD',
  'united states': 'USD',
  gb: 'GBP',
  'royaume uni': 'GBP',
  'united kingdom': 'GBP',
  zm: 'ZMW',
  zambie: 'ZMW',
  zambia: 'ZMW',
  zw: 'ZWG',
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