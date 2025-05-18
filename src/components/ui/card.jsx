import React from "react";

export function Card({ children, className }) {
  return (
    <div className={`bg-[#1e1e2f] rounded-2xl shadow-lg p-4 ${className || ""}`}>
      {children}
    </div>
  );
}

export function CardContent({ children }) {
  return <div className="text-white">{children}</div>;
}
