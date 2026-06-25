/**
 * Admin-autentificering via Cloudflare Access.
 *
 * Adgang til /admin og /api/admin gates på edge af Cloudflare Access (login før
 * requesten når Workeren). Her verificerer vi Access-JWT'et som forsvar-i-dybden
 * og som kilde til identitet — så vi slipper for det gamle ?token= i URL'er.
 *
 * Fallbacks:
 *  - Lokal udvikling (host = localhost): tillad uden Access (intet edge-lag der).
 *  - Break-glass: header `x-admin-token` = ADMIN_TOKEN (til scripts/nødsituationer).
 */
import { createRemoteJWKSet, jwtVerify } from "jose";
import { getEnv } from "@/lib/db";

const TEAM_DOMAIN = "https://crimson-salad-7c64.cloudflareaccess.com";
const ACCESS_AUD = "aeab7c28ea5056faaa0bd977dcba5f64a6e9b3b070d7711559a29c3e87224c50";
const ALLOWED_EMAILS = ["m.guldbjerg@gmail.com"];

const JWKS = createRemoteJWKSet(new URL(`${TEAM_DOMAIN}/cdn-cgi/access/certs`));

/** Verificér et Access-JWT → returnér e-mail hvis gyldig OG på allowlisten. */
export async function verifyAccessJwt(token: string | null | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: TEAM_DOMAIN,
      audience: ACCESS_AUD,
    });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
    return email && ALLOWED_EMAILS.includes(email) ? email : null;
  } catch {
    return null;
  }
}

/** Hent Access-JWT fra header (injiceret af Access) eller CF_Authorization-cookie. */
function jwtFromHeaders(h: Headers): string | null {
  const hdr = h.get("cf-access-jwt-assertion");
  if (hdr) return hdr;
  const cookie = h.get("cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Lokal udvikling — intet Access-lag foran, så tillad. */
export function isLocalDev(h: Headers): boolean {
  const host = (h.get("host") ?? "").toLowerCase();
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
}

/** Break-glass: x-admin-token-header der matcher ADMIN_TOKEN-secret'en. */
async function hasBreakGlassToken(h: Headers): Promise<boolean> {
  const supplied = h.get("x-admin-token");
  if (!supplied) return false;
  try {
    const expected = (await getEnv()).ADMIN_TOKEN as string | undefined;
    return !!expected && supplied === expected;
  } catch {
    return false;
  }
}

/** Sand hvis requesten er en autoriseret admin. Bruges af pages (via headers())
 *  og af /api/admin-route-handlers (via req.headers). */
export async function isAdmin(h: Headers): Promise<boolean> {
  if (isLocalDev(h)) return true;
  if (await verifyAccessJwt(jwtFromHeaders(h))) return true;
  return hasBreakGlassToken(h);
}
