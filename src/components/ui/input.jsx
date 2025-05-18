import React from "react";

export function Input({ value, onChange, placeholder, type = "text", className, ...props }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`bg-[#2a2a40] text-white border border-gray-600 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${className || ""}`}
      {...props}
    />
  );
}
