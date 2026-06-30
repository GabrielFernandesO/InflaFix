"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const path = usePathname();
  return (
    <nav className="navbar">
      <div className="nav-inner">
        <Link href="/" className="brand">
          <Image
            className="brand-logo"
            src="/logo.png"
            alt="InflaFix"
            width={38}
            height={38}
            priority
          />
          InflaFix
        </Link>
        <div className="nav-links">
          <Link href="/" className={path === "/" ? "ativo" : ""}>
            Início
          </Link>
          <Link href="/como-funciona" className={path === "/como-funciona" ? "ativo" : ""}>
            Como funciona
          </Link>
          <a
            href="#contato"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("contato")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Contato
          </a>
        </div>
      </div>
    </nav>
  );
}
