import type { MealItem } from '@/types'

/**
 * Older saved meal plans stored items as plain strings like
 * "80g rolled oats (Tesco Wholegrain Porridge Oats)". Newer plans use a
 * structured { food, brand } shape so brands can render in their own column.
 * This helper accepts either and returns the structured form, splitting on
 * the trailing parenthesised brand if present.
 */
export function normalizeMealItem(item: MealItem | string | null | undefined): MealItem {
  if (!item) return { food: '' }
  if (typeof item === 'string') {
    const m = item.match(/^(.+?)\s*\(([^()]+)\)\s*$/)
    if (m) {
      return { food: m[1].trim(), brand: m[2].trim() }
    }
    return { food: item.trim() }
  }
  return { food: item.food || '', brand: item.brand?.trim() || undefined }
}

export function normalizeMealItems(items: (MealItem | string)[] | null | undefined): MealItem[] {
  return (items ?? []).map(normalizeMealItem).filter((i) => i.food.length > 0)
}
