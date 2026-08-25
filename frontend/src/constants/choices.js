export const PAYMENT_TERMS = [
  ['cash', 'Comptant'], ['15', '15 jours'], ['30', '30 jours'], ['45', '45 jours'],
  ['60', '60 jours'], ['90', '90 jours'],
]

export const CUSTOMER_TYPES = [
  ['public_admin', 'Administration publique'], ['public_estab', 'Établissement public'],
  ['public_company', 'Entreprise publique'], ['private', 'Société privée'],
  ['sme', 'PME'], ['large', 'Grande entreprise'], ['association', 'Association'],
  ['professional', 'Professionnel'], ['individual', 'Particulier'], ['other', 'Autre'],
]

// Types de client sans registre de commerce ni identifiants fiscaux/statistiques
// d'entreprise (RC/NIF/NIS) — ces champs sont masqués dans le formulaire pour eux.
export const CUSTOMER_TYPES_WITHOUT_BUSINESS_IDS = [
  'public_admin', 'public_estab', 'association', 'individual',
]
