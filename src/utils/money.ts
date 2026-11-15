export const toCents = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100);
export const fromCents = (cents: number) => cents / 100;
export const roundMoney = (value: number) => fromCents(toCents(value));
export const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(value);

export const formatWholeMoney = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
