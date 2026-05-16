import type { CardBrand } from "@/types/billing";
import type { Currency, EventPrice } from "@/types/campaign";

export function detectCardBrand(number: string): CardBrand {
  const n = number.replace(/\s/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (/^(6011|65|64[4-9])/.test(n)) return "discover";
  return "unknown";
}

export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  const brand = detectCardBrand(digits);
  if (brand === "amex") {
    return digits.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*$/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(" "),
    );
  }
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function luhnValid(number: string): boolean {
  const digits = number.replace(/\D/g, "");
  if (digits.length < 12) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function isExpiryValid(value: string): boolean {
  const m = value.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const exp = new Date(year, month, 0, 23, 59, 59);
  return exp >= now;
}

export function isCvcValid(cvc: string, brand: CardBrand): boolean {
  const digits = cvc.replace(/\D/g, "");
  return brand === "amex" ? digits.length === 4 : digits.length === 3;
}

const currencySymbols: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  LKR: "Rs ",
};

export function formatPrice(price: EventPrice | null | undefined): string {
  if (!price || price.amount_cents <= 0) return "Free";
  const symbol = currencySymbols[price.currency];
  const value = (price.amount_cents / 100).toFixed(2).replace(/\.00$/, "");
  return `${symbol}${value}`;
}

export function formatMoney(amountCents: number, currency: Currency): string {
  const symbol = currencySymbols[currency];
  const value = (amountCents / 100).toFixed(2);
  return `${symbol}${value}`;
}

export function maskCard(last4: string, brand: CardBrand): string {
  const prefix = brand === "amex" ? "•••• •••••• " : "•••• •••• •••• ";
  return `${prefix}${last4}`;
}
