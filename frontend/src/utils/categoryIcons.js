export const CATEGORY_ICON_MAP = {
  Food: '\uD83C\uDF54',
  Transport: '\uD83D\uDE97',
  Entertainment: '\uD83C\uDFAC',
  Bills: '\uD83D\uDCA1',
  Health: '\uD83D\uDC8A',
  Shopping: '\uD83D\uDED2',
  Groceries: '\uD83E\uDD66',
  Rent: '\uD83C\uDFE0',
  Education: '\uD83D\uDCDA',
  Travel: '\u2708\uFE0F',
  Investment: '\uD83D\uDCC8',
  Salary: '\uD83D\uDCB0',
  Gift: '\uD83C\uDF81',
  Other: '\uD83D\uDCE6',
  Default: '\uD83D\uDCDD'
};

export const getCategoryIcon = (category) => {
  return CATEGORY_ICON_MAP[category] || CATEGORY_ICON_MAP.Default;
};
