export enum CategoryStatus {
  AVAILABLE = 'available',
  LOW_STOCK = 'low_stock',
  UNAVAILABLE = 'unavailable',
}

export const CATEGORY_STATUSES = Object.values(CategoryStatus);

export const DEFAULT_CATEGORY_THRESHOLD = 5;

export function resolveCategoryStatus(
  quantity: number,
  threshold: number,
): CategoryStatus {
  if (quantity >= threshold) {
    return CategoryStatus.AVAILABLE;
  }

  if (quantity > 0) {
    return CategoryStatus.LOW_STOCK;
  }

  return CategoryStatus.UNAVAILABLE;
}
