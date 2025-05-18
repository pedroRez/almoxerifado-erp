import React from "react";

export function Table({ children }) {
  return (
    <div className="w-full overflow-auto rounded-lg border border-gray-700">
      <table className="min-w-full bg-gray-900 text-left text-sm text-gray-300">
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children }) {
  return <thead className="bg-gray-800 text-gray-400">{children}</thead>;
}

export function TableBody({ children }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children }) {
  return <tr className="border-b border-gray-700 hover:bg-gray-800">{children}</tr>;
}

export function TableHead({ children }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

export function TableCell({ children }) {
  return <td className="px-4 py-3">{children}</td>;
}
