import {
  ALL_NOTIFICATION_CATEGORY_KEYS,
  NOTIFICATION_CATEGORIES,
  type NotificationAudience,
  type NotificationCategoryKey,
} from "./notification-categories";

export type PreferenceRowLike = {
  category: string;
  enabled: boolean;
};

export type ResolvedPreference = {
  category: NotificationCategoryKey;
  enabled: boolean;
  label: string;
  description: string;
  audience: NotificationAudience;
  implemented: boolean;
  /** True when the value comes from a stored row (not the category default). */
  explicit: boolean;
};

export function resolvePreferencesFromRows(
  rows: PreferenceRowLike[],
  options?: { audience?: NotificationAudience; implementedOnly?: boolean },
): ResolvedPreference[] {
  const byCategory = new Map(rows.map((row) => [row.category, row]));

  return ALL_NOTIFICATION_CATEGORY_KEYS.filter((key) => {
    const def = NOTIFICATION_CATEGORIES[key];
    if (options?.audience && def.audience !== options.audience) return false;
    if (options?.implementedOnly && !def.implemented) return false;
    return true;
  }).map((key) => {
    const def = NOTIFICATION_CATEGORIES[key];
    const row = byCategory.get(key);
    return {
      category: key,
      enabled: row ? row.enabled : def.defaultEnabled,
      label: def.label,
      description: def.description,
      audience: def.audience,
      implemented: def.implemented,
      explicit: Boolean(row),
    };
  });
}
