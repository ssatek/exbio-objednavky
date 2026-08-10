const DISCOUNT_BRANDS = new Set(["LAHOFER", "HANZEL", "WALDBERG", "ZNOVIN"]);
const DISCOUNT_RATE_BRAND = 0.2;
const DISCOUNT_RATE_OTHER = 0.1;

export function roundUp(price: number) {
  return Math.ceil(price);
}

export function getDiscountRate(brand: string) {
  return DISCOUNT_BRANDS.has(brand) ? DISCOUNT_RATE_BRAND : DISCOUNT_RATE_OTHER;
}

// Sazba se aplikuje až na cenu zaokrouhlenou nahoru na celé koruny, výsledek se opět zaokrouhlí nahoru.
export function getDiscountedPrice(price: number, brand: string) {
  return roundUp(roundUp(price) * (1 - getDiscountRate(brand)));
}
