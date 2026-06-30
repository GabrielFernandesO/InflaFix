// ---------------------------------------------------------------------------
// Lógica financeira do RDB (Caixinha Nubank) — porte fiel de calc_rdb.py.
// Funções PURAS (sem I/O): mesmas fórmulas, mesmos números do CLI em Python.
// Todas as taxas em DECIMAL: 0.1415 = 14,15%.
// ---------------------------------------------------------------------------

export const DIAS_UTEIS_ANO = 252;
export const DIAS_CORRIDOS_ANO = 365;

// IR regressivo da renda fixa: [limite superior em dias corridos, alíquota]
const TABELA_IR: [number, number][] = [
  [180, 0.225],
  [360, 0.2],
  [720, 0.175],
  [Infinity, 0.15],
];

// IOF regressivo: dias corridos -> fração do RENDIMENTO retida (< 30 dias).
const IOF_REGRESSIVO: Record<number, number> = {
  1: 0.96, 2: 0.93, 3: 0.9, 4: 0.86, 5: 0.83, 6: 0.8, 7: 0.76, 8: 0.73,
  9: 0.7, 10: 0.66, 11: 0.63, 12: 0.6, 13: 0.56, 14: 0.53, 15: 0.5, 16: 0.46,
  17: 0.43, 18: 0.4, 19: 0.36, 20: 0.33, 21: 0.3, 22: 0.26, 23: 0.23, 24: 0.2,
  25: 0.16, 26: 0.13, 27: 0.1, 28: 0.06, 29: 0.03,
};

export function aliquotaIr(diasCorridos: number): number {
  for (const [limite, aliq] of TABELA_IR) if (diasCorridos <= limite) return aliq;
  return 0.15;
}

export function faixaIr(diasCorridos: number): string {
  if (diasCorridos <= 180) return "até 180 dias";
  if (diasCorridos <= 360) return "181 a 360 dias";
  if (diasCorridos <= 720) return "361 a 720 dias";
  return "acima de 720 dias";
}

export function aliquotaIof(diasCorridos: number): number {
  if (diasCorridos >= 30) return 0;
  return IOF_REGRESSIVO[diasCorridos] ?? 0;
}

/** Juros reais pela fórmula de Fisher (jeito CERTO de descontar a inflação). */
export function rendimentoReal(taxaLiquida: number, inflacao: number): number {
  return (1 + taxaLiquida) / (1 + inflacao) - 1;
}

// --------------------------------------------------------------------------- //
// 1) Comparação anualizada em % ("estou acima da inflação?")
// --------------------------------------------------------------------------- //

export interface ComparacaoAnual {
  rendimentoBruto: number;
  aliquotaIr: number;
  rendimentoLiquido: number;
  inflacao: number;
  rendimentoReal: number;
  acimaDaInflacao: boolean;
}

export function compararComInflacao(
  cdiAnual: number,
  ipcaAnual: number,
  pctCdi = 1,
  diasAplicados = 730,
): ComparacaoAnual {
  const bruto = pctCdi * cdiAnual;
  const ir = aliquotaIr(diasAplicados);
  const liquido = bruto * (1 - ir);
  const real = rendimentoReal(liquido, ipcaAnual);
  return {
    rendimentoBruto: bruto,
    aliquotaIr: ir,
    rendimentoLiquido: liquido,
    inflacao: ipcaAnual,
    rendimentoReal: real,
    acimaDaInflacao: real >= 0,
  };
}

// --------------------------------------------------------------------------- //
// 2) Decomposição do SALDO atual (aporte + rendimento já acumulado)
// --------------------------------------------------------------------------- //

export interface SaldoAtual {
  saldoBruto: number;
  diasCorridos: number;
  diasUteis: number;
  aporteInicial: number;
  rendimentoBruto: number;
  iof: number;
  ir: number;
  rendimentoLiquido: number;
  valorLiquidoResgate: number;
  inflacaoPeriodo: number;
  valorCorrigidoIpca: number;
  ganhoReal: number;
  acimaDaInflacao: boolean;
}

