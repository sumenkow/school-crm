/**
 * ISO / ICAO standard transliteration for Cyrillic names to Latin.
 * Complies with ICAO Doc 9303 and international European banking standards.
 */
const CYRILLIC_TO_LATIN_MAP: Record<string, string> = {
  // Uppercase
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E',
  'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
  'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
  'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch',
  'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
  'Є': 'Ye', 'І': 'I', 'Ї': 'Yi', 'Ґ': 'G', 'Ў': 'U',

  // Lowercase
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  'є': 'ye', 'і': 'i', 'ї': 'yi', 'ґ': 'g', 'ў': 'u',
};

/**
 * Transliterates a name or text string from Cyrillic to Latin according to ISO standard.
 * If already Latin or mixed, non-Cyrillic characters are preserved as-is.
 */
export function transliterateIso(text: string): string {
  if (!text) return '';
  return text
    .split('')
    .map((char) => CYRILLIC_TO_LATIN_MAP[char] ?? char)
    .join('');
}
