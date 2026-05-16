import type { CardBrand } from "@/types/billing";
import { cn } from "@/lib/utils";

export function CardBrandIcon({
  brand,
  className,
}: {
  brand: CardBrand;
  className?: string;
}) {
  const base = "inline-flex items-center justify-center rounded-md text-[10px] font-semibold tracking-tight";

  if (brand === "visa") {
    return (
      <span
        className={cn(
          base,
          "h-6 w-9 bg-gradient-to-br from-indigo-600 to-blue-700 text-white italic",
          className,
        )}
      >
        VISA
      </span>
    );
  }
  if (brand === "mastercard") {
    return (
      <span
        className={cn(
          base,
          "relative h-6 w-9 overflow-hidden bg-zinc-900 text-white",
          className,
        )}
      >
        <span className="absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-red-500" />
        <span className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-amber-400 mix-blend-screen" />
      </span>
    );
  }
  if (brand === "amex") {
    return (
      <span
        className={cn(
          base,
          "h-6 w-9 bg-gradient-to-br from-sky-500 to-blue-600 text-white",
          className,
        )}
      >
        AMEX
      </span>
    );
  }
  if (brand === "discover") {
    return (
      <span
        className={cn(
          base,
          "h-6 w-9 bg-gradient-to-br from-orange-400 to-rose-500 text-white",
          className,
        )}
      >
        DISC
      </span>
    );
  }
  return (
    <span
      className={cn(
        base,
        "h-6 w-9 border border-zinc-200 bg-zinc-50 text-zinc-400",
        className,
      )}
    >
      ••••
    </span>
  );
}
