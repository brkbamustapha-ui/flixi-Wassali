export type Wilaya = { code: number; name: string; ar: string; lat: number; lng: number };
const AR = ["أدرار", "الشلف", "الأغواط", "أم البواقي", "باتنة", "بجاية", "بسكرة", "بشار", "البليدة", "البويرة", "تمنراست", "تبسة", "تلمسان", "تيارت", "تيزي وزو", "الجزائر", "الجلفة", "جيجل", "سطيف", "سعيدة", "سكيكدة", "سيدي بلعباس", "عنابة", "قالمة", "قسنطينة", "المدية", "مستغانم", "المسيلة", "معسكر", "ورقلة", "وهران", "البيض", "إليزي", "برج بوعريريج", "بومرداس", "الطارف", "تندوف", "تيسمسيلت", "الوادي", "خنشلة", "سوق أهراس", "تيبازة", "ميلة", "عين الدفلى", "النعامة", "عين تموشنت", "غرداية", "غليزان", "تيميمون", "برج باجي مختار", "أولاد جلال", "بني عباس", "عين صالح", "عين قزام", "تقرت", "جانت", "المغير", "المنيعة"];

export const WILAYAS: Wilaya[] = [
  [1, "Adrar", 27.87, -0.29], [2, "Chlef", 36.16, 1.33], [3, "Laghouat", 33.8, 2.86], [4, "Oum El Bouaghi", 35.88, 7.11],
  [5, "Batna", 35.56, 6.17], [6, "Béjaïa", 36.75, 5.06], [7, "Biskra", 34.85, 5.73], [8, "Béchar", 31.62, -2.22],
  [9, "Blida", 36.47, 2.83], [10, "Bouira", 36.37, 3.9], [11, "Tamanrasset", 22.79, 5.52], [12, "Tébessa", 35.4, 8.12],
  [13, "Tlemcen", 34.88, -1.32], [14, "Tiaret", 35.37, 1.32], [15, "Tizi Ouzou", 36.71, 4.05], [16, "Alger", 36.75, 3.06],
  [17, "Djelfa", 34.67, 3.26], [18, "Jijel", 36.82, 5.77], [19, "Sétif", 36.19, 5.41], [20, "Saïda", 34.83, 0.15],
  [21, "Skikda", 36.88, 6.91], [22, "Sidi Bel Abbès", 35.19, -0.63], [23, "Annaba", 36.9, 7.77], [24, "Guelma", 36.46, 7.43],
  [25, "Constantine", 36.37, 6.61], [26, "Médéa", 36.26, 2.75], [27, "Mostaganem", 35.93, 0.09], [28, "M'Sila", 35.7, 4.54],
  [29, "Mascara", 35.4, 0.14], [30, "Ouargla", 31.95, 5.32], [31, "Oran", 35.7, -0.63], [32, "El Bayadh", 33.68, 1.02],
  [33, "Illizi", 26.51, 8.48], [34, "Bordj Bou Arréridj", 36.07, 4.76], [35, "Boumerdès", 36.76, 3.48], [36, "El Tarf", 36.77, 8.31],
  [37, "Tindouf", 27.67, -8.15], [38, "Tissemsilt", 35.61, 1.81], [39, "El Oued", 33.37, 6.86], [40, "Khenchela", 35.43, 7.14],
  [41, "Souk Ahras", 36.29, 7.95], [42, "Tipaza", 36.59, 2.44], [43, "Mila", 36.45, 6.26], [44, "Aïn Defla", 36.26, 1.97],
  [45, "Naâma", 33.27, -0.31], [46, "Aïn Témouchent", 35.3, -1.14], [47, "Ghardaïa", 32.49, 3.67], [48, "Relizane", 35.74, 0.56],
  [49, "Timimoun", 29.26, 0.23], [50, "Bordj Badji Mokhtar", 21.33, 0.95], [51, "Ouled Djellal", 34.43, 5.07],
  [52, "Béni Abbès", 30.13, -2.17], [53, "In Salah", 27.2, 2.48], [54, "In Guezzam", 19.57, 5.77], [55, "Touggourt", 33.1, 6.06],
  [56, "Djanet", 24.55, 9.48], [57, "El M'Ghair", 33.95, 5.92], [58, "El Menia", 30.58, 2.88],
].map(([code, name, lat, lng]) => ({ code, name, ar: AR[(code as number) - 1], lat, lng }) as Wilaya);

export const wilayaLabel = (w: Wilaya, lang: string = "fr") => `${String(w.code).padStart(2, "0")} - ${lang === "ar" || lang === "dz" ? w.ar : w.name}`;
export const findWilaya = (name?: string | null) => WILAYAS.find((w) => w.name === name);

export const distKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
/** Wilaya dont le centre est le plus proche du point (approximation pour avertir le client). */
export const nearestWilaya = (lat: number, lng: number) => WILAYAS.reduce((best, w) => (distKm({ lat, lng }, w) < distKm({ lat, lng }, best) ? w : best), WILAYAS[0]);

/** Wilayas traversées par le trajet A → B (couloir de 60 km autour de la ligne droite), dans l'ordre de A vers B. */
export function wilayasAlong(a: Wilaya, b: Wilaya, maxKm = 60): Wilaya[] {
  const k = Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180);
  const ax = a.lng * 111 * k, ay = a.lat * 111, bx = b.lng * 111 * k, by = b.lat * 111;
  const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1;
  return WILAYAS.map((w) => {
    const px = w.lng * 111 * k, py = w.lat * 111;
    const t = ((px - ax) * dx + (py - ay) * dy) / len2;
    const tc = Math.max(0, Math.min(1, t));
    const d = Math.hypot(px - (ax + tc * dx), py - (ay + tc * dy));
    return { w, t, d };
  }).filter((x) => x.t >= -0.02 && x.t <= 1.02 && x.d <= maxKm).sort((x, y) => x.t - y.t).map((x) => x.w);
}
