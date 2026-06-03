import type { ReactNode } from "react";
import {
  adminTableClass,
  adminTableHeadRowClass,
  adminTableWrapClass,
  adminThClass,
} from "../lib/adminUi";

export function AdminTableWrap({ children }: { children: ReactNode }) {
  return <div className={adminTableWrapClass}>{children}</div>;
}

export function AdminTable({
  children,
  minWidth = "720px",
}: {
  children: ReactNode;
  minWidth?: string;
}) {
  return (
    <table className={adminTableClass} style={{ minWidth }}>
      {children}
    </table>
  );
}

export function AdminTableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className={adminTableHeadRowClass}>{children}</tr>
    </thead>
  );
}

export function AdminTh({
  children = null,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return <th className={`${adminThClass} ${className}`.trim()}>{children}</th>;
}
