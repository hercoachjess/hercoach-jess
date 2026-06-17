import type { MealItem } from '@/types'

// Recognised units for the quantity input + parser. Keep in sync with
// the MealItem.unit type. Longest tokens first so 'tbsp' matches before
// 'tb' / 'tsp' before 't', etc.
const KNOWN_UNITS = ['tbsp', 'tsp', 'cup', 'scoop', 'ml', 'g'] as const
type ParsedUnit = (typeof KNOWN_UNITS)[number] | 'item'

const QUANTITY_PREFIX_RE = new RegExp(
  // optional leading number + optional unit ("80g " | "250ml " | "1 ")
  `^\\s*(\\d+(?:\\.\\d+)?)\\s*(${KNOWN_UNITS.join('|')})?\\s+`,
  'i',
)

interface ParsedQuantity {
  quantity: number | undefined
  unit: ParsedUnit | undefined
  remainingFood: string
}

/**
 * Extract a leading quantity ("80g", "250ml", "1 ") from a free-text
 * item string. Falls back to undefined quantity if there's no clear
 * leading number, in which case the whole string stays as the food
 * name.
 */
function parseQuantityFromFood(food: string): ParsedQuantity {
  const m = food.match(QUANTITY_PREFIX_RE)
  if (!m) return { quantity: undefined, unit: undefined, remainingFood: food }
  const quantity = parseFloat(m[1])
  if (!Number.isFinite(quantity)) {
    return { quantity: undefined, unit: undefined, remainingFood: food }
  }
  const rawUnit = m[2]?.toLowerCase() as ParsedUnit | undefined
  const unit: ParsedUnit = rawUnit ?? 'item'
  const remainingFood = food.replace(QUANTITY_PREFIX_RE, '').trim()
  return { quantity, unit, remainingFood }
}

/**
 * Older saved meal plans stored items as plain strings like
 * "80g rolled oats (Tesco Wholegrain Porridge Oats)". Newer plans use a
 * structured { food, brand, quantity, unit, macros... } shape. This
 * helper accepts either and returns the structured form, splitting on
 * the trailing parenthesised brand and the leading quantity if present.
 */
export function normalizeMealItem(item: MealItem | string | null | undefined): MealItem {
  if (!item) return { food: '' }
  if (typeof item === 'string') {
    const trimmed = item.trim()
    const brandMatch = trimmed.match(/^(.+?)\s*\(([^()]+)\)\s*$/)
    const rawFood = (brandMatch ? brandMatch[1] : trimmed).trim()
    const brand = brandMatch ? brandMatch[2].trim() : undefined
    const { quantity, unit, remainingFood } = parseQuantityFromFood(rawFood)
    return {
      food: remainingFood || rawFood,
      brand: brand || undefined,
      quantity,
      unit,
    }
  }
  // Object form. Trim brand, default-empty food, leave the rest as-is.
  return {
    food: item.food || '',
    brand: item.brand?.trim() || undefined,
    quantity: typeof item.quantity === 'number' && Number.isFinite(item.quantity) ? item.quantity : undefined,
    unit: item.unit,
    kcal: typeof item.kcal === 'number' ? item.kcal : undefined,
    protein_g: typeof item.protein_g === 'number' ? item.protein_g : undefined,
    fat_g: typeof item.fat_g === 'number' ? item.fat_g : undefined,
    carbs_g: typeof item.carbs_g === 'number' ? item.carbs_g : undefined,
  }
}

export function normalizeMealItems(items: (MealItem | string)[] | null | undefined): MealItem[] {
  return (items ?? []).map(normalizeMealItem).filter((i) => i.food.length > 0)
}
