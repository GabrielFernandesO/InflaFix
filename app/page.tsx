"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { pct } from "@/lib/format";
import Historico from "@/components/Historico";

interface Macro {
  cdi: number;
  ipca: number;
  cdiData: string;
  ipcaRef: string;
}

export default function Home() {
  const [macro, setMacro] = useState<Macro | null>(null);
  const [bcOffline, setBcOffline] = useState(false);

  useEffect(() => {
    fetch("/api/macro")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((m: Macro) => {
        setMacro(m);
        setBcOffline(false);
      })
      .catch(() => setBcOffline(true));
  }, []);

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <span className="hero-eyebrow">Renda fixa · 100% do CDI</span>
          <h1>
            Seu dinheiro está <span>ganhando da inflação?</span>
          </h1>
          <p className="slogan">
            Protegendo seu patrimônio da inflação de forma simples e estratégica.
          </p>
          <div className="macro">
            {bcOffline ? (
              <div className="pill alerta">
                <span className="dot off" />
                BC offline — sem dados do Banco Central
              </div>
            ) : macro ? (
              <>
                <div className="pill">
                  <span className="dot vivo" />
                  CDI <b>{pct(macro.cdi)}</b> a.a.
                </div>
                <div className="pill">
                  <span className="dot vivo" />
                  IPCA <b>{pct(macro.ipca)}</b> 12m (ref. {macro.ipcaRef})
                </div>
                <div className="pill" style={{ opacity: 0.85 }}>
                  Banco Central · {macro.cdiData}
                </div>
              </>
            ) : (
              <div className="pill">
                <span className="dot" />
                consultando o Banco Central…
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="features">
        <div className="feat">
          <div className="feat-ico">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18" />
              <path d="M12 3 3 8h18z" />
              <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" />
            </svg>
          </div>
          <h3>Dados reais do BC</h3>
          <p>CDI e IPCA ao vivo do Banco Central (séries SGS). Nada estimado.</p>
        </div>
        <div className="feat">
          <div className="feat-ico">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18" />
              <rect x="5" y="11" width="3" height="7" />
              <rect x="10.5" y="6" width="3" height="12" />
              <rect x="16" y="13" width="3" height="5" />
            </svg>
          </div>
          <h3>Mês a mês</h3>
          <p>Veja em quais meses você ficou acima ou abaixo da inflação.</p>
        </div>
        <div className="feat">
          <div className="feat-ico">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h3>Ganho real, líquido</h3>
          <p>Já com IR e IOF descontados — o que sobra de verdade.</p>
        </div>
      </section>

      <main className="wrap">
        <div className="cartao aplica">
          <div className="sec-titulo">
            <div className="num">✓</div>
            <h2>Para quais investimentos serve?</h2>
          </div>
          <div className="sec-sub">
            Qualquer renda fixa pós-fixada que rende 100% do CDI — em qualquer
            banco ou corretora.
          </div>
          <div className="aplica-grid">
            <div className="aplica-item">
              <span className="chk">✓</span>
              <span>
                <b>Caixinha do Nubank</b> (RDB a 100% do CDI)
              </span>
            </div>
            <div className="aplica-item">
              <span className="chk">✓</span>
              <span>
                <b>CDB</b> a 100% do CDI (qualquer banco ou corretora)
              </span>
            </div>
            <div className="aplica-item">
              <span className="chk">✓</span>
              <span>
                <b>Cofrinhos / caixinhas</b> dos bancos digitais (Inter, C6,
                PicPay, Mercado Pago…)
              </span>
            </div>
            <div className="aplica-item">
              <span className="chk">✓</span>
              <span>
                <b>RDB</b> e demais pós-fixados a 100% do CDI
              </span>
            </div>
          </div>
          <p className="aplica-nota">
            Exceções: <b>LCI/LCA</b> (isentas de IR), <b>Tesouro Selic</b>{" "}
            (atrelado à Selic) e <b>fundos DI</b> (come-cotas) seguem regras um
            pouco diferentes — detalhes em{" "}
            <Link href="/como-funciona">Como funciona</Link>.
          </p>
        </div>

        <Historico />
      </main>
    </>
  );
}
