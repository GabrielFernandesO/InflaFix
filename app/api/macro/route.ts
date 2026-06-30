import { NextResponse } from "next/server";
import { obterMacro } from "@/lib/bcb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const macro = await obterMacro();
  if (!macro) {
    return NextResponse.json(
      { offline: true, erro: "BC offline — sem dados do Banco Central" },
      { status: 503 },
    );
  }
  return NextResponse.json(macro);
}
