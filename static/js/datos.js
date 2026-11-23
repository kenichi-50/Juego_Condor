"use strict";
/* =====================================================================
   DATOS DEL JUEGO  ·  Guardianes del Cóndor: Cumbres Low-Poly
   Aquí viven los datos reales, los niveles, las preguntas y los números
   que controlan la física. La lógica del juego (juego.js) solo los lee,
   así que puedes ajustar el juego sin tocar el código.
   ===================================================================== */

const FUENTES = {
  wiki: "Wikipedia, «Andean condor» (con citas a estudios científicos)",
  pnas: "Williams, H. J. et al. (2020). Physical limits of flight performance in the heaviest soaring bird. PNAS.",
  plos: "Restrepo-Cardona, J. S. et al. (2022). Anthropogenic threats to the Vulnerable Andean Condor in northern South America. PLOS ONE.",
  primicias: "Primicias (2019). Día del Cóndor Andino en Ecuador.",
};

/* Cada dato real tiene su fuente. VERIFÍCALOS y amplíalos en tu informe. */
const DATOS_CONDOR = [
  { id: "carronero", tema: "Alimentación", titulo: "Limpiador del páramo",
    texto: "El cóndor se alimenta de animales muertos. Al comerlos evita que las enfermedades se propaguen por el páramo.",
    fuente: FUENTES.primicias },
  { id: "vuelo", tema: "Vuelo", titulo: "Casi no aletea",
    texto: "Aletea apenas cerca del 1 % del tiempo que vuela. El resto planea sobre corrientes de aire caliente llamadas térmicas.",
    fuente: FUENTES.pnas },
  { id: "despegue", tema: "Vuelo", titulo: "Despegar cuesta caro",
    texto: "Cerca del 75 % de su aleteo ocurre al despegar. Por eso busca riscos y laderas para lanzarse al aire.",
    fuente: FUENTES.pnas },
  { id: "vista", tema: "Alimentación", titulo: "Ojos de cóndor",
    texto: "Encuentra la comida sobre todo con la vista y siguiendo a otras aves carroñeras, como los gallinazos.",
    fuente: FUENTES.wiki },
  { id: "envergadura", tema: "Cuerpo", titulo: "Alas de más de tres metros",
    texto: "Con las alas abiertas mide en promedio unos 2,8 m y puede llegar a 3,3 m. Es de las aves voladoras más grandes del mundo.",
    fuente: FUENTES.wiki },
  { id: "peso", tema: "Cuerpo", titulo: "Peso pesado del aire",
    texto: "Pesa entre 10 y 15 kg. A diferencia de muchas rapaces, el macho es más grande que la hembra.",
    fuente: FUENTES.wiki },
  { id: "distancia", tema: "Vuelo", titulo: "Gran viajera",
    texto: "Un cóndor silvestre puede recorrer más de 200 km en un solo día buscando comida.",
    fuente: FUENTES.wiki },
  { id: "patas", tema: "Cuerpo", titulo: "Patas para caminar",
    texto: "Sus patas no sirven para agarrar presas como las de un águila. Por eso come en el suelo.",
    fuente: FUENTES.wiki },
  { id: "anidacion", tema: "Cría", titulo: "Nidos en los riscos",
    texto: "Anida en repisas de roca de difícil acceso, entre los 3.000 y los 5.000 metros de altura.",
    fuente: FUENTES.wiki },
  { id: "huevo", tema: "Cría", titulo: "Un solo huevo",
    texto: "Una pareja pone normalmente un huevo cada dos años. Ambos padres lo incuban entre 54 y 58 días.",
    fuente: FUENTES.wiki },
  { id: "pichon", tema: "Cría", titulo: "Una crianza muy larga",
    texto: "El pichón empieza a volar a los 6 meses y acompaña a sus padres hasta cerca de los 2 años.",
    fuente: FUENTES.wiki },
  { id: "longevidad", tema: "Cría", titulo: "Vive más de 50 años",
    texto: "En la naturaleza puede pasar los 50 años. Como se reproduce tan lento, cada cóndor que muere es una gran pérdida.",
    fuente: FUENTES.wiki },
  { id: "dimorfismo", tema: "Cuerpo", titulo: "Macho y hembra",
    texto: "El macho lleva una cresta roja (carúncula) y tiene ojos cafés. La hembra no tiene cresta y sus ojos son rojos.",
    fuente: FUENTES.wiki },
  { id: "collar", tema: "Cuerpo", titulo: "Collar blanco",
    texto: "Los adultos tienen plumaje negro, un collar de plumas blancas en el cuello y grandes manchas blancas en las alas.",
    fuente: FUENTES.wiki },
  { id: "veneno", tema: "Amenazas", titulo: "La mayor amenaza: el veneno",
    texto: "El envenenamiento causó el 63 % de los casos de cóndores heridos o muertos registrados en el norte de Sudamérica (1979–2021). El cóndor no puede detectar el veneno.",
    fuente: FUENTES.plos },
  { id: "cables", tema: "Amenazas", titulo: "Peligro en los cables",
    texto: "Los choques y la electrocución en tendidos eléctricos también hieren y matan cóndores.",
    fuente: FUENTES.plos },
  { id: "caza", tema: "Amenazas", titulo: "Disparos contra el cóndor",
    texto: "Los disparos de personas son otra amenaza de origen humano documentada para el cóndor en el norte de Sudamérica.",
    fuente: FUENTES.plos },
  { id: "poblacion", tema: "Ecuador", titulo: "Quedan muy pocos",
    texto: "Los censos de 2015 y 2018 estimaron entre 94 y 150 cóndores en Ecuador. Está en peligro en el país y es Vulnerable a nivel mundial (UICN).",
    fuente: FUENTES.plos },
  { id: "simbolo", tema: "Ecuador", titulo: "Símbolo del Ecuador",
    texto: "Es el ave nacional del Ecuador y aparece en su escudo. Cada 7 de julio se celebra el Día del Cóndor Andino.",
    fuente: FUENTES.primicias },
];

