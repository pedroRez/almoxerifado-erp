import React from "react";

export function Label({ children, htmlFor, className }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-white mb-1 ${className || ""}`}
    >
      {children}
    </label>
  );
}
