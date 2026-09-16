/**
 * Helper utility for calculating student age from birth date and formatting age & grade.
 */

/**
 * Calculates exact age in full years from a birth date string (YYYY-MM-DD or DD.MM.YYYY).
 */
export function calculateAge(birthDateString?: string | null): number | null {
  if (!birthDateString) return null;

  let birth: Date;
  const trimmed = birthDateString.trim();

  // Support DD.MM.YYYY
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('.').map(Number);
    birth = new Date(year, month - 1, day);
  } else {
    birth = new Date(trimmed);
  }

  if (isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age >= 0 ? age : null;
}

/**
 * Formats age with correct Russian pluralization (год / года / лет).
 */
export function formatAgeRussian(age: number): string {
  const mod10 = age % 10;
  const mod100 = age % 100;

  if (mod100 >= 11 && mod100 <= 19) {
    return `${age} лет`;
  }
  if (mod10 === 1) {
    return `${age} год`;
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return `${age} года`;
  }
  return `${age} лет`;
}

/**
 * Formats grade string (e.g., '8' -> '8 класс', '5 класс' -> '5 класс').
 */
export function formatGradeRussian(grade?: string | null): string {
  if (!grade) return '';
  const trimmed = grade.trim();
  if (!trimmed) return '';

  // If numeric only: '8' -> '8 класс'
  if (/^\d+$/.test(trimmed)) {
    return `${trimmed} класс`;
  }

  return trimmed;
}

/**
 * Returns formatted "age, grade" string separated by comma (e.g. "14 лет, 8 класс").
 */
export function formatAgeAndGrade(
  birthDate?: string | null,
  grade?: string | null,
  fallbackAge?: string | null
): string {
  const parts: string[] = [];

  const age = calculateAge(birthDate);
  if (age !== null) {
    parts.push(formatAgeRussian(age));
  } else if (fallbackAge && fallbackAge.trim()) {
    const num = parseInt(fallbackAge.replace(/\D/g, ''), 10);
    if (!isNaN(num) && num > 0 && num < 120) {
      parts.push(formatAgeRussian(num));
    } else {
      parts.push(fallbackAge.trim());
    }
  }

  if (grade && grade.trim()) {
    parts.push(formatGradeRussian(grade));
  }

  return parts.join(', ');
}

/**
 * Formats birth date into readable Russian date (e.g. "14.05.2012").
 */
export function formatBirthDate(birthDateString?: string | null): string {
  if (!birthDateString) return '';
  const trimmed = birthDateString.trim();

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return trimmed;

  return d.toLocaleDateString('ru-RU');
}
