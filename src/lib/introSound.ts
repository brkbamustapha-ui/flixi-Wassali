/** Son d'ouverture « Flixi Wassali » généré en direct (WebAudio, aucun fichier) :
 *  souffle de départ → moteur qui monte → arpège brillant do-mi-sol-do → étincelle finale. */
type Ctx = BaseAudioContext;
let url: string | null = null;
let played = false;

function note(c: Ctx, out: AudioNode, freq: number, at: number, dur: number, vol: number, type: OscillatorType = "sine") {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(out); o.start(at); o.stop(at + dur + 0.05);
}

function jingle(c: Ctx) {
  const t0 = c.currentTime + 0.05;
  const master = c.createGain(); master.gain.value = 0.55; master.connect(c.destination);

  // 1) souffle (bruit filtré qui monte)
  const len = Math.floor(c.sampleRate * 0.9), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const n = c.createBufferSource(); n.buffer = buf;
  const f = c.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 2;
  f.frequency.setValueAtTime(300, t0); f.frequency.exponentialRampToValueAtTime(3200, t0 + 0.8);
  const ng = c.createGain(); ng.gain.setValueAtTime(0.0001, t0); ng.gain.exponentialRampToValueAtTime(0.18, t0 + 0.5); ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
  n.connect(f).connect(ng).connect(master); n.start(t0);

  // 2) moteur de camion qui monte en régime
  const e = c.createOscillator(), eg = c.createGain();
  e.type = "sawtooth"; e.frequency.setValueAtTime(55, t0); e.frequency.exponentialRampToValueAtTime(140, t0 + 0.9);
  eg.gain.setValueAtTime(0.0001, t0); eg.gain.exponentialRampToValueAtTime(0.09, t0 + 0.3); eg.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.0);
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 500;
  e.connect(lp).connect(eg).connect(master); e.start(t0); e.stop(t0 + 1.05);

  // 3) arpège brillant do – mi – sol – do (C5 E5 G5 C6)
  [523.25, 659.25, 783.99, 1046.5].forEach((fr, i) => {
    const at = t0 + 0.75 + i * 0.16;
    note(c, master, fr, at, 0.55, 0.22, "triangle");
    note(c, master, fr * 2, at, 0.35, 0.05, "sine");
  });
  // 4) accord final + étincelle
  const end = t0 + 1.5;
  [523.25, 659.25, 783.99, 1046.5].forEach((fr) => note(c, master, fr, end, 1.3, 0.12, "sine"));
  [2093, 2637, 3136].forEach((fr, i) => note(c, master, fr, end + 0.05 + i * 0.07, 0.4, 0.05, "sine"));
}

/** Rend le jingle en fichier WAV (hors ligne) : joué via <audio>, il fonctionne aussi quand le téléphone est en mode silencieux. */
async function render(): Promise<string | null> {
  if (url) return url;
  try {
    const OAC = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    const rate = 44100, oc = new OAC(1, rate * 3.6, rate);
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

export const introSoundPlayed = () => played;

/** Tente de jouer le son (une seule fois). Renvoie false si le navigateur exige d'abord un toucher. */
export async function playIntroSound(): Promise<boolean> {
  if (played) return true;
  const u = await render();
  if (!u) return false;
  try {
    const a = new Audio(u); a.volume = 1;
    await a.play();
    played = true;
    return true;
  } catch { return false; }
}
