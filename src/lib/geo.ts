/** Communes d'une wilaya (fichiers statiques /communes/NN.json) + géocodage OpenStreetMap (Nominatim) côté navigateur. */
export type Commune = [string, string]; // [nom latin, nom arabe]
const cache = new Map<number, Commune[]>();

export async function loadCommunes(code: number): Promise<Commune[]> {
  if (cache.has(code)) return cache.get(code)!;
  const r = await fetch(`/communes/${String(code).padStart(2, "0")}.json`);
  const list = (await r.json()) as Commune[];
  cache.set(code, list);
  return list;
}

export const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

export function matchCommune(list: Commune[], name?: string | null): Commune | null {
  if (!name) return null;
  const n = norm(name);
  if (!n) return null;
  return list.find((c) => norm(c[0]) === n) ?? list.find((c) => norm(c[0]).includes(n) || n.includes(norm(c[0]))) ?? null;
}

let lastCall = 0;
async function nominatim(path: string): Promise<unknown> {
  const wait = Math.max(0, lastCall + 1100 - Date.now());
  lastCall = Date.now() + wait;
  if (wait) await new Promise((r) => setTimeout(r, wait));
  const r = await fetch(`https://nominatim.openstreetmap.org/${path}`, { headers: { "Accept-Language": "fr" } });
  if (!r.ok) throw new Error("geo");
  return r.json();
}
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} },
};

export async function geocodeCommune(commune: string, wilaya: string): Promise<{ lat: number; lng: number } | null> {
  const key = `flixi_geo:${wilaya}:${commune}`;
  const hit = store.get(key);
  if (hit) return JSON.parse(hit);
  try {
    const q = encodeURIComponent(`${commune}, ${wilaya}, Algeria`);
    const res = (await nominatim(`search?q=${q}&format=json&limit=1&countrycodes=dz`)) as { lat: string; lon: string }[];
    if (!res.length) return null;
    const pt = { lat: Number(res[0].lat), lng: Number(res[0].lon) };
    store.set(key, JSON.stringify(pt));
    return pt;
  } catch { return null; }
}

/** Commune et wilaya trouvées à partir d'un point de la carte. */
export async function reverseCommune(lat: number, lng: number): Promise<{ commune: string | null; state: string | null } | null> {
  try {
    const res = (await nominatim(`reverse?lat=${lat}&lon=${lng}&format=json&zoom=12&addressdetails=1`)) as { address?: Record<string, string> };
    const a = res.address ?? {};
    return { commune: a.city ?? a.town ?? a.municipality ?? a.village ?? a.suburb ?? a.county ?? null, state: a.state ?? null };
  } catch { return null; }
}
