/** Son d'ouverture « Flixi Wassali » généré en direct (WebAudio, aucun fichier) :
 *  signature de marque : camion qui démarre, coup de klaxon, carillon montant. */
type Ctx = BaseAudioContext;
let url: string | null = null;
let played = false;

function noiseBuf(c: Ctx, secs: number) {
  const len = Math.floor(c.sampleRate * secs), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/** Un « coup » de piston : dent de scie grave + souffle d'échappement, enveloppe courte. */
function chug(c: Ctx, out: AudioNode, at: number, f: number, vol: number, len: number, noise: AudioBuffer) {
  const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
  o.type = "sawtooth"; o2.type = "square"; o.frequency.setValueAtTime(f, at); o2.frequency.setValueAtTime(f * 2.01, at);
  lp.type = "lowpass"; lp.frequency.setValueAtTime(900, at); lp.frequency.exponentialRampToValueAtTime(260, at + len);
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  const g2 = c.createGain(); g2.gain.value = 0.35;
  o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g).connect(out);
  o.start(at); o2.start(at); o.stop(at + len + 0.03); o2.stop(at + len + 0.03);
  const n = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain();
  n.buffer = noise; nf.type = "bandpass"; nf.frequency.value = 330; nf.Q.value = 0.8;
  ng.gain.setValueAtTime(0.0001, at); ng.gain.exponentialRampToValueAtTime(vol * 0.55, at + 0.004); ng.gain.exponentialRampToValueAtTime(0.0001, at + len * 0.8);
  n.connect(nf).connect(ng).connect(out); n.start(at, Math.random() * 0.5, len);
}

/** Note de carillon (triangle + harmonique) : la « signature » brillante de l'application. */
function chime(c: Ctx, out: AudioNode, at: number, f: number, vol: number, len: number) {
  for (const [mul, v, type] of [[1, vol, "triangle"], [2, vol * 0.25, "sine"], [3, vol * 0.08, "sine"]] as const) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f * mul, at);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(v, at + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    o.connect(g).connect(out); o.start(at); o.stop(at + len + 0.05);
  }
}

/** Klaxon de camion à deux tons (do#4 + mi4, tierce) avec attaque et relâchement doux. */
function horn(c: Ctx, out: AudioNode, at: number, len: number, vol: number) {
  const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 560; bp.Q.value = 0.7;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.03); g.gain.setValueAtTime(vol, at + len - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  bp.connect(g).connect(out);
  for (const f of [277.2, 349.2]) for (const det of [-1.5, 1.5]) {
    const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(f + det, at);
    o.connect(bp); o.start(at); o.stop(at + len + 0.05);
  }
}

/** Signature sonore de l'application : un camion démarre → coup de klaxon → carillon montant (do-mi-sol) qui conclut. */
function jingle(c: Ctx) {
  const t0 = c.currentTime + 0.05;
  const noise = noiseBuf(c, 1);
  const master = c.createGain();
  master.gain.setValueAtTime(0.9, t0); master.gain.setValueAtTime(0.9, t0 + 3.0); master.gain.linearRampToValueAtTime(0, t0 + 3.9);
  const tone = c.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 5000;
  master.connect(tone).connect(c.destination);

  // 1) moteur : 4 tours de démarreur puis le moteur prend et monte en régime (≈ 1 s)
  for (let i = 0; i < 4; i++) chug(c, master, t0 + i * 0.13, 48 + i * 5, 0.38, 0.11, noise);
  let t = 0.55, i = 0;
  while (t < 1.25) {
    const k = Math.min(1, (t - 0.55) / 0.7);
    chug(c, master, t0 + t, 60 + 38 * k, 0.55, 0.1, noise);
    t += 1 / (9 + 9 * k) * (0.94 + 0.12 * Math.random()); i++;
  }
  // 2) klaxon « pi-piiin »
  horn(c, master, t0 + 1.3, 0.17, 0.2);
  horn(c, master, t0 + 1.55, 0.42, 0.2);
  // 3) carillon montant do-mi-sol + octave brillante, qui s'ouvre sur l'écran d'accueil
  [523.25, 659.25, 783.99].forEach((f, k) => chime(c, master, t0 + 2.05 + k * 0.14, f, 0.2, 0.9));
  chime(c, master, t0 + 2.5, 1046.5, 0.22, 1.3);
  chime(c, master, t0 + 2.56, 1568, 0.07, 1.1);
}

/** Rend le jingle en fichier WAV (hors ligne) : joué via <audio>, il fonctionne aussi quand le téléphone est en mode silencieux. */
async function render(): Promise<string | null> {
  if (url) return url;
  try {
    const OAC = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    const rate = 44100, oc = new OAC(1, rate * 4.2, rate);
    jingle(oc);
    const buf = await oc.startRendering();
    const d = buf.getChannelData(0), pcm = new DataView(new ArrayBuffer(44 + d.length * 2));
    const w = (o: number, t: string) => [...t].forEach((ch, i) => pcm.setUint8(o + i, ch.charCodeAt(0)));
    w(0, "RIFF"); pcm.setUint32(4, 36 + d.length * 2, true); w(8, "WAVE"); w(12, "fmt "); pcm.setUint32(16, 16, true);
    pcm.setUint16(20, 1, true); pcm.setUint16(22, 1, true); pcm.setUint32(24, rate, true); pcm.setUint32(28, rate * 2, true);
    pcm.setUint16(32, 2, true); pcm.setUint16(34, 16, true); w(36, "data"); pcm.setUint32(40, d.length * 2, true);
    for (let i = 0; i < d.length; i++) pcm.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 0x7fff, true);
    return (url = URL.createObjectURL(new Blob([pcm.buffer], { type: "audio/wav" })));
  } catch { return null; }
}

let audio: HTMLAudioElement | null = null;
export const introSoundPlaying = () => audio !== null;

/** Tente de jouer le son (une seule fois). Renvoie false si le navigateur exige d'abord un geste de l'utilisateur. */
let starting = false;
export async function playIntroSound(): Promise<boolean> {
  if (played) return true;
  if (starting) return false;
  starting = true;
  try { return await start(); } finally { starting = false; }
}

async function start(): Promise<boolean> {
  const u = await render();
  if (!u) return false;
  try {
    const a = new Audio(u); a.volume = 1;
    await a.play();
    audio = a; played = true;
    return true;
  } catch { return false; }
}

/** Coupe le son en fondu quand l'animation se termine (le son ne doit jamais déborder sur le reste de l'application). */
export function stopIntroSound() {
  const a = audio; audio = null; played = true;
  if (!a) return;
  const step = () => { if (a.volume > 0.12) { a.volume = Math.max(0, a.volume - 0.12); setTimeout(step, 30); } else { a.pause(); a.src = ""; } };
  step();
}
