export const brl = (x: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(x);

export const pct = (x: number, d = 2) =>
  (x * 100).toFixed(d).replace(".", ",") + "%";
