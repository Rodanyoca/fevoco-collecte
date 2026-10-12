export const ACTOR_TYPES = ['Athlète', 'Entraîneur', 'Médecin', 'Officiel', 'Arbitre', 'Autre'];
export const SEXES = ['Masculin', 'Féminin'];
export const FIELDS = [
  ['type', 'Type d’acteur'], ['name', 'Nom complet'], ['sex', 'Sexe'],
  ['birthDate', 'Date de naissance'], ['affiliationDate', 'Date d’affiliation au club'],
  ['address', 'Adresse'], ['phone', 'Téléphone'], ['email', 'E-mail'],
];
export function compactDate(value) {
  return String(value).replace(/\D/g, '').slice(0, 8).replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2}\/\d{2})(\d)/, '$1/$2');
}
export function parseDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value || '');
  if (!match) return null;
  const [, d, m, y] = match.map(Number);
  const date = new Date(0); date.setUTCFullYear(y, m - 1, d); date.setUTCHours(0, 0, 0, 0);
  if (y < 1900 || y > 2200 || date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date;
}
export function toISO(value) { return value ? parseDate(value)?.toISOString().slice(0, 10) || '' : ''; }
export function displayDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value.split('-').reverse().join('/') : ''; }
export function excelDate(value) { return value ? parseDate(displayDate(value)) : null; }
export function validatePerson(input) {
  const errors = {};
  const data = Object.fromEntries(FIELDS.map(([key]) => [key, String(input[key] || '').trim()]));
  if (!ACTOR_TYPES.includes(data.type)) errors.type = 'Choisissez un type d’acteur.';
  if (!data.name) errors.name = 'Renseignez le nom complet.';
  if (data.name.length > 200) errors.name = 'Le nom est limité à 200 caractères.';
  if (!SEXES.includes(data.sex)) errors.sex = 'Choisissez le sexe.';
  if (!data.affiliationDate) errors.affiliationDate = 'Renseignez la date d’affiliation au club.';
  for (const key of ['birthDate', 'affiliationDate']) {
    if (data[key] && !parseDate(data[key])) errors[key] = 'Saisissez une date réelle au format JJ/MM/AAAA (1900 à 2200).';
  }
  if (!errors.birthDate && data.birthDate && toISO(data.birthDate) > new Date().toISOString().slice(0, 10)) errors.birthDate = 'La naissance ne peut pas être dans le futur.';
  if (!errors.birthDate && !errors.affiliationDate && data.birthDate && toISO(data.affiliationDate) < toISO(data.birthDate)) errors.affiliationDate = 'L’affiliation ne peut pas précéder la naissance.';
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Renseignez une adresse e-mail valide ou laissez ce champ vide.';
  for (const [key, max] of [['address',1000],['phone',80],['email',254]]) if (data[key].length > max) errors[key] = 'Ce champ est trop long.';
  return { errors, data: {...data, birthDate: toISO(data.birthDate), affiliationDate: toISO(data.affiliationDate)} };
}
export function filterPeople(people, search, type) {
  const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
  const term = normalize(search.trim());
  return people.filter(p => (!type || p.type === type) && normalize([p.name,p.phone,p.email].join(' ')).includes(term));
}
export function exportRows(people, club) {
  return people.map(p => [club, ...FIELDS.map(([key]) => key.endsWith('Date') ? displayDate(p[key]) : p[key] || '')]);
}
export function fileName(club, scope, extension) {
  const safe = club.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,60) || 'club';
  return 'FEVOCO-' + safe + '-' + scope + '.' + extension;
}