/* Orden en que se desbloquean datos al comer carroña (los demás salen por eventos). */
const ORDEN_CARRONA = ["envergadura", "patas", "peso", "distancia", "collar",
  "dimorfismo", "longevidad", "pichon", "simbolo", "poblacion"];

/* ---------------------------------------------------------------------
   FÍSICA: todos los números que definen cómo se siente el vuelo.
   Unidades: píxeles y segundos del lienzo de 960 × 540.
   --------------------------------------------------------------------- */
const FISICA = {
  gravedad: 260,
  hundimiento: 72,          // velocidad de caída al planear (px/s)
  aleteoImpulso: 250,       // impulso hacia arriba de cada aleteo
  aleteoCoste: 4.6,         // energía que gasta cada aleteo
  aleteoEspera: 0.24,       // segundos entre aleteos
  despegueMultiplicador: 3, // despegar del suelo cuesta el triple (dato real)
  velMin: 70, velMax: 250, aceleracion: 280,
  picadaVel: 350, picadaAcel: 620,   // picada: acelera de forma progresiva (más suave)
  picadaRampa: 0.4,                  // segundos que tarda la picada en alcanzar toda su fuerza
  picadaSoltar: 3.2,                 // qué tan rápido se recupera el vuelo al soltar ↓ (más bajo = más suave)
  plumaEnergia: 0.25,                // la pluma dorada devuelve el 25 % de la energía máxima
  plumaDoradaViaje: 5.2,             // segundos que tarda la pluma dorada en cruzar la pantalla
  plumaDoradaCada: [8, 11],          // cada cuántos segundos aparece una (mínimo, máximo)
  aroPos: 0.75,                      // el aro dorado está al 75 % del camino al nido
  aroRadio: 58,
  aroImpulsoDuracion: 4.5, aroImpulsoVel: 380, aroAprobar: 2,   // con 2 de 3 aciertos hay impulso
  termicaVel: 230,          // velocidad de subida gratis en el centro de una térmica
  energiaPasiva: 1.1,       // gasto por segundo solo por volar
  comerEnergia: 45, comerTiempo: 1.1,
  vistaCoste: 8, vistaDuracion: 3.4, vistaEspera: 9,
  invulnerable: 1.9,
  vidas: 3,
  altitudBase: 3000, altitudPorPixel: 4.5, // para mostrar metros sobre el nivel del mar
};

