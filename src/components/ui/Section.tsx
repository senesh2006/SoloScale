import { cn } from "@/lib/utils";

type Props = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function Section({
  icon,
  title,
  description,
  action,
  children,
  className,
}: Props) {
  return (
    <section className={cn("space-y-5", className)}>
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
              {icon}
            </div>
          ) : null}
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              {title}
            </h2>
            {description ? (
              <p className="text-sm text-zinc-500">{description}</p>
            ) : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
