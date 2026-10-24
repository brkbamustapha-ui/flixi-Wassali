import { findWilaya, wilayasAlong } from "@/lib/wilayas";

type T = { from_wilaya: string; to_wilaya: string; allow_enroute?: boolean };

/** Un transporteur est utile à un client si son trajet PART de la wilaya de départ du client, ou la TRAVERSE
 *  (annonce « charge en route »), avec l'arrivée du client plus loin sur le trajet quand elle est connue. */
export function tripServes(x: T, from: string, to: string): boolean {
  const departs = (!from || x.from_wilaya === from) && (!to || x.to_wilaya === to);
  if (departs) return true;
  if (!x.allow_enroute || (!from && !to)) return false;
  const a = findWilaya(x.from_wilaya), b = findWilaya(x.to_wilaya);
  if (!a || !b) return false;
  const names = wilayasAlong(a, b).map((v) => v.name);
  const i = from ? names.indexOf(from) : 0, j = to ? names.indexOf(to) : names.length - 1;
  return i >= 0 && j >= 0 && i < j;
}

/** Trajets qui PARTENT de la wilaya du client ou la TRAVERSENT (que le transporteur charge en route ou non). */
export const tripPassesFrom = (x: T, from: string) => {
  if (!from) return false;
  if (x.from_wilaya === from) return true;
  const a = findWilaya(x.from_wilaya), b = findWilaya(x.to_wilaya);
  if (!a || !b) return false;
  const names = wilayasAlong(a, b).map((v) => v.name);
  const i = names.indexOf(from);
  return i >= 0 && i < names.length - 1;
};
/** Le transporteur accepte-t-il une marchandise dans cette wilaya ? (départ de l'annonce, ou annonce « charge en route ») */
export const canLoadIn = (x: T, from: string) => x.from_wilaya === from || !!x.allow_enroute;
