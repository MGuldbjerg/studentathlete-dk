import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { COUNTRIES } from "@/lib/countries";

/**
 * Landevælgeren i admin.
 *
 * Admin bor kun på standardsitet (ét Cloudflare Access-app), men redigerer ét
 * lands indhold ad gangen. Valget ligger i en cookie, som middlewaren oversætter
 * til `x-sa-country` på admin-requests — se `contentCountry()`.
 *
 * GET frem for POST, fordi vælgeren er et almindeligt link: ingen JavaScript,
 * ingen formular. Ruten ændrer kun brugerens eget valg, aldrig indhold.
 */
export async function GET(req: NextRequest) {
  if (!(await isAdmin(req.headers))) {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  }

  const code = (req.nextUrl.searchParams.get("code") ?? "").toUpperCase();
  if (!COUNTRIES[code]) {
    return NextResponse.json({ error: "Ukendt land" }, { status: 400 });
  }

  // Kun stier inde i admin — ellers kunne linket bruges som åben viderestilling.
  const next = req.nextUrl.searchParams.get("next") ?? "/admin";
  const target = next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";

  const res = NextResponse.redirect(new URL(target, req.nextUrl.origin), 303);
  res.cookies.set("sa_country", code, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
