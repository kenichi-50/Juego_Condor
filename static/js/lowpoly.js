"use strict";
/* =====================================================================
   MOTOR VISUAL LOW-POLY
   Todo lo que se ve en el lienzo está hecho de triángulos planos con
   un color por cara, como una malla 3D vista de lado. No hay imágenes.
   ===================================================================== */
const LP = (() => {
  const W = 960, H = 540, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- Utilidades de azar y color ---------- */
  const hash = (i, j = 0, s = 0) => {
    let h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263) ^ Math.imul(s | 0, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const hsl = (h, s, l, a = 1) => (a >= 1 ? `hsl(${h | 0} ${s}% ${l}%)` : `hsl(${h | 0} ${s}% ${l}% / ${a})`);
  const luz = (c, dl, dh = 0, a = 1) => hsl(c[0] + dh, c[1], clamp(c[2] + dl, 3, 97), a);
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const rgb = (c, d = 0) => `rgb(${c.map((v) => clamp(Math.round(v + d), 0, 255)).join(",")})`;
  function colorEn(stops, t) {
    const n = stops.length - 1, k = Math.min(n - 1, Math.floor(clamp(t, 0, 0.9999) * n));
    const a = hex(stops[k]), b = hex(stops[k + 1]), f = clamp(t, 0, 1) * n - k;
    return a.map((v, i) => v + (b[i] - v) * f);
  }

  /* ---------- Primitivas ---------- */
  function tri(ctx, ax, ay, bx, by, cx, cy, color) {
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 0.8; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  const tri2 = (ctx, a, b, c, color) => tri(ctx, a[0], a[1], b[0], b[1], c[0], c[1], color);
  function abanico(ctx, cx, cy, pts, colores) {
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      tri(ctx, cx, cy, p[0], p[1], q[0], q[1], colores[i % colores.length]);
    }
  }
  function poligono(ctx, pts, color) {
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 0.8; ctx.lineJoin = "round";
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  /* Blob facetado (círculo de pocos lados con radio irregular) */
  function blob(ctx, x, y, r, lados, semilla, colores, rot = 0) {
    const pts = [];
    for (let i = 0; i < lados; i++) {
      const a = rot + (i / lados) * TAU, rr = r * (0.82 + hash(i, semilla, 3) * 0.3);
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    abanico(ctx, x, y, pts, colores);
  }

  /* ---------- Cielo facetado (se dibuja una vez por nivel) ---------- */
  function crearCielo(stops, semilla) {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    const cols = 12, rows = 9, hor = 500, cw = W / cols, ch = hor / rows;
    const V = [];
    for (let r = 0; r <= rows; r++) {
      V[r] = [];
      for (let q = 0; q <= cols; q++) {
        const borde = q === 0 || q === cols || r === 0 || r === rows;
        V[r][q] = [q * cw + (borde ? 0 : (hash(q, r, semilla) - 0.5) * cw * 0.7),
                   r * ch + (borde ? 0 : (hash(q, r + 40, semilla) - 0.5) * ch * 0.7)];
      }
    }
    g.fillStyle = rgb(colorEn(stops, 1)); g.fillRect(0, 0, W, H);
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      const a = V[r][q], b = V[r][q + 1], d = V[r + 1][q], e = V[r + 1][q + 1];
      const flip = hash(q, r, semilla + 7) > 0.5;
      const T = flip ? [[a, b, e], [a, e, d]] : [[a, b, d], [b, e, d]];
      T.forEach((t, k) => {
        const cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
        const col = colorEn(stops, cy / hor);
        tri2(g, t[0], t[1], t[2], rgb(col, (hash(q * 2 + k, r, semilla + 3) - 0.5) * 13));
      });
    }
    return c;
  }

  /* ---------- Sol facetado ---------- */
  function sol(ctx, x, y, r, colores, halo, t) {
    ctx.save();
    ctx.globalAlpha = 0.18; blob(ctx, x, y, r * 2.1, 12, 5, [halo], t * 0.03);
    ctx.globalAlpha = 0.28; blob(ctx, x, y, r * 1.55, 10, 6, [halo], -t * 0.04);
    ctx.globalAlpha = 1;
    blob(ctx, x, y, r, 9, 7, [colores[0], colores[1], colores[0], colores[1], colores[1]], t * 0.05);
    ctx.restore();
  }

  /* ---------- Volcán Cotopaxi (sprite precalculado) ---------- */
  function crearVolcan(pal, semilla) {
    const w = 940, h = 430, c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d");
    const apice = [[440, 52], [500, 52]], n = 14, baseY = h - 6;
    const B = [], M = [];
    for (let k = 0; k <= n; k++) {
      const f = k / n;
      B.push([20 + f * 900 + (k % 2 ? 10 : -6) * hash(k, 1, semilla), baseY]);
      const xm = apice[0][0] + (B[k][0] - 470) * 0.40 + (hash(k, 2, semilla) - 0.5) * 24;
      M.push([k === 0 ? xm - 20 : xm, 52 + (baseY - 52) * (0.34 + hash(k, 3, semilla) * 0.2)]);
    }
    const roca = pal.volcan, nieve = pal.nieve;
    const cara = (k, base) => {
      const f = k / n; return base + (0.5 - f) * 12 + (hash(k, 9, semilla) - 0.5) * 8;
    };
    for (let k = 0; k < n; k++) {
      const m0 = M[k], m1 = M[k + 1], b0 = B[k], b1 = B[k + 1];
      const ap = k < n / 2 ? apice[0] : apice[1];
      // franja de nieve alta
      const nieveBaja = hash(k, 4, semilla) > 0.45;
      tri2(g, ap, m0, m1, luz(nieve, cara(k, 0) - 2));
      // franja de roca
      tri2(g, m0, b0, m1, luz(roca, cara(k, 4) + (nieveBaja ? 6 : 0), 0));
      tri2(g, m1, b0, b1, luz(roca, cara(k, -4)));
      // lengüetas de nieve que bajan
      if (nieveBaja) {
        const my = m0[1] + (b0[1] - m0[1]) * 0.28;
        tri2(g, m0, [(m0[0] + b0[0]) / 2 + 6, my], m1, luz(nieve, cara(k, -6)));
      }
    }
    // cumbre entre las dos puntas del cráter
    tri2(g, apice[0], apice[1], M[n / 2], luz(nieve, 2));
    // cráter
    tri2(g, [apice[0][0] - 6, 58], [apice[1][0] + 6, 58], [470, 70], luz(roca, -14));
    return c;
  }

  /* ---------- Terreno por facetas (capas lejanas y suelo jugable) ---------- */
  function terreno(ctx, o) {
    const off = o.cam * o.par, i0 = Math.floor(off / o.cw) - 1, n = Math.ceil(W / o.cw) + 3, filas = o.filas || 2;
    const V = [];
    for (let c = 0; c <= n; c++) {
      const i = i0 + c, x = i * o.cw - off, yt = o.top(i), col = [];
      for (let r = 0; r <= filas; r++) {
        const f = r / filas;
        let xx = x, y = yt + (o.bottom - yt) * f;
        if (r > 0 && r < filas) {
          xx += (hash(i, r, o.semilla) - 0.5) * o.cw * 0.7;
          y += (hash(i, r + 9, o.semilla) - 0.5) * ((o.bottom - yt) / filas) * 0.55;
        }
        col.push([xx, y]);
      }
      V.push(col);
    }
    for (let c = 0; c < n; c++) for (let r = 0; r < filas; r++) {
      const i = i0 + c, a = V[c][r], b = V[c + 1][r], d = V[c][r + 1], e = V[c + 1][r + 1];
      const base = o.mezcla ? o.mezcla(i) : o.hsl;
      const flip = hash(i, r, o.semilla + 5) > 0.5;
      const pend = r === 0 ? (V[c][0][1] - V[c + 1][0][1]) / o.cw : 0;   // >0: sube hacia la derecha
      const T = flip ? [[a, b, e], [a, e, d]] : [[a, b, d], [b, e, d]];
      const prof = -r * 3 + (r === 0 ? 5 : 0);
      T.forEach((t, k) => {
        const dl = prof + pend * 9 * (k === 0 ? 1 : 0.4) - (k === 1 ? 4 : 0) + (hash(i * 2 + k, r, o.semilla + 11) - 0.5) * 9;
        tri2(ctx, t[0], t[1], t[2], luz(base, dl, (hash(i, r + 3, o.semilla) - 0.5) * 6));
      });
    }
  }

  /* ---------- Vegetación y rocas ---------- */
  function frailejon(ctx, x, y, s, semilla, pal) {
    const tronco = [28, 30, 30], hoja = [96, 22, 60];
    const h = 30 * s;
    tri(ctx, x - 4 * s, y, x + 4 * s, y, x - 3 * s, y - h, luz(tronco, 2));
    tri(ctx, x + 4 * s, y, x + 3 * s, y - h, x - 3 * s, y - h, luz(tronco, -8));
    const cx = x, cy = y - h - 2 * s, pts = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU, rr = (i % 2 ? 7 : 14) * s;
      pts.push([cx + Math.cos(a) * rr * 1.05, cy + Math.sin(a) * rr * 0.62]);
    }
    abanico(ctx, cx, cy, pts, [luz(hoja, 8), luz(hoja, -4), luz(hoja, 2), luz(hoja, -10), luz(hoja, 12)]);
  }
  function pajonal(ctx, x, y, s, color) {
    for (let k = 0; k < 4; k++) {
      const dx = (k - 1.5) * 5 * s, alto = (14 + (k % 2) * 8) * s;
      tri(ctx, x + dx - 2.5 * s, y + 2, x + dx + 2.5 * s, y + 2, x + dx + (k - 1.5) * 3 * s, y - alto, luz(color, k % 2 ? 6 : -4));
    }
  }
  function roca(ctx, x, y, s, color) {
    const p = [[x - 12 * s, y], [x - 6 * s, y - 11 * s], [x + 5 * s, y - 14 * s], [x + 13 * s, y - 3 * s], [x + 8 * s, y]];
    const c = [x, y - 4 * s];
    abanico(ctx, c[0], c[1], p, [luz(color, 8), luz(color, -2), luz(color, -10), luz(color, 4), luz(color, -6)]);
  }

  /* ---------- Nubes ---------- */
  function nube(ctx, x, y, s, semilla, color, alpha = 1) {
    ctx.save(); ctx.globalAlpha = alpha;
    const blobs = [[0, 0, 34], [-38, 8, 24], [40, 6, 28], [12, -16, 26], [-14, -12, 20]];
    blobs.forEach((b, i) => blob(ctx, x + b[0] * s, y + b[1] * s, b[2] * s, 8, semilla + i,
      [luz(color, 5), luz(color, 0), luz(color, -6), luz(color, 2)], i));
    ctx.restore();
  }
  function nubeTormenta(ctx, x, y, w, semilla, t) {
    const col = [214, 14, 30], n = Math.ceil(w / 70);
    for (let i = 0; i < n; i++) {
      const cx = x - w / 2 + (i + 0.5) * (w / n), cy = y + Math.sin(i * 1.7 + semilla) * 14;
      blob(ctx, cx, cy + 20, 58, 8, semilla + i, [luz(col, -6), luz(col, -10), luz(col, -14)], i);
      blob(ctx, cx, cy, 52, 8, semilla + i + 20, [luz(col, 4), luz(col, -2), luz(col, -8), luz(col, 1)], i + 2);
    }
  }

  /* ---------- Térmica ---------- */
  function termica(ctx, x, w, suelo, t, intensidad = 1) {
    const sup = 20, alto = suelo - sup;
    const g = ctx.createLinearGradient(0, suelo, 0, sup);
    g.addColorStop(0, `rgba(255,196,110,${0.42 * intensidad})`);
    g.addColorStop(0.7, `rgba(255,220,160,${0.2 * intensidad})`);
    g.addColorStop(1, "rgba(255,240,210,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - w * 0.36, suelo); ctx.lineTo(x - w * 0.5, sup); ctx.lineTo(x + w * 0.5, sup); ctx.lineTo(x + w * 0.36, suelo); ctx.closePath(); ctx.fill();
    // flechas triangulares que suben
    const paso = 58;
    for (let k = 0; k < Math.ceil(alto / paso) + 1; k++) {
      const yy = suelo - ((t * 60 + k * paso) % (alto + paso));
      if (yy < sup + 6) continue;
      const lado = Math.sin(k * 2.3) * w * 0.22;
      const a = clamp((yy - sup) / 120, 0, 1) * 0.5 * intensidad;
      tri(ctx, x + lado, yy - 14, x + lado - 11, yy + 6, x + lado + 11, yy + 6, `rgba(255,244,214,${a})`);
    }
    // brasa en el suelo
    ctx.save(); ctx.globalAlpha = 0.4 * intensidad;
    blob(ctx, x, suelo, w * 0.2, 8, 4, ["#ffb25a", "#ff9a45", "#ffc477"], t * 0.4);
    ctx.restore();
  }

  /* ---------- Carroña y huesos ---------- */
  function carrona(ctx, x, y, s, comida, venenosa) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const piel = venenosa ? [278, 46, 36] : [24, 38, 36];      // la carroña envenenada es de color morado
    if (comida < 1) {
      // cuerpo caído (una llama), de lado
      const cuerpo = [[-34, -6], [-26, -24], [4, -28], [30, -20], [36, -4], [14, 2], [-20, 2]];
      abanico(ctx, 0, -12, cuerpo, [luz(piel, 6), luz(piel, 0), luz(piel, -8), luz(piel, 3), luz(piel, -4), luz(piel, -10), luz(piel, 4)]);
      // cuello y cabeza
      tri(ctx, 30, -20, 36, -4, 54, -10, luz(piel, -6));
      tri(ctx, 54, -10, 36, -4, 56, -2, luz(piel, -12));
      // patas rígidas hacia arriba
      [[-20, -24, -26, -44], [-6, -28, -8, -48], [14, -26, 18, -46], [26, -22, 32, -40]].forEach((l, i) =>
        tri(ctx, l[0] - 3, l[1], l[0] + 3, l[1], l[2], l[3], luz(piel, -14 + i)));
      // costillas
      for (let k = 0; k < 4; k++) tri(ctx, -16 + k * 11, -26, -11 + k * 11, -26, -13 + k * 11, -14, venenosa ? luz([285, 60, 72], -4 * k) : luz([48, 20, 80], -4 * k));
    }
    if (comida > 0) {
      ctx.globalAlpha = clamp(comida, 0, 1);
      const hueso = [48, 25, 88];
      for (let k = 0; k < 5; k++) {
        const bx = -28 + k * 14;
        tri(ctx, bx, -2, bx + 5, -2, bx + 3 + (k % 2) * 5, -20 - (k % 3) * 4, luz(hueso, -k * 2));
      }
      tri(ctx, -34, -2, 36, -2, 0, -9, luz(hueso, -10));
    }
    ctx.restore();
  }

  /* ---------- Gallinazo ---------- */
  function gallinazo(ctx, x, y, t, s = 1) {
    const ala = Math.sin(t * 3.2) * 4 * s, c = [230, 12, 14];
    ctx.save(); ctx.translate(x, y);
    tri(ctx, -2 * s, 0, -20 * s, -5 * s - ala, -8 * s, 3 * s, luz(c, 4));
    tri(ctx, 2 * s, 0, 20 * s, -5 * s - ala, 8 * s, 3 * s, luz(c, 8));
    tri(ctx, -7 * s, 0, 8 * s, 0, 0, 7 * s, luz(c, -2));
    tri(ctx, 6 * s, 0, 12 * s, -1 * s, 9 * s, 5 * s, "#8a8c93");
    ctx.restore();
  }

  /* ---------- Marcadores de la Vista de cóndor ---------- */
  function marcador(ctx, x, y, venenosa, t) {
    const y2 = y + Math.sin(t * 5) * 3;
    ctx.save();
    if (venenosa) {
      blob(ctx, x, y2, 20, 4, 1, ["#9b4dff", "#6f2bd1", "#b980ff"], Math.PI / 4);
      ctx.fillStyle = "#fff"; ctx.font = "700 17px 'Chakra Petch', system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("!", x, y2 + 1);
    } else {
      tri(ctx, x - 13, y2 - 9, x + 13, y2 - 9, x, y2 + 11, "#6bd06a");
      tri(ctx, x - 13, y2 - 9, x, y2 - 9, x - 2, y2 + 2, "#8fe58a");
    }
    ctx.restore();
  }

  /* ---------- Plumas (monedas) ---------- */
  function pluma(ctx, x, y, t, fase) {
    const b = Math.sin(t * 3 + fase) * 4, r = Math.sin(t * 1.6 + fase) * 0.35;
    ctx.save(); ctx.translate(x, y + b); ctx.rotate(r);
    ctx.globalAlpha = 0.28; blob(ctx, 0, 0, 20, 6, 2, ["#ffe08a"], t);
    ctx.globalAlpha = 1;
    tri(ctx, 0, -13, 7, 0, 0, 13, "#ffcf55");
    tri(ctx, 0, -13, -7, 0, 0, 13, "#fff2c7");
    tri(ctx, 0, -13, 2, 0, 0, 13, "#e9a93a");
    ctx.restore();
  }

  /* ---------- Torres y cables ---------- */
  function torre(ctx, x, suelo, tope) {
    const alto = suelo - tope, ancho = 26, c1 = "#5b6573", c2 = "#3f4753";
    tri(ctx, x - ancho, suelo, x - 4, tope, x - 8, suelo, c1);
    tri(ctx, x + ancho, suelo, x + 4, tope, x + 8, suelo, c2);
    ctx.strokeStyle = c2; ctx.lineWidth = 2.4; ctx.lineJoin = "round";
    ctx.beginPath();
    const tramos = 4;
    for (let k = 0; k < tramos; k++) {
      const y0 = suelo - alto * (k / tramos), y1 = suelo - alto * ((k + 1) / tramos);
      const a0 = ancho * (1 - k / tramos * 0.82), a1 = ancho * (1 - (k + 1) / tramos * 0.82);
      ctx.moveTo(x - a0 + 3, y0); ctx.lineTo(x + a1 - 3, y1);
      ctx.moveTo(x + a0 - 3, y0); ctx.lineTo(x - a1 + 3, y1);
    }
    ctx.stroke();
    tri(ctx, x - 30, tope + 6, x + 30, tope + 6, x, tope - 8, "#6a7584");
    tri(ctx, x - 30, tope + 6, x + 30, tope + 6, x, tope + 14, "#48515e");
  }
  function cable(ctx, x0, x1, yTorre, hundido, t) {
    const seg = 16; let prev = null;
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    const pts = [];
    for (let k = 0; k <= seg; k++) {
      const f = k / seg, y = yTorre + hundido * (1 - Math.pow(2 * f - 1, 2));
      pts.push([x0 + (x1 - x0) * f, y]);
    }
    ctx.strokeStyle = "#1c2128"; ctx.lineWidth = 4; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    ctx.strokeStyle = "#8793a3"; ctx.lineWidth = 1.2; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] - 1) : ctx.moveTo(p[0], p[1] - 1))); ctx.stroke();
    // desviadores de vuelo (visibles para las aves)
    for (let k = 2; k < seg - 1; k += 3) {
      const p = pts[k], on = (k / 3 | 0) % 2;
      blob(ctx, p[0], p[1] + 1, 6.5, 6, k, on ? ["#ff7a45", "#ff5a2b"] : ["#f4f4f4", "#dfe4ea"], k);
    }
  }

  /* ---------- Cazador ---------- */
  function cazador(ctx, x, y, apunta, ang, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1.4, 1.4);
    tri(ctx, -8, 0, -1, 0, -3, -16, "#3a3f4b"); tri(ctx, 1, 0, 8, 0, 3, -16, "#2b303a");           // piernas
    tri(ctx, -10, -14, 10, -14, 0, -34, "#4f6b4a"); tri(ctx, -10, -14, 0, -34, -4, -20, "#5f7d58");     // chaqueta
    tri(ctx, -5, -34, 5, -34, 0, -43, "#d9b08c");                                                      // cabeza
    tri(ctx, -7, -39, 7, -39, 0, -49, "#e8742f");                                                      // gorro naranja
    // fusil
    const a = apunta ? ang : -0.5 + Math.sin(t) * 0.05;
    ctx.save(); ctx.translate(2, -27); ctx.rotate(a);
    poligono(ctx, [[-4, -1.5], [30, -1.5], [30, 1.5], [-4, 1.5]], "#262a33");
    tri(ctx, -4, -1.5, -10, 5, -4, 3, "#6b4a2f");
    ctx.restore();
    ctx.restore();
  }

  /* ---------- Rayo ---------- */
  function rayo(ctx, x, y0, y1, semilla, alpha) {
    const pts = [[x, y0]]; let cx = x;
    const pasos = 9;
    for (let k = 1; k <= pasos; k++) {
      cx += (hash(k, semilla, 2) - 0.5) * 70;
      pts.push([cx, y0 + (y1 - y0) * (k / pasos)]);
    }
    ctx.save(); ctx.lineJoin = "miter"; ctx.lineCap = "round";
    ctx.strokeStyle = `rgba(255,236,150,${0.45 * alpha})`; ctx.lineWidth = 16;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`; ctx.lineWidth = 4.5;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    ctx.restore();
  }

  /* ---------- Nido y huevo ---------- */
  function nido(ctx, x, y, huevo, t) {
    // columna de luz que marca la meta
    const g = ctx.createLinearGradient(0, y, 0, -10);
    g.addColorStop(0, "rgba(255,226,140,0.45)"); g.addColorStop(1, "rgba(255,226,140,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - 26, y); ctx.lineTo(x - 52 - Math.sin(t) * 4, -10); ctx.lineTo(x + 52 + Math.sin(t) * 4, -10); ctx.lineTo(x + 26, y); ctx.closePath(); ctx.fill();
    // ramas
    const ramas = [[-36, 0], [-30, -10], [-14, -16], [6, -17], [24, -12], [36, -2]];
    abanico(ctx, x, y - 4, ramas.map((r) => [x + r[0], y + r[1]]), ["#7a5532", "#5e3f25", "#8e6640", "#4d321d", "#6f4c2d", "#835b38"]);
    tri(ctx, x - 40, y + 4, x + 40, y + 4, x, y - 6, "#4d321d");
    if (huevo) {
      tri(ctx, x, y - 26, x + 9, y - 12, x - 9, y - 12, "#f7f3e8");
      tri(ctx, x, y - 26, x - 9, y - 12, x - 1, y - 8, "#dfd8c6");
      tri(ctx, x + 9, y - 12, x, y - 5, x - 9, y - 12, "#cfc7b2");
    }
  }

  /* ---------- Cóndor Low-Poly ---------- */
  const NEGROS = ["#1a1d27", "#242a3a", "#151720", "#2e3649", "#1f2431"];
  function ala(ctx, sx, sy, a, len, lejana, adulto) {
    const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    const P = (d, off) => [sx + ux * d + nx * off, sy + uy * d + ny * off];
    const ds = [0, 0.36, 0.7, 1].map((v) => v * len);
    const lead = [10, 7, 4, 1], trail = [17, 23, 19, 9];
    const L = ds.map((d, i) => P(d, lead[i])), T = ds.map((d, i) => P(d, -trail[i]));
    const sombra = lejana ? -10 : 0;
    const tono = (i, k) => {
      const base = NEGROS[(i * 2 + k) % NEGROS.length];
      return lejana ? rgb(hex(base), 6) : base;
    };
    for (let i = 0; i < 3; i++) {
      tri2(ctx, L[i], L[i + 1], T[i], tono(i, 0));
      const blanco = adulto && i === 1;
      tri2(ctx, L[i + 1], T[i + 1], T[i], blanco ? (lejana ? "#cfd6dc" : "#f1f4f6") : tono(i, 1));
    }
    // plumas primarias (dedos)
    const F1 = P(len * 0.8, -33), F2 = P(len * 0.95, -29), F3 = P(len * 1.1, -19);
    tri2(ctx, T[2], F1, P(len * 0.86, -15), tono(1, 1));
    tri2(ctx, P(len * 0.86, -15), F2, T[3], tono(2, 0));
    tri2(ctx, T[3], F3, P(len * 1.0, -11), tono(0, 1));
  }
  /* o: {x,y,pitch,fase,amp,macho,escala,suelo,comiendo,alpha,tinte} */
  function condor(ctx, o) {
    ctx.save();
    ctx.translate(o.x, o.y); ctx.rotate(o.pitch || 0); ctx.scale(o.escala || 1, o.escala || 1);
    if (o.alpha !== undefined && o.alpha < 1) ctx.globalAlpha = o.alpha;
    const plegada = o.suelo && !o.aleteando;
    const amp = o.amp || 0, fase = o.fase || 0;
    const aNear = plegada ? -3.95 : -2.5 + 0.95 * amp * Math.sin(fase);
    const aFar = plegada ? -4.1 : -2.62 + 0.95 * amp * Math.sin(fase - 0.55);
    const len = plegada ? 50 : 72;
    // sombra de ala lejana
    ala(ctx, -2, -8, aFar, len * 0.95, true, true);
    // patas
    if (o.suelo || o.comiendo) {
      tri(ctx, -4, 10, 2, 10, -6, 24, "#a79c93"); tri(ctx, 6, 10, 12, 10, 5, 24, "#8c8179");
    }
    // cuerpo
    const cuerpo = [[-42, 5], [-31, -5], [-13, -11], [5, -12], [16, -9], [19, 3], [8, 12], [-14, 11], [-36, 12]];
    abanico(ctx, 0, 0, cuerpo, NEGROS);
    tri(ctx, -30, -2, -48, 2, -33, 10, "#12141b");
    tri(ctx, -26, 2, -46, 8, -30, 12, "#242a3a");
    // collar blanco
    const hy = o.comiendo ? 12 + Math.sin(o.t * 14) * 2 : 0, hx = o.comiendo ? 7 : 0;
    tri(ctx, 11, -10, 20, -6, 15, 3, "#f4f6f7");
    tri(ctx, 11, -10, 15, 3, 8, 5, "#dfe5ea");
    tri(ctx, 20, -6, 21, 3, 15, 3, "#cfd6dc");
    // cabeza (el cuello baja al comer)
    const cab = [[22 + hx, -14 + hy], [31 + hx, -19 + hy], [38 + hx, -14 + hy], [39 + hx, -8 + hy], [31 + hx, -3 + hy], [22 + hx, -4 + hy]];
    if (o.comiendo) {
      tri(ctx, 17, -8, 21, -4, 22 + hx, -14 + hy, "#4a3d42");
      tri(ctx, 21, -4, 22 + hx, -4 + hy, 22 + hx, -14 + hy, "#5a4a50");
    }
    abanico(ctx, 30 + hx, -10 + hy, cab, o.macho
      ? ["#d9593f", "#c94a38", "#e5774a", "#b8423a", "#ec8f54", "#d24f3b"]          // macho: cabeza roja y anaranjada
      : ["#8d9096", "#797c83", "#a1a4aa", "#6f7279", "#9b9092", "#a8aaaf"]);        // hembra: cabeza gris
    if (o.macho) {
      tri(ctx, 26 + hx, -18 + hy, 38 + hx, -24 + hy, 38 + hx, -14 + hy, "#8a3f3d");
      tri(ctx, 38 + hx, -14 + hy, 32 + hx, -3 + hy, 38 + hx, -5 + hy, "#f0a24f");
    }
    // pico
    tri(ctx, 38 + hx, -13 + hy, 49 + hx, -6 + hy, 38 + hx, -6 + hy, "#f1ecde");
    tri(ctx, 46 + hx, -8 + hy, 50 + hx, -4 + hy, 44 + hx, -4 + hy, "#cfc7b0");
    // ojo
    ctx.fillStyle = o.macho ? "#4a2a16" : "#d6362b";
    ctx.beginPath(); ctx.arc(33 + hx, -10 + hy, 2.1, 0, TAU); ctx.fill();
    // ala cercana
    ala(ctx, 4, -9, aNear, len, false, true);
    ctx.restore();
  }


  /* ---------- Poderes (orbes brillantes) ---------- */
  function tono(hex, k) {
    const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255], m = k >= 0 ? 255 : 0, f = Math.abs(k);
    return `rgb(${c.map((v) => Math.round(v + (m - v) * f)).join(",")})`;
  }
  function poder(ctx, x, y, tipo, color, t, fase) {
    const b = Math.sin(t * 2.6 + fase) * 5, pul = 1 + Math.sin(t * 4 + fase) * 0.09;
    ctx.save(); ctx.translate(x, y + b);
    ctx.globalAlpha = 0.26; blob(ctx, 0, 0, 38 * pul, 8, (fase * 3) | 0, [tono(color, 0.45)], t * 0.4);
    ctx.globalAlpha = 0.4; blob(ctx, 0, 0, 28 * pul, 6, 5, [tono(color, 0.3)], -t * 0.5);
    ctx.globalAlpha = 1;
    const pts = Array.from({ length: 6 }, (_, i) => [Math.cos((i / 6) * TAU + 0.5) * 20, Math.sin((i / 6) * TAU + 0.5) * 20]);
    abanico(ctx, 0, 0, pts, [tono(color, 0.3), color, tono(color, -0.25), tono(color, 0.12), tono(color, -0.12), tono(color, 0.4)]);
    const w = "#ffffff", w2 = "rgba(255,255,255,.7)";
    if (tipo === "escudo") { poligono(ctx, [[-9, -10], [9, -10], [9, 2], [0, 12], [-9, 2]], w); poligono(ctx, [[0, -10], [9, -10], [9, 2], [0, 12]], w2); }
    else if (tipo === "rafaga") { [-8, 0, 8].forEach((o, i) => { poligono(ctx, [[-11 + i * 2, o - 2], [5, o - 2], [5, o - 5], [12, o], [5, o + 5], [5, o + 2], [-11 + i * 2, o + 2]], i === 1 ? w : w2); }); }
    else if (tipo === "termica") { poligono(ctx, [[0, -12], [11, 0], [4, 0], [4, 11], [-4, 11], [-4, 0], [-11, 0]], w); poligono(ctx, [[0, -12], [11, 0], [4, 0], [0, -4]], w2); }
    else if (tipo === "iman") { poligono(ctx, [[-10, -10], [-4, -10], [-4, 3], [4, 3], [4, -10], [10, -10], [10, 6], [0, 13], [-10, 6]], w); tri(ctx, -10, -10, -4, -10, -4, -5, "#ff6a5a"); tri(ctx, 10, -10, 4, -10, 4, -5, "#ff6a5a"); }
    else { poligono(ctx, [[3, -12], [-7, 2], [-1, 2], [-4, 12], [8, -3], [1, -3]], w); }
    ctx.restore();
  }
  function escudo(ctx, x, y, t, a) {
    ctx.save(); ctx.translate(x, y);
    const r = 50 + Math.sin(t * 6) * 2, pts = Array.from({ length: 7 }, (_, i) => [Math.cos((i / 7) * TAU + t * 0.6) * r, Math.sin((i / 7) * TAU + t * 0.6) * r * 0.9]);
    ctx.globalAlpha = a * 0.2; abanico(ctx, 0, 0, pts, ["#8fdcff", "#6fd3ff", "#b6ecff"]);
    ctx.globalAlpha = a * 0.95; ctx.strokeStyle = "#c9f0ff"; ctx.lineWidth = 3; ctx.lineJoin = "round";
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.stroke();
    ctx.restore();
  }


  /* ---------- Bandera de punto de control ---------- */
  function bandera(ctx, x, y, activo, t, anim) {
    const alto = 118, cols = activo ? ["#ffe9a8", "#ffd46e", "#f0b942"] : ["#a1a9c9", "#8a93b8", "#6f7aa3"];
    ctx.save(); ctx.translate(x, y);
    poligono(ctx, [[-17, 0], [17, 0], [11, -10], [-11, -10]], "#6a5b4f"); tri(ctx, -17, 0, 0, 0, -11, -10, "#7b6a5c");
    poligono(ctx, [[-2.5, -8], [2.5, -8], [1.6, -alto], [-1.6, -alto]], "#d9d0c0"); tri(ctx, 0, -8, 2.5, -8, 1.6, -alto, "#b9b0a0");
    tri(ctx, -5, -alto, 5, -alto, 0, -alto - 10, activo ? "#ffd46e" : "#9aa3c7");
    const fy = -alto + 8 + (activo ? (1 - anim) * 38 : 62), w = Math.sin(t * 5) * 4;
    if (activo) { ctx.globalAlpha = 0.25; blob(ctx, 24, fy + 12, 34, 8, 3, ["#ffe08a"], t * 0.5); ctx.globalAlpha = 1; }
    tri(ctx, 1.6, fy, 40 + w, fy + 8 + w * 0.5, 1.6, fy + 15, cols[0]);
    tri(ctx, 1.6, fy + 15, 40 + w, fy + 8 + w * 0.5, 1.6, fy + 30, cols[1]);
    tri(ctx, 1.6, fy, 22, fy + 3, 1.6, fy + 12, cols[2]);
    ctx.restore();
  }

  /* ---------- Partículas triangulares ---------- */
  function particula(ctx, p) {
    const a = clamp(p.vida / p.vidaMax, 0, 1);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    const s = p.tam * (p.encoge ? a : 1);
    tri(ctx, -s, s * 0.7, s, s * 0.7, 0, -s, p.color);
    ctx.restore();
  }

  return { W, H, hash, hsl, luz, clamp, tri, tri2, poligono, blob, abanico, crearCielo, sol, crearVolcan, terreno,
    frailejon, pajonal, roca, nube, nubeTormenta, termica, carrona, gallinazo, marcador, pluma, torre, cable,
    cazador, rayo, nido, condor, particula, poder, escudo, tono, bandera };
})();
