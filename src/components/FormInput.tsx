import React from "react";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function FormInput({
  label,
  error,
  className = "",
  ...props
}: FormInputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        className={`high-contrast-input w-full px-3 py-2 rounded-lg focus:ring-2 transition-all duration-300 ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
