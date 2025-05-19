// components/ui/table.jsx (ou onde quer que estejam definidos)
import React from "react";

// Função auxiliar simples para juntar classes, tratando valores nulos/undefined
function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function Table({ children, className }) {
  return (
    <div className={classNames("w-full overflow-auto rounded-lg border border-gray-700", className)}>
      <table className="min-w-full bg-gray-900 text-left text-sm text-gray-300">
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className }) {
  return <thead className={classNames("bg-gray-800 text-gray-400", className)}>{children}</thead>;
}

export function TableBody({ children, className }) {
  return <tbody className={className || ''}>{children}</tbody>; // className pode ser undefined
}

export function TableRow({ children, className }) {
  return <tr className={classNames("border-b border-gray-700 hover:bg-gray-800", className)}>{children}</tr>;
}

export function TableHead({ children, className }) {
  // As classes base (px-4 py-3 font-medium) são boas.
  // As classes do CSS module (styles.th, styles.thNumeric) podem adicionar/sobrescrever background, color, text-align.
  return <th className={classNames("px-4 py-3 font-medium", className)}>{children}</th>;
}

export function TableCell({ children, className }) {
  // As classes base (px-4 py-3) são boas.
  // As classes do CSS module (styles.td, styles.tdNumeric, styles.actions) podem adicionar text-align, display flex etc.
  return <td className={classNames("px-4 py-3", className)}>{children}</td>;
}