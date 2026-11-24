"use strict";
/* =====================================================================
   VISOR 3D DEL CÓNDOR  ·  Low-Poly, sin librerías
   Un mini motor 3D hecho a mano: el cóndor es una malla de triángulos
   planos que se gira, se proyecta con perspectiva, se ordena por
   profundidad y se pinta en un <canvas> con luz plana por cara.
   Lo abre la pantalla de inicio al elegir macho o hembra.
   ===================================================================== */
const Condor3D = (() => {
  const TAU = Math.PI * 2, W = 960, H = 540, F = 1000;
  const { clamp, hash } = LP;
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- Vectores ---------- */
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const mid = (a, b) => mix(a, b, 0.5);

  /* ---------- Paletas ---------- */
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const pal = (a) => a.map(rgb);
  const PAL = {
    adulto: {
      cuerpo: pal(["#161922", "#1e222f", "#262c3d", "#12141b", "#2e3649", "#1b1f2a"]),
      ala: pal(["#1a1d27", "#232938", "#161922", "#2b3245", "#1f2433"]),
      blanca: pal(["#f6f8f9", "#e8edf0", "#dbe2e7"]),
      borde: pal(["#cdd5dc", "#bac3cd"]),
      collar: pal(["#fbfcfd", "#eaeff2", "#d9e0e6", "#f2f5f7"]),
      cola: pal(["#13151c", "#1c2029", "#0f1117"]),
    },
    joven: {
      cuerpo: pal(["#5a4535", "#6a5240", "#4b3a2d", "#7a604b", "#54402f"]),
      ala: pal(["#5d4838", "#6c5543", "#4d3c2f", "#7b624d", "#55402f"]),
      blanca: pal(["#9a836c", "#8d7761", "#a89079"]),
      borde: pal(["#7a6552", "#6b5848"]),
      collar: pal(["#bfab94", "#ae997f", "#cdbba5"]),
      cola: pal(["#43342a", "#4f3d31", "#3a2d24"]),
    },
    pielMacho: pal(["#d9593f", "#e5774a", "#c94a38", "#ec8f54", "#b8423a"]),
    pielHembra: pal(["#8d9096", "#a1a4aa", "#797c83", "#9b9092", "#6f7279"]),
    cresta: pal(["#8a3f3d", "#a3524a", "#6e3236", "#92453f"]),
    barbilla: pal(["#f0a24f", "#e48a3e", "#f4b765"]),
    pico: pal(["#f1e9d3", "#ddd4ba", "#c9bfa2", "#e8dfc6"]),
    pata: pal(["#9a9ca3", "#80838a", "#aeb0b6", "#8a8d94"]),
    garra: pal(["#2c2d33", "#3a3b42"]),
    suelo: pal(["#8a9a45", "#a3a84a", "#7c8f42", "#b39a4a", "#c4a64f", "#93a24a"]),
    liquen: pal(["#d98a3d", "#e0a040", "#b9c04e"]),
    sombra: pal(["#5f6b34", "#56622f", "#69753a"]),
    roca: pal(["#7a6a5c", "#8c7a68", "#6a5b4f", "#9a8672", "#5f5248", "#85766a"]),
    rocaOscura: pal(["#5c4f45", "#4f443b", "#665850", "#463c35"]),
    tronco: pal(["#6a4a33", "#5a3e2a", "#7a5a40"]),
    hojaFrailejon: pal(["#c3d1ab", "#aebf95", "#d3ddbf", "#9fb386"]),
    chulloA: pal(["#d9503a", "#f0b942", "#2e6f9e"]),
    chulloB: pal(["#f2f6f8", "#d9992b", "#b8423a"]),
    sombreroAla: pal(["#b88b5a", "#a37748", "#8f653a"]),
    sombreroCopa: pal(["#8c6239", "#75502c", "#5e3f22"]),
  };

  /* ---------- Constructores de mallas ---------- */
  function tri(out, a, b, c, col, oc, parte, bias) { out.push({ p: [a, b, c], c: col, o: oc || null, parte, bias: bias || 0 }); }
  const elegir = (paleta, i, sem) => paleta[Math.floor(hash(i, sem, 9) * paleta.length)];

  function elipsoide(out, cx, cy, cz, rx, ry, rz, seg, anillos, paleta, parte, o = {}) {
    const jit = o.jit || 0, sem = o.sem || 1, bias = o.bias || 0, rings = [];
    for (let r = 1; r < anillos; r++) {
      const phi = (Math.PI * r) / anillos, ring = [];
      for (let s = 0; s < seg; s++) {
        const th = (TAU * (s + (r % 2) * 0.5)) / seg, j = 1 + (hash(r * 31 + s, sem, 3) - 0.5) * jit;
        ring.push([cx + Math.cos(th) * Math.sin(phi) * rx * j, cy + Math.cos(phi) * ry * j, cz + Math.sin(th) * Math.sin(phi) * rz * j]);
      }
      rings.push(ring);
    }
    const top = [cx, cy + ry, cz], bot = [cx, cy - ry, cz], oc = [cx, cy, cz];
    let k = 0;
    const T = (a, b, c) => tri(out, a, b, c, elegir(paleta, k++, sem), oc, parte, bias);
    for (let s = 0; s < seg; s++) T(top, rings[0][s], rings[0][(s + 1) % seg]);
    for (let r = 0; r < rings.length - 1; r++) for (let s = 0; s < seg; s++) {
      const a = rings[r][s], b = rings[r][(s + 1) % seg], c = rings[r + 1][s], d = rings[r + 1][(s + 1) % seg];
      T(a, c, b); T(b, c, d);
    }
    const last = rings[rings.length - 1];
    for (let s = 0; s < seg; s++) T(bot, last[(s + 1) % seg], last[s]);
  }

  function tronco(out, p0, p1, r0, r1, seg, paleta, parte, sem = 1) {
    const ax = norm(sub(p1, p0)), ref = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u = norm(cross(ax, ref)), w = cross(ax, u), oc = mid(p0, p1);
    const anillo = (p, r) => Array.from({ length: seg }, (_, i) => { const a = (TAU * i) / seg; return add(p, add(mul(u, Math.cos(a) * r), mul(w, Math.sin(a) * r))); });
    const A = anillo(p0, r0), B = anillo(p1, r1);
    let k = 0;
    for (let i = 0; i < seg; i++) {
      const a = A[i], b = A[(i + 1) % seg], c = B[i], d = B[(i + 1) % seg];
      tri(out, a, c, b, elegir(paleta, k++, sem), oc, parte); tri(out, b, c, d, elegir(paleta, k++, sem), oc, parte);
    }
  }

  function loft(out, anillos, punta, paleta, parte, oc, sem = 1) {
    let k = 0;
    for (let r = 0; r < anillos.length - 1; r++) {
      const A = anillos[r], B = anillos[r + 1], n = A.length;
      for (let i = 0; i < n; i++) {
        const a = A[i], b = A[(i + 1) % n], c = B[i], d = B[(i + 1) % n];
        tri(out, a, c, b, elegir(paleta, k++, sem), oc, parte); tri(out, b, c, d, elegir(paleta, k++, sem), oc, parte);
      }
    }
    const U = anillos[anillos.length - 1];
    for (let i = 0; i < U.length; i++) tri(out, U[i], punta, U[(i + 1) % U.length], elegir(paleta, k++, sem), oc, parte);
  }
  const anilloXY = (cx, cy, cz, rx, ry, seg) => Array.from({ length: seg }, (_, i) => { const a = (TAU * i) / seg; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, cz]; });

  function disco(out, c, n, r, col, parte, bias, squash = 1, seg = 9) {
    const u = norm(cross(n, [0, 1, 0])), w = cross(u, n);
    const pts = Array.from({ length: seg }, (_, i) => { const a = (TAU * i) / seg; return add(c, add(mul(u, Math.cos(a) * r), mul(w, Math.sin(a) * r * squash))); });
    for (let i = 0; i < seg; i++) tri(out, c, pts[i], pts[(i + 1) % seg], col, null, parte, bias);
  }

  function pluma(out, base, dir, lat, L, w, paleta, parte, sem) {
    const bl = sub(base, mul(lat, w)), br = add(base, mul(lat, w));
    const m = add(base, mul(dir, L * 0.55)), ml = sub(m, mul(lat, w * 0.9)), mr = add(m, mul(lat, w * 0.9)), tip = add(base, mul(dir, L));
    tri(out, bl, br, mr, elegir(paleta, sem, 4), null, parte); tri(out, bl, mr, ml, elegir(paleta, sem + 1, 4), null, parte);
    tri(out, ml, mr, tip, elegir(paleta, sem + 2, 4), null, parte);
  }
  function cuad(out, a, b, c, d, col, parte) { tri(out, a, b, c, col, null, parte); tri(out, a, c, d, col, null, parte); }

  function mover(op) {
    const k = op[0];
    if (k === "t") return (p) => [p[0] + op[1], p[1] + op[2], p[2] + op[3]];
    if (k === "s") return (p) => [p[0] * op[1], p[1] * op[2], p[2] * op[3]];
    const c = Math.cos(op[1]), s = Math.sin(op[1]);
    if (k === "rx") return (p) => [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
    if (k === "ry") return (p) => [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
    return (p) => [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
  }
  function xf(tris, ops) {
    for (const op of ops) { const f = mover(op); for (const t of tris) { t.p = t.p.map(f); if (t.o) t.o = f(t.o); } }
  }
  const girarEn = (tris, c, ops) => xf(tris, [["t", -c[0], -c[1], -c[2]], ...ops, ["t", c[0], c[1], c[2]]]);

  /* ---------- Isla flotante del páramo ---------- */
  function construirIsla() {
    const out = [], oc = [0, -0.35, 0];
    const anillo = (r, y, n, sem, jr, jy) => Array.from({ length: n }, (_, i) => {
      const a = (TAU * i) / n + hash(i, sem, 1) * 0.15, rr = r * (1 + (hash(i, sem, 2) - 0.5) * jr);
      return [Math.cos(a) * rr, y + (hash(i, sem, 3) - 0.5) * jy, Math.sin(a) * rr];
    });
    const n = 11;
    const R0 = anillo(1.0, 0, n, 11, 0.16, 0.04), R1 = anillo(1.04, -0.22, n, 12, 0.14, 0.06), R2 = anillo(0.66, -0.7, n, 13, 0.2, 0.1);
    const Ri = anillo(0.42, 0.0, n, 14, 0.05, 0.0), punta = [0.03, -1.2, 0.02];
    const centro = [0, 0.012, 0];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      tri(out, centro, Ri[i], Ri[j], elegir(PAL.sombra, i, 5), oc, "isla");
      const liq = hash(i, 6, 2) > 0.8 ? PAL.liquen : PAL.suelo;
      tri(out, Ri[i], R0[i], R0[j], elegir(liq, i, 6), oc, "isla"); tri(out, Ri[i], R0[j], Ri[j], elegir(PAL.suelo, i + 3, 7), oc, "isla");
      tri(out, R0[i], R1[i], R1[j], elegir(PAL.roca, i, 8), oc, "isla"); tri(out, R0[i], R1[j], R0[j], elegir(PAL.roca, i + 2, 9), oc, "isla");
      tri(out, R1[i], R2[i], R2[j], elegir(PAL.rocaOscura, i, 10), oc, "isla"); tri(out, R1[i], R2[j], R1[j], elegir(PAL.roca, i + 4, 11), oc, "isla");
      tri(out, R2[i], punta, R2[j], elegir(PAL.rocaOscura, i + 1, 12), oc, "isla");
    }
    [[0.62, -0.42, 0.9], [-0.7, 0.34, 0.75], [0.35, 0.62, 0.6]].forEach(([x, z, e], q) => {
      const alto = 0.34 * e;
      tronco(out, [x, 0, z], [x, alto, z], 0.04 * e, 0.032 * e, 5, PAL.tronco, "isla", q + 20);
      for (let k = 0; k < 9; k++) {
        const a = (TAU * k) / 9 + q, dir = norm([Math.cos(a) * 0.9, 0.35, Math.sin(a) * 0.9]), lat = norm(cross(dir, [0, 1, 0]));
        pluma(out, [x, alto, z], dir, lat, 0.2 * e, 0.035 * e, PAL.hojaFrailejon, "isla", k + q * 9);
      }
    });
    [[1.35, -0.5, 0.3, 0.13], [-1.25, -0.75, -0.5, 0.1], [0.5, -0.95, 1.2, 0.09], [-0.4, -0.3, -1.3, 0.11]].forEach(([x, y, z, r], q) =>
      elipsoide(out, x, y, z, r, r * 0.8, r, 5, 3, PAL.roca, "isla", { jit: 0.3, sem: q + 40 }));
    return out;
  }

  /* ---------- Partes fijas del cóndor ---------- */
  function construirFijo(macho, edad) {
    const P = PAL[edad], out = [];
    const cuerpo = [];
    elipsoide(cuerpo, 0, 0.82, -0.04, 0.34, 0.48, 0.3, 9, 6, P.cuerpo, "plumaje", { jit: 0.09, sem: 1 });
    girarEn(cuerpo, [0, 0.82, -0.04], [["rx", 0.6]]);
    out.push(...cuerpo);
    [-1, 1].forEach((sg, q) => elipsoide(out, sg * 0.16, 0.44, 0.02, 0.13, 0.17, 0.15, 6, 4, P.cuerpo, "plumaje", { jit: 0.1, sem: 50 + q }));
    const collar = [], cc = [0, 1.2, 0.22];
    elipsoide(collar, cc[0], cc[1], cc[2], 0.24, 0.125, 0.23, 9, 4, P.collar, "collar", { jit: 0.1, sem: 60 });
    const borde = (a, r, y) => [Math.cos(a) * r, y, cc[2] + Math.sin(a) * r * 0.95];
    for (let i = 0; i < 14; i++) {
      const a0 = (TAU * i) / 14, a1 = (TAU * (i + 1)) / 14, am = (a0 + a1) / 2;
      tri(collar, borde(a0, 0.23, cc[1]), borde(a1, 0.23, cc[1]), borde(am, 0.36, cc[1] - 0.04 - 0.02 * Math.sin(i * 2)), elegir(P.collar, i, 61), cc, "collar");
    }
    girarEn(collar, cc, [["rx", 0.45]]);
    out.push(...collar);
    for (let k = 0; k < 5; k++) {
      const a = (k - 2) * 0.28, dir = norm([Math.sin(a) * 0.6, -0.55, -0.85]), lat = norm(cross(dir, [0, 1, 0]));
      pluma(out, [0, 0.46, -0.28], dir, lat, 0.56, 0.085, P.cola, "cola", k * 3);
    }
    [-1, 1].forEach((sg, q) => {
      const x = sg * 0.15;
      const inicio = out.length;
      tronco(out, [x, 0.36, 0.05], [x, 0.05, 0.14], 0.036, 0.032, 6, PAL.pata, "patas", 70 + q);
      [[-0.09, 0.4], [0, 0.45], [0.09, 0.4]].forEach(([dx, dz], t) => {
        const fin = [x + dx, 0.025, dz];
        tronco(out, [x, 0.05, 0.14], fin, 0.024, 0.017, 5, PAL.pata, "patas", 80 + t + q * 3);
        tronco(out, fin, add(fin, [dx * 0.4, -0.02, 0.08]), 0.017, 0.0, 5, PAL.garra, "patas", 90 + t);
      });
      tronco(out, [x, 0.05, 0.13], [x, 0.025, -0.06], 0.022, 0.014, 5, PAL.pata, "patas", 100 + q);
      for (let i = inicio; i < out.length; i++) {
        out[i].ladoPata = sg;
      }
    });
    return out;
  }

  /* ---------- Cabeza y accesorios opcionales ---------- */
  function construirCabeza(macho, blink) {
    const out = [], piel = macho ? PAL.pielMacho : PAL.pielHembra;
    tronco(out, [0, 1.17, 0.2], [0, 1.4, 0.36], 0.11, 0.09, 7, piel, "cabeza", 2);
    elipsoide(out, 0, 1.5, 0.42, 0.15, 0.15, 0.18, 7, 5, piel, "cabeza", { jit: macho ? 0.17 : 0.08, sem: macho ? 3 : 4 });
    loft(out, [anilloXY(0, 1.47, 0.58, 0.066, 0.06, 6), anilloXY(0, 1.47, 0.68, 0.052, 0.05, 6), anilloXY(0, 1.45, 0.755, 0.033, 0.04, 6)],
      [0, 1.365, 0.8], PAL.pico, "pico", [0, 1.44, 0.68], 5);
    loft(out, [anilloXY(0, 1.42, 0.575, 0.05, 0.026, 6), anilloXY(0, 1.425, 0.675, 0.038, 0.021, 6)], [0, 1.43, 0.74], PAL.pico, "pico", [0, 1.425, 0.65], 6);
    const cafe = rgb("#a8742f"), rojo = rgb("#c4211b");
    [-1, 1].forEach((sg) => {
      const n = norm([sg * 0.88, 0.05, 0.35]), c = add([sg * 0.126, 1.535, 0.51], mul(n, 0.008)), sq = blink ? 0.1 : 1;
      disco(out, c, n, 0.06, rgb("#1b1012"), "ojos", 0.07, sq);
      disco(out, add(c, mul(n, 0.003)), n, 0.049, macho ? cafe : rojo, "ojos", 0.075, sq);
      disco(out, add(c, mul(n, 0.006)), n, 0.026, rgb("#0d0e12"), "ojos", 0.08, sq);
      if (!blink) disco(out, add(add(c, mul(n, 0.009)), [-sg * 0.005, 0.021, 0.015]), n, 0.011, rgb("#ffffff"), "ojos", 0.085, 1, 6);
    });
    if (macho) {
      const cr = [];
      elipsoide(cr, 0, 1.69, 0.5, 0.055, 0.14, 0.15, 6, 4, PAL.cresta, "cresta", { jit: 0.18, sem: 7 });
      girarEn(cr, [0, 1.69, 0.5], [["rx", -0.4]]);
      out.push(...cr);
      elipsoide(out, 0, 1.4, 0.57, 0.04, 0.085, 0.05, 5, 3, PAL.barbilla, "cresta", { jit: 0.15, sem: 8 });
    }
    return out;
  }

  function construirAccesorioCabeza(tipo) {
    const out = [];
    if (!tipo || tipo === "ninguno") return out;
    if (tipo === "chullo") {
      elipsoide(out, 0, 1.58, 0.43, 0.165, 0.11, 0.19, 8, 4, PAL.chulloA, "accesorio", { jit: 0.05, sem: 71 });
      elipsoide(out, 0, 1.65, 0.42, 0.105, 0.08, 0.12, 7, 3, PAL.chulloB, "accesorio", { jit: 0.04, sem: 72 });
      for (const sg of [-1, 1]) {
        const base = [sg * 0.145, 1.54, 0.42];
        const dir = norm([sg * 0.25, -0.95, 0.1]);
        const lat = norm(cross(dir, [0, 0, 1]));
        pluma(out, base, dir, lat, 0.14, 0.032, PAL.chulloB, "accesorio", sg > 0 ? 73 : 74);
      }
    } else if (tipo === "sombrero") {
      const ala = [];
      elipsoide(ala, 0, 1.61, 0.41, 0.27, 0.025, 0.29, 10, 3, PAL.sombreroAla, "accesorio", { jit: 0.04, sem: 75 });
      girarEn(ala, [0, 1.61, 0.41], [["rx", -0.14]]);
      out.push(...ala);
      const copa = [];
      elipsoide(copa, 0, 1.68, 0.40, 0.13, 0.085, 0.145, 8, 4, PAL.sombreroCopa, "accesorio", { jit: 0.04, sem: 76 });
      girarEn(copa, [0, 1.68, 0.40], [["rx", -0.14]]);
      out.push(...copa);
    }
    return out;
  }

  /* ---------- Alas ---------- */
  const U = [0, 0.33, 0.66, 0.94], LEAD = [0, 0, 0.06, 0.2], TRAIL = [0.7, 0.74, 0.66, 0.44], FR = [0, 0.42, 0.9, 1], UMAX = 1.22;
  const interp = (arr, u) => { const i = Math.min(arr.length - 2, Math.max(0, U.findIndex((x, k) => u >= x && u <= U[k + 1]))); return lerp(arr[i], arr[i + 1], (u - U[i]) / (U[i + 1] - U[i])); };

  function construirAla(out, lado, s, psi, edad, anc, rxS = 0) {
    const P = PAL[edad];
    const d = norm(mix([0.06, -0.1, -0.99], [1, 0.08, -0.1], s));
    let t = mix([0, -1, 0.05], [0, 0.03, -1], s);
    t = norm(sub(t, mul(d, dot(t, d))));
    const nW = cross(d, t), nOut = nW[0] >= 0 ? nW : mul(nW, -1);
    const lenS = lerp(0.85, 1, s), chS = lerp(0.55, 1, s);
    let S = [0.33, 1.1, 0.08];
    if (rxS) { const c = Math.cos(rxS), sn = Math.sin(rxS), dy = S[1] - 0.85; S = [S[0], 0.85 + dy * c - S[2] * sn, dy * sn + S[2] * c]; }
    const pt = (u, v, bul = 0) => {
      let p = add(add(mul(d, u * lenS), mul(t, v * chS)), mul(nOut, bul));
      p[1] += 0.14 * s * Math.pow(u / UMAX, 2);
      const ang = psi * (0.55 + 0.9 * (u / UMAX)), c = Math.cos(ang), sn = Math.sin(ang);
      p = [p[0] * c - p[1] * sn, p[0] * sn + p[1] * c, p[2]];
      return [lado * (S[0] + p[0]), S[1] + p[1], S[2] + p[2]];
    };
    const V = (i, j) => {
      const u = U[i], v = LEAD[i] + (TRAIL[i] - LEAD[i]) * FR[j];
      return pt(u, v, 0.055 * (1 - s) * Math.sin(Math.PI * FR[j]) * Math.sin(Math.PI * Math.min(1, u / 0.94)));
    };
    let q = 0;
    for (let k = 0; k < 3; k++) for (let b = 0; b < 3; b++) {
      let paleta = P.ala, parte = "alas";
      if (b === 1) { paleta = k < 2 ? P.blanca : P.ala; parte = k < 2 ? "blancas" : "primarias"; }
      if (b === 2) { paleta = k < 2 ? P.borde : P.ala; parte = k < 2 ? "blancas" : "primarias"; }
      cuad(out, V(k, b), V(k + 1, b), V(k + 1, b + 1), V(k, b + 1), elegir(paleta, q++, 30 + k), parte);
    }
    let punta = null;
    for (let f = 0; f < 7; f++) {
      const ub = 0.44 + 0.068 * f, vb = lerp(interp(LEAD, ub), interp(TRAIL, ub), 0.78), th = ((64 - 8.5 * f) * Math.PI) / 180, L = 0.45 - 0.013 * f;
      const base = pt(ub, vb), tip = pt(ub + L * Math.cos(th), vb + L * Math.sin(th)), m = pt(ub + L * 0.55 * Math.cos(th), vb + L * 0.55 * Math.sin(th));
      const dir = norm(sub(tip, base)), lat = norm(cross(nW, dir)), w = 0.058 - f * 0.0017;
      const bl = sub(base, mul(lat, w)), br = add(base, mul(lat, w)), ml = sub(m, mul(lat, w * 0.9)), mr = add(m, mul(lat, w * 0.9));
      tri(out, bl, br, mr, elegir(P.ala, f, 31), null, "primarias"); tri(out, bl, mr, ml, elegir(P.ala, f + 2, 32), null, "primarias");
      tri(out, ml, mr, tip, elegir(P.ala, f + 4, 33), null, "primarias");
      if (f === 6) punta = tip;
    }
    if (lado > 0) { anc.alas = pt(0.35, 0.2); anc.blancas = pt(0.5, 0.45); anc.primarias = pt(1.0, 0.3); }
    return punta;
  }

  /* ---------- Estado ---------- */
  let cv = null, ctx = null, fondo = null, raf = 0, ultimo = 0;
  const isla = construirIsla();
  const cache = {};
  const fijo = (macho, edad) => cache[macho + edad] || (cache[macho + edad] = construirFijo(macho, edad));
  const est = {
    sexo: "macho", edad: "adulto", accesorio: "ninguno", yaw: 0.6, pitch: 0.2, dist: 3.9, tx: 0, ty: 0.8, tz: 0, spread: 0,
    t: 0, giro: true, tour: true, manual: false, sel: null, sigue: false, flap: null, pausaHasta: 0, arrastra: false,
    chispas: [], pins: [], puntas: [null, null],
  };
  const reducido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Cámara y proyección ---------- */
  function vista(p, g) {
    if (g.rx) { const c = Math.cos(g.rx), sn = Math.sin(g.rx), dy = p[1] - 0.85; p = [p[0], 0.85 + dy * c - p[2] * sn, dy * sn + p[2] * c]; }
    const C = g.cam || est;
    let x = p[0] * g.e - C.tx, y = p[1] * g.e + g.dy - C.ty, z = p[2] * g.e - C.tz;
    const yw = C.yaw + Math.PI, cy = Math.cos(yw), sy = Math.sin(yw), cp = Math.cos(C.pitch), sp = Math.sin(C.pitch);
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    return [x1, y * cp + z1 * sp, -y * sp + z1 * cp + C.dist];
  }
  const pantalla = (v, g) => [(g.cx === undefined ? W / 2 : g.cx) + (v[0] * (g.f || F)) / v[2], (g.cy === undefined ? H * 0.56 : g.cy) - (v[1] * (g.f || F)) / v[2]];
  const LUZ = norm([-0.35, 0.8, -0.5]);

  function agregar(items, tris, g, activas, pulso) {
    for (const t of tris) {
      const a = vista(t.p[0], g), b = vista(t.p[1], g), c = vista(t.p[2], g);
      if (a[2] < 0.4 || b[2] < 0.4 || c[2] < 0.4) continue;
      let n = cross(sub(b, a), sub(c, a));
      const l = Math.hypot(n[0], n[1], n[2]); if (l < 1e-9) continue;
      n = mul(n, 1 / l);
      const cen = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
      if (t.o) { if (dot(n, sub(cen, vista(t.o, g))) < 0) n = mul(n, -1); if (dot(n, cen) >= 0) continue; }
      else if (dot(n, cen) > 0) n = mul(n, -1);
      const sh = 0.6 + 0.56 * Math.max(0, dot(n, LUZ)) + 0.08 * Math.max(0, n[1]);
      let col = [t.c[0] * sh, t.c[1] * sh, t.c[2] * sh * 1.03];
      if (activas && activas.includes(t.parte)) col = mix(col, [255, 238, 150], 0.28 + 0.2 * pulso);
      const A = pantalla(a, g), B = pantalla(b, g), C = pantalla(c, g);
      items.push({ A, B, C, p: t.parte, k: cen[2] - t.bias, col: `rgb(${clamp(col[0], 0, 255) | 0},${clamp(col[1], 0, 255) | 0},${clamp(col[2], 0, 255) | 0})` });
    }
  }

  function crearFondo() {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.drawImage(LP.crearCielo(["#4f86c6", "#9ccbea", "#fdeccf"], 77), 0, 0);
    LP.sol(g, 770, 150, 52, ["#fffbe6", "#ffe9a8"], "#fff3c4", 0);
    g.drawImage(LP.crearVolcan({ volcan: [214, 24, 62], nieve: [196, 30, 97] }, 5), 470, 130, 560, 258);
    LP.terreno(g, { cam: 0, par: 0.1, cw: 96, top: (i) => 400 - 105 * (0.35 * hash(i, 1, 5) + 0.65 * (0.5 + 0.5 * Math.sin(i * 0.55 + 4))), bottom: H, hsl: [226, 30, 62], semilla: 8, filas: 2 });
    g.fillStyle = "rgba(253,236,207,.35)"; g.fillRect(0, 330, W, 210);
    LP.terreno(g, { cam: 200, par: 0.3, cw: 84, top: (i) => 450 - 85 * (0.4 * hash(i, 2, 6) + 0.6 * (0.5 + 0.5 * Math.sin(i * 0.8 + 2))), bottom: H, hsl: [200, 30, 54], semilla: 9, filas: 2 });
    return c;
  }

  function chispa(x, y) {
    est.chispas.push({ x, y, vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 50, v: 1.4, r: 6 + Math.random() * 8, c: Math.random() < 0.5 ? "#ffe08a" : "#ffffff", rot: Math.random() * 3 });
  }
  function dibujarChispas(dt) {
    for (let i = est.chispas.length - 1; i >= 0; i--) {
      const s = est.chispas[i]; s.v -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += dt * 2;
      if (s.v <= 0) { est.chispas.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = Math.min(1, s.v); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
      const r = s.r; ctx.fillStyle = s.c; ctx.beginPath();
      ctx.moveTo(0, -r); ctx.lineTo(r * 0.28, -r * 0.28); ctx.lineTo(r, 0); ctx.lineTo(r * 0.28, r * 0.28); ctx.lineTo(0, r); ctx.lineTo(-r * 0.28, r * 0.28); ctx.lineTo(-r, 0); ctx.lineTo(-r * 0.28, -r * 0.28);
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }

  const angulo = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

  function actualizar(dt) {
    est.t += dt;
    const sel = null, ahora = performance.now();
    let obj = est.manual ? est.abrir : 0;
    if (est.tour && !sel && !est.manual) { const c = est.t % 12; obj = c > 2.5 && c < 9.2 ? 1 : 0; }
    if (sel && est.sigue) obj = sel.cam.alas;
    if (est.flap) { obj = 1; est.flap.t += dt; if (est.flap.t > est.flap.dur) est.flap = null; }
    est.spread += (obj - est.spread) * Math.min(1, dt * 3.2);
    let objYaw = est.yaw, objPitch = lerp(0.2, 0.42, est.spread), objDist = lerp(3.9, 5.3, est.spread), objT = [0, 0.8, 0];
    if (sel && est.sigue) { objYaw = est.yaw + angulo(est.yaw, sel.cam.yaw); objPitch = sel.cam.pitch; objDist = sel.cam.dist; objT = sel.cam.t; }
    else if (!est.arrastra && est.giro && ahora > est.pausaHasta && !sel) est.yaw += dt * (reducido ? 0.2 : 0.7);
    const esc = est.sexo === "macho" ? 1 : 0.9; objT = objT.map((v) => v * esc);
    const k = Math.min(1, dt * 3.4);
    if (sel && est.sigue) est.yaw += (objYaw - est.yaw) * k;
    if (!est.arrastra || (sel && est.sigue)) est.pitch += (objPitch - est.pitch) * k;
    est.dist += (objDist - est.dist) * k;
    est.tx += (objT[0] - est.tx) * k; est.ty += (objT[1] - est.ty) * k; est.tz += (objT[2] - est.tz) * k;
  }

  function cabezaAnimada(macho, t, o = {}) {
    const cab = construirCabeza(macho, o.blink !== undefined ? o.blink : (t % 3.8) < 0.14);
    const acc = construirAccesorioCabeza(o.accesorio);
    const partes = acc.length ? [...cab, ...acc] : cab;
    girarEn(partes, [0, 1.2, 0.22], [
      ["rz", o.tilt !== undefined ? o.tilt : 0.09 * Math.sin(t * 1.1)],
      ["rx", o.nod !== undefined ? o.nod : 0.07 * Math.sin(t * 1.7)],
      ["ry", o.look !== undefined ? o.look : 0.4 * Math.sin(t * 0.8) + 0.15 * Math.sin(t * 2.3)],
    ]);
    return partes;
  }

  function poseCaminata(tris, fase, intensidad) {
    if (!intensidad) return tris;
    const poses = new Map();
    for (const lado of [-1, 1]) {
      const ciclo = fase + (lado === 1 ? Math.PI : 0);
      const ang = Math.sin(ciclo) * 0.48 * intensidad;
      const giro = mover(["rx", ang]);
      const pivote = [lado * 0.15, 0.36, 0.05];
      const elevar = Math.max(0, Math.cos(ciclo)) * 0.085 * intensidad;
      poses.set(lado, (v) => {
        const a = add(pivote, giro(sub(v, pivote)));
        a[1] += elevar * clamp((0.36 - v[1]) / 0.36, 0, 1);
        return a;
      });
    }
    return tris.map((t) => {
      const f = poses.get(t.ladoPata);
      return f ? { ...t, p: t.p.map(f), o: t.o ? f(t.o) : null } : t;
    });
  }

  function sprite(c2, o) {
    const macho = o.macho, e = macho ? 1 : 0.9;
    const g = { e, dy: 0, rx: o.rx || 0, cx: o.cx, cy: o.cy, f: o.f, cam: { yaw: o.yaw, pitch: o.pitch, dist: o.dist, tx: 0, ty: 0.85 * e, tz: 0 } };
    const cab = cabezaAnimada(macho, o.t || 0, {
      blink: o.blink, nod: o.nod, look: o.look, tilt: o.tilt,
      accesorio: o.accesorio !== undefined ? o.accesorio : est.accesorio,
    });
    const alas = [], anc = {};
    construirAla(alas, 1, o.spread, o.psi || 0, "adulto", anc, o.rx || 0); construirAla(alas, -1, o.spread, o.psi || 0, "adulto", anc, o.rx || 0);
    const items = [], gAlas = Object.assign({}, g, { rx: 0 });
    const modelo = fijo(macho, "adulto");
    const modeloAnimado = poseCaminata(modelo, o.pasoFase || 0, o.pasoAmp || 0);
    agregar(items, modeloAnimado, g, null, 0); agregar(items, cab, g, null, 0); agregar(items, alas, gAlas, null, 0);

    items.sort((a, b) => b.k - a.k);
    c2.save(); c2.lineJoin = "round";
    const trazo = (it) => { c2.beginPath(); c2.moveTo(it.A[0], it.A[1]); c2.lineTo(it.B[0], it.B[1]); c2.lineTo(it.C[0], it.C[1]); c2.closePath(); };
    if (o.contorno !== false) {
      c2.fillStyle = c2.strokeStyle = o.contorno || "rgba(255,248,226,.95)"; c2.lineWidth = (o.grosor || 4.4);
      c2.beginPath();
      for (const it of items) { if (it.p === "ojos" || it.p === "patas") continue; c2.moveTo(it.A[0], it.A[1]); c2.lineTo(it.B[0], it.B[1]); c2.lineTo(it.C[0], it.C[1]); c2.closePath(); }
      c2.fill(); c2.stroke();
    }
    c2.lineWidth = 0.8;
    for (const it of items) { c2.fillStyle = c2.strokeStyle = it.col; trazo(it); c2.fill(); c2.stroke(); }
    c2.restore();
  }

  function dibujar(dt) {
    const macho = est.sexo === "macho", e = macho ? 1 : 0.9, t = est.t;
    const fl = est.flap, env = fl ? Math.sqrt(Math.sin((Math.PI * fl.t) / fl.dur)) : 0;
    const psi = fl ? 0.62 * Math.sin(fl.t * 11) * env : 0.05 * Math.sin(t * 2) * est.spread;
    const hop = fl ? 0.13 * Math.abs(Math.sin(fl.t * 5.5)) * env : 0;
    const blink = (t % 3.8) < 0.14;
    const gc = { e, dy: hop }, gi = { e: 1, dy: 0 };

    const cab = cabezaAnimada(macho, t, {
      blink,
      nod: 0.07 * Math.sin(t * 1.7) + (fl ? 0.12 * Math.sin(fl.t * 11) : 0),
      accesorio: est.accesorio,
    });
    const alas = [], anc = {}, p1 = construirAla(alas, 1, est.spread, psi, est.edad, anc), p2 = construirAla(alas, -1, est.spread, psi, est.edad, anc);
    est.puntas = [p1, p2];

    const activas = null, pulso = 0;
    const items = [];
    agregar(items, isla, gi, null, 0);
    agregar(items, fijo(macho, est.edad), gc, activas, pulso);
    agregar(items, cab, gc, activas, pulso);
    agregar(items, alas, gc, activas, pulso);
    items.sort((a, b) => b.k - a.k);

    ctx.drawImage(fondo, 0, 0, W, H);
    [[0.0, 90, 0.9], [0.4, 330, 0.7], [0.75, 150, 1.0]].forEach(([f, y, s], i) => {
      const x = ((f * (W + 400) + t * (8 + i * 4)) % (W + 400)) - 200; LP.nube(ctx, x, y, s, 11 + i * 5, [200, 25, 97], 0.9);
    });
    for (const it of items) {
      ctx.fillStyle = it.col; ctx.strokeStyle = it.col; ctx.lineWidth = 0.8; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(it.A[0], it.A[1]); ctx.lineTo(it.B[0], it.B[1]); ctx.lineTo(it.C[0], it.C[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
    }

    if ((est.spread > 0.5 || fl) && !reducido && Math.random() < 0.35) {
      const c = pantalla(vista([(Math.random() - 0.5) * 3, 0.8 + Math.random() * 1.4, (Math.random() - 0.5) * 0.6], gc), gc); chispa(c[0], c[1]);
    }
    dibujarChispas(dt);
  }

  function bucle(ts) {
    raf = requestAnimationFrame(bucle);
    const dt = Math.min(0.05, Math.max(0.001, (ts - ultimo) / 1000) || 0.016); ultimo = ts;
    actualizar(dt); dibujar(dt);
  }

  const $ = (id) => document.getElementById(id);
  let dlg, ini = false;

  function setAccesorio(tipo) {
    est.accesorio = tipo || "ninguno";
    const selAcc = $("v3d-cabeza");
    if (selAcc) selAcc.value = est.accesorio;
  }

  function iniciarUI() {
    dlg = $("visor"); cv = $("visor-lienzo"); ctx = cv.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fondo = crearFondo();
    const selAcc = $("v3d-cabeza");
    if (selAcc) {
      selAcc.value = est.accesorio || "ninguno";
      selAcc.addEventListener("change", () => {
        est.accesorio = selAcc.value;
        if (typeof Almacen !== "undefined" && Almacen.guardarPrefs) {
          Almacen.guardarPrefs({ accesorio: est.accesorio });
        }
      });
    }
    $("v3d-aletear").addEventListener("click", () => {
      est.flap = { t: 0, dur: 2.6 }; SND.iniciar(); SND.play("aleteo"); setTimeout(() => SND.play("aleteo"), 280); setTimeout(() => SND.play("aleteo"), 560);
    });
    const cerrar = () => dlg.close();
    $("visor-cerrar").addEventListener("click", cerrar);
    dlg.addEventListener("click", (e) => { if (e.target === dlg) cerrar(); });
    dlg.addEventListener("close", () => {
      cancelAnimationFrame(raf); raf = 0;
      if (typeof Juego !== "undefined" && Juego.estado === "menu") UI.menu();
    });
    let dx0 = 0, abajo = false;
    const px = (e) => { const r = cv.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * W; };
    cv.addEventListener("pointerdown", (e) => { abajo = true; dx0 = px(e); est.arrastra = true; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener("pointermove", (e) => { if (!abajo) return; const x = px(e); est.yaw -= (x - dx0) * 0.009; dx0 = x; });
    const soltar = () => { abajo = false; est.arrastra = false; est.pausaHasta = performance.now() + 1200; };
    cv.addEventListener("pointerup", soltar); cv.addEventListener("pointercancel", soltar);
    ini = true;
  }

  function abrir(sexo) {
    if (!ini) iniciarUI();
    est.sexo = sexo || (typeof Almacen !== "undefined" && Almacen.prefs && Almacen.prefs.sexo) || "macho";
    est.accesorio = (typeof Almacen !== "undefined" && Almacen.prefs && Almacen.prefs.accesorio) || est.accesorio || "ninguno";
    const selAcc = $("v3d-cabeza");
    if (selAcc) selAcc.value = est.accesorio;
    est.edad = "adulto"; est.giro = true; est.tour = true; est.manual = false; est.spread = 0; est.yaw = 0.6; est.t = 0; est.flap = null;
    est.pitch = 0.2; est.dist = 3.9; est.tx = 0; est.ty = 0.8; est.tz = 0; est.chispas = []; est.pausaHasta = 0;
    if (!dlg.open) dlg.showModal();
    ultimo = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(bucle);
    $("v3d-aletear").focus({ preventScroll: true });
  }

  return { abrir, estado: est, sprite, setAccesorio };
})();