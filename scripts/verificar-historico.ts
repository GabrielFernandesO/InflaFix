// Confere o motor mês a mês contra as séries reais do BC.
// Aporte único de R$ 10.000, meses CHEIOS dez/2025..mai/2026.
// Esperado (série 4391 CDI no mês): 1,22 / 1,16 / 1,00 / 1,21 / 1,09 / 1,07 %
// e saldo final ~ R$ 10.694.  Rode: npx tsx scripts/verificar-historico.ts
import { cdiDiarioFatores, ipcaMensal } from "../lib/bcb";
import { simularHistorico } from "../lib/historico";

async function main() {
  // Início em 30/11 (não rende no dia do aporte) => dezembro é mês CHEIO.
  const inicio = new Date(Date.UTC(2025, 10, 30)); // 30/11/2025
  const hoje = new Date(Date.UTC(2026, 4, 31)); // 31/05/2026

  const fatores = await cdiDiarioFatores(inicio, hoje);
  const ipca = await ipcaMensal(inicio, hoje);
  if (!fatores || !ipca) {
    console.log("BC offline — não foi possível testar.");
    process.exit(1);
  }

  const h = simularHistorico({
    valorInicial: 10000,
    aportes: [],
    inicio,
    hoje,
    fatores,
    ipca,
    macro: { cdi: 0.1415, ipca: 0.0472, cdiData: "-", ipcaRef: "-" },
  });

  console.table(
    h.meses.map((m) => ({
      mes: m.rotulo,
      "CDI %": (m.cdiPct * 100).toFixed(2),
      "IPCA %": m.ipcaPct !== null ? (m.ipcaPct * 100).toFixed(2) : "-",
      "rend R$": m.rendimento.toFixed(2),
      "saldo fim": m.saldoFim.toFixed(2),
      bateu: m.acima,
    })),
  );

  const cdiEsperado = [1.22, 1.16, 1.0, 1.21, 1.09, 1.07]; // série 4391, dez..mai
  const cheios = h.meses.filter((m) => !m.parcial);
  let ok = cheios.length === cdiEsperado.length;
  cheios.forEach((m, i) => {
    if (Math.abs(m.cdiPct * 100 - cdiEsperado[i]) > 0.03) ok = false;
  });
  const saldoOk = Math.abs(h.resumo.saldoBruto - 10694) < 5;

  console.log("\nSaldo bruto :", h.resumo.saldoBruto.toFixed(2), "(esperado ~10694)");
  console.log("Total aportado :", h.resumo.totalAportado.toFixed(2));
  console.log("Ganho real vs inflação :", h.resumo.ganhoReal.toFixed(2));
  console.log("Acima da inflação :", h.resumo.acimaDaInflacao);
  console.log(
    ok && saldoOk
      ? "\n✅ CDI diário compõe igual à série mensal 4391 do BC."
      : "\n❌ Divergência com as séries do BC.",
  );
  process.exit(ok && saldoOk ? 0 : 1);
}

main();
