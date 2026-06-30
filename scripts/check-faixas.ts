// Confere as faixas de IR/IOF por nº de dias (funções puras, sem rede).
import { aliquotaIof, aliquotaIr, faixaIr } from "../lib/rdb";

for (const d of [8, 25, 29, 30, 153, 200, 400, 800]) {
  const iof = aliquotaIof(d);
  const iofTxt = iof > 0 ? `${(iof * 100).toFixed(0)}% (incide, faltam ${30 - d}d)` : "isento";
  console.log(`${String(d).padStart(3)} dias -> IR ${(aliquotaIr(d) * 100).toFixed(1)}% (${faixaIr(d).padEnd(16)}) | IOF ${iofTxt}`);
}
