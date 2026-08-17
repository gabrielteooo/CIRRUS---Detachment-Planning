/** Normalise stored tail numbers to a 3–4 digit display value. */
export function formatAircraftTailNumber(tail: string): string {
  const trimmed = tail.trim();
  if (!trimmed) return '—';

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length >= 3 && digitsOnly.length <= 4) {
    return digitsOnly;
  }

  return trimmed;
}

export function isValidAircraftTailNumber(tail: string): boolean {
  return /^\d{3,4}$/.test(tail.trim());
}

export function formatCannibalisedItemLabel(description: string, tailNumber: string): string {
  return `${description} - ${formatAircraftTailNumber(tailNumber)}`;
}
