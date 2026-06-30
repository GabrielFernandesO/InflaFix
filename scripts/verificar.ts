// Confere se o porte TypeScript bate com os números do calc_rdb.py (Python).
// Entradas fixas (CDI 14,15% | IPCA 4,72% | 220 dias | 147 dias úteis) para ser
// determinístico. Rode com:  npm run verificar
import { aliquotaIr, analisarSaldoAtual, calcularRitmo } from "../lib/rdb";

const cdi = 0.1415;
const ipca = 0.0472;
const valor = 10000;
const dias = 220;
const du = 147;

const s = analisarSaldoAtual(valor, dias, cdi, ipca, 1, du);
const r = calcularRitmo(valor, cdi, ipca, aliquotaIr(dias), 1);

// Valores de referência produzidos pelo calc_rdb.py (Python).
const esperado: Record<string, number> = {
  aporteInicial: 9257.05,
  rendimentoBruto: 742.95,
  ir: 148.59,
  rendimentoLiquido: 594.36,
  valorLiquidoResgate: 9851.41,
  valorCorrigidoIpca: 9517.99,
  ganhoReal: 324.28,
  ganhoDiaUtilLiquido: 4.2,
  ganhoMesLiquido: 88.72,
};
const obtido: Record<string, number> = {
  aporteInicial: s.aporteInicial,
  rendimentoBruto: s.rendimentoBruto,
  ir: s.ir,
  rendimentoLiquido: s.rendimentoLiquido,
  valorLiquidoResgate: s.valorLiquidoResgate,
  valorCorrigidoIpca: s.valorCorrigidoIpca,
  ganhoReal: s.ganhoReal,
  ganhoDiaUtilLiquido: r.ganhoDiaUtilLiquido,
  ganhoMesLiquido: r.ganhoMesLiquido,
};

let ok = true;
for (const k of Object.keys(esperado)) {
  const diff = Math.abs(esperado[k] - obtido[k]);
  const passou = diff < 0.02;
  if (!passou) ok = false;
  console.log(
    `${passou ? "PASS" : "FALHA"}  ${k.padEnd(20)} TS=${obtido[k].toFixed(2).padStart(10)}  Python=${esperado[k].toFixed(2).padStart(10)}`,
  );
}
console.log(ok ? "\n✅ Porte TS == Python" : "\n❌ Divergência encontrada!");
process.exit(ok ? 0 : 1);
