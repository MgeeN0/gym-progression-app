// Hermes doesn't reliably support Unicode property escapes like \p{L}, so letters are
// spelled out as ranges: Latin (including accented and Polish letters), Greek and Cyrillic.
const LETTERS = 'A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u024F\\u0370-\\u03FF\\u0400-\\u04FF';

const NAME = new RegExp(`^[${LETTERS}0-9 ]+$`);
const NOTE = new RegExp(`^[${LETTERS}0-9 \\n.,!?():-]*$`);
const POSITIVE_INTEGER = /^[1-9]\d*$/;
// One decimal separator at most; iOS shows a comma or a dot depending on the region.
const DECIMAL = /^\d+([.,]\d+)?$/;
const YOUTUBE_LINK = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\/[A-Za-z0-9._\-/?=&+]+$/i;

// Empty values count as valid here: whether a field is required is checked separately,
// so an untouched field isn't shown as an error.
export function isValidName(value: string) {
  return value === '' || NAME.test(value);
}

export function isValidNote(value: string) {
  return NOTE.test(value);
}

export function isValidInteger(value: string) {
  return value === '' || POSITIVE_INTEGER.test(value);
}

export function isValidDecimal(value: string) {
  return value === '' || DECIMAL.test(value);
}

export function isValidYoutubeLink(value: string) {
  return value === '' || YOUTUBE_LINK.test(value);
}

/** Adds https:// when it's missing so the link can be opened. */
export function normalizeYoutubeLink(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/** Parses a validated decimal, accepting a comma as the separator. */
export function parseDecimal(value: string) {
  return Number(value.replace(',', '.'));
}
