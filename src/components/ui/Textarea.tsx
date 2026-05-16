import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
};

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { label, hint, error, leftIcon, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div className="space-y-1.5">
      {label ? (
        <label
          htmlFor={inputId}
          className="flex items-center gap-2 text-xs font-medium text-zinc-700"
        >
          {leftIcon ? (
            <span className="text-zinc-400">{leftIcon}</span>
          ) : null}
          {label}
        </label>
      ) : null}
      <textarea
        id={inputId}
        ref={ref}
        className={cn(
          "block w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 transition-all",
          "focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100",
          "resize-y min-h-24",
          error && "border-red-300 focus:border-red-400 focus:ring-red-100",
          className,
        )}
        {...rest}
      />
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
});
