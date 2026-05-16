"use client";

import type { FormField } from "@/types/campaign";
import { cn } from "@/lib/utils";

type Props = {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

const inputBase =
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-all focus:border-violet-600 focus:ring-4 focus:ring-violet-600/10";

const htmlType: Record<FormField["type"], string> = {
  text: "text",
  email: "email",
  phone: "tel",
  url: "url",
  number: "number",
  date: "date",
  textarea: "text",
  select: "text",
  checkbox: "text",
};

export function FormFieldInput({ field, value, onChange, className }: Props) {
  const id = `field-${field.id}`;
  const required = field.required;

  return (
    <div className={cn("space-y-1.5", className)}>
      {field.type !== "checkbox" && (
        <label
          htmlFor={id}
          className="text-xs font-bold uppercase tracking-wider text-zinc-700"
        >
          {field.label}
          {required && <span className="ml-1 text-violet-600">*</span>}
        </label>
      )}

      {field.type === "textarea" ? (
        <textarea
          id={id}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={cn(inputBase, "min-h-24 resize-y")}
        />
      ) : field.type === "select" ? (
        <select
          id={id}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputBase, "h-11 py-0")}
        >
          <option value="" disabled>
            {field.placeholder || "Choose an option"}
          </option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : field.type === "checkbox" ? (
        <label
          htmlFor={id}
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300"
        >
          <input
            id={id}
            type="checkbox"
            required={required}
            checked={value === "true"}
            onChange={(e) => onChange(e.target.checked ? "true" : "")}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-600"
          />
          <span className="text-sm text-zinc-700">
            {field.description || field.label}
            {required && <span className="ml-1 text-violet-600">*</span>}
          </span>
        </label>
      ) : (
        <input
          id={id}
          type={htmlType[field.type]}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={cn(inputBase)}
        />
      )}

      {field.type !== "checkbox" && field.description && (
        <p className="text-xs text-zinc-500">{field.description}</p>
      )}
    </div>
  );
}
