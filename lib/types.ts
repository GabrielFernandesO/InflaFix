import type { Macro } from "./bcb";
import type { ComparacaoAnual, SaldoAtual, Ritmo } from "./rdb";
import type { Historico } from "./historico";

/** Resposta completa de POST /api/calcular. */
export interface Resultado {
  macro: Macro;
  entrada: {
    valor: number;
    inicio: string; // dd/mm/aaaa
    hoje: string; // dd/mm/aaaa
    diasCorridos: number;
    meses: number;
    diasUteis: number;
    origemDu: "BC" | "estimado";
  };
  ir: { aliquota: number; faixa: string };
  iof: { aplicavel: boolean; fracao: number };
  comparacaoAnual: ComparacaoAnual;
  saldoAtual: SaldoAtual;
  ritmo: Ritmo;
}

export interface RespostaErro {
  erro: string;
  offline?: boolean;
}

/** Resposta completa de POST /api/historico. */
export interface HistoricoResposta extends Historico {
  entrada: {
    inicio: string; // dd/mm/aaaa
    hoje: string; // dd/mm/aaaa
    modalidade: string;
  };
}
