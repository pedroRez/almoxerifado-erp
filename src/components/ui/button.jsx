import React from "react";

export function Button({ children, onClick, className, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition ${className || ""}`}
    >
      {children}
    </button>
  );
}
