// components/ui/table.jsx
import React from "react";

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function Table({ children, className, tableClassName }) { // className para o div, tableClassName para a <table>
  return (
    <div className={classNames("tableContainerDefaultFromUi", className)}> 
      <table className={classNames("tableDefaultFromUi", tableClassName)}> 
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className }) {
  return <thead className={className}>{children}</thead>;
}

export function TableBody({ children, className }) {
  return <tbody className={className || ''}>{children}</tbody>;
}

export function TableRow({ children, className }) {
  return <tr className={className}>{children}</tr>;
}

export function TableHead({ children, className }) {
  return <th className={className}>{children}</th>;
}

export function TableCell({ children, className }) {
  return <td className={className}>{children}</td>;
}