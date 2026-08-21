/**
 * Læservendte stier og query-parametre.
 *
 * De stod her som DANSKE konstanter med en note om at de hørte hjemme i
 * sprogpakken «når site nummer to lander». Site nummer to landede 5. august
 * 2026, og noten blev stående — så britiske sider lå på /atleter og /artikler
 * med `?side=2`. Nu er det sprogpakken der svarer, og filen er kun genveje.
 */
import { routePath, queryParam, queryParamAliases } from "./i18n";

/** Arkivet: alle artikler, pagineret. Også målet for Instagram-bio-linket. */
export function archivePath(lang: string): string {
  return routePath("archive", lang);
}

/** Sidetal-parameteren på arkivet (`?side=` / `?page=`). */
export function pageParam(lang: string): string {
  return queryParam("page", lang);
}

/** Kilde-parameteren vi hænger på delte links (`?kilde=ig` / `?source=ig`). */
export function sourceParam(lang: string): string {
  return queryParam("source", lang);
}

/**
 * ALLE sprogs navne for en parameter. Læsesiden bruger dem, så et link delt fra
 * det ene site stadig virker på det andet.
 */
export function pageParamAliases(): string[] {
  return queryParamAliases("page");
}

export function sourceParamAliases(): string[] {
  return queryParamAliases("source");
}
