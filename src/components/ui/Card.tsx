import { cn } from "@/lib/utils";

/** Frosted glass panel for dashboard / campaign views (reads well over imagery). */
export const glassPanelClass =
  "rounded-2xl border border-white/50 bg-white/65 shadow-[0_1px_3px_rgba(9,9,11,0.08)] backdrop-blur-xl backdrop-saturate-150";

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(glassPanelClass, className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-zinc-200/40 px-6 py-4",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-sm font-semibold tracking-tight text-zinc-950",
        className,
      )}
      {...rest}
    >
      {children}
    </h3>
  );
}

export function CardBody({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6", className)} {...rest}>
      {children}
    </div>
  );
}
