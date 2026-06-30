import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "InflaFix — Proteja seu patrimônio da inflação",
  description:
    "InflaFix: veja, mês a mês, se sua renda fixa a 100% do CDI está acima da inflação — com CDI e IPCA reais do Banco Central.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Navbar />
        {children}
        <footer id="contato" className="rodape">
          <div className="rodape-inner">
            <div className="rodape-top">
              <div className="rodape-marca">
                <strong className="rodape-logo">
                  Infla<span>Fix</span>
                </strong>
                <span className="rodape-tag">
                  Proteja seu patrimônio da inflação.
                </span>
              </div>
              <div className="rodape-contato">
                <span className="rodape-contato-label">
                  Dúvidas, sugestões ou feedback?
                </span>
                <a
                  className="rodape-mail"
                  href="mailto:inflafix@gmail.com?subject=Contato%20InflaFix"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                  inflafix@gmail.com
                </a>
              </div>
            </div>
            <p className="rodape-nota">
              Simula do início com <b>CDI diário real</b> composto dia a dia e
              compara com o <b>IPCA de cada mês</b>. O saldo do RDB é bruto —
              IR/IOF só saem no resgate. CDI e IPCA ao vivo do Banco Central (SGS
              4389, 433, 13522). Sem dados estimados.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
