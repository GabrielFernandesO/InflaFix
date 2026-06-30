// ---------------------------------------------------------------------------
// Acesso ao Banco Central (SGS) — roda no SERVIDOR (route handlers).
// Resiliência: cache em memória + retry + fallback para o último valor bom.
// "BC offline" só se o BC estiver fora E sem nada recente em cache.
// Séries: CDI anualizado/diário = 4389 | IPCA 12m = 13522 | IPCA mensal = 433.
// ---------------------------------------------------------------------------

const SGS_CDI = 4389;
const SGS_IPCA_12M = 13522;
const BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

export interface Macro {
  cdi: number; // decimal, ex.: 0.1415
  ipca: number; // decimal, ex.: 0.0472
  cdiData: string; // data de referência do CDI (dd/mm/aaaa)
  ipcaRef: string; // mês de referência do IPCA (mm/aaaa)
}

const refMes = (data: string): string => {
  const p = data.split("/");
  return p.length === 3 ? `${p[1]}/${p[2]}` : data;
};

// Cache em memória (por instância do servidor) + retry. Evita martelar o BC,
// sobrevive a 503 transitórios e, em último caso, devolve o último valor bom
// (mesmo vencido) em vez de "offline".
interface CacheEntry {
  valor: unknown;
  exp: number;
}
const _cache = new Map<string, CacheEntry>();

const TTL_ULTIMO = 30 * 60_000; // 30 min (CDI/IPCA atuais)
const TTL_SERIE = 60 * 60_000; // 1 h (séries por período)

async function buscarJson(url: string, ttlMs: number): Promise<unknown | null> {
  const agora = Date.now();
  const cached = _cache.get(url);
  if (cached && cached.exp > agora) return cached.valor;

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    if (tentativa > 0) await new Promise((r) => setTimeout(r, 250 * tentativa));
    try {
      const resp = await fetch(url, { cache: "no-store" });
      if (resp.ok) {
        const data = await resp.json();
        _cache.set(url, { valor: data, exp: agora + ttlMs });
        return data;
      }
    } catch {
      /* tenta de novo */
    }
  }
  return cached ? cached.valor : null; // fallback: último valor bom (vencido)
}

async function buscarSgs(
  codigo: number,
): Promise<{ valor: number; data: string } | null> {
  const data = await buscarJson(
    `${BASE}.${codigo}/dados/ultimos/1?formato=json`,
    TTL_ULTIMO,
  );
  if (!Array.isArray(data) || data.length === 0) return null;
  const item = data[data.length - 1];
  const valor = parseFloat(String(item.valor).replace(",", ".")) / 100;
  if (!Number.isFinite(valor)) return null;
  return { valor, data: String(item.data) };
}

/** CDI e IPCA (12m) ao vivo. Retorna null se qualquer série falhar. */
export async function obterMacro(): Promise<Macro | null> {
  const [cdi, ipca] = await Promise.all([
    buscarSgs(SGS_CDI),
    buscarSgs(SGS_IPCA_12M),
  ]);
  if (!cdi || !ipca) return null;
  return {
    cdi: cdi.valor,
    ipca: ipca.valor,
    cdiData: cdi.data,
    ipcaRef: refMes(ipca.data),
  };
}

// ----- Datas (sempre UTC à meia-noite, no fuso do Brasil) ------------------ //

/** Hoje no fuso America/Sao_Paulo, como Date em UTC-meia-noite. */
export function hojeSaoPaulo(): Date {
  const iso = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  }); // "YYYY-MM-DD"
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Converte "YYYY-MM-DD" (input date) para Date UTC-meia-noite. */
export function parseDataISO(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim());
  if (!m) throw new Error("data inválida (use o seletor de data)");
  const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (isNaN(dt.getTime())) throw new Error("data inválida");
  return dt;
}

/** Date -> "dd/mm/aaaa" (formato que o SGS espera e que exibimos). */
export function fmtBR(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

const parseBC = (s: string): Date => {
  const [dd, mm, yy] = s.split("/").map(Number);
  return new Date(Date.UTC(yy, mm - 1, dd));
};

/**
 * Dias úteis com rendimento entre `inicio` e `fim`, contados pela série diária
 * do CDI (publicada só em dia útil). O dia do aporte não rende -> conta os dias
 * úteis APÓS `inicio`. Retorna null se a API falhar (chamador estima 252/365).
 */
export async function contarDiasUteisBc(
  inicio: Date,
  fim: Date,
): Promise<number | null> {
  const url =
    `${BASE}.${SGS_CDI}/dados?formato=json` +
    `&dataInicial=${fmtBR(inicio)}&dataFinal=${fmtBR(fim)}`;
  const data = await buscarJson(url, TTL_SERIE);
  if (!Array.isArray(data)) return null;
  return (data as { data: string }[]).filter(
    (x) => parseBC(String(x.data)).getTime() > inicio.getTime(),
  ).length;
}

// --------------------------------------------------------------------------- //
// Histórico mês a mês: CDI diário (fatores) e IPCA mensal, ambos do BC.
// --------------------------------------------------------------------------- //

const SGS_IPCA_MES = 433; // IPCA - variação mensal (%)

const primeiroDiaMes = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

/** Fatores diários do CDI (um por dia útil) no período: (1 + CDI_a.a.)^(1/252). */
export async function cdiDiarioFatores(
  inicio: Date,
  fim: Date,
): Promise<{ data: Date; fator: number }[] | null> {
  const url =
    `${BASE}.${SGS_CDI}/dados?formato=json` +
    `&dataInicial=${fmtBR(inicio)}&dataFinal=${fmtBR(fim)}`;
  const data = await buscarJson(url, TTL_SERIE);
  if (!Array.isArray(data)) return null;
  return (data as { data: string; valor: string }[]).map((x) => {
    const anual = parseFloat(String(x.valor).replace(",", ".")) / 100;
    return { data: parseBC(String(x.data)), fator: (1 + anual) ** (1 / 252) };
  });
}

/** IPCA mensal (decimal) por mês "YYYY-MM" no período. */
export async function ipcaMensal(
  inicio: Date,
  fim: Date,
): Promise<Map<string, number> | null> {
  const url =
    `${BASE}.${SGS_IPCA_MES}/dados?formato=json` +
    `&dataInicial=${fmtBR(primeiroDiaMes(inicio))}&dataFinal=${fmtBR(fim)}`;
  const data = await buscarJson(url, TTL_SERIE);
  if (!Array.isArray(data)) return null;
  const m = new Map<string, number>();
  for (const x of data as { data: string; valor: string }[]) {
    const d = parseBC(String(x.data));
    const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    m.set(k, parseFloat(String(x.valor).replace(",", ".")) / 100);
  }
  return m;
}
