import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como funciona — InflaFix",
  description:
    "Entenda o que o InflaFix calcula, como o cálculo é feito e os conceitos de CDI, IPCA e inflação.",
};

export default function ComoFunciona() {
  return (
    <main className="wrap pagina">
      <div className="pagina-head">
        <h1>Como funciona</h1>
        <p>O que o InflaFix calcula e os conceitos por trás — em linguagem simples.</p>
      </div>

      <div className="cartao intro">
        <p>
          <b>Vale para qualquer renda fixa pós-fixada a 100% do CDI</b> — CDB, RDB
          e as &quot;caixinhas&quot;/&quot;cofrinhos&quot; dos apps de banco, em{" "}
          <b>qualquer banco ou corretora</b>. A conta é a mesma: rende o CDI a cada
          dia útil, com IR regressivo e IOF (resgate antes de 30 dias) descontados
          só no saque.
        </p>
        <p className="intro-obs">
          Casos diferentes: <b>LCI/LCA</b> são isentas de IR; <b>Tesouro Selic</b>{" "}
          segue a Selic e tem taxa de custódia; <b>fundos DI</b> têm come-cotas e
          taxa de administração — nesses, a conta muda um pouco.
        </p>
      </div>

      <div className="cartao">
        <div className="sec-titulo">
          <div className="num">⚙</div>
          <h2>Como o cálculo é feito</h2>
        </div>
        <div className="educ-item">
          <p>
            O InflaFix puxa o <b>CDI diário real</b> do Banco Central e o compõe{" "}
            <b>dia útil a dia útil</b> sobre cada aporte que você lançou — do mais
            antigo até hoje. Depois compara com o <b>IPCA de cada mês</b> (IBGE).
          </p>
        </div>
        <div className="educ-item">
          <p>
            O resultado mostra o <b>saldo bruto de hoje</b>, quanto disso é
            rendimento, o <b>IR e o IOF</b> que sairiam se você sacasse agora, e o{" "}
            <b>ganho real</b> — o que sobra de verdade depois de descontar a
            inflação. E uma tabela <b>mês a mês</b> dizendo em quais meses você
            ficou acima ou abaixo da inflação.
          </p>
        </div>
        <div className="educ-item">
          <p>
            Tudo com <b>dados ao vivo do Banco Central</b> (séries SGS 4389, 433 e
            13522) — <b>nada é estimado</b>.
          </p>
        </div>
      </div>

      <div className="cartao educ">
        <div className="sec-titulo">
          <div className="num">?</div>
          <h2>Entenda: CDI, IPCA e inflação</h2>
        </div>
        <div className="educ-item">
          <h3>CDI</h3>
          <p>
            É a taxa que rege a renda fixa pós-fixada (anda colada na Selic) — o
            quanto o seu dinheiro <b>rende</b>. Ex.: CDI de 1,10% no mês = seu
            dinheiro cresceu 1,10% naquele mês.
          </p>
        </div>
        <div className="educ-item">
          <h3>IPCA</h3>
          <p>
            É o índice oficial de <b>inflação</b> (medido pelo IBGE) — o quanto os
            preços subiram. Ex.: IPCA de 0,50% no mês = as coisas ficaram 0,50%
            mais caras.
          </p>
        </div>
        <div className="educ-item">
          <h3>Inflação</h3>
          <p>
            É a <b>perda do poder de compra</b> do seu dinheiro com o tempo. O IPCA
            é o termômetro dela: se os preços sobem e seu dinheiro não acompanha,
            você compra menos com o mesmo valor.
          </p>
        </div>
        <div className="educ-item">
          <h3>Como saber se no mês rendi acima da inflação?</h3>
          <p>
            Compare o <b>CDI%</b> com o <b>IPCA%</b> daquele mês:
          </p>
          <ul>
            <li>
              <b className="pos">CDI maior que IPCA</b> → seu dinheiro cresceu mais
              que os preços = você <b>ganhou</b> poder de compra (badge{" "}
              <span className="pill-mes acima">▲ Acima</span>).
            </li>
            <li>
              <b className="neg">CDI menor que IPCA</b> → os preços subiram mais que
              o rendimento = você <b>perdeu</b> poder de compra (badge{" "}
              <span className="pill-mes abaixo">▼ Abaixo</span>).
            </li>
          </ul>
        </div>
      </div>

      <div className="cta">
        <Link href="/">Fazer meu cálculo →</Link>
      </div>
    </main>
  );
}
