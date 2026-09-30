export function LogoMark({ size = 40 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/icon.svg" alt="Flixi Tawsil" width={size} height={size} style={{ width: size, height: size }} />;
}

export function Logo({ size = 40, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <span className="keep-ltr inline-flex items-center gap-2.5" dir="ltr">
      <LogoMark size={size} />
      <span className="leading-none">
        <span className="block font-extrabold tracking-tight" style={{ fontSize: size * 0.56 }}>
          <span className="grad-text">Flixi</span>
          <span className={`ml-[0.28em] ${dark ? "text-white" : "text-ink"}`}>Tawsil</span>
        </span>
        <span className="block font-bold tracking-[0.3em] text-brand-violet" style={{ fontSize: size * 0.24, marginTop: 3 }}>
          توصيل · ALGÉRIE
        </span>
      </span>
    </span>
  );
}
