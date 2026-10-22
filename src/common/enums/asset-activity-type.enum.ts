export enum AssetActivityType {
  ADDED = 'added',
  ASSIGNED = 'assigned',
  RETURNED = 'returned',
  REPAIRED = 'repaired',
  ISSUE_REPORTED = 'issue_reported',
  OTHERS = 'others',
}

export const ASSET_ACTIVITY_TYPES = Object.values(AssetActivityType);
