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

// Piso: início do Plano Real. Antes disso o país usava outra moeda (cruzeiro/
// cruzado) e a inflação era de outra ordem — simular "100% do CDI" não faz sentido.
const DATA_MIN = new Date(Date.UTC(1994, 6, 1)); // 01/07/1994

/** Valida a data de início do cálculo. Retorna a mensagem de erro ou null se ok. */
function validarInicio(inicio: Date, hoje: Date): string | null {
  if (Number.isNaN(inicio.getTime())) {
    return "Data inválida. Use o seletor de data para escolher o dia do aporte.";
  }
  if (inicio.getTime() > hoje.getTime()) {
    return "A data de início está no futuro. Escolha o dia em que você realmente investiu — hoje ou antes.";
  }
  if (inicio.getTime() === hoje.getTime()) {
    return "Você escolheu a data de hoje. O rendimento só começa a contar no primeiro dia útil após o aporte, então ainda não há nada a mostrar para hoje. Selecione uma data anterior.";
  }
  if (inicio.getTime() < DATA_MIN.getTime()) {
    return "Use uma data a partir de 01/07/1994 (início do Real). Antes disso o Brasil usava outra moeda, então o cálculo não faz sentido.";
  }
  return null;
}

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
      const erroData = validarInicio(inicio, hoje);
      if (erroData) return NextResponse.json({ erro: erroData }, { status: 400 });
    } else {
      valorInicial = parseValorOpcional(String(body.valorInicial ?? ""));
      inicio = parseDataISO(String(body.inicio ?? ""));
      const erroData = validarInicio(inicio, hoje);
      if (erroData) return NextResponse.json({ erro: erroData }, { status: 400 });
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
  // `obterMacro` usa o último valor (sempre disponível): serve de sonda. Se ele
  // falhar, o BC está realmente fora do ar. Se ele responde mas as séries do
  // período vêm vazias, o problema é a data escolhida — não o BC.
  if (!macro) {
    return NextResponse.json(
      {
        offline: true,
        erro: "O Banco Central está fora do ar no momento. Os dados de CDI e IPCA vêm direto do BC — tente novamente em alguns minutos.",
      },
      { status: 503 },
    );
  }
  if (!fatores || fatores.length === 0 || !ipca || ipca.size === 0) {
    return NextResponse.json(
      {
        erro: "Não encontramos cotações do Banco Central para esse período. A data pode ser muito recente (sem dia útil fechado ainda) ou cair em feriado/fim de semana sem cotação. Tente uma data um pouco anterior.",
      },
      { status: 422 },
    );
  }

  const h = simularHistorico({ valorInicial, aportes, inicio, hoje, fatores, ipca, macro });
  return NextResponse.json({
    ...h,
    entrada: { inicio: fmtBR(inicio), hoje: fmtBR(hoje), modalidade },
  });
}
