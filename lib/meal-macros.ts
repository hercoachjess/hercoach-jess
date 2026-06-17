import type { Meal, MealItem } from '@/types'

export interface MacroTotals {
  kcal: number
  protein_g: number
  fat_g: number
  carbs_g: number
}

export const ZERO: MacroTotals = { kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0 }

/** Whether an item has any usable macro estimates at all. */
export function itemHasMacros(item: MealItem): boolean {
  return (
    item.kcal != null ||
    item.protein_g != null ||
    item.fat_g != null ||
    item.carbs_g != null
  )
}

/** Pull macros off a single item, falling back to zero when missing. */
export function itemMacros(item: MealItem): MacroTotals {
  return {
    kcal: item.kcal ?? 0,
    protein_g: item.protein_g ?? 0,
    fat_g: item.fat_g ?? 0,
    carbs_g: item.carbs_g ?? 0,
  }
}

export function addMacros(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    kcal: a.kcal + b.kcal,
    protein_g: a.protein_g + b.protein_g,
    fat_g: a.fat_g + b.fat_g,
    carbs_g: a.carbs_g + b.carbs_g,
  }
}

/** Total macros for a single meal (sums the items). Excludes alternatives. */
export function mealMacros(meal: Meal): MacroTotals {
  return meal.items.reduce<MacroTotals>(
    (acc, item) => addMacros(acc, itemMacros(item)),
    { ...ZERO },
  )
}

/** Total macros across an entire plan. */
export function planMacros(meals: Meal[]): MacroTotals {
  return meals.reduce<MacroTotals>(
    (acc, meal) => addMacros(acc, mealMacros(meal)),
    { ...ZERO },
  )
}

/**
 * Linearly scale an item's macros to a new quantity. The food name,
 * brand, and unit stay the same. If the item has no quantity recorded
 * (legacy data) we leave macros unchanged — there's nothing to scale.
 */
export function scaleItemQuantity(item: MealItem, newQuantity: number): MealItem {
  if (!Number.isFinite(newQuantity) || newQuantity < 0) return item
  const oldQty = item.quantity
  if (oldQty == null || oldQty === 0) {
    // No baseline to scale from; record the quantity but keep macros.
    return { ...item, quantity: newQuantity }
  }
  const factor = newQuantity / oldQty
  return {
    ...item,
    quantity: newQuantity,
    kcal: item.kcal != null ? round1(item.kcal * factor) : item.kcal,
    protein_g: item.protein_g != null ? round1(item.protein_g * factor) : item.protein_g,
    fat_g: item.fat_g != null ? round1(item.fat_g * factor) : item.fat_g,
    carbs_g: item.carbs_g != null ? round1(item.carbs_g * factor) : item.carbs_g,
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Display helper: "80g rolled oats" from the structured form. */
export function formatItemDisplay(item: MealItem): string {
  const qty = item.quantity != null ? `${item.quantity}` : ''
  const unit = item.unit && item.unit !== 'item' ? item.unit : ''
  const prefix = qty ? (unit ? `${qty}${unit} ` : `${qty} `) : ''
  return `${prefix}${item.food}`.trim()
}

/** Display helper: "280 kcal · P10 F5 C45" — short form for inline display. */
export function formatMacrosShort(m: MacroTotals): string {
  return `${Math.round(m.kcal)} kcal · P${Math.round(m.protein_g)} F${Math.round(m.fat_g)} C${Math.round(m.carbs_g)}`
}

/**
 * Compare plan totals to targets and return a tuple suitable for
 * picking a colour: 'on' within ±5%, 'off' if outside that band.
 */
export function macroComparisonStatus(
  actual: number,
  target: number,
  tolerancePct = 5,
): 'on' | 'off' {
  if (!target) return 'off'
  const diffPct = Math.abs((actual - target) / target) * 100
  return diffPct <= tolerancePct ? 'on' : 'off'
}
