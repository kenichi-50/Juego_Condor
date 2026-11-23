"use strict";
/* =====================================================================
   INTERFAZ  ·  pantallas, HUD, avisos, almacenamiento y avisos
   No contiene lógica de vuelo: solo muestra cosas y avisa a Juego.
   ===================================================================== */

/* ---------- Almacenamiento en el navegador ---------- */
const Almacen = (() => {
  const leer = (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };
  const datos = new Set(leer("gdc.datos", []));
  const logros = new Set(leer("gdc.logros", []));
  return {
    leer, guardar,
    get datos() { return datos; },
    get logros() { return logros; },
    descubrir(id) { if (datos.has(id)) return false; datos.add(id); guardar("gdc.datos", [...datos]); return true; },
    otorgar(id) { if (logros.has(id)) return false; logros.add(id); guardar("gdc.logros", [...logros]); return true; },
    prefs: leer("gdc.prefs", { jugadores: 1, sexo: "macho", nombre: "" }),
    guardarPrefs(p) { Object.assign(this.prefs, p); guardar("gdc.prefs", this.prefs); },
  };
})();

const UI = (() => {
  const $ = (id) => document.getElementById(id);
  const capa = $("capa"), toasts = $("toasts"), consejoEl = $("consejo");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const miles = (n) => Math.round(n).toLocaleString("es-EC");
  const estrellas = (n, max = 3) => `<span class="estrellas" aria-label="${n} de ${max} estrellas">${
    Array.from({ length: max }, (_, i) => `<i class="estrella ${i < n ? "llena" : ""}"></i>`).join("")}</span>`;

  let filtroTema = "Todos";
  let plumaTimer = null;
  let plumaDesbloqueada = false;

  /* ---------- Capa de pantallas ---------- */
  function mostrar(html, clase = "") {
    capa.className = "capa " + clase; capa.innerHTML = html; capa.hidden = false;
    const f = capa.querySelector("[data-foco]") || capa.querySelector("button:not([disabled]), input");
    if (f) f.focus({ preventScroll: true });
    capa.scrollTop = 0;
  }
  function ocultar() {
    clearInterval(plumaTimer);
    capa.hidden = true;
    capa.innerHTML = "";
  }
  const visible = () => !capa.hidden;

  /* ---------- Pantallas ---------- */
  function menu() {
    const p = Almacen.prefs, otro = p.sexo === "macho" ? "hembra" : "macho";
    const seg = (accion, valor, actual, texto) =>
      `<button type="button" class="seg ${String(actual) === String(valor) ? "activo" : ""}" data-accion="${accion}" data-v="${valor}" aria-pressed="${String(actual) === String(valor)}">${texto}</button>`;
    mostrar(`
      <section class="panel menu">
        <h1 class="titulo">Guardianes<br>del Cóndor</h1>
        <p class="lema">Planea sobre el Cotopaxi, limpia el páramo y lleva alimento al nido del ave nacional del Ecuador.</p>
        <div class="ajustes">
          <div class="ajuste"><span class="etq">Jugadores</span><div class="grupo-seg">${seg("jugadores", 1, p.jugadores, "1")}${seg("jugadores", 2, p.jugadores, "2")}</div></div>
          <div class="ajuste"><span class="etq">${p.jugadores === 2 ? "Jugador 1" : "Tu cóndor"}</span><div class="grupo-seg">${seg("sexo", "macho", p.sexo, "Macho")}${seg("sexo", "hembra", p.sexo, "Hembra")}</div></div>
          <p class="nota-ajuste">${esc(CONDORES[p.sexo].detalle)}${p.jugadores === 2 ? ` El jugador 2 será ${otro === "macho" ? "el macho" : "la hembra"}.` : ""}</p>
        </div>
        <div class="botones">
          <button type="button" class="btn principal" data-accion="jugar" data-foco>Volar</button>
          <button type="button" class="btn" data-accion="ayuda">Cómo se juega</button>
          <button type="button" class="btn" data-accion="enciclopedia">Enciclopedia <small>${Almacen.datos.size}/${DATOS_CONDOR.length}</small></button>
          <button type="button" class="btn" data-accion="logros">Logros <small>${Almacen.logros.size}/${LOGROS.length}</small></button>
          <button type="button" class="btn suave" data-accion="sonido">${SND.silencio ? "Activar sonido" : "Silenciar"}</button>
        </div>
      </section>`, "centro-menu");
  }

  function ayuda() {
    mostrar(`
      <section class="panel ancho">
        <h2>Cómo se juega</h2>
        <p>Vuelas hacia el nido, en el risco al final de cada nivel. Planear es gratis; aletear gasta energía.</p>
        <div class="dos-col">
          <div>
            <h3>Controles</h3>
            <table class="tabla">
              <thead><tr><th>Acción</th><th>1 jugador</th><th>Jugador 1</th><th>Jugador 2</th></tr></thead>
              <tbody>
                <tr><td>Aletear (mantén)</td><td><kbd>↑</kbd> <kbd>Espacio</kbd></td><td><kbd>W</kbd></td><td><kbd>↑</kbd></td></tr>
                <tr><td>Acelerar / frenar</td><td><kbd>→</kbd> <kbd>←</kbd></td><td><kbd>D</kbd> <kbd>A</kbd></td><td><kbd>→</kbd> <kbd>←</kbd></td></tr>
                <tr><td>Picada</td><td><kbd>↓</kbd></td><td><kbd>S</kbd></td><td><kbd>↓</kbd></td></tr>
                <tr><td>Vista de cóndor</td><td><kbd>V</kbd></td><td><kbd>E</kbd></td><td><kbd>L</kbd></td></tr>
                <tr><td>Pausa / sonido</td><td colspan="3"><kbd>Esc</kbd> o <kbd>P</kbd> / <kbd>M</kbd></td></tr>
              </tbody>
            </table>
            <p class="chico">En el celular usa los botones táctiles (1 jugador).</p>
          </div>
          <div>
            <h3>Lo que debes saber</h3>
            <ul class="lista">
              <li><strong>Térmicas:</strong> columnas de aire caliente. Frena dentro de ellas y subes gratis.</li>
              <li><strong>Carroña:</strong> baja en picada y quédate quieto un momento para comer y recuperar energía.</li>
              <li><strong>Gallinazos:</strong> dan vueltas sobre la comida segura.</li>
              <li><strong>Carroña morada:</strong> está envenenada. ¡No la comas! La Vista de cóndor también la marca en morado.</li>
              <li><strong>Pluma dorada:</strong> cruza la pantalla unos segundos. Tócala: se pausa el juego 5 segundos para leer el dato y otorga +25 % de energía.</li>
              <li><strong>Aro dorado:</strong> cerca del nido. Atraviésalo y responde 3 preguntas sobre las plumas: con 2 aciertos te da un gran impulso.</li>
              <li><strong>Planeo:</strong> cuanto más tiempo sin aletear, más puntos multiplicas.</li>
              <li><strong>Despegar del suelo cuesta el triple.</strong> Mejor lanzarte desde lo alto.</li>
            </ul>
          </div>
        </div>
        <div class="acciones"><button type="button" class="btn principal" data-accion="menu" data-foco>Entendido</button></div>
      </section>`);
  }

  function enciclopedia() {
    const temas = ["Todos", ...new Set(DATOS_CONDOR.map((d) => d.tema))];
    const lista = DATOS_CONDOR.filter((d) => filtroTema === "Todos" || d.tema === filtroTema);
    mostrar(`
      <section class="panel ancho">
        <h2>Enciclopedia del cóndor</h2>
        <p>Descubriste <strong>${Almacen.datos.size}</strong> de ${DATOS_CONDOR.length} datos. Cada uno se desbloquea jugando.</p>
        <div class="filtros" role="group" aria-label="Filtrar por tema">${temas.map((t) =>
          `<button type="button" class="seg ${t === filtroTema ? "activo" : ""}" data-accion="filtro" data-v="${esc(t)}" aria-pressed="${t === filtroTema}">${esc(t)}</button>`).join("")}</div>
        <div class="rejilla-datos">${lista.map((d) => Almacen.datos.has(d.id)
          ? `<article class="dato"><h3>${esc(d.titulo)}</h3><p>${esc(d.texto)}</p><small>Fuente: ${esc(d.fuente)}</small></article>`
          : `<article class="dato bloqueado"><h3>Dato por descubrir</h3><p>Tema: ${esc(d.tema)}. Sigue volando para encontrarlo.</p></article>`).join("")}</div>
        <div class="acciones"><button type="button" class="btn principal" data-accion="menu" data-foco>Volver</button></div>
      </section>`);
  }

  function logros() {
    mostrar(`
      <section class="panel ancho">
        <h2>Logros</h2>
        <p>Tienes ${Almacen.logros.size} de ${LOGROS.length}.</p>
        <ul class="rejilla-logros">${LOGROS.map((l) => {
          const ok = Almacen.logros.has(l.id);
          return `<li class="logro ${ok ? "ganado" : ""}"><i class="medalla"></i><div><strong>${esc(l.titulo)}</strong><span>${esc(l.texto)}</span></div></li>`;
        }).join("")}</ul>
        <div class="acciones"><button type="button" class="btn principal" data-accion="menu" data-foco>Volver</button></div>
      </section>`);
  }

  function intro(i) {
    const n = NIVELES[i];
    mostrar(`
      <section class="panel nivel-intro">
        <p class="num-nivel">Nivel ${n.id} de ${NIVELES.length}</p>
        <h2>${esc(n.nombre)}</h2>
        <p class="texto-intro">${n.intro}</p>
        <ul class="chips" aria-label="Novedades del nivel">${n.nuevo.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <div class="acciones"><button type="button" class="btn principal" data-accion="empezar" data-foco>Volar</button></div>
      </section>`, "fondo-suave");
  }

  function pausa() {
    mostrar(`
      <section class="panel pausa">
        <h2>Pausa</h2>
        <div class="botones">
          <button type="button" class="btn principal" data-accion="reanudar" data-foco>Continuar</button>
          <button type="button" class="btn" data-accion="reiniciar">Reiniciar nivel</button>
          <button type="button" class="btn" data-accion="ayuda-pausa">Cómo se juega</button>
          <button type="button" class="btn" data-accion="sonido-pausa">${SND.silencio ? "Activar sonido" : "Silenciar"}</button>
          <button type="button" class="btn suave" data-accion="menu-salir">Salir al menú</button>
        </div>
      </section>`, "fondo-suave");
  }

  function pregunta(idx) {
    const q = PREGUNTAS[idx];
    mostrar(`
      <section class="panel pregunta">
        <p class="num-nivel">Pregunta del nivel ${idx + 1}</p>
        <h2>${esc(q.pregunta)}</h2>
        <div class="opciones-pregunta" id="opciones">${q.opciones.map((o, i) =>
          `<button type="button" class="btn opcion" data-accion="responder" data-i="${i}" ${i === 0 ? "data-foco" : ""}>${esc(o)}</button>`).join("")}</div>
        <div id="resultado-pregunta" aria-live="polite"></div>
      </section>`, "fondo-suave");
  }

  function respuestaMostrada(idx, elegida, ok) {
    const q = PREGUNTAS[idx];
    capa.querySelectorAll(".opcion").forEach((b, i) => {
      b.disabled = true;
      if (i === q.correcta) b.classList.add("correcta"); else if (i === elegida) b.classList.add("incorrecta");
    });
    $("resultado-pregunta").innerHTML = `
      <p class="veredicto ${ok ? "bien" : "mal"}">${ok ? "¡Correcto! +200 puntos" : "Casi. La respuesta correcta está marcada."}</p>
      <p>${esc(q.explicacion)}</p><p class="chico">Fuente: ${esc(q.fuente)}</p>
      <div class="acciones"><button type="button" class="btn principal" data-accion="continuar" data-foco>Continuar</button></div>`;
    const f = capa.querySelector("[data-accion='continuar']"); if (f) f.focus();
  }

  function resumen(r) {
    const ultimo = r.indice === NIVELES.length - 1;
    mostrar(`
      <section class="panel resumen">
        <p class="num-nivel">Nivel ${r.indice + 1} completado</p>
        <h2>${esc(r.nombre)}</h2>
        ${estrellas(r.estrellas)}
        <ul class="criterios">
          <li class="${r.estrellas >= 1 ? "ok" : ""}">Llegaste al nido</li>
          <li class="${r.limpio >= 70 ? "ok" : ""}">Páramo limpio al 70 % o más</li>
          <li class="${r.correcta ? "ok" : ""}">Respuesta correcta</li>
        </ul>
        <table class="tabla chica">
          <tbody>
            <tr><td>Puntos del nivel</td><td>${miles(r.puntosNivel)}</td></tr>
            <tr><td>Páramo limpio</td><td>${r.limpio}%</td></tr>
            <tr><td>Plumas recogidas</td><td>${r.plumas} de ${r.plumasTotal}</td></tr>
            <tr><td>Plumas doradas</td><td>${r.plumasDoradas}</td></tr>
            <tr><td>Aro dorado</td><td>${r.aro < 0 ? "No lo cruzaste" : r.aro + " de 3 aciertos" + (r.aro >= FISICA.aroAprobar ? " (¡impulso!)" : "")}</td></tr>
            <tr><td>Tiempo aleteando</td><td>${r.aleteoPct}% <span class="chico">(el cóndor real: cerca del 1 %)</span></td></tr>
            <tr><td>Daños recibidos</td><td>${r.danos}</td></tr>
            <tr><td>Datos nuevos</td><td>${r.datosNuevos}</td></tr>
          </tbody>
        </table>
        <div class="acciones"><button type="button" class="btn principal" data-accion="siguiente" data-foco>${ultimo ? "Ver el final" : "Siguiente nivel"}</button></div>
      </section>`, "fondo-suave");
  }

  function fin(r) {
    mostrar(`
      <section class="panel ancho fin ${r.victoria ? "victoria" : "derrota"}">
        <h2>${r.victoria ? "¡Todos los nidos a salvo!" : "El vuelo terminó"}</h2>
        ${r.victoria ? estrellas(r.estrellasTotal, NIVELES.length * 3) : ""}
        <p class="gran-puntaje">${miles(r.puntos)} <small>puntos</small></p>
        ${r.victoria ? `<div class="mensaje-final"><h3>${esc(MENSAJE_FINAL.titulo)}</h3><p>${esc(MENSAJE_FINAL.texto)}</p></div>`
          : `<p>Perdiste todas las vidas en el nivel ${r.nivel}. Los cóndores reales no tienen una segunda oportunidad, por eso hay que cuidarlos.</p>`}
        <div class="acciones">
          <button type="button" class="btn" data-accion="jugar" ${r.victoria ? "" : "data-foco"}>Jugar de nuevo</button>
          <button type="button" class="btn suave" data-accion="menu">Menú</button>
        </div>
      </section>`);
  }

  /* ---------- Pluma dorada: Cuadro centrado con espera de 5 segundos ---------- */
  function plumaDoradaModal(f) {
    limpiarAvisos();
    clearInterval(plumaTimer);
    plumaDesbloqueada = false;
    let seg = 5;

    mostrar(`
      <section class="panel pregunta aro-panel">
        <p class="num-nivel">¡Pluma Dorada Encontrada!</p>
        <h2>${esc(f.titulo)}</h2>
        <p>${esc(f.texto)}</p>
        <p class="bono">+25 % de energía recuperada</p>
        <small>Fuente: ${esc(f.fuente)}</small>
        <div class="acciones">
          <button type="button" class="btn principal" id="btn-pluma-continuar" data-accion="reanudar-pluma" disabled>Lee el dato (5s)</button>
        </div>
      </section>`, "fondo-suave aro");

    const btn = $("btn-pluma-continuar");
    plumaTimer = setInterval(() => {
      seg--;
      if (!btn) { clearInterval(plumaTimer); return; }
      if (seg > 0) {
        btn.textContent = `Lee el dato (${seg}s)`;
      } else {
        clearInterval(plumaTimer);
        plumaDesbloqueada = true;
        btn.disabled = false;
        btn.textContent = "Continuar (Presiona Enter o cualquier tecla)";
        btn.focus({ preventScroll: true });
      }
    }, 1000);
  }

  function plumaLista() {
    return plumaDesbloqueada;
  }

  /* ---------- Aro dorado: quiz de 3 preguntas ---------- */
  function aroQuiz(qs) {
    let i = 0, aciertos = 0;
    limpiarAvisos();
    const pintar = () => {
      const q = qs[i];
      mostrar(`
        <section class="panel pregunta aro-panel">
          <p class="num-nivel">Aro dorado · pregunta ${i + 1} de ${qs.length}</p>
          <h2>${esc(q.pregunta)}</h2>
          <div class="opciones-pregunta">${q.opciones.map((o, k) =>
            `<button type="button" class="btn opcion" data-accion="aro-resp" data-i="${k}" ${k === 0 ? "data-foco" : ""}>${esc(o)}</button>`).join("")}</div>
          <div id="resultado-aro" aria-live="polite"></div>
          <p class="chico">Aciertos: ${aciertos}. Con ${FISICA.aroAprobar} de ${qs.length} recibes el impulso.</p>
        </section>`, "fondo-suave aro");
    };
    aroEstado = {
      responder(k) {
        const q = qs[i], ok = k === q.correcta; if (ok) aciertos++;
        capa.querySelectorAll(".opcion").forEach((b, n) => { b.disabled = true; if (n === q.correcta) b.classList.add("correcta"); else if (n === k) b.classList.add("incorrecta"); });
        const ultima = i === qs.length - 1;
        $("resultado-aro").innerHTML = `<p class="veredicto ${ok ? "bien" : "mal"}">${ok ? "¡Correcto!" : "Casi."}</p><p>${esc(q.explicacion)}</p>
          <div class="acciones"><button type="button" class="btn principal" data-accion="aro-sig" data-foco>${ultima ? "Ver resultado" : "Siguiente"}</button></div>`;
        const f = capa.querySelector("[data-accion='aro-sig']"); if (f) f.focus();
      },
      siguiente() {
        i++;
        if (i < qs.length) { pintar(); return; }
        const ok = aciertos >= FISICA.aroAprobar;
        mostrar(`
          <section class="panel pregunta aro-panel">
            <p class="num-nivel">Aro dorado</p>
            <h2>${aciertos} de ${qs.length} aciertos</h2>
            <p class="veredicto ${ok ? "bien" : "mal"}">${ok ? "¡El aro te lanza hacia el nido!" : "El aro se apaga. Sigue volando hacia el nido."}</p>
            <div class="acciones"><button type="button" class="btn principal" data-accion="aro-fin" data-foco>${ok ? "¡Impulso!" : "Continuar"}</button></div>
          </section>`, "fondo-suave aro");
        aroEstado.aciertos = aciertos;
      },
    };
    pintar();
  }
  let aroEstado = null;

  /* ---------- HUD ---------- */
  const hud = $("hud");
  const gemas = (n, max) => Array.from({ length: max }, (_, i) => `<i class="gema ${i < n ? "" : "perdida"}"></i>`).join("");
  function hudVisible(v) { hud.classList.toggle("oculto", !v); }
  function hudActualizar(s) {
    $("hud-nivel").textContent = s.nivel;
    $("hud-puntos").textContent = miles(s.puntos);
    $("hud-altitud").textContent = miles(s.altitud);
    $("hud-limpio").textContent = s.limpio;
    $("hud-datos").textContent = Almacen.datos.size + "/" + DATOS_CONDOR.length;
    const combo = $("hud-combo"); combo.textContent = "×" + s.combo; combo.parentElement.classList.toggle("caliente", s.combo > 1);
    $("hud-ruta").style.width = (s.progreso * 100).toFixed(1) + "%";
    $("hud-ruta-pin").style.left = (s.progreso * 100).toFixed(1) + "%";
    s.jugadores.forEach((j, i) => {
      const n = i + 1, caja = $("hud-j" + n); if (!caja) return;
      caja.hidden = false;
      $("hud-j" + n + "-nombre").textContent = j.nombre;
      $("hud-j" + n + "-vidas").innerHTML = gemas(j.vidas, j.vidasMax);
      const b = $("hud-j" + n + "-energia"), pct = Math.max(0, Math.round((j.energia / j.energiaMax) * 100));
      b.firstElementChild.style.width = pct + "%";
      b.setAttribute("aria-valuenow", pct);
      b.classList.toggle("baja", pct <= 25);
      $("hud-j" + n + "-vista").textContent = j.vista;
      caja.classList.toggle("fuera", !j.vivo);
    });
    $("hud-j2").hidden = s.jugadores.length < 2;
    hud.classList.toggle("uno", s.jugadores.length < 2);
  }

  /* ---------- Avisos (Solo 1 notificación flotante a la vez) ---------- */
  function toast(clase, html, ms = 7000) {
    // Elimina cualquier notificación flotante anterior para que nunca se acumulen
    while (toasts.children.length > 0) {
      toasts.firstElementChild.remove();
    }
    const el = document.createElement("div");
    el.className = "toast " + clase;
    el.innerHTML = html;
    toasts.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.classList.add("sale"); }, ms - 400);
    setTimeout(() => { if (el.parentNode) el.remove(); }, ms);
  }
  function dato(d) {
    toast("dato", `<strong>¿Sabías que…? ${esc(d.titulo)}</strong><p>${esc(d.texto)}</p><small>Fuente: ${esc(d.fuente)}</small>`, 8000);
  }
  function logro(l) { toast("trofeo", `<strong>Logro: ${esc(l.titulo)}</strong><p>${esc(l.texto)}</p>`, 5000); }
  let consejoT = null;
  function consejo(texto, ms = 4200) {
    consejoEl.textContent = texto; consejoEl.hidden = false;
    consejoEl.classList.remove("entra"); void consejoEl.offsetWidth; consejoEl.classList.add("entra");
    clearTimeout(consejoT); consejoT = setTimeout(() => { consejoEl.hidden = true; }, ms);
  }
  function limpiarAvisos() { toasts.innerHTML = ""; consejoEl.hidden = true; }

  /* ---------- Clics de las pantallas (delegación de eventos) ---------- */
  capa.addEventListener("click", (e) => {
    const b = e.target.closest("[data-accion]"); if (!b || b.disabled) return;
    SND.iniciar(); SND.play("clic");
    const a = b.dataset.accion;
    switch (a) {
      case "jugadores": Almacen.guardarPrefs({ jugadores: Number(b.dataset.v) }); menu(); break;
      case "sexo": Almacen.guardarPrefs({ sexo: b.dataset.v }); menu(); break;
      case "jugar": Juego.nuevaPartida(); break;
      case "ayuda": ayuda(); break;
      case "enciclopedia": filtroTema = "Todos"; enciclopedia(); break;
      case "filtro": filtroTema = b.dataset.v; enciclopedia(); break;
      case "logros": logros(); break;
      case "menu": menu(); break;
      case "menu-salir": Juego.alMenu(); break;
      case "sonido": SND.alternar(); menu(); break;
      case "sonido-pausa": SND.alternar(); pausa(); break;
      case "ayuda-pausa": ayuda(); capa.querySelector("[data-accion='menu']").dataset.accion = "volver-pausa"; break;
      case "volver-pausa": pausa(); break;
      case "empezar": Juego.empezarNivel(); break;
      case "reanudar": Juego.reanudar(); break;
      case "reanudar-pluma": Juego.reanudarPluma(); break;
      case "reiniciar": Juego.reiniciarNivel(); break;
      case "responder": { const i = Number(b.dataset.i); const ok = Juego.responder(i); respuestaMostrada(Juego.indiceNivel(), i, ok); break; }
      case "continuar": Juego.continuarTrasPregunta(); break;
      case "aro-resp": aroEstado.responder(Number(b.dataset.i)); break;
      case "aro-sig": aroEstado.siguiente(); break;
      case "aro-fin": Juego.aroResultado(aroEstado.aciertos); break;
      case "siguiente": Juego.siguienteNivel(); break;
      default: break;
    }
  });

  return { menu, intro, pausa, pregunta, resumen, fin, mostrar, ocultar, visible, hudVisible, hudActualizar,
    dato, logro, consejo, limpiarAvisos, miles, plumaDoradaModal, plumaLista, aroQuiz };
})();