/* Macho y hembra juegan distinto (dimorfismo real: el macho es más grande). */
const CONDORES = {
  macho:  { nombre: "Macho",  energia: 110, agil: 0.85, coste: 1.0,  escala: 1.0,  detalle: "Más grande y resistente, gira más lento." },
  hembra: { nombre: "Hembra", energia: 92,  agil: 1.2,  coste: 0.82, escala: 0.9,  detalle: "Más pequeña y ágil, aletea con menos esfuerzo." },
};

/* ---------------------------------------------------------------------
   NIVELES. Cada nivel cambia el paisaje, la luz y las amenazas.
   paleta = colores HSL [tono, saturación, luminosidad] de cada capa.
   --------------------------------------------------------------------- */
const NIVELES = [
  { id: 1, semilla: 11, nombre: "Amanecer en el páramo",
    intro: "Aprende a volar como un cóndor. Aletear cansa: busca las <strong>térmicas</strong> (columnas de aire caliente) y <strong>frena dentro de ellas</strong> para subir gratis. Baja en picada para comer <strong>carroña</strong> y limpiar el páramo. Al final te espera tu <strong>nido en el risco</strong>.",
    nuevo: ["Térmicas", "Carroña", "Planeo", "Nido"],
    largo: 7600, vel: 130,
    termicas: 8, carronas: 7, venenos: 0, cables: 0, cazadores: 0, tormentas: 0, plumasArcos: 7,
    cielo: ["#3e5a94", "#c98aa0", "#f9cf91"],
    sol: { x: 690, y: 214, r: 46, color: ["#fff1c1", "#ffd57a"], halo: "#ffe3a8" },
    paleta: { lejos: [262, 26, 60], medio: [222, 30, 46], cerca: [152, 26, 38], suelo: [64, 40, 42], volcan: [236, 22, 50], nieve: [200, 40, 96] },
    clima: "amanecer", datoNido: "anidacion", pregunta: 0 },
  { id: 2, semilla: 29, nombre: "Cables en el valle",
    intro: "Ahora hay personas cerca. Esquiva los <strong>tendidos eléctricos</strong> y usa la <strong>Vista de cóndor</strong> (tecla V): señala la carroña dudosa. La carroña <strong>envenenada es de color morado</strong>: ¡no la comas! Los gallinazos vuelan sobre la comida segura.",
    nuevo: ["Cables", "Veneno", "Vista de cóndor", "Gallinazos"],
    largo: 9200, vel: 140,
    termicas: 10, carronas: 8, venenos: 3, cables: 5, cazadores: 0, tormentas: 0, plumasArcos: 9,
    cielo: ["#3f7bc0", "#8cc1e6", "#e8f3f2"],
    sol: { x: 300, y: 130, r: 40, color: ["#ffffff", "#fff6cf"], halo: "#ffffff" },
    paleta: { lejos: [212, 32, 68], medio: [198, 32, 54], cerca: [132, 28, 42], suelo: [84, 36, 42], volcan: [208, 24, 56], nieve: [195, 30, 97] },
    clima: "dia", datoNido: "huevo", pregunta: 1 },
  { id: 3, semilla: 47, nombre: "Cazadores en la quebrada",
    intro: "Al caer la tarde aparecen <strong>cazadores</strong> en el suelo. Cuando te apuntan, el láser se <strong>fija</strong> y el disparo sale un instante después: <strong>muévete antes del tiro</strong>. Los cables y el veneno siguen ahí.",
    nuevo: ["Cazadores", "Disparo con aviso", "Más veneno"],
    largo: 10800, vel: 150,
    termicas: 12, carronas: 9, venenos: 3, cables: 4, cazadores: 5, tormentas: 0, plumasArcos: 10,
    cielo: ["#3b4a86", "#b3638c", "#f4a867"],
    sol: { x: 760, y: 300, r: 52, color: ["#ffd9a0", "#ff9f5a"], halo: "#ffb27a" },
    paleta: { lejos: [286, 24, 52], medio: [262, 24, 40], cerca: [14, 28, 34], suelo: [26, 42, 38], volcan: [276, 22, 44], nieve: [330, 50, 90] },
    clima: "tarde", datoNido: "pichon", pregunta: 2 },
  { id: 4, semilla: 83, nombre: "Tormenta sobre el Cotopaxi",
    intro: "Es temporada de cría: tu pareja cuida <strong>un solo huevo</strong>. Las <strong>tormentas</strong> empujan hacia abajo, gastan energía y lanzan <strong>rayos con aviso</strong>. Rodéalas por debajo o espera una térmica. Llega al nido con vida.",
    nuevo: ["Tormentas", "Rayos", "Huevo en el nido"],
    largo: 12500, vel: 158,
    termicas: 14, carronas: 10, venenos: 4, cables: 4, cazadores: 4, tormentas: 4, plumasArcos: 11,
    cielo: ["#2a3341", "#4b5767", "#808c99"],
    sol: null,
    paleta: { lejos: [212, 12, 44], medio: [210, 14, 34], cerca: [196, 16, 28], suelo: [96, 16, 30], volcan: [214, 10, 38], nieve: [210, 14, 86] },
    clima: "tormenta", datoNido: "poblacion", pregunta: 3 },
];

