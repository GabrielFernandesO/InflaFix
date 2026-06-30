import Link from "next/link";

export default function NotFound() {
  return (
    <section className="nf">
      <div className="nf-inner">
        <span className="hero-eyebrow">Erro 404</span>
        <div className="nf-code">
          4<span>0</span>4
        </div>
        <h1 className="nf-titulo">
          Essa página <span>não foi encontrada</span>
        </h1>
        <p className="nf-sub">
          O endereço que você tentou acessar não existe ou foi movido. Mas seu
          patrimônio continua precisando ganhar da inflação.
        </p>
        <div className="nf-acoes">
          <Link href="/" className="nf-btn">
            Voltar ao início
          </Link>
          <Link href="/como-funciona" className="nf-btn-sec">
            Como funciona
          </Link>
        </div>
      </div>
    </section>
  );
}
