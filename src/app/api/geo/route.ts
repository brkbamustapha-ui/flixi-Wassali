import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Position approximative déduite de la connexion internet (utile sur ordinateur, sans GPS). Vercel renseigne ces en-têtes. */
export async function GET(req: NextRequest) {
  const lat = Number(req.headers.get("x-vercel-ip-latitude"));
  const lng = Number(req.headers.get("x-vercel-ip-longitude"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return NextResponse.json({ ok: false }, { status: 404 });
  const city = req.headers.get("x-vercel-ip-city");
  return NextResponse.json({ ok: true, lat, lng, city: city ? decodeURIComponent(city) : null, country: req.headers.get("x-vercel-ip-country"), approx: true });
}