export function analisarSaldoAtual(
  saldoBruto: number,
  diasCorridos: number,
  cdiAnual: number,
  ipcaAnual: number,
  pctCdi = 1,
  diasUteis: number | null = null,
): SaldoAtual {
  const du =
    diasUteis ?? Math.round((diasCorridos * DIAS_UTEIS_ANO) / DIAS_CORRIDOS_ANO);

  const taxaAnual = pctCdi * cdiAnual;
  const fatorBruto = (1 + taxaAnual) ** (du / DIAS_UTEIS_ANO);
  const aporteInicial = saldoBruto / fatorBruto;
  const rendimentoBruto = saldoBruto - aporteInicial;

  const iof = rendimentoBruto * aliquotaIof(diasCorridos);
  const ir = (rendimentoBruto - iof) * aliquotaIr(diasCorridos);
  const rendimentoLiquido = rendimentoBruto - iof - ir;
  const valorLiquidoResgate = saldoBruto - iof - ir;

  const taxaLiqPeriodo = aporteInicial ? rendimentoLiquido / aporteInicial : 0;
  const inflacaoPeriodo =
    (1 + ipcaAnual) ** (diasCorridos / DIAS_CORRIDOS_ANO) - 1;
  const valorCorrigidoIpca = aporteInicial * (1 + inflacaoPeriodo);
  const realPeriodo = rendimentoReal(taxaLiqPeriodo, inflacaoPeriodo);
  const ganhoReal = aporteInicial * realPeriodo;

  return {
    saldoBruto,
    diasCorridos,
    diasUteis: du,
    aporteInicial,
    rendimentoBruto,
    iof,
    ir,
    rendimentoLiquido,
    valorLiquidoResgate,
    inflacaoPeriodo,
    valorCorrigidoIpca,
    ganhoReal,
    acimaDaInflacao: realPeriodo >= 0,
  };
}

// --------------------------------------------------------------------------- //
// 3) Ritmo de ganho (por dia útil e por mês, daqui para frente)
// --------------------------------------------------------------------------- //

export interface Ritmo {
  cdiDiaUtil: number;
  cdiMes: number;
  ipcaMes: number;
  ir: number;
  ganhoDiaUtilBruto: number;
  ganhoDiaUtilLiquido: number;
  ganhoMesBruto: number;
  ganhoMesLiquido: number;
  inflacaoMes: number;
  ganhoRealMes: number;
}

export function calcularRitmo(
  valor: number,
  cdiAnual: number,
  ipcaAnual: number,
  ir: number,
  pctCdi = 1,
): Ritmo {
  const taxaAnual = pctCdi * cdiAnual;
  const cdiDia = (1 + taxaAnual) ** (1 / DIAS_UTEIS_ANO) - 1;
  const cdiMes = (1 + taxaAnual) ** (1 / 12) - 1;
  const ipcaMes = (1 + ipcaAnual) ** (1 / 12) - 1;

  const gDiaBruto = valor * cdiDia;
  const gMesBruto = valor * cdiMes;
  const realMes = rendimentoReal(cdiMes * (1 - ir), ipcaMes);

  return {
    cdiDiaUtil: cdiDia,
    cdiMes,
    ipcaMes,
    ir,
    ganhoDiaUtilBruto: gDiaBruto,
    ganhoDiaUtilLiquido: gDiaBruto * (1 - ir),
    ganhoMesBruto: gMesBruto,
    ganhoMesLiquido: gMesBruto * (1 - ir),
    inflacaoMes: valor * ipcaMes,
    ganhoRealMes: valor * realMes,
  };
}

// --------------------------------------------------------------------------- //
// Entrada: parse tolerante do montante (igual ao _parse_valor do Python)
// --------------------------------------------------------------------------- //

export function parseValor(texto: string): number {
  let s = texto.trim().replace(/R\$/gi, "").replace(/\s/g, "");
  if (!s) throw new Error("informe o montante");
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if ((s.match(/\./g) || []).length > 1) {
    s = s.replace(/\./g, "");
  } else if (s.includes(".")) {
    const i = s.indexOf(".");
    if (s.slice(i + 1).length === 3) s = s.slice(0, i) + s.slice(i + 1);
  }
  const v = Number(s);
  if (!Number.isFinite(v)) throw new Error("não consegui ler esse número");
  if (v <= 0) throw new Error("o montante precisa ser maior que zero");
  return v;
}

/** Como parseValor, mas aceita vazio (=> 0) e zero. Para aportes opcionais. */
export function parseValorOpcional(texto: string): number {
  const s = texto.trim();
  if (s === "") return 0;
  let t = s.replace(/R\$/gi, "").replace(/\s/g, "");
  if (t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else if ((t.match(/\./g) || []).length > 1) {
    t = t.replace(/\./g, "");
  } else if (t.includes(".")) {
    const i = t.indexOf(".");
    if (t.slice(i + 1).length === 3) t = t.slice(0, i) + t.slice(i + 1);
  }
  const v = Number(t);
  if (!Number.isFinite(v) || v < 0) throw new Error("valor inválido");
  return v;
}
