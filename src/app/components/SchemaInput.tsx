"use client";

import React from "react";

interface SchemaInputProps {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  placeholder?: string;
  className?: string;
}

export function SchemaInput({
  value,
  onChange,
  placeholder = '{ "type": "object", "properties": {} }',
  className = ""
}: SchemaInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      onChange(JSON.parse(e.target.value));
    } catch {
      // Allow invalid JSON while typing
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    try {
      onChange(JSON.parse(e.target.value));
    } catch {
      // Reset to last valid value on parse error
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <textarea
        value={JSON.stringify(value, null, 2)}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full p-2 border rounded resize-none h-24 text-xs font-mono high-contrast-input"
      />
      <a
        href="/schema-editor"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
      >
        <svg
          className="w-3 h-3 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        Schema
      </a>
    </div>
  );
}
