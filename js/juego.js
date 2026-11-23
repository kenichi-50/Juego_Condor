"use strict";
/* =====================================================================
   LÓGICA DEL JUEGO  ·  Guardianes del Cóndor: Cumbres Low-Poly
   Bucle con requestAnimationFrame, física de vuelo, peligros, niveles.
   Lee los números de datos.js, dibuja con lowpoly.js y habla con la
   interfaz (interfaz.js) para mostrar pantallas, HUD y avisos.
   ===================================================================== */
const Juego = (() => {
  const W = 960, H = 540, TAU = Math.PI * 2;
  const lienzo = document.getElementById("lienzo");
  const ctx = lienzo.getContext("2d");
  const { clamp } = LP;
  const lerp = (a, b, f) => a + (b - a) * f;
  const suave = (f) => f * f * (3 - 2 * f);
  const azar = (semilla) => () => {
    semilla |= 0; semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /* ---------- Estado ---------- */
  let estado = "menu";            // menu | intro | jugando | llegando | pausa | plumaPausa | aro | pregunta | resumen | fin
  let nivelIdx = 0, N = NIVELES[0], M = null;
  let jugadores = [], partida = null;
  let cam = 0, sacudida = 0, destello = 0, destelloColor = "255,255,255", reloj = 0, ultimo = 0, hudT = 0;
  const teclas = new Set();
  const demo = { fase: 0, amp: 0, flapT: 0 };

  function ajustarLienzo() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    lienzo.width = W * dpr; lienzo.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- Construcción del mundo de un nivel ---------- */
  function crearMundo(idx) {
    const n = NIVELES[idx], L = n.largo, rnd = azar(n.semilla * 977 + 13), cw = 56;
    const altura = (i) => {
      const x = i * cw, s = suave(clamp((x - (L - 1500)) / 1150, 0, 1));
      const ruido = 22 * Math.sin(x * 0.0031 + 1) + 14 * Math.sin(x * 0.0097 + 0.5) + 8 * Math.sin(x * 0.021)
        + (LP.hash(i, 0, n.semilla) - 0.5) * 16;
      return 468 + ruido * (1 - s) - s * 290;
    };
    const suelo = (x) => { const i = Math.floor(x / cw), f = x / cw - i; return lerp(altura(i), altura(i + 1), f); };

    // térmicas
    const termicas = [], sp = (L - 2300) / n.termicas;
    for (let i = 0; i < n.termicas; i++) termicas.push({ x: (i === 0 ? 560 : 800 + i * sp) + (i ? (rnd() - 0.5) * sp * 0.35 : 0), w: 190 + rnd() * 70 });
    termicas.push({ x: L - 1380, w: 280 }, { x: L - 650, w: 250 });   // corrientes del risco: ayudan a subir al nido

    // carroña (algunas envenenadas, nunca la primera)
    const carronas = [], spc = (L - 2900) / n.carronas;
    for (let i = 0; i < n.carronas; i++) carronas.push({ x: 900 + i * spc + rnd() * 220, venenosa: false, estado: 0, comida: 0, por: null, gal: [] });
    const idxs = carronas.map((_, i) => i).slice(1).sort(() => rnd() - 0.5).slice(0, n.venenos);
    idxs.forEach((i) => { carronas[i].venenosa = true; });
    carronas.forEach((c) => {
      if (!c.venenosa) for (let k = 0; k < 3; k++) c.gal.push({ fase: rnd() * 6, r: 26 + rnd() * 34, v: 0.5 + rnd() * 0.6, dy: rnd() * 40 });
    });

    // cables con torres
    const cables = [], spk = (L - 4200) / Math.max(1, n.cables);
    for (let i = 0; i < n.cables; i++) {
      const x0 = 1700 + i * spk + rnd() * 150, x1 = x0 + 300 + rnd() * 110, y0 = 250 + rnd() * 60;
      cables.push({ x0, x1, y0, hund: 20 + rnd() * 14, lineas: rnd() > 0.5 ? [0, 42] : [0] });
    }

    // cazadores
    const cazadores = [], spz = (L - 4000) / Math.max(1, n.cazadores);
    for (let i = 0; i < n.cazadores; i++) cazadores.push({ x: 1900 + i * spz + rnd() * 200, estado: "espera", t: 0, obj: null, mira: { x: 0, y: 0 }, fijo: false });

    // tormentas
    const tormentas = [], spt = (L - 4600) / Math.max(1, n.tormentas);
    for (let i = 0; i < n.tormentas; i++) {
      tormentas.push({ x: 2500 + i * spt + rnd() * 120, w: 560 + rnd() * 180, y: 90 + rnd() * 40, semilla: i * 7 + 3,
        rayo: { estado: 0, t: 1.2 + rnd() * 1.5, x: 0 } });
    }

    // plumas en arcos de planeo
    const plumas = [], arcos = n.plumasArcos, spa = (L - 2800) / arcos;
    for (let k = 0; k < arcos; k++) {
      const x0 = 500 + k * spa + rnd() * 120, base = 190 + rnd() * 130;
      for (let j = 0; j < 5; j++) {
        const x = x0 + j * 52, y = base - Math.sin((j / 4) * Math.PI) * 55;
        if (y < suelo(x) - 70) plumas.push({ x, y, tomada: false, fase: j });
      }
    }

    // nubes decorativas
    const nubes = Array.from({ length: 16 }, (_, i) => ({ x: rnd() * 3000, y: 40 + rnd() * 190, s: 0.6 + rnd() * 0.9, par: 0.16 + rnd() * 0.3, sem: i * 5 }));

    const mundo = {
      L, suelo, altura, termicas, carronas, cables, cazadores, tormentas, plumas, nubes, part: [],
      nido: { x: L - 130, y: suelo(L - 130) - 6 },
      cielo: LP.crearCielo(n.cielo, n.semilla), volcan: LP.crearVolcan(n.paleta, n.semilla),
      mezclaSuelo: (i) => { const t = suave(clamp((i * cw - (L - 1700)) / 900, 0, 1)), q = n.paleta.suelo; return [q[0], lerp(q[1], 9, t), lerp(q[2], q[2] + 6, t)]; },
      topLejos: (i) => 405 - 105 * (0.35 * LP.hash(i, 1, n.semilla + 1) + 0.65 * (0.5 + 0.5 * Math.sin(i * 0.55 + n.semilla))),
      topMedio: (i) => 432 - 92 * (0.4 * LP.hash(i, 2, n.semilla + 2) + 0.6 * (0.5 + 0.5 * Math.sin(i * 0.8 + n.semilla * 2))),
      topCerca: (i) => 458 - 60 * (0.4 * LP.hash(i, 3, n.semilla + 3) + 0.6 * (0.5 + 0.5 * Math.sin(i * 1.1 + n.semilla * 3))),
      tips: new Set(), datosVistos: new Set(), datosNuevos: 0, limpias: 0, plumasTomadas: 0, vistaT: 0,
      seguras: carronas.filter((c) => !c.venenosa).length, tiempo: 0, llegadaT: 0, correcta: false, quizBonus: 0,
      pd: [], pdT: 4.5, pdTomadas: [], pdAparecidas: 0,
      aro: { x: (L - 130) * FISICA.aroPos, y: 215 + rnd() * 50, estado: 0, aviso: false }, aroAciertos: -1,
    };
    return mundo;
  }

  const ALT_Y = (y) => FISICA.altitudBase + (468 - y) * FISICA.altitudPorPixel;

  /* ---------- Jugadores ---------- */
  function crearJugadores() {
    const p = Almacen.prefs, dos = p.jugadores === 2;
    const sexos = dos ? [p.sexo, p.sexo === "macho" ? "hembra" : "macho"] : [p.sexo];
    return sexos.map((sexo, i) => {
      const c = CONDORES[sexo];
      const vidas = partida && partida.vidasIni[i] !== undefined ? partida.vidasIni[i] : FISICA.vidas;
      return {
        id: i, sexo, macho: sexo === "macho", nombre: dos ? `Jugador ${i + 1}` : `Cóndor ${sexo}`,
        x: 260 - i * 70, y: 170 + i * 60, vx: N.vel, vy: 0, energia: c.energia, energiaMax: c.energia,
        vidas, vivo: true, suelo: false, espera: 0, comiendo: null, noComer: 0, invul: 0, fase: 0, amp: 0, aleteoT: 0,
        vistaEspera: 0, vistaT: 0, glideT: 0, mult: 1, puntos: 0, aleteoSeg: 0, tiempo: 0, danos: 0, rot: 0,
        mordisco: 0, llego: false, auto: false, enTermica: false, enTormenta: false, escala: c.escala,
        pitch: 0, picada: 0, estelaT: 0, impulso: 0,
      };
    });
  }

  /* ---------- Entrada ---------- */
  const MAPAS = {
    uno: [{ izq: ["ArrowLeft", "KeyA"], der: ["ArrowRight", "KeyD"], aletear: ["ArrowUp", "KeyW", "Space"], picada: ["ArrowDown", "KeyS"], vista: ["KeyV", "KeyE"] }],
    dos: [
      { izq: ["KeyA"], der: ["KeyD"], aletear: ["KeyW"], picada: ["KeyS"], vista: ["KeyE"] },
      { izq: ["ArrowLeft"], der: ["ArrowRight"], aletear: ["ArrowUp"], picada: ["ArrowDown"], vista: ["KeyL"] },
    ],
  };
  const mapaDe = (p) => (jugadores.length === 2 ? MAPAS.dos : MAPAS.uno)[p.id];
  function entrada(p) {
    const m = mapaDe(p), k = (a) => a.some((c) => teclas.has(c));
    return { izq: k(m.izq), der: k(m.der), aletear: k(m.aletear), picada: k(m.picada) };
  }
  const CODIGOS_JUEGO = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "KeyW", "KeyA", "KeyS", "KeyD", "KeyE", "KeyL", "KeyV"]);

  function teclaAbajo(codigo) {
    if (estado !== "jugando" && estado !== "llegando") return;
    jugadores.forEach((p) => { if (mapaDe(p).vista.includes(codigo)) activarVista(p); });
  }

  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyM" && !e.repeat) { SND.alternar(); return; }
    if ((e.code === "Escape" || e.code === "KeyP") && !e.repeat) {
      if (estado === "jugando" || estado === "llegando") pausar(); else if (estado === "pausa") reanudar();
      return;
    }
    // Si estamos en pausa por la pluma dorada, solo reanuda cuando hayan pasado los 5 segundos
    if (estado === "plumaPausa") {
      e.preventDefault();
      if (!e.repeat && UI.plumaLista()) {
        reanudarPluma();
      }
      return;
    }
    if (CODIGOS_JUEGO.has(e.code) && (estado === "jugando" || estado === "llegando")) {
      e.preventDefault();
      if (!teclas.has(e.code)) { SND.iniciar(); teclaAbajo(e.code); }
      teclas.add(e.code);
    }
  });

  window.addEventListener("keyup", (e) => teclas.delete(e.code));
  window.addEventListener("blur", () => { teclas.clear(); if (estado === "jugando" || estado === "llegando") pausar(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && (estado === "jugando" || estado === "llegando")) pausar(); });

  // controles táctiles
  document.querySelectorAll("#tactil [data-tecla]").forEach((b) => {
    const codigo = b.dataset.tecla;
    const soltar = () => { teclas.delete(codigo); b.classList.remove("pulsado"); };
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault(); SND.iniciar(); b.setPointerCapture(e.pointerId);
      if (!teclas.has(codigo)) teclaAbajo(codigo);
      teclas.add(codigo); b.classList.add("pulsado");
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((ev) => b.addEventListener(ev, soltar));
    b.addEventListener("contextmenu", (e) => e.preventDefault());
  });

  /* ---------- Utilidades de juego ---------- */
  function emitir(x, y, n, colores, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = o.ang !== undefined ? o.ang + (Math.random() - 0.5) * (o.abre || 1) : Math.random() * TAU;
      const v = (o.vel || 80) * (0.4 + Math.random() * 0.8);
      const vida = (o.vida || 0.7) * (0.7 + Math.random() * 0.6);
      M.part.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.g !== undefined ? o.g : 200, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 8,
        tam: (o.tam || 4) * (0.7 + Math.random() * 0.7), vida, vidaMax: vida, color: colores[i % colores.length], encoge: true });
    }
    if (M.part.length > 280) M.part.splice(0, M.part.length - 280);
  }
  function tip(id, texto) { const vistos = partida ? partida.tips : M.tips; if (vistos.has(id)) return; vistos.add(id); UI.consejo(texto); }
  function mostrarDato(id) {
    const d = DATOS_CONDOR.find((x) => x.id === id);
    if (!d || M.datosVistos.has(id)) return;
    M.datosVistos.add(id);
    if (Almacen.descubrir(id)) { M.datosNuevos++; if (jugadores[0]) jugadores[0].puntos += 50; }
    UI.dato(d); SND.play("dato");
    if (Almacen.datos.size === DATOS_CONDOR.length) otorgar("coleccionista");
  }
  function otorgar(id) {
    if (Almacen.otorgar(id)) { const l = LOGROS.find((x) => x.id === id); if (l) { UI.logro(l); SND.play("logro"); } }
  }
  const vivos = () => jugadores.filter((p) => p.vivo);
  const puntosTotales = () => (partida ? partida.puntos : 0) + jugadores.reduce((s, p) => s + p.puntos, 0);

  /* ---------- Daño ---------- */
  function herir(p, causa) {
    if (!p.vivo || p.invul > 0 || p.impulso > 0) return;
    p.vidas--; p.danos++; p.invul = FISICA.invulnerable; p.glideT = 0;
    if (p.comiendo) { p.comiendo.obj.estado = 0; p.comiendo.obj.por = null; p.comiendo = null; }
    sacudida = 14; destello = 0.5; destelloColor = causa === "veneno" ? "120,220,90" : "230,60,50";
    SND.play("dano");
    emitir(p.x, p.y, 14, ["#1a1d27", "#2e3649", "#f4f6f7"], { vel: 140, g: 260, tam: 5, vida: 0.9 });
    p.vy = -150; p.vx *= 0.5;
    if (causa === "cables") mostrarDato("cables");
    if (causa === "veneno") mostrarDato("veneno");
    if (causa === "caza") mostrarDato("caza");
    if (causa === "rayo") UI.consejo("Un rayo con aviso: cuando veas la línea, sal de ahí.");
    if (p.vidas <= 0) { p.vivo = false; p.vy = -170; p.vx = 70; p.invul = 0; if (!vivos().length) setTimeout(() => terminarPartida(false), 1500); }
  }

  /* ---------- Vista de cóndor ---------- */
  function activarVista(p) {
    if (!p.vivo || p.comiendo) return;
    if (p.vistaEspera > 0 || p.energia < FISICA.vistaCoste) { if (p.vistaEspera <= 0) UI.consejo("Necesitas más energía para la Vista de cóndor."); return; }
    p.energia -= FISICA.vistaCoste; p.vistaEspera = FISICA.vistaEspera; p.vistaT = FISICA.vistaDuracion;
    M.vistaT = FISICA.vistaDuracion; partida.vistas++;
    SND.play("vista");
    if (partida.vistas >= 5) otorgar("ojo");
    mostrarDato("vista");
  }

  /* ---------- Alas y aleteo ---------- */
  function aletear(p) {
    const F = FISICA, c = CONDORES[p.sexo];
    if (p.energia < 0.5) { tip("sinEnergia", "Sin energía: planea y baja a comer carroña."); return false; }
    const desdeSuelo = p.suelo;
    p.energia = Math.max(0, p.energia - F.aleteoCoste * c.coste * (desdeSuelo ? F.despegueMultiplicador : 1));
    p.vy = -F.aleteoImpulso * (desdeSuelo ? 1.12 : 1) * (0.92 + 0.1 * c.agil);
    p.espera = F.aleteoEspera; p.aleteoT = 0.42; p.glideT = 0;
    if (desdeSuelo) {
      p.suelo = false; p.y -= 4;
      emitir(p.x, p.y + 16, 8, ["#b69a6a", "#d2b98a"], { ang: -Math.PI / 2, abre: 2.4, vel: 70, tam: 3.5 });
      mostrarDato("despegue");
    } else emitir(p.x - 10, p.y + 8, 2, ["rgba(255,255,255,.7)"], { ang: Math.PI * 0.6, abre: 0.8, vel: 50, g: 0, tam: 3, vida: 0.4 });
    SND.play("aleteo");
    return true;
  }

  /* ---------- Comer ---------- */
  function iniciarComer(p, c) {
    c.estado = 1; c.por = p; p.comiendo = { obj: c, prog: 0 };
    p.vx = 0; p.vy = 0; p.suelo = true; p.x = lerp(p.x, c.x, 0.7); p.y = M.suelo(p.x) - 18; p.mordisco = 0;
    p.glideT = 0;
  }
  function terminarComer(p, c) {
    c.estado = 2; c.por = null; p.comiendo = null; p.noComer = 1;
    if (c.venenosa) { herir(p, "veneno"); return; }
    p.energia = Math.min(p.energiaMax, p.energia + FISICA.comerEnergia);
    p.puntos += 100 * p.mult; M.limpias++;
    SND.play("dato");
    emitir(c.x, M.suelo(c.x) - 20, 12, ["#ffe08a", "#fff2c7", "#8fe58a"], { vel: 110, g: 120, tam: 4.5, vida: 0.9 });
    mostrarDato("carronero");
    const sig = ORDEN_CARRONA.find((id) => !Almacen.datos.has(id) && !M.datosVistos.has(id));
    if (sig && M.datosVistos.has("carronero")) setTimeout(() => { if (estado === "jugando") mostrarDato(sig); }, 700);
  }
  function actualizarComer(p, e, dt) {
    const c = p.comiendo.obj;
    p.comiendo.prog += dt / FISICA.comerTiempo;
    p.mordisco -= dt;
    if (p.mordisco <= 0) { p.mordisco = 0.28; SND.play("comer"); emitir(c.x, M.suelo(c.x) - 22, 4, ["#7a5532", "#a9825c", "#e6dcc9"], { vel: 70, g: 240, tam: 3, vida: 0.5, ang: -Math.PI / 2, abre: 1.6 }); }
    if (e.aletear && p.espera <= 0 && p.energia > 0.5) {
      c.estado = 0; c.por = null; p.comiendo = null; p.noComer = 0.9; aletear(p); return;
    }
    if (p.comiendo.prog >= 1) terminarComer(p, c);
  }

  /* ---------- Actualización de un jugador ---------- */
  function animarAlas(p, dt) {
    if (p.aleteoT > 0) { p.aleteoT -= dt; p.fase += dt * 17; p.amp = Math.min(1, p.amp + dt * 9); p.aleteoSeg += dt; }
    else p.amp = Math.max(0, p.amp - dt * 3.5);
  }
  function autopiloto(p, dt) {
    const n = M.nido, tx = n.x - 16 + p.id * 34, ty = n.y - 20;
    p.x = lerp(p.x, tx, Math.min(1, dt * 2.2)); p.y = lerp(p.y, ty, Math.min(1, dt * 2.2));
    p.vx = 0; p.vy = 0; p.suelo = Math.abs(p.y - ty) < 4;
    animarAlas(p, dt);
  }
  function actualizarJugador(p, dt) {
    const F = FISICA;
    if (!p.vivo) {
      p.vy += 520 * dt; p.x += p.vx * dt; p.vx *= 0.995; p.rot += dt * 3;
      p.y = Math.min(p.y + p.vy * dt, M.suelo(p.x) - 8); return;
    }
    if (p.auto) { autopiloto(p, dt); return; }
    const e = entrada(p), c = CONDORES[p.sexo];
    p.invul = Math.max(0, p.invul - dt); p.espera -= dt; p.vistaEspera = Math.max(0, p.vistaEspera - dt);
    p.vistaT = Math.max(0, p.vistaT - dt); p.noComer = Math.max(0, p.noComer - dt); p.tiempo += dt;
    animarAlas(p, dt);

    if (p.comiendo) { p.pitch += (0 - p.pitch) * Math.min(1, dt * 6); p.picada = Math.max(0, p.picada - dt * 6); actualizarComer(p, e, dt); return; }

    if (p.impulso > 0) { impulsoDorado(p, e, dt); return; }
    if (e.picada && !p.suelo) p.picada = Math.min(1, p.picada + dt / F.picadaRampa);
    else p.picada = Math.max(0, p.picada - dt * (p.suelo ? 6 : 1.6));
    const kp = suave(p.picada);
    let vxObj = N.vel;
    if (e.der) vxObj = F.velMax; if (e.izq) vxObj = F.velMin;
    if (!p.suelo) vxObj += 70 * kp;
    if (p.suelo) vxObj = e.der ? 60 : e.izq ? -30 : 0;
    const acc = F.aceleracion * c.agil * dt;
    p.vx += clamp(vxObj - p.vx, -acc, acc);

    let aire = 0; p.enTermica = false;
    for (const th of M.termicas) {
      const dx = Math.abs(p.x - th.x);
      if (dx < th.w / 2 && p.y > 50) {
        const f = 1 - (dx / (th.w / 2)) ** 2;
        aire = Math.min(aire, -F.termicaVel * (0.35 + 0.65 * f)); p.enTermica = true;
      }
    }
    if (p.enTermica && p.suelo && aire < -90) { p.suelo = false; p.y -= 3; p.vy = -40; }

    if (!p.suelo) {
      if (e.picada) p.vy = Math.min(F.picadaVel, p.vy + F.picadaAcel * (0.25 + 0.75 * kp) * dt);
      else {
        const k = lerp(F.picadaSoltar, F.gravedad / F.hundimiento, 1 - kp);
        p.vy += (F.gravedad - k * (p.vy - aire)) * dt;
      }
      if (kp > 0.5 && (p.estelaT -= dt) <= 0) {
        p.estelaT = 0.05;
        emitir(p.x - 30, p.y - 6 + (Math.random() - 0.5) * 30, 1, ["rgba(255,255,255,.75)"], { ang: Math.PI + 0.9, abre: 0.3, vel: 60, g: 0, tam: 3, vida: 0.35 });
      }
      p.energia = Math.max(0, p.energia - F.energiaPasiva * dt);
    }
    if (e.aletear && p.espera <= 0) aletear(p);
    if (p.enTermica) {
      p.termicaT = (p.termicaT || 0) + dt;
      tip("termica", "¡Térmica! Frena con ← y sube gratis, sin gastar energía.");
      if (p.termicaT > 1.6) mostrarDato("vuelo");
    }

    p.enTormenta = false;
    for (const s of M.tormentas) {
      if (Math.abs(p.x - s.x) < s.w / 2) {
        p.enTormenta = true; p.energia = Math.max(0, p.energia - 3 * dt); sacudida = Math.max(sacudida, 2);
        if (p.y < 340) p.vy += 330 * dt;
      }
    }

    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.y < 30) { p.y = 30; if (p.vy < 0) p.vy = 0; }
    p.x = clamp(p.x, 20, M.L + 300);

    const piso = M.suelo(p.x) - 18;
    if (p.suelo) { p.y = piso; p.vy = 0; }
    else if (p.y >= piso && p.vy >= 0) {
      if (p.vy > 260) { p.energia = Math.max(0, p.energia - 4); emitir(p.x, p.y + 16, 8, ["#b69a6a", "#d2b98a"], { vel: 90, tam: 3.5 }); }
      p.y = piso; p.vy = 0; p.suelo = true; p.vx *= 0.4;
    }

    const pitchObj = p.suelo ? 0 : p.picada > 0.05 ? clamp(0.12 + 0.62 * kp + p.vy * 0.0006, 0, 0.78) : clamp(p.vy * 0.0018, -0.45, 0.6);
    p.pitch += (pitchObj - p.pitch) * Math.min(1, dt * (p.picada > 0 ? 5 : 7));

    if (!p.suelo && p.aleteoT <= 0 && !e.aletear) p.glideT += dt; else if (e.aletear) p.glideT = 0;
    p.mult = 1 + Math.min(4, Math.floor(p.glideT / 2.5));
    peligros(p);
    recoger(p);
    if (p.energia <= 0 && !p.suelo) tip("sinEnergia", "Sin energía: planea y baja a comer carroña.");
  }

  function impulsoDorado(p, e, dt) {
    const F = FISICA;
    p.impulso -= dt; p.suelo = false; p.glideT = 0; p.picada = Math.max(0, p.picada - dt * 3);
    if (p.x > M.nido.x - 260) p.impulso = 0;
    let objY = Math.max(70, M.suelo(p.x + 240) - 120);
    objY += e.picada ? 70 : e.aletear ? -70 : 0;
    p.vy += (clamp((objY - p.y) * 2.4, -260, 260) - p.vy) * Math.min(1, dt * 4);
    p.vx += (F.aroImpulsoVel - p.vx) * Math.min(1, dt * 3.5);
    p.aleteoT = Math.max(p.aleteoT, 0.1); p.fase += dt * 9; p.amp = Math.min(0.55, p.amp + dt * 3);
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.pitch += (clamp(p.vy * 0.0018, -0.4, 0.5) - p.pitch) * Math.min(1, dt * 6);
    if ((p.estelaT -= dt) <= 0) { p.estelaT = 0.03; emitir(p.x - 34, p.y, 2, ["#ffcf55", "#fff2c7", "#ffe08a"], { ang: Math.PI, abre: 0.6, vel: 120, g: 0, tam: 5, vida: 0.55 }); }
    sacudida = Math.max(sacudida, 1.6);
    recoger(p);
    if (!p.llego && p.x > M.nido.x - 90 && Math.abs(p.y - M.nido.y) < 80) llegar(p);
    if (p.impulso <= 0) { p.impulso = 0; p.invul = Math.max(p.invul, 0.6); p.vx = Math.min(p.vx, F.velMax); }
  }

  function peligros(p) {
    for (const c of M.cables) {
      if (p.x > c.x0 - 14 && p.x < c.x1 + 14) {
        if (p.x > c.x0 && p.x < c.x1) {
          const f = (p.x - c.x0) / (c.x1 - c.x0), sag = c.hund * (1 - (2 * f - 1) ** 2);
          for (const off of c.lineas) {
            const y = c.y0 + off + sag;
            if (Math.abs(p.y - y) < 17) { herir(p, "cables"); p.vy = p.y < y ? -150 : 150; }
          }
        }
      }
    }
    for (const c of M.carronas) {
      if (c.estado === 0 && !c.por && !p.comiendo && p.noComer <= 0 && Math.abs(p.x - c.x) < 52 && p.y > M.suelo(c.x) - 72) { iniciarComer(p, c); break; }
    }
    if (!p.llego && p.x > M.nido.x - 90 && Math.abs(p.y - M.nido.y) < 80) llegar(p);
  }

  function recoger(p) {
    for (const f of M.plumas) {
      if (f.tomada) continue;
      const dx = f.x - p.x, dy = f.y - p.y;
      if (dx * dx + dy * dy < 30 * 30) {
        f.tomada = true; M.plumasTomadas++; p.puntos += 10 * p.mult; p.energia = Math.min(p.energiaMax, p.energia + 1.5);
        SND.play("pluma"); emitir(f.x, f.y, 6, ["#ffcf55", "#fff2c7"], { vel: 90, g: 40, tam: 3.5, vida: 0.5 });
      }
    }
  }

  function llegar(p) {
    p.llego = true; p.auto = true; p.invul = 99;
    if (estado === "jugando") {
      estado = "llegando"; M.llegadaT = 0; SND.play("nido");
      mostrarDato(N.datoNido);
      UI.consejo(nivelIdx === NIVELES.length - 1 ? "¡Llegaste al nido y el huevo está a salvo!" : "¡Llegaste al nido!", 3200);
      if (nivelIdx === 0) otorgar("primer_vuelo");
    }
    emitir(M.nido.x, M.nido.y - 20, 24, ["#ffcf55", "#fff2c7", "#ffffff"], { vel: 170, g: 60, tam: 5, vida: 1.3 });
  }

  function actualizarLlegada(dt) {
    M.llegadaT += dt;
    const faltan = vivos().filter((p) => !p.llego).length;
    if (!faltan || M.llegadaT > 3.8) { if (M.llegadaT > 2.2) finalizarNivel(); }
  }

  function actualizarCarronas(dt) {
    for (const c of M.carronas) {
      if (c.estado === 2 && c.comida < 1) c.comida = Math.min(1, c.comida + dt * 2.5);
      if (c.estado === 0 && cam < c.x && c.x < cam + W - 80) {
        if (!c.venenosa && N.id >= 1) { tip("gallinazos", "Los gallinazos dan vueltas sobre la comida segura. Baja en picada con ↓ para comer."); }
        if (c.venenosa) tip("morada", "¡Carroña morada! Está envenenada: no la comas.");
      }
    }
  }

  function actualizarCazadores(dt) {
    for (const c of M.cazadores) {
      c.t += dt;
      const gy = M.suelo(c.x), cerca = vivos().map((p) => ({ p, d: Math.hypot(p.x - c.x, p.y - gy) })).sort((a, b) => a.d - b.d)[0];
      if (c.estado === "espera") {
        if (cerca && cerca.d < 560 && !cerca.p.auto) {
          c.estado = "apunta"; c.t = 0; c.obj = cerca.p; c.fijo = false; c.mira = { x: cerca.p.x, y: cerca.p.y };
          SND.play("alarma"); tip("cazador", "¡Te apuntan! El láser se fija: muévete antes del disparo.");
        }
      } else if (c.estado === "apunta") {
        const dur = N.id >= 4 ? 1.2 : 1.45, p = c.obj;
        if (!p || !p.vivo || p.auto || Math.hypot(p.x - c.x, p.y - gy) > 680) { c.estado = "espera"; continue; }
        if (c.t < dur * 0.55) c.mira = { x: p.x, y: p.y };
        else if (!c.fijo) { c.fijo = true; SND.play("alarma"); }
        if (c.t >= dur) {
          SND.play("disparo"); sacudida = Math.max(sacudida, 4); destello = 0.25; destelloColor = "255,240,200";
          emitir(c.mira.x, c.mira.y, 6, ["#ffe08a", "#ff8a4a"], { vel: 90, tam: 4, vida: 0.4 });
          vivos().forEach((q) => { if (Math.hypot(q.x - c.mira.x, q.y - c.mira.y) < 42) herir(q, "caza"); });
          c.estado = "recarga"; c.t = 0;
        }
      } else if (c.t > 2.6) { c.estado = "espera"; c.t = 0; }
    }
  }

  function actualizarTormentas(dt) {
    for (const s of M.tormentas) {
      const r = s.rayo, cerca = vivos().some((p) => Math.abs(p.x - s.x) < s.w / 2 + 420);
      if (!cerca) continue;
      tip("tormenta", "Tormenta: empuja hacia abajo y gasta energía. Rodéala por debajo o espera una térmica.");
      r.t -= dt;
      if (r.estado === 0 && r.t <= 0) {
        const objetivos = vivos().filter((p) => Math.abs(p.x - s.x) < s.w / 2);
        const o = objetivos[Math.floor(Math.random() * objetivos.length)];
        r.x = o && Math.random() < 0.7 ? o.x + (Math.random() - 0.5) * 60 : s.x + (Math.random() - 0.5) * s.w * 0.8;
        r.x = clamp(r.x, s.x - s.w / 2 + 30, s.x + s.w / 2 - 30);
        r.estado = 1; r.t = 0.8; SND.play("alarma");
      } else if (r.estado === 1 && r.t <= 0) {
        r.estado = 2; r.t = 0.22; SND.play("rayo"); destello = 0.85; destelloColor = "255,255,255"; sacudida = Math.max(sacudida, 9);
        vivos().forEach((p) => { if (Math.abs(p.x - r.x) < 34 && p.y < M.suelo(p.x)) herir(p, "rayo"); });
      } else if (r.estado === 2 && r.t <= 0) { r.estado = 0; r.t = 1.3 + Math.random() * 1.6; }
    }
  }

  function elegirPlumaDorada() {
    const vistas = partida.pdVistas, delNivel = new Set(M.pdTomadas.map((f) => f.id));
    let pool = PLUMAS_DORADAS.filter((f) => !vistas.has(f.id));
    if (!pool.length) pool = PLUMAS_DORADAS.filter((f) => !delNivel.has(f.id));
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function actualizarPlumasDoradas(dt) {
    const F = FISICA, lejos = Math.max(...jugadores.map((p) => p.x)) / M.nido.x;
    M.pdT -= dt;
    if (M.pdT <= 0 && lejos < 0.66 && !M.pd.length) {
      const y0 = clamp(110 + Math.random() * 210, 90, M.suelo(cam + W) - 110);
      M.pd.push({ t: 0, sx: W + 50, y0, y: y0, fase: Math.random() * 6, fact: elegirPlumaDorada() });
      M.pdT = F.plumaDoradaCada[0] + Math.random() * (F.plumaDoradaCada[1] - F.plumaDoradaCada[0]);
      M.pdAparecidas++;
      tip("pdorada", "¡Pluma dorada! Tócala antes de que salga de la pantalla: dato real y +25 % de energía.");
    }
    const vel = (W + 110) / F.plumaDoradaViaje;
    for (let i = M.pd.length - 1; i >= 0; i--) {
      const f = M.pd[i]; f.t += dt; f.sx = W + 50 - f.t * vel; f.y = f.y0 + Math.sin(f.t * 2.2 + f.fase) * 26;
      let tomada = null;
      for (const p of vivos()) { if (!p.auto && Math.hypot(p.x - cam - f.sx, p.y - f.y) < 40) { tomada = p; break; } }
      if (tomada) {
        tomada.energia = Math.min(tomada.energiaMax, tomada.energia + tomada.energiaMax * F.plumaEnergia);
        tomada.puntos += 50;
        M.pdTomadas.push(f.fact); partida.pdVistas.add(f.fact.id);
        emitir(cam + f.sx, f.y, 16, ["#ffcf55", "#fff2c7", "#ffe08a"], { vel: 140, g: 30, tam: 5, vida: 0.9 });
        destello = Math.max(destello, 0.25); destelloColor = "255,220,120";
        SND.play("dato"); 
        
        // Pausar el juego y mostrar el recuadro central con temporizador de 5s
        M.pausadoEnLlegada = estado === "llegando";
        estado = "plumaPausa";
        teclas.clear();
        SND.viento(0);
        UI.plumaDoradaModal(f.fact);

        M.pd.splice(i, 1);
      } else if (f.sx < -70) M.pd.splice(i, 1);
    }
  }

  function preguntasAro() {
    const mezclar = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
    const idsNivel = M.pdTomadas.map((f) => f.id);
    const previas = [...partida.pdVistas].filter((id) => !idsNivel.includes(id));
    let orden = [...mezclar(idsNivel), ...mezclar(previas)];
    if (orden.length < 3) orden = orden.concat(mezclar(PLUMAS_DORADAS.map((f) => f.id).filter((id) => !orden.includes(id))));
    return orden.slice(0, 3).map((id) => {
      const f = PLUMAS_DORADAS.find((x) => x.id === id), correcta = f.opciones[f.correcta];
      const opciones = mezclar(f.opciones);
      return { pregunta: f.pregunta, opciones, correcta: opciones.indexOf(correcta), explicacion: f.texto, fuente: f.fuente, repaso: !idsNivel.includes(id) && !partida.pdVistas.has(id) };
    });
  }

  function actualizarAro(dt) {
    const a = M.aro; if (a.estado !== 0) return;
    const lejos = Math.max(...jugadores.map((p) => p.x));
    if (!a.aviso && cam + W > a.x - 40) { a.aviso = true; UI.consejo("¡Aro dorado! Atraviésalo para responder 3 preguntas: con 2 aciertos te da impulso.", 5000); SND.play("pluma"); }
    for (const p of vivos()) {
      if (p.auto || p.impulso > 0) continue;
      if (Math.abs(p.x - a.x) < 28 && Math.abs(p.y - a.y) < FISICA.aroRadio * 1.05) {
        a.estado = 1; estado = "aro"; teclas.clear(); SND.viento(0.1); SND.play("nido");
        emitir(a.x, a.y, 20, ["#ffcf55", "#fff2c7", "#ffe08a"], { vel: 160, g: 0, tam: 5, vida: 0.8 });
        UI.aroQuiz(preguntasAro());
        return;
      }
    }
    if (lejos > a.x + 170) { a.estado = 2; UI.consejo("Pasaste de largo el aro dorado."); }
  }

  function aroResultado(aciertos) {
    const ok = aciertos >= FISICA.aroAprobar;
    M.aroAciertos = aciertos;
    jugadores[0].puntos += 100 * aciertos;
    UI.ocultar(); estado = "jugando"; ultimo = performance.now(); hudT = 0;
    if (ok) {
      vivos().forEach((p) => { p.impulso = FISICA.aroImpulsoDuracion; p.vy = Math.min(p.vy, 0); });
      destello = 0.7; destelloColor = "255,220,120"; sacudida = 8; SND.play("logro");
      UI.consejo(`¡${aciertos} de 3! Impulso dorado: vuela hacia el nido.`, 3800);
      if (aciertos === 3) otorgar("aro_perfecto");
    } else UI.consejo(`${aciertos} de 3. El aro se apagó, pero sigue volando hacia el nido.`, 4200);
  }

  function actualizar(dt) {
    M.tiempo += dt;
    jugadores.forEach((p) => actualizarJugador(p, dt));
    if (jugadores.length === 2) vivos().forEach((p) => { if (!p.auto) p.x = clamp(p.x, cam + 34, cam + W - 60); });
    actualizarCarronas(dt); actualizarCazadores(dt); actualizarTormentas(dt);
    if (estado === "jugando") { actualizarPlumasDoradas(dt); actualizarAro(dt); }
    M.vistaT = Math.max(0, M.vistaT - dt);

    const v = vivos().length ? vivos() : jugadores;
    const mx = v.reduce((s, p) => s + p.x, 0) / v.length, mvx = v.reduce((s, p) => s + p.vx, 0) / v.length;
    const objetivo = clamp(mx - (270 + (mvx - N.vel) * 0.8), 0, M.L - 640);
    cam += (objetivo - cam) * Math.min(1, dt * 5);

    for (let i = M.part.length - 1; i >= 0; i--) {
      const q = M.part[i]; q.vida -= dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
      if (q.vida <= 0) M.part.splice(i, 1);
    }
    sacudida = Math.max(0, sacudida - dt * 30); destello = Math.max(0, destello - dt * 2.2);

    const vm = v.reduce((s, p) => s + Math.hypot(p.vx, p.vy), 0) / v.length;
    SND.viento(clamp(vm / 340, 0, 1));

    if (estado === "llegando") actualizarLlegada(dt);
    if (estado === "aro") return;

    hudT -= dt;
    if (hudT <= 0) { hudT = 0.1; UI.hudActualizar(estadoHud()); }
  }

  function estadoHud() {
    const lider = vivos()[0] || jugadores[0], lejos = Math.max(...jugadores.map((p) => p.x));
    return {
      nivel: `Nivel ${N.id}: ${N.nombre}`, puntos: puntosTotales(), altitud: ALT_Y(lider.y),
      limpio: M.seguras ? Math.round((M.limpias / M.seguras) * 100) : 100,
      combo: Math.max(...jugadores.filter((p) => p.vivo).map((p) => p.mult), 1),
      progreso: clamp(lejos / M.nido.x, 0, 1),
      jugadores: jugadores.map((p) => ({
        nombre: p.nombre, vidas: p.vidas, vidasMax: FISICA.vidas, energia: p.energia, energiaMax: p.energiaMax, vivo: p.vivo,
        vista: p.vistaT > 0 ? "Vista de cóndor activa" : p.vistaEspera > 0 ? `Vista de cóndor en ${Math.ceil(p.vistaEspera)} s` : "Vista de cóndor lista",
      })),
    };
  }

  function finalizarNivel() {
    if (estado !== "llegando") return;
    estado = "pregunta"; teclas.clear(); SND.viento(0.1);
    const pct = M.seguras ? Math.round((M.limpias / M.seguras) * 100) : 100;
    const aleteoPct = Math.round((jugadores.reduce((s, p) => s + p.aleteoSeg, 0) / Math.max(1, jugadores.reduce((s, p) => s + p.tiempo, 0))) * 100);
    const danos = jugadores.reduce((s, p) => s + p.danos, 0);
    let bonus = 0;
    vivos().forEach((p) => { bonus += Math.round(p.energia * 2 + p.vidas * 100); });
    M.resultado = { pct, aleteoPct, danos, bonus };
    partida.vidasIni = jugadores.map((p) => Math.min(FISICA.vidas, Math.max(1, p.vidas) + (p.vidas < FISICA.vidas ? 1 : 0)));
    if (aleteoPct < 12) otorgar("planeador");
    if (pct === 100 && M.seguras > 0) otorgar("limpiador");
    if (danos === 0) otorgar("intocable");
    UI.pregunta(nivelIdx);
  }

  function responder(i) {
    const ok = i === PREGUNTAS[N.pregunta].correcta;
    M.correcta = ok;
    if (ok) { M.quizBonus = 200; partida.correctas++; }
    return ok;
  }

  function continuarTrasPregunta() {
    const r = M.resultado, puntosNivel = jugadores.reduce((s, p) => s + p.puntos, 0) + r.bonus + M.quizBonus;
    partida.puntos += puntosNivel;
    const estrellas = 1 + (r.pct >= 70 ? 1 : 0) + (M.correcta ? 1 : 0);
    partida.estrellas[nivelIdx] = estrellas; partida.limpios[nivelIdx] = r.pct;
    if (estrellas === 3) otorgar("tres_estrellas");
    if (nivelIdx === NIVELES.length - 1 && partida.correctas === NIVELES.length) otorgar("sabio");
    estado = "resumen";
    UI.resumen({ indice: nivelIdx, nombre: N.nombre, estrellas, puntosNivel, limpio: r.pct, plumas: M.plumasTomadas, plumasTotal: M.plumas.length,
      aleteoPct: r.aleteoPct, danos: r.danos, datosNuevos: M.datosNuevos, correcta: M.correcta,
      plumasDoradas: M.pdTomadas.length, aro: M.aroAciertos });
  }

  function siguienteNivel() {
    if (nivelIdx >= NIVELES.length - 1) { terminarPartida(true); return; }
    nivelIdx++; cargarNivel(nivelIdx); estado = "intro"; UI.hudVisible(false); UI.limpiarAvisos(); UI.intro(nivelIdx);
  }

  function terminarPartida(victoria) {
    if (estado === "fin") return;
    estado = "fin"; teclas.clear(); SND.viento(0); SND.musica(false); UI.limpiarAvisos(); UI.hudVisible(false);
    const total = victoria ? partida.puntos : puntosTotales();
    if (victoria) { otorgar("guardian"); if (jugadores.length === 2) otorgar("pareja"); SND.play("nido"); } else SND.play("gameover");
    const limpios = partida.limpios.filter((x) => x !== undefined);
    UI.fin({ victoria, puntos: total, nivel: nivelIdx + 1, jugadores: jugadores.length,
      estrellasTotal: partida.estrellas.reduce((s, x) => s + (x || 0), 0),
      limpio: limpios.length ? Math.round(limpios.reduce((s, x) => s + x, 0) / limpios.length) : (M.seguras ? Math.round((M.limpias / M.seguras) * 100) : 0) });
  }

  function cargarNivel(i) {
    nivelIdx = i; N = NIVELES[i]; M = crearMundo(i); cam = 0; jugadores = []; sacudida = 0; destello = 0;
    const c = parseInt(N.cielo[2].slice(1), 16);
    M.nebRGB = `${c >> 16},${(c >> 8) & 255},${c & 255}`;
  }

  function nuevaPartida() {
    SND.iniciar(); SND.musica(true);
    partida = { puntos: 0, estrellas: [], limpios: [], correctas: 0, vistas: 0, vidasIni: [], tips: new Set(), pdVistas: new Set() };
    cargarNivel(0); estado = "intro"; UI.hudVisible(false); UI.limpiarAvisos(); UI.intro(0);
  }

  function empezarNivel() {
    SND.iniciar();
    cargarNivel(nivelIdx);
    jugadores = crearJugadores();
    partida.vidasSnap = partida.vidasIni.slice();
    estado = "jugando"; UI.ocultar(); UI.hudVisible(true); UI.limpiarAvisos(); teclas.clear(); hudT = 0; ultimo = performance.now();
    UI.consejo(nivelIdx === 0 ? "Mantén ↑ para aletear. Suéltala para planear y ganar puntos." : "Llega al nido sin perder tus vidas.", 4500);
  }

  function reiniciarNivel() {
    partida.vidasIni = partida.vidasSnap ? partida.vidasSnap.slice() : [];
    empezarNivel();
  }

  function pausar() {
    if (estado !== "jugando" && estado !== "llegando") return;
    M.pausadoEnLlegada = estado === "llegando"; estado = "pausa";
    teclas.clear(); SND.viento(0); UI.pausa();
  }

  function reanudar() { if (estado !== "pausa") return; UI.ocultar(); estado = M.pausadoEnLlegada ? "llegando" : "jugando"; ultimo = performance.now(); }

  function reanudarPluma() {
    if (estado !== "plumaPausa") return;
    UI.ocultar();
    estado = M.pausadoEnLlegada ? "llegando" : "jugando";
    ultimo = performance.now();
  }

  function alMenu() { estado = "menu"; teclas.clear(); SND.viento(0); SND.musica(false); UI.hudVisible(false); UI.limpiarAvisos(); cargarNivel(0); UI.menu(); }

  function neblina(a) {
    const g = ctx.createLinearGradient(0, 240, 0, 520);
    g.addColorStop(0, `rgba(${M.nebRGB},0)`); g.addColorStop(1, `rgba(${M.nebRGB},${a * 1.8})`);
    ctx.fillStyle = g; ctx.fillRect(0, 240, W, 300);
  }

  function humo(x, y, T) {
    for (let k = 0; k < 4; k++) {
      const ph = (T * 0.07 + k / 4) % 1, px = x + ph * 46 + Math.sin(T + k) * 5, py = y - ph * 120, r = 8 + ph * 26;
      ctx.globalAlpha = (1 - ph) * 0.4;
      LP.blob(ctx, px, py, r, 7, k, [LP.hsl(220, 8, 84), LP.hsl(220, 8, 74)], T * 0.2);
    }
    ctx.globalAlpha = 1;
  }

  function dibujarNubes(par0, par1, T) {
    const color = N.clima === "tormenta" ? [214, 12, 42] : N.clima === "tarde" ? [330, 40, 80] : N.clima === "amanecer" ? [18, 60, 88] : [200, 20, 97];
    for (const c of M.nubes) {
      if (c.par < par0 || c.par >= par1) continue;
      const ancho = W + 500, sx = (((c.x - cam * c.par + T * 4 * c.par) % ancho) + ancho) % ancho - 250;
      LP.nube(ctx, sx, c.y, c.s, c.sem, color, N.clima === "tormenta" ? 0.9 : 0.85);
    }
  }

  function dibujarJugador(p, T) {
    const o = { x: p.x - cam, y: p.y, pitch: p.pitch, picada: suave(p.picada), fase: p.fase, amp: p.amp, macho: p.macho, escala: p.escala,
      suelo: p.suelo, comiendo: !!p.comiendo, aleteando: p.aleteoT > 0, t: T, alpha: 1 };
    if (!p.vivo) { o.pitch = p.rot; o.alpha = 0.85; o.amp = 0; o.suelo = false; o.picada = 0; }
    else if (p.invul > 0 && p.invul < 90 && Math.floor(T * 14) % 2) o.alpha = 0.35;
    if (jugadores.length === 2 && p.vivo) {
      const col = p.id === 0 ? "#ffcf55" : "#6fd3ff";
      LP.tri(ctx, o.x - 7, o.y - 46, o.x + 7, o.y - 46, o.x, o.y - 36, col);
    }
    LP.condor(ctx, o);
    if (p.comiendo) {
      ctx.strokeStyle = "rgba(255,240,190,.95)"; ctx.lineWidth = 4; ctx.beginPath();
      ctx.arc(o.x, o.y - 40, 13, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(p.comiendo.prog, 0, 1)); ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(o.x, o.y - 40, 15.5, 0, TAU); ctx.stroke();
    }
    if (p.vistaT > 0) {
      const f = 1 - p.vistaT / FISICA.vistaDuracion;
      ctx.save(); ctx.globalAlpha = 0.5 * (1 - f); ctx.strokeStyle = "#ffe08a"; ctx.lineWidth = 3;
      ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + T, r = 30 + f * 90; ctx[k ? "lineTo" : "moveTo"](o.x + Math.cos(a) * r, o.y + Math.sin(a) * r); }
      ctx.closePath(); ctx.stroke(); ctx.restore();
    }
  }

  function dibujar() {
    if (!M) return;
    const n = N, pal = n.paleta, T = reloj;
    const sc = estado === "jugando" || estado === "llegando" || estado === "pausa" || estado === "plumaPausa" || estado === "aro";
    ctx.save();
    if (sacudida > 0.3) ctx.translate((Math.random() - 0.5) * sacudida, (Math.random() - 0.5) * sacudida);
    ctx.drawImage(M.cielo, 0, 0, W, H);
    if (n.sol) LP.sol(ctx, n.sol.x - cam * 0.02, n.sol.y, n.sol.r, n.sol.color, n.sol.halo, T);
    const vx = 20 - (cam / n.largo) * 300;
    ctx.drawImage(M.volcan, vx, 96);
    humo(vx + 470, 148, T);
    dibujarNubes(0, 0.3, T);
    LP.terreno(ctx, { cam, par: 0.1, cw: 96, top: M.topLejos, bottom: H, hsl: pal.lejos, semilla: n.semilla + 1, filas: 2 });
    neblina(0.16);
    LP.terreno(ctx, { cam, par: 0.28, cw: 84, top: M.topMedio, bottom: H, hsl: pal.medio, semilla: n.semilla + 2, filas: 2 });
    neblina(0.1);
    dibujarNubes(0.3, 1, T);
    LP.terreno(ctx, { cam, par: 0.52, cw: 72, top: M.topCerca, bottom: H, hsl: pal.cerca, semilla: n.semilla + 3, filas: 2 });
    LP.terreno(ctx, { cam, par: 1, cw: 56, top: M.altura, bottom: H + 40, hsl: pal.suelo, semilla: n.semilla + 4, filas: 3, mezcla: M.mezclaSuelo });

    const i0 = Math.floor(cam / 56) - 2;
    for (let i = i0; i < i0 + 23; i++) {
      const x = i * 56 - cam, y = M.altura(i), h = LP.hash(i, 77, n.semilla);
      if (h > 0.86) LP.frailejon(ctx, x, y + 2, 0.8 + h * 0.7, i, pal);
      else if (h > 0.6) LP.pajonal(ctx, x, y + 2, 0.8 + h * 0.4, [pal.suelo[0] - 10, 48, 54]);
      else if (h > 0.55) LP.roca(ctx, x, y + 2, 1 + h, [pal.suelo[0], 10, 40]);
    }

    for (const t of M.termicas) { const sx = t.x - cam; if (sx > -200 && sx < W + 200) LP.termica(ctx, sx, t.w, M.suelo(t.x), T, n.clima === "tormenta" ? 0.8 : 1); }
    for (const s of M.tormentas) dibujarTormenta(s, T);
    LP.nido(ctx, M.nido.x - cam, M.nido.y + 6, nivelIdx >= 3, T);
    if (M.aro.estado === 0 && sc) { const ax = M.aro.x - cam; if (ax > -120 && ax < W + 120) LP.aro(ctx, ax, M.aro.y, FISICA.aroRadio, T); }
    for (const c of M.cables) {
      const a = c.x0 - cam, b = c.x1 - cam; if (b < -50 || a > W + 50) continue;
      LP.torre(ctx, a, M.suelo(c.x0) + 4, c.y0 - 8); LP.torre(ctx, b, M.suelo(c.x1) + 4, c.y0 - 8);
      c.lineas.forEach((off) => LP.cable(ctx, a, b, c.y0 + off, c.hund, T));
    }

    const vista = M.vistaT > 0;
    for (const c of M.carronas) {
      const sx = c.x - cam; if (sx < -120 || sx > W + 120) continue;
      LP.carrona(ctx, sx, M.suelo(c.x) + 3, 1, c.estado === 2 ? c.comida : 0, c.venenosa, T);
      if (c.estado !== 2) {
        for (const g of c.gal) {
          const a = T * g.v + g.fase;
          LP.gallinazo(ctx, sx + Math.cos(a) * g.r, M.suelo(c.x) - 120 - g.dy + Math.sin(a) * 14, T + g.fase, 1);
        }
        if (vista) LP.marcador(ctx, sx, M.suelo(c.x) - 70, c.venenosa, T);
      }
    }

    for (const c of M.cazadores) {
      const sx = c.x - cam; if (sx < -80 || sx > W + 80) continue;
      const gy = M.suelo(c.x), apunta = c.estado === "apunta" || (c.estado === "recarga" && c.t < 0.4);
      const ang = Math.atan2(c.mira.y - (gy - 38), c.mira.x - (c.x + 3));
      LP.cazador(ctx, sx, gy + 2, apunta, ang, T);
      if (c.estado === "apunta" && c.obj) dibujarMira(c, gy, T);
    }

    for (const f of M.plumas) { const sx = f.x - cam; if (!f.tomada && sx > -30 && sx < W + 30) LP.pluma(ctx, sx, f.y, T, f.fase); }
    for (const f of M.pd) LP.plumaDorada(ctx, f.sx, f.y, T + f.fase);
    jugadores.forEach((p) => dibujarJugador(p, T));

    if (!sc && jugadores.length === 0) {
      LP.condor(ctx, { x: 330, y: 240 + Math.sin(T * 0.7) * 36, pitch: Math.cos(T * 0.7) * 0.12, fase: demo.fase, amp: demo.amp, macho: true, escala: 1.1, t: T });
    }

    for (const q of M.part) LP.particula(ctx, { ...q, x: q.x - cam });
    for (const s of M.tormentas) dibujarRayos(s, T);

    if (vista) { ctx.fillStyle = `rgba(40,50,110,${0.16 * clamp(M.vistaT, 0, 1)})`; ctx.fillRect(0, 0, W, H); }
    if (destello > 0) { ctx.fillStyle = `rgba(${destelloColor},${Math.min(0.7, destello)})`; ctx.fillRect(0, 0, W, H); }

    const j0 = jugadores[0];
    if (sc && j0 && j0.vivo && j0.energia / j0.energiaMax < 0.2 && Math.floor(T * 3) % 2) {
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.95);
      g.addColorStop(0, "rgba(220,60,40,0)"); g.addColorStop(1, "rgba(220,60,40,.32)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  function dibujarMira(c, gy, T) {
    const p = c.obj, objetivo = c.fijo ? c.mira : { x: p.x, y: p.y };
    const x0 = c.x + 3 - cam, y0 = gy - 38, x1 = objetivo.x - cam, y1 = objetivo.y;
    ctx.save(); ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(20,10,30,.45)"; ctx.lineWidth = c.fijo ? 6 : 4;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = c.fijo ? "#ff4a3d" : "#ffb35c"; ctx.lineWidth = c.fijo ? 3 : 2;
    ctx.setLineDash(c.fijo ? [] : [9, 9]); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
    if (c.fijo) {
      ctx.lineWidth = 3; ctx.beginPath();
      for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + T * 2, r = 30 + Math.sin(T * 20) * 3; ctx[k ? "lineTo" : "moveTo"](x1 + Math.cos(a) * r, y1 + Math.sin(a) * r); }
      ctx.closePath(); ctx.stroke();
    }
    ctx.restore();
  }

  function dibujarTormenta(s, T) {
    const sx = s.x - cam; if (sx + s.w / 2 < -100 || sx - s.w / 2 > W + 100) return;
    ctx.save();
    for (let k = 0; k < 7; k++) {
      const xx = sx - s.w / 2 + 60 + ((k * 83 + s.semilla * 13) % (s.w - 120)), yy = 140 + ((T * 90 + k * 71) % 200);
      LP.tri(ctx, xx, yy + 12, xx - 10, yy - 8, xx + 10, yy - 8, "rgba(120,140,170,.35)");
    }
    ctx.restore();
    LP.nubeTormenta(ctx, sx, s.y, s.w, s.semilla, T);
  }

  function dibujarRayos(s, T) {
    const sx = s.x - cam; if (sx + s.w / 2 < -100 || sx - s.w / 2 > W + 100) return;
    ctx.strokeStyle = "rgba(190,210,235,.35)"; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let k = 0; k < 34; k++) {
      const xx = sx - s.w / 2 + ((k * 97 + s.semilla * 31) % s.w), yy = 130 + ((T * 520 + k * 53) % 330);
      ctx.moveTo(xx, yy); ctx.lineTo(xx - 5, yy + 16);
    }
    ctx.stroke();
    const r = s.rayo, x = r.x - cam, gy = M.suelo(r.x);
    if (r.estado === 1) {
      const a = 0.35 + 0.35 * Math.abs(Math.sin(T * 18));
      ctx.strokeStyle = `rgba(255,230,120,${a})`; ctx.lineWidth = 3; ctx.setLineDash([10, 9]);
      ctx.beginPath(); ctx.moveTo(x, s.y + 40); ctx.lineTo(x, gy); ctx.stroke(); ctx.setLineDash([]);
      LP.tri(ctx, x - 12, gy, x + 12, gy, x, gy - 18, `rgba(255,230,120,${a})`);
    } else if (r.estado === 2) LP.rayo(ctx, x, s.y + 30, gy, Math.floor(T * 30), 1);
  }

  function actualizarDemo(dt) {
    cam = 400 + ((reloj * 62) % Math.max(1000, M.L - 3200));
    demo.flapT -= dt;
    if (demo.flapT <= 0) { demo.flapT = 2.6 + Math.random() * 2; demo.amp = 1; }
    demo.amp = Math.max(0, demo.amp - dt * 0.9); demo.fase += dt * (6 + demo.amp * 12);
    for (let i = M.part.length - 1; i >= 0; i--) { M.part.splice(i, 1); }
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (ts - ultimo) / 1000) || 0.016);
    ultimo = ts; reloj += dt;
    if (estado === "jugando" || estado === "llegando") actualizar(dt);
    else if (estado === "menu" || estado === "intro") actualizarDemo(dt);
    dibujar();
  }

  function iniciar() {
    ajustarLienzo(); window.addEventListener("resize", ajustarLienzo);
    cargarNivel(0);
    UI.hudVisible(false); UI.menu();
    requestAnimationFrame((t) => { ultimo = t; frame(t); });
  }

  return { iniciar, nuevaPartida, empezarNivel, reiniciarNivel, pausar, reanudar, reanudarPluma, alMenu, responder, continuarTrasPregunta, siguienteNivel, aroResultado,
    indiceNivel: () => nivelIdx, get estado() { return estado; }, get jugadores() { return jugadores; }, get mundo() { return M; } };
})();

Juego.iniciar();