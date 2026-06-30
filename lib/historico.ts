// ---------------------------------------------------------------------------
// Histórico mês a mês: simula a caixinha PARA FRENTE usando o CDI diário real
// (compõe dia útil a dia útil) e compara cada mês com o IPCA real do mês.
//
// Aportes entram como uma LISTA { data, valor } — cobre os três casos:
//   - único:    lista vazia (só o valorInicial na criação).
//   - fixo:     mesmo valor em todo mês (a rota gera a lista).
//   - variável: valor e dia próprios por mês (a rota monta a lista).
//
// Mês a mês compara BRUTO (CDI) vs IPCA. IR/IOF entram só no resumo (resgate).
// ---------------------------------------------------------------------------

import { aliquotaIof, aliquotaIr, faixaIr, rendimentoReal } from "./rdb";

export interface MesHistorico {
  mes: string; // "YYYY-MM"
  rotulo: string; // "dez/25"
  parcial: boolean; // mês incompleto (primeiro/último)
  saldoInicio: number;
  aportes: number;
  rendimento: number; // R$ no mês
  ganhoDiario: number; // R$ médio por dia útil no mês
  saldoFim: number;
  cdiPct: number; // taxa do CDI no mês (decimal)
  ipcaPct: number | null; // IPCA do mês (null = ainda não divulgado)
  realPct: number | null; // Fisher(cdi, ipca) — só em mês cheio com IPCA
  acima: boolean | null;
  diasUteis: number;
}

export interface ResumoHistorico {
  modalidade: "unico" | "mensal";
  totalAportado: number;
  saldoBruto: number;
  rendimentoBruto: number;
  iof: number;
  ir: number;
  rendimentoLiquido: number;
  valorLiquidoResgate: number;
  totalCorrigidoIpca: number; // aportes corrigidos pela inflação
  ganhoReal: number; // saldo bruto - aportes corrigidos
  acimaDaInflacao: boolean;
  diasCorridos: number;
  irAliquota: number; // alíquota de IR pela faixa do período (ex.: 0.225)
  irFaixa: string; // descrição da faixa (ex.: "até 180 dias")
  iofAplicavel: boolean; // true se ainda incide IOF (< 30 dias)
  iofFracao: number; // fração de IOF sobre o rendimento (0 se isento)
  cdi: number;
  ipca: number;
  cdiData: string;
  ipcaRef: string;
}

export interface Historico {
  meses: MesHistorico[];
  resumo: ResumoHistorico;
}

