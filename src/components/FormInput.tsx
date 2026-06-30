import React from "react";

interface FormInputProps {
  label?: string;
  error?: string;
  as?: "input" | "textarea";
  rows?: number;
  className?: string;
  type?: string;
  value?: string | number | readonly string[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  onChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  variant?: "glass" | "tui";
  [key: string]: unknown;
}

export default function FormInput({
  label,
  error,
  as: Component = "input",
  rows,
  className = "",
  variant = "glass",
  ...props
}: FormInputProps) {
  const labelClass =
    variant === "tui"
      ? "block tui-label mb-2"
      : "block text-sm font-medium text-gray-700 dark:text-gray-300";

  const inputClass =
    variant === "tui"
      ? `w-full tui-input ${className}`
      : `high-contrast-input w-full px-3 py-2 rounded-lg focus:ring-2 transition-all duration-300${Component === "textarea" ? " resize-none" : ""} ${className}`;

  return (
    <div className="space-y-2">
      {label && (
        <label className={labelClass}>{label}</label>
      )}
      {Component === "textarea" ? (
        <textarea className={inputClass} rows={rows} {...props} />
      ) : (
        <input className={inputClass} {...props} />
      )}
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