/* Una pregunta por nivel, con explicación. */
const PREGUNTAS = [
  { pregunta: "¿Cuánto tiempo pasa aleteando un cóndor mientras vuela?",
    opciones: ["Casi todo el tiempo", "Cerca del 1 %", "La mitad del tiempo"],
    correcta: 1,
    explicacion: "Aletea apenas cerca del 1 % del tiempo. El resto planea aprovechando térmicas, igual que hiciste en el juego.",
    fuente: FUENTES.pnas },
  { pregunta: "¿Cuál fue la principal causa de casos de cóndores heridos o muertos registrados en el norte de Sudamérica?",
    opciones: ["El frío del páramo", "El envenenamiento", "La falta de agua"],
    correcta: 1,
    explicacion: "El envenenamiento causó el 63 % de los casos registrados, y el cóndor no puede detectar el veneno.",
    fuente: FUENTES.plos },
  { pregunta: "¿Qué tienen en común el veneno, los cables eléctricos y los disparos?",
    opciones: ["Son fenómenos naturales", "Son amenazas causadas por las personas", "Solo ocurren en otros continentes"],
    correcta: 1,
    explicacion: "Son amenazas de origen humano. Por eso las personas también pueden ser parte de la solución.",
    fuente: FUENTES.plos },
  { pregunta: "¿Cuántos cóndores se estima que quedan en estado silvestre en Ecuador?",
    opciones: ["Más de 50.000", "Unos 5.000", "Entre 94 y 150"],
    correcta: 2,
    explicacion: "Los censos de 2015 y 2018 estimaron entre 94 y 150 cóndores en el país. Y una pareja cría un solo huevo cada dos años.",
    fuente: FUENTES.plos },
];

/* ---------------------------------------------------------------------
   PLUMAS DORADAS: aparecen un momento y cruzan la pantalla. Al tocarlas muestran un dato real
   y devuelven el 25 % de la energía. Cada una tiene su pregunta para el aro dorado.
   --------------------------------------------------------------------- */
