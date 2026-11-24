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

  //Parametros de caminata
  caminataVel: 60,
  caminataAcel: 180,
  caminataPasos: 2.5,

  // Parametros de aterrizaje y despegue
  aterrizajeTiempo: 0.45,
  despegueTiempo: 0.55,
  aterrizajeDistancia: 65,
  aterrizajeVelocidad: 110,

  picadaVel: 340, picadaAcel: 900,
  termicaVel: 230,          // velocidad de subida gratis en el centro de una térmica
  
  // Consumo de energia por segundo
  energiaPasiva: 1.1,
  energiaReposo: 0.2,
  energiaCaminata: 0.5,
  energiaTermica: 0.4,
  energiaTormenta: 3.0,

  // Umbrales de energia
  energiaBaja: 0.20,
  energiaCritica: 0.10,

  comerEnergia: 45, comerTiempo: 1.1,
  vistaCoste: 8, vistaDuracion: 3.4, vistaEspera: 9,
  invulnerable: 1.9,
  imanRadio: 250, rafagaVel: 70, rafagaHund: 0.55, energiaPoder: 50,   // poderes
  vidas: 3,
  altitudBase: 3000, altitudPorPixel: 4.5, // para mostrar metros sobre el nivel del mar
};


/* ---------------------------------------------------------------------
   PODERES: orbes brillantes que se recogen en el aire y ayudan a llegar al nido.
   --------------------------------------------------------------------- */
const PODERES = {
  escudo:  { nombre: "Escudo del Apu",     dur: 8, color: "#6fd3ff", corto: "Te protege de cables, disparos y rayos (¡no del veneno!)" },
  rafaga:  { nombre: "Corriente de cola",  dur: 6, color: "#8fe58a", corto: "Vuelas más rápido y caes más despacio" },
  termica: { nombre: "Térmica portátil",   dur: 5, color: "#ffb25a", corto: "Una columna de aire caliente te sube gratis" },
  iman:    { nombre: "Imán de plumas",     dur: 9, color: "#5fe0c8", corto: "Las plumas vuelan hacia ti" },
  energia: { nombre: "Recarga de energía", dur: 0, color: "#ffe08a", corto: "Recuperas 50 de energía al instante" },
};

