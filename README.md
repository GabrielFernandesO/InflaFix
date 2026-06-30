# InflaFix — Web (Next.js)

> Proteja seu patrimônio da inflação, de forma estratégica.

Calculadora para qualquer renda fixa pós-fixada a 100% do CDI (CDB, RDB e as
"caixinhas"/"cofrinhos" dos apps), com **CDI e IPCA ao vivo do Banco Central**.
Mostra, para o saldo informado: comparação anual, decomposição do saldo
(aporte vs. rendimento já acumulado) e o ritmo de ganho diário/mensal.

Reaproveita a mesma lógica do `calc_rdb.py` (raiz do projeto), portada para
TypeScript em [`lib/rdb.ts`](lib/rdb.ts) e conferida número a número
(`npm run verificar`).

> **Sem dados estimados.** Se o Banco Central não responder, o site mostra
> **"BC offline"** em vez de inventar valores.

## Rodar localmente

```bash
npm install
npm run dev
# abre http://localhost:3000
```

Conferir o porte TS contra o Python:

```bash
npm run verificar
```

## Deploy no Vercel

1. Suba o repositório no GitHub.
2. No Vercel: **New Project** → importe o repo.
3. Em **Root Directory**, selecione **`web`** (o app Next.js fica nesta subpasta).
4. Framework: Next.js (detectado). **Deploy**.

Não há variáveis de ambiente: o CDI/IPCA vem da API pública do Banco Central
(séries SGS 4389 e 13522), chamada no servidor (route handlers), sem CORS.

## Estrutura

```
web/
  app/
    page.tsx              UI (React, client component)
    layout.tsx
    globals.css
    api/
      macro/route.ts      GET  -> CDI/IPCA atuais (503 se BC offline)
      calcular/route.ts   POST -> cálculo completo (503 se BC offline)
  lib/
    rdb.ts                lógica financeira (porte de calc_rdb.py)
    bcb.ts                acesso ao Banco Central + datas (servidor)
    types.ts              tipos da resposta da API
  scripts/
    verificar.ts          confere TS == Python
```
