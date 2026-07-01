import type { ReactNode } from "react";

export function Linha({
  rot,
  children,
  forte,
  sub,
  cls,
}: {
  rot: ReactNode;
  children: ReactNode;
  forte?: boolean;
  sub?: boolean;
  cls?: string;
}) {
  return (
    <div className={`linha${forte ? " forte" : ""}${sub ? " sub" : ""}${cls ? ` ${cls}` : ""}`}>
      <span className="rot">{rot}</span>
      <span className="val">{children}</span>
    </div>
  );
}

export function Badge({ acima }: { acima: boolean }) {
  return acima ? (
    <div className="badge up">▲ Acima da inflação</div>
  ) : (
    <div className="badge down">▼ Abaixo da inflação</div>
  );
}
