"use client";

import { useEffect, useRef, useState } from "react";
import { brl, pct } from "@/lib/format";
import { Badge, Linha } from "@/components/ui";
import type { HistoricoResposta } from "@/lib/types";

type Modalidade = "fixo" | "variavel";

interface Aporte {
  id: number;
  data: string; // YYYY-MM-DD
  valor: string;
}

// Parse leniente só para o total exibido (não lança erro).
function numBR(s: string): number {
  const t = s.trim().replace(/R\$/gi, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const v = Number(t);
  return Number.isFinite(v) ? v : 0;
}

export default function Historico() {
  const [modalidade, setModalidade] = useState<Modalidade>("fixo");
  const [valorInicial, setValorInicial] = useState("");
  const [inicio, setInicio] = useState("");
  const [aporteFixo, setAporteFixo] = useState("");
  const [diaFixo, setDiaFixo] = useState("1");
  const [aportes, setAportes] = useState<Aporte[]>([]);
  const idRef = useRef(1);
  const [res, setRes] = useState<HistoricoResposta | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Hoje (local) em YYYY-MM-DD: limite máximo dos campos de data (sem futuro).
  const hojeISO = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const diaPadrao =
    inicio.length >= 10
      ? String(Math.min(31, Math.max(1, parseInt(inicio.slice(8, 10), 10) || 1)))
      : "1";

  useEffect(() => {
    setDiaFixo(diaPadrao);
  }, [diaPadrao]);

  // No modo avulso, mantém sempre ao menos uma linha de aporte para preencher.
  useEffect(() => {
    if (modalidade === "variavel" && aportes.length === 0) {
      setAportes([{ id: idRef.current++, data: "", valor: "" }]);
    }
  }, [modalidade, aportes.length]);

  function addAporte() {
    // Começa vazio: espera o usuário escolher a data (sem auto-preencher).
    setAportes((prev) => [...prev, { id: idRef.current++, data: "", valor: "" }]);
  }
  function removeAporte(id: number) {
    setAportes((prev) => prev.filter((a) => a.id !== id));
  }
  function setAporte(id: number, campo: "data" | "valor", v: string) {
    setAportes((prev) => prev.map((a) => (a.id === id ? { ...a, [campo]: v } : a)));
  }

  function limpar() {
    setValorInicial("");
    setInicio("");
    setAporteFixo("");
    setAportes([]);
    setRes(null);
    setErro("");
  }

  const totalAportes = aportes.reduce((s, a) => s + numBR(a.valor), 0);

  async function calcular(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const corpo: Record<string, unknown> = {
        modalidade,
        valorInicial: modalidade === "variavel" ? "0" : valorInicial,
        inicio,
      };
      if (modalidade === "fixo") {
        corpo.aporteMensal = aporteFixo;
        corpo.diaAporte = diaFixo;
      }
      if (modalidade === "variavel") {
        corpo.aportes = aportes.map((a) => ({ data: a.data, valor: a.valor }));
      }
      const r = await fetch("/api/historico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro || "erro ao calcular");
      setRes(d as HistoricoResposta);
    } catch (err) {
      setErro((err as Error).message);
      setRes(null);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <div className="cartao">
        <div className="calc-head">
          <h2>Calcule seu ganho real, mês a mês</h2>
          <p>
            Lance seus aportes e veja, com dados reais do Banco Central, se você
            bateu a inflação.
          </p>
        </div>
        <div className="modalidade">
          <button type="button" className={modalidade === "fixo" ? "ativo" : ""} onClick={() => setModalidade("fixo")}>
            Mensal Fixo
          </button>
          <button type="button" className={modalidade === "variavel" ? "ativo" : ""} onClick={() => setModalidade("variavel")}>
            Mensal Variável
          </button>
        </div>

        <p className="dica-modo">
          {modalidade === "fixo" ? (
            <>
              <b>Mensal fixo:</b> você aporta o <b>mesmo valor</b> todo mês.
            </>
          ) : (
            <>
              <b>Mensal variável:</b> para quem investe <b>valores diferentes</b> —
              lance cada aporte com sua data e valor (pode vários no mesmo dia).
            </>
          )}
        </p>

        <form onSubmit={calcular}>
          {modalidade === "fixo" && (
            <div className="form-hist">
              <div>
                <label htmlFor="vi">Aporte inicial (pode ser 0)</label>
                <input
                  id="vi"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="ex.: 10.000,00"
                  value={valorInicial}
                  onChange={(e) => setValorInicial(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="ini">Início da aplicação</label>
                <input id="ini" type="date" max={hojeISO} value={inicio} onChange={(e) => setInicio(e.target.value)} />
              </div>
              <div>
                <label htmlFor="af">Aporte todo mês</label>
                <input
                  id="af"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="ex.: 500,00"
                  value={aporteFixo}
                  onChange={(e) => setAporteFixo(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="df">Dia do aporte</label>
                <input id="df" type="number" min={1} max={31} value={diaFixo} onChange={(e) => setDiaFixo(e.target.value)} />
              </div>
            </div>
          )}

          {modalidade === "variavel" && (
            <div className="ap-list">
              {aportes.map((a, i) => {
                // Trava em cascata: cada aporte não pode ser anterior ao aporte
                // de cima. min = data mais recente já preenchida nas linhas acima.
                const minData = aportes
                  .slice(0, i)
                  .map((x) => x.data)
                  .filter(Boolean)
                  .sort()
                  .pop();
                return (
                <div className="ap-row" key={a.id}>
                  <div className="ap-campo">
                    <label>{i === 0 ? "Data do primeiro aporte" : "Data do aporte"}</label>
                    <input
                      type="date"
                      className="ap-data"
                      min={minData}
                      max={hojeISO}
                      value={a.data}
                      onChange={(e) => setAporte(a.id, "data", e.target.value)}
                    />
                  </div>
                  <div className="ap-campo">
                    <label>Valor</label>
                    <div className="ap-valor">
                      <span className="ap-rs">R$</span>
                      <input
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="0,00"
                        value={a.valor}
                        onChange={(e) => setAporte(a.id, "valor", e.target.value)}
                      />
                    </div>
                  </div>
                  <button type="button" className="rm" onClick={() => removeAporte(a.id)} aria-label="remover aporte">
                    ×
                  </button>
                </div>
                );
              })}
              <button type="button" className="ap-add" onClick={addAporte}>
                + Adicionar aporte
              </button>
              <div className="ap-total">
                <span>Total aportado</span>
                <b>{brl(totalAportes)}</b>
              </div>
            </div>
          )}

          <div className="btn-row">
            <button type="submit" className="btn-calc" disabled={carregando}>
              {carregando ? (
                <span className="btn-loading">
                  <span className="spinner" aria-hidden="true" />
                  Calculando…
                </span>
              ) : (
                "Calcular"
              )}
            </button>
            <button type="button" className="btn-limpar" onClick={limpar}>
              Limpar
            </button>
          </div>
        </form>
        {erro && <div className="erro">⚠ {erro}</div>}
      </div>

      {carregando ? <CarregandoResultado /> : res && <Resultado res={res} />}
    </>
  );
}

function CarregandoResultado() {
  return (
    <div className="cartao carregando-card" role="status" aria-live="polite">
      <div className="carregando-top">
        <span className="spinner spinner-lg" aria-hidden="true" />
        <div className="carregando-txt">
          <b>Calculando seu rendimento…</b>
          <span>Consultando CDI e IPCA reais no Banco Central</span>
        </div>
      </div>
      <div className="skeleton-chips" aria-hidden="true">
        <div className="sk-chip" />
        <div className="sk-chip" />
        <div className="sk-chip" />
        <div className="sk-chip" />
      </div>
    </div>
  );
}

function Veredito({ r }: { r: HistoricoResposta["resumo"] }) {
  const meta = r.totalCorrigidoIpca;
  const brutoDelta = r.saldoBruto - meta;
  const liqDelta = r.valorLiquidoResgate - meta;
  const brutoPct = meta > 0 ? Math.abs(brutoDelta) / meta : 0;
  const liqPct = meta > 0 ? Math.abs(liqDelta) / meta : 0;
  const palavra = (d: number) => (d >= 0 ? "acima" : "abaixo");
  // Ganho/perda real em R$: pelo saldo bruto e pelo que sobra após o IR (líquido).
  const real = (v: number) =>
    v >= 0
      ? { nome: "ganho", val: brl(v) }
      : { nome: "perda", val: brl(Math.abs(v)) };
  const rb = real(brutoDelta);
  const rl = real(liqDelta);

  return (
    <div className={`veredito ${r.acimaDaInflacao ? "up" : "down"}`}>
      <Badge acima={r.acimaDaInflacao} />
      <p>
        Considerando um <b>rendimento bruto de {brl(r.rendimentoBruto)}</b> e um{" "}
        <b>rendimento líquido de {brl(r.rendimentoLiquido)}</b> (já com o IR
        descontado): seu saldo bruto está{" "}
        <b>
          {pct(brutoPct)} {palavra(brutoDelta)}
        </b>{" "}
        da linha de empate com a inflação (<b>{brl(meta)}</b>) e o líquido,{" "}
        {liqDelta >= 0 ? "mesmo após o imposto, " : ""}
        <b>
          {pct(liqPct)} {palavra(liqDelta)}
        </b>
        .{" "}
        Na prática, pelo saldo bruto há um{" "}
        <b>
          {rb.nome} real de poder de compra de {rb.val}
        </b>
        ; já com o IR descontado — o que de fato sobra no seu bolso — o{" "}
        <b>
          {rl.nome} real é de {rl.val}
        </b>
        .
      </p>
    </div>
  );
}

function Resultado({ res }: { res: HistoricoResposta }) {
  const r = res.resumo;
  return (
    <>
      <div className="resumo">
        <div className="chip">
          <span>Total aportado</span>
          <b>{brl(r.totalAportado)}</b>
        </div>
        <div className="chip destaque">
          <span>Saldo bruto hoje</span>
          <b>{brl(r.saldoBruto)}</b>
        </div>
        <div className="chip">
          <span>Rendimento bruto</span>
          <b className="pos">{brl(r.rendimentoBruto)}</b>
        </div>
        <div className="chip">
          <span>Período</span>
          <b>{r.diasCorridos} dias</b>
        </div>
        <div className="chip">
          <span>IR aplicável</span>
          <b>{pct(r.irAliquota)}</b> · {r.irFaixa}
        </div>
        <div className="chip">
          <span>IOF</span>
          <b>{r.iofAplicavel ? "Incide" : "Isento"}</b>
          {r.iofAplicavel ? ` · dia ${r.diasCorridos}/30` : " · +30 dias"}
        </div>
      </div>

      <div className="cartao">
        <div className="sec-titulo">
          <div className="num">★</div>
          <h2>Resultado</h2>
        </div>
        <div className="sec-sub">
          Do quanto você juntou ao quanto sobra de verdade — já descontando
          imposto e a inflação do período (IPCA até {r.ipcaRef}).
        </div>

        <div className="grupo-label">O seu dinheiro</div>
        <Linha rot="Total aportado no período">{brl(r.totalAportado)}</Linha>
        <Linha rot="Saldo bruto hoje (o que aparece no extrato)">
          {brl(r.saldoBruto)}
        </Linha>
        <Linha rot="Rendimento bruto">
          <span className="pos">{brl(r.rendimentoBruto)}</span>
        </Linha>
        <Linha
          rot={
            r.iofAplicavel
              ? `IOF — incide: dia ${r.diasCorridos} de 30 (faltam ${30 - r.diasCorridos} p/ zerar)`
              : "IOF — isento (passou de 30 dias)"
          }
          sub
        >
          − {brl(r.iof)}
        </Linha>
        <Linha rot={`IR — ${pct(r.irAliquota)} (faixa: ${r.irFaixa})`} sub>
          − {brl(r.ir)}
        </Linha>
        <Linha rot="Rendimento líquido (já com o IR descontado)">
          <span className={r.rendimentoLiquido >= 0 ? "pos" : "neg"}>
            {brl(r.rendimentoLiquido)}
          </span>
        </Linha>
        <Linha
          cls="resgate"
          rot={
            <>
              Resgatando hoje, recebe
              <span className="rot-hint">
                Total aportado + rendimento líquido
              </span>
            </>
          }
          forte
        >
          {brl(r.valorLiquidoResgate)}
        </Linha>

        <div className="grupo-label">Frente à inflação</div>
        <Linha
          cls="meta"
          rot={
            <>
              Total aportado corrigido pelo IPCA
              <span className="rot-hint">
                Valor que seria necessário hoje só para não perder dinheiro —
                o empate com a inflação
              </span>
            </>
          }
          forte
        >
          {brl(r.totalCorrigidoIpca)}
        </Linha>

        <Veredito r={r} />

        <p className="nota-margem">
          Os valores são uma <b>estimativa</b>, uma base de referência — não um
          número exato. Pequenas diferenças em relação ao saldo no app/extrato do
          seu banco são normais (arredondamento do CDI diário, quando cada aporte
          começa a render e o mês corrente que ainda não fechou). E como a{" "}
          <b>inflação é volátil e imprevisível</b>, use o resultado como
          indicativo para acompanhar a tendência, não como valor fechado.
        </p>
      </div>

      <div className="cartao">
        <div className="sec-titulo">
          <div className="num">▦</div>
          <h2>Mês a mês</h2>
        </div>
        <div className="sec-sub">
          CDI (bruto) vs. IPCA de cada mês — ▲ = venceu a inflação no mês. Meses
          de entrada/saída são parciais.
        </div>
        <div className="tabela-wrap">
          <table className="hist">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Aporte</th>
                <th>CDI</th>
                <th>IPCA</th>
                <th>Ganho mês</th>
                <th>Ganho/dia</th>
                <th>Saldo</th>
                <th>vs. Inflação</th>
              </tr>
            </thead>
            <tbody>
              {res.meses.map((m) => (
                <tr key={m.mes} className={m.parcial ? "parc" : ""}>
                  <td>
                    {m.rotulo}
                    {m.parcial && <span className="tag">parcial</span>}
                  </td>
                  <td>{m.aportes > 0 ? brl(m.aportes) : "—"}</td>
                  <td>{pct(m.cdiPct)}</td>
                  <td>{m.ipcaPct !== null ? pct(m.ipcaPct) : "—"}</td>
                  <td className="pos">{brl(m.rendimento)}</td>
                  <td>{brl(m.ganhoDiario)}</td>
                  <td>{brl(m.saldoFim)}</td>
                  <td>
                    {m.acima === null ? (
                      <span className="pill-mes neutro" title="mês parcial">—</span>
                    ) : m.acima ? (
                      <span className="pill-mes acima">▲ Acima</span>
                    ) : (
                      <span className="pill-mes abaixo">▼ Abaixo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
