import { NextResponse } from "next/server";
import {
  cdiDiarioFatores,
  fmtBR,
  hojeSaoPaulo,
  ipcaMensal,
  obterMacro,
  parseDataISO,
} from "@/lib/bcb";
import { parseValorOpcional } from "@/lib/rdb";
import { simularHistorico } from "@/lib/historico";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ultimoDia = (y: number, m0: number) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
const clampDia = (n: number) => (Number.isFinite(n) ? Math.min(31, Math.max(1, n)) : 1);

export async function POST(req: Request) {
  let body: {
    modalidade?: unknown;
    valorInicial?: unknown;
    inicio?: unknown;
    aporteMensal?: unknown;
    diaAporte?: unknown;
    aportes?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const modalidade = String(body.modalidade ?? "unico");
  const hoje = hojeSaoPaulo();
  const aportes: { data: Date; valor: number }[] = [];
  let valorInicial = 0;
  let inicio: Date = hoje;

  try {
    if (modalidade === "variavel") {
      // Lista livre de aportes { data, valor } — vários no mesmo dia somam.
      // O INÍCIO é o aporte mais antigo: conta vazia não rende nem paga imposto,
      // então a data de "abertura" sem dinheiro é irrelevante.
      const lista: unknown[] = Array.isArray(body.aportes) ? body.aportes : [];
      for (const itRaw of lista) {
        const it = itRaw as { data?: unknown; valor?: unknown };
        const valor = parseValorOpcional(String(it.valor ?? ""));
        if (valor <= 0) continue;
        let data: Date;
        try {
          data = parseDataISO(String(it.data ?? ""));
        } catch {
          continue;
        }
        if (data.getTime() > hoje.getTime()) continue; // ignora datas futuras
        aportes.push({ data, valor });
      }
      if (aportes.length === 0) {
        return NextResponse.json(
          { erro: "informe ao menos um aporte com data e valor" },
          { status: 400 },
        );
      }
      inicio = new Date(Math.min(...aportes.map((a) => a.data.getTime())));
    } else {
      valorInicial = parseValorOpcional(String(body.valorInicial ?? ""));
      inicio = parseDataISO(String(body.inicio ?? ""));
      if (inicio.getTime() > hoje.getTime()) {
        return NextResponse.json(
          { erro: "a data de início não pode estar no futuro" },
          { status: 400 },
        );
      }
      if (modalidade === "fixo") {
        const valor = parseValorOpcional(String(body.aporteMensal ?? ""));
        const dia = clampDia(parseInt(String(body.diaAporte ?? "1"), 10));
        if (valor > 0) {
          let y = inicio.getUTCFullYear();
          let m = inicio.getUTCMonth();
          for (;;) {
            const dt = new Date(Date.UTC(y, m, Math.min(dia, ultimoDia(y, m))));
            if (dt.getTime() > hoje.getTime()) break;
            aportes.push({ data: dt, valor });
            m += 1;
            if (m > 11) {
              m = 0;
              y += 1;
            }
          }
        }
      }
      if (valorInicial <= 0 && aportes.length === 0) {
        return NextResponse.json(
          { erro: "informe um aporte inicial e/ou aportes mensais" },
          { status: 400 },
        );
      }
    }
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 400 });
  }

  const [macro, fatores, ipca] = await Promise.all([
    obterMacro(),
    cdiDiarioFatores(inicio, hoje),
    ipcaMensal(inicio, hoje),
  ]);
  if (!macro || !fatores || !ipca) {
    return NextResponse.json(
      { offline: true, erro: "BC offline — sem dados do Banco Central" },
      { status: 503 },
    );
  }

  const h = simularHistorico({ valorInicial, aportes, inicio, hoje, fatores, ipca, macro });
  return NextResponse.json({
    ...h,
    entrada: { inicio: fmtBR(inicio), hoje: fmtBR(hoje), modalidade },
  });
}
