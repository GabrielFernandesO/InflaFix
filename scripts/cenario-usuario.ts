// Cenário real do usuário (Caixinha Nubank) para validar o cálculo.
import { cdiDiarioFatores, hojeSaoPaulo, ipcaMensal } from "../lib/bcb";
import { simularHistorico } from "../lib/historico";

async function main() {
  const inicio = new Date(Date.UTC(2026, 0, 26)); // 26/01/2026
  const hoje = hojeSaoPaulo();

  const fatores = await cdiDiarioFatores(inicio, hoje);
  const ipca = await ipcaMensal(inicio, hoje);
  if (!fatores || !ipca) {
    console.log("BC offline");
    process.exit(1);
  }

  const ap = (y: number, m: number, d: number, v: number) => ({
    data: new Date(Date.UTC(y, m - 1, d)),
    valor: v,
  });
  const aportes = [
    ap(2026, 1, 26, 3500), // início
    ap(2026, 2, 4, 3266),
    ap(2026, 2, 4, 400), // mesmo dia
    ap(2026, 3, 9, 400),
    ap(2026, 4, 7, 400),
    ap(2026, 4, 9, 500),
    ap(2026, 5, 4, 500),
    ap(2026, 6, 5, 500),
  ];

  const h = simularHistorico({
    valorInicial: 0,
    aportes,
    inicio,
    hoje,
    fatores,
    ipca,
    macro: { cdi: 0, ipca: 0, cdiData: "-", ipcaRef: "-" },
  });

  console.table(
    h.meses.map((m) => ({
      mes: m.rotulo,
      aporte: m.aportes.toFixed(2),
      "CDI%": (m.cdiPct * 100).toFixed(2),
      rend: m.rendimento.toFixed(2),
      saldoFim: m.saldoFim.toFixed(2),
    })),
  );
  console.log("hoje                :", hoje.toISOString().slice(0, 10));
  console.log("total aportado      : R$", h.resumo.totalAportado.toFixed(2));
  console.log("SALDO BRUTO HOJE    : R$", h.resumo.saldoBruto.toFixed(2));
  console.log("rendimento bruto    : R$", h.resumo.rendimentoBruto.toFixed(2));
  console.log("se sacar hoje (líq) : R$", h.resumo.valorLiquidoResgate.toFixed(2));
}

main();
