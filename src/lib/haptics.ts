const PATTERNS: Record<string, number | number[]> = {
  'workout-saved': [40, 60, 80],
  'pr-hit': [30, 40, 30, 40, 100],
}

export function haptic(type: keyof typeof PATTERNS): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(PATTERNS[type])
  }
}