export interface ParamsHistorico {
  valorInicial: number;
  aportes: { data: Date; valor: number }[]; // aportes mensais (qualquer data/valor)
  inicio: Date;
  hoje: Date;
  fatores: { data: Date; fator: number }[]; // CDI diário
  ipca: Map<string, number>; // "YYYY-MM" -> decimal
  macro: { cdi: number; ipca: number; cdiData: string; ipcaRef: string };
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const UM_DIA = 86_400_000;
const keyDay = (d: Date) => d.toISOString().slice(0, 10);
const monthKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
const rotuloMes = (k: string) => {
  const [y, m] = k.split("-");
  return `${MESES[+m - 1]}/${y.slice(2)}`;
};
const ultimoDiaMes = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

export function simularHistorico(p: ParamsHistorico): Historico {
  const fatorMap = new Map(p.fatores.map((f) => [keyDay(f.data), f.fator]));

  // Aportes válidos: data em [inicio, hoje] — INCLUI o mês de início.
  const validos = p.aportes.filter(
    (a) =>
      a.valor > 0 &&
      a.data.getTime() >= p.inicio.getTime() &&
      a.data.getTime() <= p.hoje.getTime(),
  );
  const aporteMap = new Map<string, number>();
  let somaAportes = 0;
  for (const a of validos) {
    const k = keyDay(a.data);
    aporteMap.set(k, (aporteMap.get(k) ?? 0) + a.valor);
    somaAportes += a.valor;
  }

  let saldo = p.valorInicial;
  const meses: MesHistorico[] = [];

  const inicioMK = monthKey(p.inicio);
  const hojeMK = monthKey(p.hoje);
  let curMonth = inicioMK;
  let saldoInicioMes = p.valorInicial;
  let aportesMes = 0;
  let duMes = 0;
  let cdiFatorMes = 1;

  const fechar = (mk: string) => {
    const rendimento = saldo - saldoInicioMes - aportesMes;
    const cdiPct = cdiFatorMes - 1;
    const ipcaPct = p.ipca.has(mk) ? p.ipca.get(mk)! : null;
    const parcial =
      (mk === inicioMK && p.inicio.getUTCDate() !== 1) ||
      (mk === hojeMK &&
        p.hoje.getUTCDate() !== ultimoDiaMes(p.hoje.getUTCFullYear(), p.hoje.getUTCMonth()));
    const realPct = ipcaPct !== null && !parcial ? rendimentoReal(cdiPct, ipcaPct) : null;
    meses.push({
      mes: mk,
      rotulo: rotuloMes(mk),
      parcial,
      saldoInicio: saldoInicioMes,
      aportes: aportesMes,
      rendimento,
      ganhoDiario: duMes ? rendimento / duMes : 0,
      saldoFim: saldo,
      cdiPct,
      ipcaPct,
      realPct,
      acima: realPct === null ? null : realPct >= 0,
      diasUteis: duMes,
    });
  };

  // Começa no próprio dia de início: o dia do aporte não rende (só a partir do
  // dia seguinte), mas um aporte lançado no mês de início já entra e é contado.
  for (let t = p.inicio.getTime(); t <= p.hoje.getTime(); t += UM_DIA) {
    const d = new Date(t);
    const mk = monthKey(d);
    if (mk !== curMonth) {
      fechar(curMonth);
      curMonth = mk;
      saldoInicioMes = saldo;
      aportesMes = 0;
      duMes = 0;
      cdiFatorMes = 1;
    }
    const dk = keyDay(d);
    if (t > p.inicio.getTime()) {
      const f = fatorMap.get(dk);
      if (f !== undefined) {
        saldo *= f;
        cdiFatorMes *= f;
        duMes += 1;
      }
    }
    const ap = aporteMap.get(dk);
    if (ap !== undefined) {
      saldo += ap;
      aportesMes += ap;
    }
  }
  fechar(curMonth);

  // ---- resumo (IR/IOF no resgate de hoje) ----
  const diasCorridos = Math.round((p.hoje.getTime() - p.inicio.getTime()) / UM_DIA);
  const totalAportado = p.valorInicial + somaAportes;
  const saldoBruto = saldo;
  const rendimentoBruto = saldoBruto - totalAportado;
  const iofFrac = aliquotaIof(diasCorridos);
  const irAliq = aliquotaIr(diasCorridos);
  const iof = rendimentoBruto * iofFrac;
  const ir = (rendimentoBruto - iof) * irAliq;
  const rendimentoLiquido = rendimentoBruto - iof - ir;
  const valorLiquidoResgate = saldoBruto - iof - ir;

  // Correção pela inflação: cada aporte sofre o IPCA dos meses POSTERIORES.
  const mesesIpca = [...p.ipca.keys()].sort();
  const corrigir = (mkAporte: string) => {
    let f = 1;
    for (const mk of mesesIpca) if (mk > mkAporte) f *= 1 + p.ipca.get(mk)!;
    return f;
  };
  let totalCorrigido = p.valorInicial * corrigir(inicioMK);
  for (const a of validos) totalCorrigido += a.valor * corrigir(monthKey(a.data));

  const ganhoReal = saldoBruto - totalCorrigido;

  return {
    meses,
    resumo: {
      modalidade: somaAportes > 0 ? "mensal" : "unico",
      totalAportado,
      saldoBruto,
      rendimentoBruto,
      iof,
      ir,
      rendimentoLiquido,
      valorLiquidoResgate,
      totalCorrigidoIpca: totalCorrigido,
      ganhoReal,
      acimaDaInflacao: ganhoReal >= 0,
      diasCorridos,
      irAliquota: irAliq,
      irFaixa: faixaIr(diasCorridos),
      iofAplicavel: iofFrac > 0,
      iofFracao: iofFrac,
      cdi: p.macro.cdi,
      ipca: p.macro.ipca,
      cdiData: p.macro.cdiData,
      ipcaRef: p.macro.ipcaRef,
    },
  };
}
