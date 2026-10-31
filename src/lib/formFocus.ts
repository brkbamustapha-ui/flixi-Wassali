/** Ramène l'écran sur la rubrique à remplir : défilement, mise en évidence rouge et focus (repère [data-field]). */
export function focusField(name: string) {
  if (typeof document === "undefined") return;
  const el = document.querySelector<HTMLElement>(`[data-field="${name}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.remove("field-error");
  void el.offsetWidth; // relance l'animation
  el.classList.add("field-error");
  const input = el.matches("input,select,textarea,button") ? el : el.querySelector<HTMLElement>("input:not([type=file]),select,textarea,button");
  window.setTimeout(() => input?.focus({ preventScroll: true }), 400);
  window.setTimeout(() => el.classList.remove("field-error"), 3500);
}
