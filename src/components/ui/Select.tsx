import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

type Props = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  label?: string;
  hint?: string;
  error?: string;
  options: Option[];
};

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { label, hint, error, options, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div className="space-y-1.5">
      {label ? (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-zinc-700"
        >
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          id={inputId}
          ref={ref}
          className={cn(
            "h-11 w-full appearance-none rounded-xl border border-zinc-200 bg-white pl-3.5 pr-10 text-sm text-zinc-900 transition-all",
            "focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100",
            error && "border-red-300 focus:border-red-400 focus:ring-red-100",
            className,
          )}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      </div>
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
});
