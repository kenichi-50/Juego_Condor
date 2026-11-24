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

  let estado = "menu";
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

  function crearMundo(idx) {
    const n = NIVELES[idx], L = n.largo, rnd = azar(n.semilla * 977 + 13), cw = 56;
    const altura = (i) => {
      const x = i * cw, s = suave(clamp((x - (L - 1500)) / 1150, 0, 1));
      const ruido = 22 * Math.sin(x * 0.0031 + 1) + 14 * Math.sin(x * 0.0097 + 0.5) + 8 * Math.sin(x * 0.021)
        + (LP.hash(i, 0, n.semilla) - 0.5) * 16;
      return 468 + ruido * (1 - s) - s * 290;
    };
    const suelo = (x) => { const i = Math.floor(x / cw), f = x / cw - i; return lerp(altura(i), altura(i + 1), f); };

    const termicas = [], sp = (L - 2300) / n.termicas;
    for (let i = 0; i < n.termicas; i++) termicas.push({ x: (i === 0 ? 560 : 800 + i * sp) + (i ? (rnd() - 0.5) * sp * 0.35 : 0), w: 190 + rnd() * 70 });
    termicas.push({ x: L - 1380, w: 280 }, { x: L - 650, w: 250 });

    const carronas = [], spc = (L - 2900) / n.carronas;
    for (let i = 0; i < n.carronas; i++) carronas.push({ x: 900 + i * spc + rnd() * 220, venenosa: false, estado: 0, comida: 0, por: null, gal: [] });
    const idxs = carronas.map((_, i) => i).slice(1).sort(() => rnd() - 0.5).slice(0, n.venenos);
    idxs.forEach((i) => { carronas[i].venenosa = true; });
    carronas.forEach((c) => {
      if (!c.venenosa) for (let k = 0; k < 3; k++) c.gal.push({ fase: rnd() * 6, r: 26 + rnd() * 34, v: 0.5 + rnd() * 0.6, dy: rnd() * 40 });
    });

    const cables = [], spk = (L - 4200) / Math.max(1, n.cables);
    for (let i = 0; i < n.cables; i++) {
      const x0 = 1700 + i * spk + rnd() * 150, x1 = x0 + 300 + rnd() * 110, y0 = 250 + rnd() * 60;
      cables.push({ x0, x1, y0, hund: 20 + rnd() * 14, lineas: rnd() > 0.5 ? [0, 42] : [0] });
    }

    const cazadores = [], spz = (L - 4000) / Math.max(1, n.cazadores);
    for (let i = 0; i < n.cazadores; i++) cazadores.push({ x: 1900 + i * spz + rnd() * 200, estado: "espera", t: 0, obj: null, mira: { x: 0, y: 0 }, fijo: false });

    const tormentas = [], spt = (L - 4600) / Math.max(1, n.tormentas);
    for (let i = 0; i < n.tormentas; i++) {
      tormentas.push({ x: 2500 + i * spt + rnd() * 120, w: 560 + rnd() * 180, y: 90 + rnd() * 40, semilla: i * 7 + 3,
        rayo: { estado: 0, t: 1.2 + rnd() * 1.5, x: 0 } });
    }

    const plumas = [], arcos = n.plumasArcos, spa = (L - 2800) / arcos;
    for (let k = 0; k < arcos; k++) {
      const x0 = 500 + k * spa + rnd() * 120, base = 190 + rnd() * 130;
      for (let j = 0; j < 5; j++) {
        const x = x0 + j * 52, y = base - Math.sin((j / 4) * Math.PI) * 55;
        if (y < suelo(x) - 70) plumas.push({ x, y, tomada: false, fase: j });
      }
    }

    const nubes = Array.from({ length: 16 }, (_, i) => ({ x: rnd() * 3000, y: 40 + rnd() * 190, s: 0.6 + rnd() * 0.9, par: 0.16 + rnd() * 0.3, sem: i * 5 }));

    const poderes = [], tiposP = n.poderes || [], spp = (L - 3400) / Math.max(1, tiposP.length);
    tiposP.forEach((tipo, i) => {
      const x = 1100 + i * spp + rnd() * 160, y = clamp(160 + rnd() * 140, 120, suelo(x) - 130);
      poderes.push({ tipo, x, y, tomado: false, fase: rnd() * 6 });
    });

    const controles = [0.25, 0.5, 0.75].map((f) => ({ x: Math.round((L - 130) * f), activo: false, anim: 0 }));

    return {
      controles, control: null, poderes, L, suelo, altura, termicas, carronas, cables, cazadores, tormentas, plumas, nubes, part: [],
      nido: { x: L - 130, y: suelo(L - 130) - 6 },
      cielo: LP.crearCielo(n.cielo, n.semilla), volcan: LP.crearVolcan(n.paleta, n.semilla),
      mezclaSuelo: (i) => { const t = suave(clamp((i * cw - (L - 1700)) / 900, 0, 1)), q = n.paleta.suelo; return [q[0], lerp(q[1], 9, t), lerp(q[2], q[2] + 6, t)]; },
      topLejos: (i) => 405 - 105 * (0.35 * LP.hash(i, 1, n.semilla + 1) + 0.65 * (0.5 + 0.5 * Math.sin(i * 0.55 + n.semilla))),
      topMedio: (i) => 432 - 92 * (0.4 * LP.hash(i, 2, n.semilla + 2) + 0.6 * (0.5 + 0.5 * Math.sin(i * 0.8 + n.semilla * 2))),
      topCerca: (i) => 458 - 60 * (0.4 * LP.hash(i, 3, n.semilla + 3) + 0.6 * (0.5 + 0.5 * Math.sin(i * 1.1 + n.semilla * 3))),
      tips: new Set(), datosVistos: new Set(), datosNuevos: 0, limpias: 0, plumasTomadas: 0, vistaT: 0,
      seguras: carronas.filter((c) => !c.venenosa).length, tiempo: 0, llegadaT: 0, finT: 1.5, correcta: false, quizBonus: 0,
    };
  }

  const ALT_Y = (y) => FISICA.altitudBase + (468 - y) * FISICA.altitudPorPixel;

  function crearJugadores() {
    const p = Almacen.prefs, dos = p.jugadores === 2;
    const sexos = dos ? [p.sexo, p.sexo === "macho" ? "hembra" : "macho"] : [p.sexo];
    return sexos.map((sexo, i) => {
      const c = CONDORES[sexo];
      const vidas = partida && partida.vidasIni[i] !== undefined ? partida.vidasIni[i] : FISICA.vidas;
      return {
        id: i, sexo, macho: sexo === "macho", nombre: dos ? `Jugador ${i + 1}` : `Cóndor ${sexo}`,
        x: 260 - i * 70, y: 170 + i * 60, vx: N.vel, vy: 0, energia: c.energia, energiaMax: c.energia,
        vidas, vivo: vidas > 0, suelo: false, espera: 0, comiendo: null, noComer: 0, invul: 0, fase: 0, amp: 0, aleteoT: 0,
        vistaEspera: 0, vistaT: 0, glideT: 0, mult: 1, puntos: 0, aleteoSeg: 0, tiempo: 0, danos: 0, rot: 0,
        mordisco: 0, dir: 1, dirV: 1, dirS: 1, pod: { escudo: 0, rafaga: 0, termica: 0, iman: 0 }, vuelo: 1, spreadV: 1, pasoFase: 0, pasoAmp: 0, aterrizajeT: 0, despegueT: 0,
        causaMuerte: null, energiaAlerta: 0, modo: "planeando", avisoT: 0, avisoTxt: "", multPrev: 1, cv: null, llego: false, auto: false, enTermica: false, enTormenta: false, escala: c.escala,
      };
    });
  }

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
    if (CODIGOS_JUEGO.has(e.code) && (estado === "jugando" || estado === "llegando")) {
      e.preventDefault();
      if (!teclas.has(e.code)) { SND.iniciar(); teclaAbajo(e.code); }
      teclas.add(e.code);
    }
  });
  window.addEventListener("keyup", (e) => teclas.delete(e.code));
  window.addEventListener("blur", () => { teclas.clear(); if (estado === "jugando" || estado === "llegando") pausar(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && (estado === "jugando" || estado === "llegando")) pausar(); });

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

  function morir(p, causa) {
    if (!p.vivo) return;
    if (p.comiendo) {
      p.comiendo.obj.estado = 0;
      p.comiendo.obj.por = null;
      p.comiendo = null;
    }
    p.vivo = false;
    p.vidas = 0;
    p.causaMuerte = causa;
    p.modo = "muerto";
    p.vy = p.suelo ? 0 : -80;
    p.vx *= 0.3;
    p.invul = 0;
    p.aleteoT = 0;
    p.amp = 0;
    p.pasoAmp = 0;
    p.glideT = 0;
    p.mult = 1;
    p.auto = false;
    p.vistaT = 0;
    for (const k in p.pod) p.pod[k] = 0;

    if (causa === "agotamiento") {
      p.energia = 0;
      SND.play("dano");
      UI.consejo(`${p.nombre}: murió por agotamiento.`, 2500);
    } else {
      UI.consejo(`${p.nombre}: perdió todas sus vidas.`, 2500);
    }
    if (!vivos().length) M.finT = 1.5;
  }

  function herir(p, causa) {
    if (!p.vivo || p.invul > 0) return;
    if (p.pod.escudo > 0 && causa !== "veneno") {
      p.invul = Math.max(p.invul, 0.35); SND.play("escudo"); sacudida = Math.max(sacudida, 3);
      emitir(p.x, p.y, 12, ["#8fdcff", "#c9f0ff", "#ffffff"], { vel: 150, g: 0, tam: 4, vida: 0.5 });
      UI.consejo("¡El escudo te protegió!", 1800); return;
    }
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
    if (p.vidas <= 0) morir(p, causa);
  }

  function activarVista(p) {
    if (!p.vivo || p.comiendo) return;
    if (p.vistaEspera > 0 || p.energia < FISICA.vistaCoste) { if (p.vistaEspera <= 0) UI.consejo("Necesitas más energía para la Vista de cóndor."); return; }
    if (!consumirEnergia(p, FISICA.vistaCoste)) return;
    p.vistaEspera = FISICA.vistaEspera;
    p.vistaT = FISICA.vistaDuracion;
    M.vistaT = FISICA.vistaDuracion; partida.vistas++;
    SND.play("vista");
    if (partida.vistas >= 5) otorgar("ojo");
    mostrarDato("vista");
  }

  function aletear(p) {
    const F = FISICA, c = CONDORES[p.sexo];
    if (!p.vivo) return false;
    const desdeSuelo = p.suelo;
    const coste = F.aleteoCoste * c.coste * (desdeSuelo ? F.despegueMultiplicador : 1);
    if (!consumirEnergia(p, coste)) return false;
    p.vy = -F.aleteoImpulso * (desdeSuelo ? 1.12 : 1) * (0.92 + 0.1 * c.agil);
    p.espera = F.aleteoEspera; p.aleteoT = 0.42; p.glideT = 0;
    if (desdeSuelo) {
      p.suelo = false; p.y -= 4; p.despegueT = F.despegueTiempo; p.aterrizajeT = 0; p.pasoAmp = 0; p.pasoFase = 0;
      emitir(p.x, p.y + 16, 8, ["#b69a6a", "#d2b98a"], { ang: -Math.PI / 2, abre: 2.4, vel: 70, tam: 3.5 });
      mostrarDato("despegue");
    } else emitir(p.x - 10, p.y + 8, 2, ["rgba(255,255,255,.7)"], { ang: Math.PI * 0.6, abre: 0.8, vel: 50, g: 0, tam: 3, vida: 0.4 });
    SND.play("aleteo");
    return true;
  }

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

  function animarAlas(p, dt) {
    if (p.aleteoT > 0) { p.aleteoT -= dt; p.fase += dt * 17; p.amp = Math.min(1, p.amp + dt * 9); p.aleteoSeg += dt; }
    else p.amp = Math.max(0, p.amp - dt * 3.5);
  }
  function autopiloto(p, dt) {
    const n = M.nido, tx = n.x - 16 + p.id * 34, ty = n.y - 20;
    p.x = lerp(p.x, tx, Math.min(1, dt * 2.2)); p.y = lerp(p.y, ty, Math.min(1, dt * 2.2));
    p.vx = 0; p.vy = 0; p.dir = 1; p.dirV = 1; p.dirS = 1; p.suelo = Math.abs(p.y - ty) < 4;
    animarAlas(p, dt); actualizarPose(p, dt, {});
  }

  function consumirEnergia(p, cantidad) {
    if (!p.vivo) return false;
    p.energia = Math.max(0, p.energia - cantidad);
    if (p.energia <= 0) { morir(p, "agotamiento"); return false; }
    const porcentaje = p.energia / p.energiaMax;
    if (porcentaje <= FISICA.energiaCritica) {
      if (p.energiaAlerta < 2) UI.consejo("Energía crítica: busca alimento.", 3000);
      p.energiaAlerta = 2;
    } else if (porcentaje <= FISICA.energiaBaja) {
      if (p.energiaAlerta < 1) UI.consejo("Energía baja: evita aletear demasiado.", 3000);
      p.energiaAlerta = 1;
    } else {
      p.energiaAlerta = 0;
    }
    return true;
  }

  function actualizarJugador(p, dt) {
    const F = FISICA;
    if (!p.vivo) {
      const piso = M.suelo(p.x) - 8;
      if (p.y < piso && !p.suelo) {
        p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        p.rot = Math.min(Math.PI / 2, p.rot + dt * 3);
      } else {
        p.y = piso; p.vx = 0; p.vy = 0; p.suelo = true;
        p.rot += (Math.PI / 2 - p.rot) * Math.min(1, dt * 8);
      }
      return;
    }
    if (p.auto) { autopiloto(p, dt); return; }
    const e = entrada(p), c = CONDORES[p.sexo];
    p.invul = Math.max(0, p.invul - dt); p.espera -= dt; p.vistaEspera = Math.max(0, p.vistaEspera - dt);
    p.vistaT = Math.max(0, p.vistaT - dt); p.noComer = Math.max(0, p.noComer - dt); p.tiempo += dt;
    for (const k in p.pod) p.pod[k] = Math.max(0, p.pod[k] - dt);
    p.avisoT = Math.max(0, p.avisoT - dt);
    p.aterrizajeT = Math.max(0, p.aterrizajeT - dt);
    p.despegueT = Math.max(0, p.despegueT - dt);

    animarAlas(p, dt);

    if (p.comiendo) {
      if (!consumirEnergia(p, F.energiaReposo * dt)) return;
      actualizarComer(p, e, dt);
      if (p.vivo) actualizarPose(p, dt, e);
      return;
    }

    if (e.izq && !e.der) p.dir = -1; else if (e.der && !e.izq) p.dir = 1;
    const dir = p.dir;
    let vel = N.vel;
    if (e.der) vel = F.velMax; else if (e.izq) vel = F.velMax * 0.85;
    else if (p.enTermica) vel = N.vel * 0.5;
    let vxObj = dir * vel;
    if (e.picada && !p.suelo) vxObj += 40 * dir;
    if (p.pod.rafaga > 0 && !p.suelo) vxObj += F.rafagaVel * dir;
    if (p.suelo) vxObj = (Number(e.der) - Number(e.izq)) * F.caminataVel;
    p.dirV += (dir - p.dirV) * Math.min(1, dt * 9); p.dirS += (dir - p.dirS) * Math.min(1, dt * 3);
    const acc = (p.suelo ? F.caminataAcel : F.aceleracion) * c.agil * dt;
    p.vx += clamp(vxObj - p.vx, -acc, acc);

    let aire = 0; p.enTermica = false;
    for (const th of M.termicas) {
      const dx = Math.abs(p.x - th.x);
      if (dx < th.w / 2 && p.y > 50) {
        const f = 1 - (dx / (th.w / 2)) ** 2;
        aire = Math.min(aire, -F.termicaVel * (0.35 + 0.65 * f)); p.enTermica = true;
      }
    }
    if (p.pod.termica > 0) aire = Math.min(aire, -F.termicaVel * 0.95);
    if (p.suelo) p.enTermica = false;

    if (!p.suelo) {
      if (e.picada) p.vy = Math.min(F.picadaVel, p.vy + F.picadaAcel * dt);
      else p.vy += (F.gravedad - (F.gravedad / (F.hundimiento * (p.pod.rafaga > 0 ? F.rafagaHund : 1))) * (p.vy - aire)) * dt;
      const consumo = p.enTermica || p.pod.termica > 0 ? F.energiaTermica : F.energiaPasiva;
      if (!consumirEnergia(p, consumo * dt)) return;
    }

    if (e.aletear && p.espera <= 0) {
      aletear(p);
      if (!p.vivo) return;
    }

    if (p.enTermica) {
      p.termicaT = (p.termicaT || 0) + dt;
      tip("termica", "¡Térmica! Aquí vas más despacio y subes gratis. Para quedarte más, alterna ← y →.");
      if (p.termicaT > 1.6) mostrarDato("vuelo");
    }

    p.enTormenta = false;
    for (const s of M.tormentas) {
      if (Math.abs(p.x - s.x) < s.w / 2) {
        p.enTormenta = true;
        if (!consumirEnergia(p, F.energiaTormenta * dt)) return;
        sacudida = Math.max(sacudida, 2);
        if (p.y < 340) p.vy += 330 * dt;
      }
    }

    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.y < 30) { p.y = 30; if (p.vy < 0) p.vy = 0; }
    p.x = clamp(p.x, 20, M.L + 300);

    const piso = M.suelo(p.x) - 18;
    if (p.suelo) { p.y = piso; p.vy = 0; }
    else if (p.y >= piso && p.vy >= 0) {
      if (p.vy > 260) {
        if (!consumirEnergia(p, 4)) return;
        emitir(p.x, p.y + 16, 8, ["#b69a6a", "#d2b98a"], { vel: 90, tam: 3.5 });
      }
      p.y = piso; p.vy = 0; p.suelo = true; p.vx *= 0.4;
      p.aterrizajeT = F.aterrizajeTiempo; p.despegueT = 0; p.aleteoT = 0; p.amp = 0;
    }

    if (!p.suelo && p.aleteoT <= 0 && !e.aletear) p.glideT += dt;
    else if (e.aletear || p.suelo) p.glideT = 0;
    p.mult = 1 + Math.min(4, Math.floor(p.glideT / 2.5));
    if (p.mult > p.multPrev) { p.avisoT = 1.3; p.avisoTxt = "Planeo ×" + p.mult; }
    p.multPrev = p.mult;

    peligros(p);
    if (!p.vivo) return;
    recoger(p, dt);
    if (p.pod.termica > 0 && Math.random() < dt * 16) emitir(p.x + (Math.random() - 0.5) * 60, p.y + 34, 1, ["#ffb25a", "#ffd9a0"], { ang: -Math.PI / 2, abre: 0.6, vel: 90, g: -30, tam: 4, vida: 0.7 });
    if (p.pod.rafaga > 0 && Math.random() < dt * 22) emitir(p.x - 40, p.y + (Math.random() - 0.5) * 50, 1, ["#8fe58a", "#d4ffcf"], { ang: Math.PI, abre: 0.3, vel: 160, g: 0, tam: 3.5, vida: 0.45 });
    actualizarPose(p, dt, e);
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
    if (!p.vivo) return;
    for (const c of M.carronas) {
      if (c.estado === 0 && !c.por && !p.comiendo && p.noComer <= 0 && Math.abs(p.x - c.x) < 52 && p.y > M.suelo(c.x) - 72) { iniciarComer(p, c); break; }
    }
    if (!p.llego && p.x > M.nido.x - 90 && Math.abs(p.y - M.nido.y) < 80) llegar(p);
  }

  function recoger(p, dt) {
    for (const q of M.poderes) {
      if (q.tomado) continue;
      const dx = q.x - p.x, dy = q.y - p.y;
      if (dx * dx + dy * dy < 38 * 38) { q.tomado = true; activarPoder(p, q); }
    }
    if (p.pod.iman > 0) {
      const R = FISICA.imanRadio;
      for (const f of M.plumas) {
        if (f.tomada) continue;
        const dx = p.x - f.x, dy = p.y - f.y, d = Math.hypot(dx, dy);
        if (d < R && d > 1) { const m = Math.min(d, 460 * dt); f.x += (dx / d) * m; f.y += (dy / d) * m; }
      }
    }
    for (const f of M.plumas) {
      if (f.tomada) continue;
      const dx = f.x - p.x, dy = f.y - p.y;
      if (dx * dx + dy * dy < 30 * 30) {
        f.tomada = true; M.plumasTomadas++; p.puntos += 10 * p.mult; p.energia = Math.min(p.energiaMax, p.energia + 1.5);
        SND.play("pluma"); emitir(f.x, f.y, 6, ["#ffcf55", "#fff2c7"], { vel: 90, g: 40, tam: 3.5, vida: 0.5 });
      }
    }
  }

  function activarPoder(p, q) {
    const def = PODERES[q.tipo];
    if (q.tipo === "energia") p.energia = Math.min(p.energiaMax, p.energia + FISICA.energiaPoder); else p.pod[q.tipo] = def.dur;
    p.puntos += 50; partida.poderes.add(q.tipo);
    if (partida.poderes.size >= Object.keys(PODERES).length) otorgar("poderoso");
    SND.play("poder");
    emitir(q.x, q.y, 18, [def.color, "#ffffff", LP.tono(def.color, 0.5)], { vel: 190, g: 20, tam: 5, vida: 0.8 });
    UI.consejo(`${def.nombre}: ${def.corto}`, 3600);
  }

  function actualizarPose(p, dt, e) {
    let modo;
    const distanciaSuelo = M.suelo(p.x) - 18 - p.y;
    const preparandoAterrizaje = !p.suelo && !e.aletear && !e.picada && p.vy > 0 && p.vy <= FISICA.aterrizajeVelocidad && distanciaSuelo >= 0 && distanciaSuelo <= FISICA.aterrizajeDistancia;

    if (p.comiendo) modo = "comiendo";
    else if (p.despegueT > 0 && !p.suelo) modo = "despegando";
    else if (p.aterrizajeT > 0 || preparandoAterrizaje) modo = "aterrizando";
    else if (p.suelo) modo = Math.abs(p.vx) > 3 ? "caminando" : "suelo";
    else if (e.picada) modo = "picada";
    else if (p.aleteoT > 0) modo = "aleteando";
    else if (p.enTermica || p.pod.termica > 0) modo = "termica";
    else modo = "planeando";

    if (modo !== p.modo) {
      if (["aleteando", "planeando", "termica", "picada", "aterrizando", "despegando"].includes(modo)) { p.avisoT = 1.3; p.avisoTxt = MODOS[modo].texto; }
      if (modo === "aleteando") tip("mAle", "Aleteando: las alas se mueven y gastas energía. Suelta ↑ para planear gratis.");
      if (modo === "planeando" && p.modo === "aleteando") tip("mPla", "Planeando: alas abiertas y quietas. ¡Es gratis y suma combo de puntos!");
      p.modo = modo;
    }

    const enAire = !p.suelo && modo !== "comiendo";
    const intensidad = modo === "caminando" ? clamp(Math.abs(p.vx) / FISICA.caminataVel, 0, 1) : 0;
    p.pasoAmp += (intensidad - p.pasoAmp) * Math.min(1, dt * 12);
    if (intensidad > 0) {
      p.pasoFase += dt * Math.PI * FISICA.caminataPasos * intensidad;
      p.pasoFase %= TAU;
    }
    if (enAire || p.comiendo) p.pasoAmp = 0;

    let vueloObjetivo = enAire ? 1 : 0;
    let alasObjetivo = enAire ? 1 : 0;
    if (modo === "picada") alasObjetivo = 0.12;
    if (modo === "aterrizando") { vueloObjetivo = p.suelo ? 0 : 0.35; alasObjetivo = p.suelo ? 0 : 0.65; }
    if (modo === "despegando") { vueloObjetivo = 1; alasObjetivo = 1; }

    p.vuelo += (vueloObjetivo - p.vuelo) * Math.min(1, dt * 7);
    p.spreadV += (alasObjetivo - p.spreadV) * Math.min(1, dt * 8);
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

  function activarControl(c) {
    c.activo = true; M.control = c; SND.play("control");
    emitir(c.x, M.suelo(c.x) - 90, 22, ["#ffe08a", "#ffffff", "#ffcf55"], { vel: 210, g: 60, tam: 5, vida: 1 });
    vivos().forEach((p) => { p.energia = Math.min(p.energiaMax, p.energia + 25); });
    const n = M.controles.filter((q) => q.activo).length;
    UI.consejo(`Punto de control ${n} de ${M.controles.length}: +25 de energía.`, 3800);
  }
  function actualizarControles(dt) {
    for (const c of M.controles) {
      if (c.activo) { c.anim = Math.min(1, c.anim + dt * 1.6); continue; }
      if (c.x > cam && c.x < cam + W) tip("control", "Bandera de punto de control: pásala para guardar tu avance.");
      if (vivos().some((p) => p.x >= c.x)) activarControl(c);
    }
  }
  function perderTodo() {
    if (estado !== "jugando" && estado !== "llegando") return;
    if (vivos().length) return;
    terminarPartida(false);
  }

  function actualizarCarronas(dt) {
    for (const c of M.carronas) {
      if (c.estado === 2 && c.comida < 1) c.comida = Math.min(1, c.comida + dt * 2.5);
      if (c.estado === 0 && cam < c.x && c.x < cam + W - 80) {
        if (!c.venenosa && N.id >= 1) tip("gallinazos", "Los gallinazos dan vueltas sobre la comida segura. Baja en picada con ↓ para comer.");
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

  function actualizar(dt) {
    M.tiempo += dt;
    jugadores.forEach((p) => actualizarJugador(p, dt));
    if (jugadores.length === 2) vivos().forEach((p) => { if (!p.auto) p.x = clamp(p.x, cam + 34, cam + W - 60); });
    actualizarCarronas(dt); actualizarCazadores(dt); actualizarTormentas(dt); actualizarControles(dt);
    M.vistaT = Math.max(0, M.vistaT - dt);

    const v = vivos().length ? vivos() : jugadores;
    const mx = v.reduce((s, p) => s + p.x, 0) / v.length, mvx = v.reduce((s, p) => s + p.vx, 0) / v.length;
    const dS = v.reduce((s2, p) => s2 + p.dirS, 0) / v.length;
    const objetivo = clamp(mx - (480 - dS * 170 + dS * (Math.abs(mvx) - N.vel) * 0.35), 0, M.L - 640);
    cam += (objetivo - cam) * Math.min(1, dt * 5);

    for (let i = M.part.length - 1; i >= 0; i--) {
      const q = M.part[i]; q.vida -= dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
      if (q.vida <= 0) M.part.splice(i, 1);
    }
    sacudida = Math.max(0, sacudida - dt * 30); destello = Math.max(0, destello - dt * 2.2);

    const vm = v.reduce((s, p) => s + Math.hypot(p.vx, p.vy), 0) / v.length;
    SND.viento(clamp(vm / 340, 0, 1));

    if (!vivos().length) {
      M.finT -= dt;
      if (M.finT <= 0) { perderTodo(); return; }
    } else if (estado === "llegando") {
      actualizarLlegada(dt);
    }
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
      controles: { total: M.controles.length, activos: M.controles.filter((c) => c.activo).length, marcas: M.controles.map((c) => ({ pos: c.x / M.nido.x, activo: c.activo })) },
      jugadores: jugadores.map((p) => ({
        nombre: p.nombre, vidas: p.vidas, vidasMax: FISICA.vidas, energia: p.energia, energiaMax: p.energiaMax, vivo: p.vivo,
        modo: { id: p.modo, texto: MODOS[p.modo].texto, ayuda: MODOS[p.modo].ayuda },
        poderes: Object.keys(p.pod).filter((k) => p.pod[k] > 0).map((k) => ({ id: k, t: Math.ceil(p.pod[k]), nombre: PODERES[k].nombre, color: PODERES[k].color })),
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
    partida.vidasIni = jugadores.map((p) => p.vivo ? Math.min(FISICA.vidas, p.vidas + 1) : 0);
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
      aleteoPct: r.aleteoPct, danos: r.danos, datosNuevos: M.datosNuevos, correcta: M.correcta });
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
    partida = { puntos: 0, estrellas: [], limpios: [], correctas: 0, vistas: 0, vidasIni: [], tips: new Set(), poderes: new Set() };
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
    SND.musica(true); empezarNivel();
  }
  function pausar() {
    if (estado !== "jugando" && estado !== "llegando") return;
    M.pausadoEnLlegada = estado === "llegando"; estado = "pausa";
    teclas.clear(); SND.viento(0); UI.pausa();
  }
  function reanudar() { if (estado !== "pausa") return; UI.ocultar(); estado = M.pausadoEnLlegada ? "llegando" : "jugando"; ultimo = performance.now(); if (!vivos().length) perderTodo(); }
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

  const SPW = 360, SPH = 300;
  function trazarCondor(h, x, y, o) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!h.cv) { h.cv = document.createElement("canvas"); h.cv.width = SPW * dpr; h.cv.height = SPH * dpr; h.c2 = h.cv.getContext("2d"); }
    const c2 = h.c2, v = o.vuelo;
    c2.setTransform(dpr, 0, 0, dpr, 0, 0); c2.clearRect(0, 0, SPW, SPH);
    Condor3D.sprite(c2, {
      pasoFase: o.pasoFase, pasoAmp: o.pasoAmp, macho: o.macho, accesorio: o.accesorio,
      spread: o.spread, psi: o.psi, rx: v * 0.9, yaw: lerp(-1.5, -2.3, v), pitch: lerp(0.12, 0.75, v),
      dist: 6, f: 432, cx: SPW / 2, cy: SPH / 2, t: o.t, nod: o.nod, look: o.look, tilt: o.tilt,
    });
    ctx.save();
    const balanceo = (o.pasoAmp || 0) * (1 - Math.cos(2 * (o.pasoFase || 0))) * 1.5;
    const altura = (1 - v) * (0.85 * 72 * (o.macho ? 1 : 0.9) - 18);
    ctx.translate(x, y - altura - balanceo);
    ctx.scale(o.dir === undefined ? 1 : o.dir, 1); ctx.rotate(o.ang || 0);
    ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha; ctx.drawImage(h.cv, -SPW / 2, -SPH / 2, SPW, SPH); ctx.restore();
  }

  function estelaPlaneo(x, y, p, T) {
    const dorado = p.mult > 1, len = 46 + Math.min(90, p.glideT * 16), a = 0.3 + Math.min(0.4, p.glideT * 0.05), col = dorado ? "255,224,138" : "205,240,255";
    ctx.save(); ctx.lineCap = "round"; ctx.lineWidth = 3;
    [[-34, 1], [-8, 1.35], [20, 1.1], [46, 0.8]].forEach(([dy, k]) => {
      const d = p.dirV >= 0 ? 1 : -1, x0 = x - d * (70 + len * k), x1 = x - d * 58, g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${a})`);
      ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(x0, y + dy + Math.sin(T * 3 + dy) * 3); ctx.lineTo(x1, y + dy); ctx.stroke();
    });
    ctx.restore();
  }
  const COLOR_MODO = {
    aleteando: "#ffb06a", planeando: "#9fe3ff", termica: "#ffd46e",
    picada: "#ff8a7a", aterrizando: "#a8e6a3", despegando: "#ffe08a",
  };
  function dibujarJugador(p, T) {
    const x = p.x - cam, y = p.y;
    let alpha = 1;
    if (!p.vivo) alpha = 0.85; else if (p.invul > 0 && p.invul < 90 && Math.floor(T * 14) % 2 && p.pod.escudo <= 0) alpha = 0.35;
    if (jugadores.length === 2 && p.vivo) LP.tri(ctx, x - 7, y - 74, x + 7, y - 74, x, y - 62, p.id === 0 ? "#ffcf55" : "#6fd3ff");
    if (p.vivo && (p.modo === "planeando" || p.modo === "termica") && p.vuelo > 0.6) estelaPlaneo(x, y, p, T);
    const flap = p.suelo ? 0 : p.aleteoT > 0 ? 0.8 * p.amp * Math.sin(p.fase) : 0.05 * Math.sin(T * 1.6) * p.spreadV;
    const nod = p.comiendo ? 0.95 + 0.12 * Math.sin(T * 14) : p.modo === "picada" ? 0.12 : -0.05 + 0.04 * Math.sin(T * 1.7);
    trazarCondor(p, x, y, {
      pasoFase: p.pasoFase, pasoAmp: p.vivo && p.suelo ? p.pasoAmp : 0, macho: p.macho,
      accesorio: (Almacen.prefs && Almacen.prefs.accesorio) || "ninguno",
      vuelo: p.vivo ? p.vuelo : 1, spread: p.vivo ? p.spreadV : 0.35, psi: p.vivo ? flap : 0,
      dir: p.vivo ? p.dirV : 1, nod: p.vivo ? nod : 0, look: 0.05 * Math.sin(T * 0.8), tilt: 0.04 * Math.sin(T * 1.3), t: T, alpha,
      ang: p.vivo ? clamp(p.vy * 0.0016, -0.3, 0.45) * p.vuelo : p.rot,
    });
    if (p.vivo && p.pod.iman > 0) {
      ctx.save(); ctx.strokeStyle = "rgba(95,224,200,.55)"; ctx.lineWidth = 2.5; ctx.setLineDash([10, 9]); ctx.lineDashOffset = -T * 40;
      ctx.beginPath(); ctx.arc(x, y, FISICA.imanRadio * (0.92 + 0.04 * Math.sin(T * 5)), 0, TAU); ctx.stroke(); ctx.restore();
    }
    if (p.vivo && p.pod.escudo > 0) LP.escudo(ctx, x, y, T, p.pod.escudo < 2 ? 0.4 + 0.6 * Math.abs(Math.sin(T * 12)) : 1);
    if (p.comiendo) {
      ctx.strokeStyle = "rgba(255,240,190,.95)"; ctx.lineWidth = 4; ctx.beginPath();
      ctx.arc(x, y - 56, 13, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(p.comiendo.prog, 0, 1)); ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y - 56, 15.5, 0, TAU); ctx.stroke();
    }
    if (p.vistaT > 0) {
      const f = 1 - p.vistaT / FISICA.vistaDuracion;
      ctx.save(); ctx.globalAlpha = 0.5 * (1 - f); ctx.strokeStyle = "#ffe08a"; ctx.lineWidth = 3;
      ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + T, r = 30 + f * 90; ctx[k ? "lineTo" : "moveTo"](x + Math.cos(a) * r, y + Math.sin(a) * r); }
      ctx.closePath(); ctx.stroke(); ctx.restore();
    }
    if (p.vivo && p.avisoT > 0) {
      const a = Math.min(1, p.avisoT * 2.2), txt = p.avisoTxt;
      ctx.save(); ctx.globalAlpha = a; ctx.font = "700 16px 'Chakra Petch', system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineJoin = "round"; ctx.lineWidth = 5; ctx.strokeStyle = "rgba(10,14,32,.85)"; ctx.fillStyle = txt.startsWith("Planeo") ? "#ffe08a" : COLOR_MODO[p.modo] || "#fff";
      const yy = y - 86 - (1.3 - p.avisoT) * 16; ctx.strokeText(txt, x, yy); ctx.fillText(txt, x, yy); ctx.restore();
    }
  }

  function dibujar() {
    if (!M) return;
    const n = N, pal = n.paleta, T = reloj;
    const sc = estado === "jugando" || estado === "llegando" || estado === "pausa";
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

    for (const c of M.controles) { const sx = c.x - cam; if (sx > -80 && sx < W + 80) LP.bandera(ctx, sx, M.suelo(c.x) + 2, c.activo, T, c.anim); }
    for (const t of M.termicas) { const sx = t.x - cam; if (sx > -200 && sx < W + 200) LP.termica(ctx, sx, t.w, M.suelo(t.x), T, n.clima === "tormenta" ? 0.8 : 1); }
    for (const s of M.tormentas) dibujarTormenta(s, T);
    LP.nido(ctx, M.nido.x - cam, M.nido.y + 6, nivelIdx >= 3, T);
    for (const c of M.cables) {
      const a = c.x0 - cam, b = c.x1 - cam; if (b < -50 || a > W + 50) continue;
      LP.torre(ctx, a, M.suelo(c.x0) + 4, c.y0 - 8); LP.torre(ctx, b, M.suelo(c.x1) + 4, c.y0 - 8);
      c.lineas.forEach((off) => LP.cable(ctx, a, b, c.y0 + off, c.hund, T));
    }
    const vista = M.vistaT > 0;
    for (const c of M.carronas) {
      const sx = c.x - cam; if (sx < -120 || sx > W + 120) continue;
      LP.carrona(ctx, sx, M.suelo(c.x) + 3, 1, c.estado === 2 ? c.comida : 0, c.venenosa);
      if (c.venenosa && c.estado !== 2) {
        for (let k = 0; k < 3; k++) {
          const ph = (T * 0.45 + k / 3 + c.x * 0.01) % 1;
          ctx.globalAlpha = (1 - ph) * 0.6;
          LP.blob(ctx, sx + (k - 1) * 14 + Math.sin(T * 2 + k * 2) * 8, M.suelo(c.x) - 34 - ph * 70, 7 + ph * 10, 6, k, ["#b980ff", "#8f4dff", "#6f2bd1"], T);
        }
        ctx.globalAlpha = 1;
      }
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
    for (const q of M.poderes) { const sx = q.x - cam; if (!q.tomado && sx > -60 && sx < W + 60) LP.poder(ctx, sx, q.y, q.tipo, PODERES[q.tipo].color, T, q.fase); }
    jugadores.forEach((p) => dibujarJugador(p, T));
    if (!sc && jugadores.length === 0) {
      const hz = Math.sin(T * 0.7), mac = Almacen.prefs.sexo === "macho";
      trazarCondor(demo, 330, 250 + hz * 36, {
        macho: mac, accesorio: (Almacen.prefs && Almacen.prefs.accesorio) || "ninguno",
        vuelo: 1, spread: 1, psi: demo.amp > 0.05 ? 0.8 * demo.amp * Math.sin(demo.fase) : 0.05 * Math.sin(T * 1.6),
        nod: -0.05, look: 0.05, tilt: 0.04 * Math.sin(T), t: T, ang: Math.cos(T * 0.7) * 0.1,
      });
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
    for (let i = M.part.length - 1; i >= 0; i--) M.part.splice(i, 1);
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

  return { iniciar, nuevaPartida, empezarNivel, reiniciarNivel, pausar, reanudar, alMenu, responder, continuarTrasPregunta, siguienteNivel,
    indiceNivel: () => nivelIdx, herirJugador: (i, causa) => herir(jugadores[i], causa || "cables"),
    get estado() { return estado; }, get jugadores() { return jugadores; }, get mundo() { return M; } };
})();

Juego.iniciar();