/* Cómo se llama cada forma de moverse (se muestra en el HUD). */
const MODOS = {
  aleteando: { texto: "Aleteando", ayuda: "Alas en movimiento: gasta energía" },
  planeando: { texto: "Planeando", ayuda: "Bajo consumo de energia y suma combo" },
  termica:   { texto: "En térmica", ayuda: "Subes aprovechando el aire caliente" },
  picada:    { texto: "En picada", ayuda: "Alas recogidas: bajas rápido" },
  suelo:     { texto: "En reposo", ayuda: "Despegar cuesta el triple" },
  caminando: { texto: "Caminando", ayuda: "Usa izquierda y derecha para caminar" },
  comiendo:  { texto: "Comiendo", ayuda: "Quieto: recuperas energía" },
  aterrizando: { texto: "Aterrizando", ayuda: "Reduce la velocidad y prepara las patas"},
  despegando: {texto: "Despegando", ayuda: "Extiende las alas para elevarse"},
  muerto: {texto: "Sin vida", ayuda: "El condor no puede continuar"},
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
    intro: "Aprende a volar como un cóndor. Aletear cansa: busca las <strong>térmicas</strong> (columnas de aire caliente) y <strong>quédate dando vueltas dentro de ellas</strong> para subir gratis (con ← y → puedes ir y volver). Baja en picada para comer <strong>carroña</strong> y limpiar el páramo. Recoge los <strong>poderes</strong> brillantes: te ayudan a llegar a tu <strong>nido en el risco</strong>.",
    nuevo: ["Térmicas", "Carroña", "Planeo", "Poderes", "Puntos de control", "Nido"],
    poderes: ["energia", "termica", "iman", "rafaga"],
    largo: 7600, vel: 130,
    termicas: 8, carronas: 7, venenos: 0, cables: 0, cazadores: 0, tormentas: 0, plumasArcos: 7,
    cielo: ["#3e5a94", "#c98aa0", "#f9cf91"],
    sol: { x: 690, y: 214, r: 46, color: ["#fff1c1", "#ffd57a"], halo: "#ffe3a8" },
    paleta: { lejos: [262, 26, 60], medio: [222, 30, 46], cerca: [152, 26, 38], suelo: [64, 40, 42], volcan: [236, 22, 50], nieve: [200, 40, 96] },
    clima: "amanecer", datoNido: "anidacion", pregunta: 0 },
  { id: 2, semilla: 29, nombre: "Cables en el valle",
    intro: "Ahora hay personas cerca. Esquiva los <strong>tendidos eléctricos</strong>. La carroña <strong>morada</strong> está <strong>envenenada</strong>: ¡no la comas! Los gallinazos vuelan sobre la comida segura y la <strong>Vista de cóndor</strong> (tecla V) la marca. Busca el <strong>Escudo del Apu</strong>.",
    nuevo: ["Cables", "Carroña morada", "Vista de cóndor", "Escudo del Apu"],
    poderes: ["escudo", "energia", "termica", "iman", "rafaga"],
    largo: 9200, vel: 140,
    termicas: 10, carronas: 8, venenos: 3, cables: 5, cazadores: 0, tormentas: 0, plumasArcos: 9,
    cielo: ["#3f7bc0", "#8cc1e6", "#e8f3f2"],
    sol: { x: 300, y: 130, r: 40, color: ["#ffffff", "#fff6cf"], halo: "#ffffff" },
    paleta: { lejos: [212, 32, 68], medio: [198, 32, 54], cerca: [132, 28, 42], suelo: [84, 36, 42], volcan: [208, 24, 56], nieve: [195, 30, 97] },
    clima: "dia", datoNido: "huevo", pregunta: 1 },
  { id: 3, semilla: 47, nombre: "Cazadores en la quebrada",
    intro: "Al caer la tarde aparecen <strong>cazadores</strong> en el suelo. Cuando te apuntan, el láser se <strong>fija</strong> y el disparo sale un instante después: <strong>muévete antes del tiro</strong>. Los cables y el veneno siguen ahí.",
    nuevo: ["Cazadores", "Disparo con aviso", "Más veneno"],
    poderes: ["escudo", "energia", "termica", "rafaga", "escudo", "iman"],
    largo: 10800, vel: 150,
    termicas: 12, carronas: 9, venenos: 3, cables: 4, cazadores: 5, tormentas: 0, plumasArcos: 10,
    cielo: ["#3b4a86", "#b3638c", "#f4a867"],
    sol: { x: 760, y: 300, r: 52, color: ["#ffd9a0", "#ff9f5a"], halo: "#ffb27a" },
    paleta: { lejos: [286, 24, 52], medio: [262, 24, 40], cerca: [14, 28, 34], suelo: [26, 42, 38], volcan: [276, 22, 44], nieve: [330, 50, 90] },
    clima: "tarde", datoNido: "pichon", pregunta: 2 },
  { id: 4, semilla: 83, nombre: "Tormenta sobre el Cotopaxi",
    intro: "Es temporada de cría: tu pareja cuida <strong>un solo huevo</strong>. Las <strong>tormentas</strong> empujan hacia abajo, gastan energía y lanzan <strong>rayos con aviso</strong>. Rodéalas por debajo o espera una térmica. Llega al nido con vida.",
    nuevo: ["Tormentas", "Rayos", "Huevo en el nido"],
    poderes: ["escudo", "energia", "termica", "rafaga", "escudo", "energia", "iman"],
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
  { id: "poderoso", titulo: "Superpoderes", texto: "Recoge los 5 poderes distintos en una partida." },
  { id: "tres_estrellas", titulo: "Cumbre perfecta", texto: "Consigue 3 estrellas en un nivel." },
];

const MENSAJE_FINAL = {
  titulo: "Quedan entre 94 y 150 cóndores en Ecuador",
  texto: "Cada cóndor cuenta: una pareja cría un solo huevo cada dos años. Tú no puedes poner veneno ni cables en su camino, pero sí puedes contar lo que aprendiste, cuidar el páramo y avisar a las autoridades ambientales si ves un cóndor herido.",
};
