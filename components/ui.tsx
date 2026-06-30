import type { ReactNode } from "react";

export function Linha({
  rot,
  children,
  forte,
  sub,
}: {
  rot: ReactNode;
  children: ReactNode;
  forte?: boolean;
  sub?: boolean;
}) {
  return (
    <div className={`linha${forte ? " forte" : ""}${sub ? " sub" : ""}`}>
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
