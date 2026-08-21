const LAST_FAMILY_KEY = 'niannian.lastFamilyId';

export function getLastFamilyId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(LAST_FAMILY_KEY);
  } catch {
    return null;
  }
}

export function setLastFamilyId(familyId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_FAMILY_KEY, familyId);
  } catch {
    /* ignore quota / private mode */
  }
}
