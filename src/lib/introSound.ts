/** Son d'ouverture « Flixi Wassali » généré en direct (WebAudio, aucun fichier) :
 *  démarrage d'un tracteur diesel — démarreur qui tourne, le moteur prend, ralenti « tac-tac-tac », puis une accélération. */
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

function jingle(c: Ctx) {
  const t0 = c.currentTime + 0.05;
  const noise = noiseBuf(c, 1);
  const master = c.createGain(); master.gain.setValueAtTime(0.9, t0); master.gain.setValueAtTime(0.9, t0 + 3.0); master.gain.linearRampToValueAtTime(0, t0 + 3.9);
  const tone = c.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 2400;
  master.connect(tone).connect(c.destination);

  // 1) démarreur : « rrr-rrr-rrr » qui s'accélère (≈ 1 s)
  const cr = 0.95;
  for (let t = 0, i = 0; t < cr; i++) {
    const period = 0.17 - 0.06 * (t / cr);
    chug(c, master, t0 + t, 48 + 14 * (t / cr), 0.42, period * 0.85, noise);
    t += period;
  }
  // 2) le moteur « prend » : coup plus fort puis ralenti irrégulier qui monte en régime
  const catchAt = t0 + cr + 0.05;
  chug(c, master, catchAt, 62, 0.8, 0.22, noise);
  let t = 0.2, i = 0;
  while (t < 2.35) {
    const rpm = 7.5 + 7 * Math.min(1, t / 2.2);          // coups par seconde
    const f = 58 + 22 * Math.min(1, t / 2.2);            // hauteur
    chug(c, master, catchAt + t, f, 0.55 + (i % 2 ? 0.08 : 0), 0.13, noise);
    t += (1 / rpm) * (0.92 + 0.16 * Math.random());      // petite irrégularité de diesel
    i++;
  }
  // 3) fumée / souffle d'échappement qui s'estompe
  const sm = c.createBufferSource(), sf = c.createBiquadFilter(), sg = c.createGain();
  sm.buffer = noise; sm.loop = true; sf.type = "lowpass"; sf.frequency.value = 500;
  sg.gain.setValueAtTime(0.0001, catchAt); sg.gain.exponentialRampToValueAtTime(0.12, catchAt + 0.4); sg.gain.exponentialRampToValueAtTime(0.0001, catchAt + 2.6);
  sm.connect(sf).connect(sg).connect(master); sm.start(catchAt); sm.stop(catchAt + 2.7);
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