const PLUMAS_DORADAS = [
  { id: "pd-envergadura", titulo: "Alas gigantes",
    texto: "Con las alas abiertas puede medir hasta 3,3 m. Es de las aves voladoras más grandes del mundo.",
    pregunta: "¿Cuánto puede medir un cóndor con las alas abiertas?",
    opciones: ["Cerca de 1 m", "Hasta 3,3 m", "Más de 6 m"], correcta: 1, fuente: FUENTES.wiki },
  { id: "pd-peso", titulo: "Peso pesado",
    texto: "Un cóndor pesa entre 10 y 15 kg. A diferencia de muchas rapaces, el macho es más grande que la hembra.",
    pregunta: "¿Cuánto pesa aproximadamente un cóndor adulto?",
    opciones: ["Entre 10 y 15 kg", "Menos de 1 kg", "Más de 60 kg"], correcta: 0, fuente: FUENTES.wiki },
  { id: "pd-vida", titulo: "Una vida larga",
    texto: "En la naturaleza un cóndor puede vivir más de 50 años.",
    pregunta: "¿Cuántos años puede vivir un cóndor en la naturaleza?",
    opciones: ["Unos 5 años", "Unos 15 años", "Más de 50 años"], correcta: 2, fuente: FUENTES.wiki },
  { id: "pd-huevo", titulo: "Un solo huevo",
    texto: "Una pareja pone normalmente un solo huevo cada dos años.",
    pregunta: "¿Cada cuánto tiempo pone un huevo una pareja de cóndores?",
    opciones: ["Cada dos años", "Cuatro por año", "Uno cada mes"], correcta: 0, fuente: FUENTES.wiki },
  { id: "pd-simbolo", titulo: "Ave nacional",
    texto: "El cóndor es el ave nacional del Ecuador y aparece en su escudo. Cada 7 de julio se celebra el Día del Cóndor Andino.",
    pregunta: "¿Qué ave aparece en el escudo del Ecuador?",
    opciones: ["El colibrí", "El cóndor andino", "El águila arpía"], correcta: 1, fuente: FUENTES.primicias },
  { id: "pd-distancia", titulo: "Gran viajera",
    texto: "Un cóndor silvestre puede recorrer más de 200 km en un solo día buscando comida.",
    pregunta: "¿Cuánto puede recorrer un cóndor en un solo día?",
    opciones: ["Menos de 5 km", "Unos 20 km", "Más de 200 km"], correcta: 2, fuente: FUENTES.wiki },
];

/* Logros: se guardan en el navegador. */
const LOGROS = [
  { id: "primer_vuelo", titulo: "Primer vuelo", texto: "Llega al primer nido." },
  { id: "planeador", titulo: "Casi sin aletear", texto: "Termina un nivel aleteando menos del 12 % del tiempo." },
  { id: "limpiador", titulo: "Páramo impecable", texto: "Deja un nivel con el 100 % del páramo limpio." },
  { id: "ojo", titulo: "Ojo de cóndor", texto: "Usa la Vista de cóndor 5 veces en una partida." },
  { id: "intocable", titulo: "Intocable", texto: "Termina un nivel sin recibir daño." },
  { id: "sabio", titulo: "Sabio andino", texto: "Responde bien las 4 preguntas en una partida." },
  { id: "coleccionista", titulo: "Enciclopedia completa", texto: "Descubre todos los datos del cóndor." },
  { id: "pareja", titulo: "Pareja de cóndores", texto: "Termina el juego con 2 jugadores." },
  { id: "guardian", titulo: "Guardián del cóndor", texto: "Llega al nido de los 4 niveles." },
  { id: "aro_perfecto", titulo: "Aro dorado", texto: "Responde 3 de 3 en el quiz del aro dorado." },
  { id: "tres_estrellas", titulo: "Cumbre perfecta", texto: "Consigue 3 estrellas en un nivel." },
];

const MENSAJE_FINAL = {
  titulo: "Quedan entre 94 y 150 cóndores en Ecuador",
  texto: "Cada cóndor cuenta: una pareja cría un solo huevo cada dos años. Tú no puedes poner veneno ni cables en su camino, pero sí puedes contar lo que aprendiste, cuidar el páramo y avisar a las autoridades ambientales si ves un cóndor herido.",
};
