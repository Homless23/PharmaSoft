export const CATEGORY_ICON_MAP = {
  Food: '🍔',
  Transport: '🚗',
  Entertainment: '🎬',
  Bills: '💡',
  Health: '💊',
  Shopping: '🛍️',
  Groceries: '🥦',
  Rent: '🏠',
  Education: '📚',
  Travel: '✈️',
  Investment: '📈',
  Salary: '💰',
  Gift: '🎁',
  Other: '📦',
  // Fallback
  Default: '📝'
};

export const getCategoryIcon = (category) => {
  return CATEGORY_ICON_MAP[category] || CATEGORY_ICON_MAP.Default;
};