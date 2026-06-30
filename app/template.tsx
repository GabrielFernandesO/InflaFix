// Re-monta a cada navegação entre rotas, disparando a animação de entrada
// (fade + slide) — deixa a troca de "Início" ↔ "Como funciona" suave.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-trans">{children}</div>;
}
