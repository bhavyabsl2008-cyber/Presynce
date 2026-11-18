"use client";

import * as React from "react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

/**
 * Masked password input with an inline right-aligned visibility toggle.
 * Always defaults to masked on mount and never persists visibility state.
 */
export function PasswordInput({
  className = "",
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const label = showPassword ? "Hide password" : "Show password";

  return (
    <div className="relative w-full">
      <input
        {...props}
        type={showPassword ? "text" : "password"}
        className={`w-full bg-transparent border border-line pl-4 pr-12 py-3 text-body-strong focus:outline-none focus:border-ink-secondary ${className}`.trim()}
      />
      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={label}
        aria-pressed={showPassword}
        title={label}
        className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-11 h-11 text-ink-secondary hover:text-ink-v2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-v2 focus-visible:text-ink-v2"
      >
        {showPassword ? (
          <EyeOff className="w-5 h-5" aria-hidden="true" />
        ) : (
          <Eye className="w-5 h-5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
