import type { CardBrand } from "@/types/billing";
import { cn } from "@/lib/utils";
import { CreditCard } from "lucide-react";

export function CardBrandMark({
  brand,
  className,
}: {
  brand: CardBrand;
  className?: string;
}) {
  const base = cn(
    "inline-flex h-6 items-center justify-center rounded-md text-[10px] font-bold uppercase",
    className,
  );

  if (brand === "visa") {
    return (
      <span className={cn(base, "bg-blue-600 px-2 text-white tracking-widest")}>
        VISA
      </span>
    );
  }
  if (brand === "mastercard") {
    return (
      <span className={cn(base, "relative w-10 bg-zinc-50 ring-1 ring-zinc-200")}>
        <span className="absolute left-1 h-4 w-4 rounded-full bg-red-500/85" />
        <span className="absolute right-1 h-4 w-4 rounded-full bg-amber-400/85 mix-blend-multiply" />
      </span>
    );
  }
  if (brand === "amex") {
    return (
      <span className={cn(base, "bg-sky-500 px-2 text-white tracking-tight")}>
        AMEX
      </span>
    );
  }
  if (brand === "discover") {
    return (
      <span className={cn(base, "bg-orange-500 px-2 text-white tracking-tight")}>
        DISC
      </span>
    );
  }
  return (
    <span className={cn(base, "w-10 bg-zinc-100 text-zinc-400")}>
      <CreditCard className="h-3 w-3" />
    </span>
  );
}
