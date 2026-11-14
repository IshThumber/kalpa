import type { ReactNode } from "react";

export function Icon({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span aria-hidden="true" className={`icon ${className}`}>
      {children}
    </span>
  );
}
export const WalletIcon = () => <Icon>▣</Icon>;
export const ChartIcon = () => <Icon>↗</Icon>;
export const PeopleIcon = () => <Icon>♧</Icon>;
export const ReceiptIcon = () => <Icon>₹</Icon>;
