"use strict";
/* =====================================================================
   SONIDO  ·  Todo se genera con Web Audio (sin archivos de audio).
   Incluye viento que cambia con la velocidad y una melodía pentatónica
   suave, al estilo de una quena andina.
   ===================================================================== */
const SND = (() => {
  let ctx = null, maestro = null, vientoGain = null, musicaId = null, silencio = false;
  try { silencio = JSON.parse(localStorage.getItem("gdc.silencio") || "false"); } catch { /* sin almacenamiento */ }

  function iniciar() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      maestro = ctx.createGain(); maestro.gain.value = silencio ? 0 : 0.9; maestro.connect(ctx.destination);
      crearViento();
    } catch { ctx = null; }
  }

  function ruido(dur) {
    const n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function crearViento() {
    const fuente = ctx.createBufferSource(); fuente.buffer = ruido(2); fuente.loop = true;
    const filtro = ctx.createBiquadFilter(); filtro.type = "bandpass"; filtro.frequency.value = 520; filtro.Q.value = 0.6;
    vientoGain = ctx.createGain(); vientoGain.gain.value = 0;
    fuente.connect(filtro).connect(vientoGain).connect(maestro); fuente.start();
  }
  /* v entre 0 y 1: intensidad del viento */
  function viento(v) {
    if (!ctx || !vientoGain) return;
    vientoGain.gain.setTargetAtTime(silencio ? 0 : 0.03 + v * 0.09, ctx.currentTime, 0.2);
  }

  function tono(frec, dur, tipo = "sine", vol = 0.08, desliz = 0, retardo = 0) {
    if (!ctx || silencio) return;
    const t = ctx.currentTime + retardo, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo; o.frequency.setValueAtTime(frec, t);
    if (desliz) o.frequency.exponentialRampToValueAtTime(Math.max(20, frec * desliz), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(maestro); o.start(t); o.stop(t + dur + 0.02);
  }
  function soplo(dur, frec, vol, q = 1, tipoFiltro = "bandpass", retardo = 0) {
    if (!ctx || silencio) return;
    const t = ctx.currentTime + retardo, f = ctx.createBufferSource(); f.buffer = ruido(dur + 0.05);
    const fl = ctx.createBiquadFilter(); fl.type = tipoFiltro; fl.frequency.value = frec; fl.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    f.connect(fl).connect(g).connect(maestro); f.start(t); f.stop(t + dur + 0.05);
  }

  const efectos = {
    aleteo: () => soplo(0.22, 380, 0.16, 0.8),
    comer: () => { soplo(0.08, 1400, 0.14, 2); soplo(0.08, 900, 0.12, 2, "bandpass", 0.12); tono(220, 0.1, "square", 0.03, 0.7, 0.05); },
    dato: () => { tono(784, 0.14, "triangle", 0.07); tono(1175, 0.24, "triangle", 0.07, 0, 0.1); },
    dano: () => { tono(260, 0.45, "sawtooth", 0.09, 0.3); soplo(0.25, 600, 0.2, 0.7, "lowpass"); },
    rayo: () => { soplo(0.7, 300, 0.5, 0.4, "lowpass"); tono(70, 0.6, "sawtooth", 0.1, 0.5); },
    alarma: () => { tono(880, 0.1, "square", 0.04); tono(880, 0.1, "square", 0.04, 0, 0.16); },
    disparo: () => { soplo(0.18, 1800, 0.5, 0.5, "highpass"); tono(120, 0.2, "sawtooth", 0.08, 0.4); },
    vista: () => { tono(660, 0.35, "sine", 0.06, 2); tono(990, 0.4, "sine", 0.05, 1.5, 0.08); },
    pluma: () => tono(1046 + Math.random() * 200, 0.12, "triangle", 0.045),
    clic: () => tono(520, 0.06, "square", 0.03),
    logro: () => [523, 659, 784, 1047].forEach((f, i) => tono(f, 0.22, "triangle", 0.07, 0, i * 0.09)),
    nido: () => [392, 523, 659, 784, 1047].forEach((f, i) => tono(f, 0.3, "triangle", 0.07, 0, i * 0.12)),
    gameover: () => [392, 330, 262, 196].forEach((f, i) => tono(f, 0.35, "triangle", 0.07, 0, i * 0.2)),
    control: () => [392, 523, 659, 784].forEach((f, i) => tono(f, 0.26, "triangle", 0.07, 0, i * 0.1)),
    termica: () => tono(330, 0.5, "sine", 0.04, 1.6),
    poder: () => [523, 784, 1175, 1568].forEach((f, i) => tono(f, 0.18, "triangle", 0.07, 0, i * 0.06)),
    escudo: () => { tono(900, 0.12, "square", 0.05, 0.5); soplo(0.1, 2400, 0.1, 2); },
  };

  /* Melodía pentatónica menor (La) que camina al azar */
  const ESCALA = [220, 261.6, 293.7, 329.6, 392, 440, 523.3];
  function musica(activa) {
    clearInterval(musicaId); musicaId = null;
    if (!activa || !ctx) return;
    let i = 3;
    const nota = () => {
      if (silencio || !ctx) return;
      i = clamp(i + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)], 0, ESCALA.length - 1);
      tono(ESCALA[i], 1.6, "sine", 0.03);
      if (Math.random() < 0.35) tono(ESCALA[i] / 2, 2.4, "triangle", 0.018, 0, 0.05);
    };
    nota(); musicaId = setInterval(nota, 1900);
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function alternar() {
    silencio = !silencio;
    try { localStorage.setItem("gdc.silencio", JSON.stringify(silencio)); } catch { /* sin almacenamiento */ }
    if (maestro) maestro.gain.value = silencio ? 0 : 0.9;
    return silencio;
  }
  const play = (n) => { if (efectos[n]) efectos[n](); };

  return { iniciar, play, viento, musica, alternar, get silencio() { return silencio; } };
})();
