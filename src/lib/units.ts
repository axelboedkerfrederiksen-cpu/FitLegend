export type UnitPref = 'kg' | 'lbs'

const KG_TO_LBS = 2.20462

export function toDisplayWeight(kg: number, unit: UnitPref): number {
  if (unit === 'lbs') return Math.round(kg * KG_TO_LBS * 10) / 10
  return kg
}

export function fromDisplayWeight(display: number, unit: UnitPref): number {
  if (unit === 'lbs') return Math.round((display / KG_TO_LBS) * 10) / 10
  return display
}

export function fmtWeight(kg: number, unit: UnitPref = 'kg'): string {
  const val = toDisplayWeight(kg, unit)
  const formatted = val % 1 === 0 ? String(val) : val.toFixed(1)
  return `${formatted} ${unit}`
}
