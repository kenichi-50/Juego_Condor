# Guardianes del Cóndor · Cumbres Low-Poly

Juego web educativo sobre el cóndor andino, con **HTML, CSS, JavaScript y Python (Flask + SQLite)**.
Todo el arte está hecho con triángulos de colores planos (estilo **Low-Poly**) dibujados en un `<canvas>`:
no usa imágenes, librerías ni archivos de audio.

## Cómo ejecutarlo

```bash
pip install -r requirements.txt
python app.py
# abre http://127.0.0.1:5000
```

También puedes abrir `static/index.html` directamente: el juego funciona igual y guarda los puntajes en el navegador
(sin servidor de Python).

## Qué lo hace diferente

- **Vuelo con física propia.** Planear es gratis; aletear cuesta energía. Las **térmicas** son aire que sube:
  quédate dando vueltas dentro de ellas (alterna ←/→) y subes sin gastar. Despegar desde el suelo cuesta el triple.
- **Combo de planeo.** Cuanto más tiempo vuelas sin aletear, más se multiplican tus puntos (×1 a ×5).
  Es el dato real "aletea cerca del 1 % del tiempo" convertido en reglas.
- **Comer es un riesgo.** Al bajar en picada a comer carroña te quedas quieto un momento (anillo de progreso).
- **Carroña morada = veneno.** La comida envenenada es de color morado y suelta vapor morado; la normal es café. Los gallinazos
  sobre la comida segura y la **Vista de cóndor (V)**, que marca la segura y la envenenada, son pistas extra.
- **Mismo cóndor 3D dentro del juego.** El personaje que ves girar en el visor es el que vuela en el juego (macho o hembra,
  con sus diferencias), dibujado en vivo con el mismo motor 3D.
- **Aleteando vs. planeando, bien distintos.** Aleteando: las alas suben y bajan, aparece la etiqueta naranja *Aleteando*
  y gastas energía. Planeando: alas abiertas y quietas, líneas de viento y etiqueta celeste (dorada si hay combo).
  En picada las alas se recogen. El HUD siempre muestra el modo: *Aleteando, Planeando, En térmica, En picada, En el suelo, Comiendo*.
- **Poderes.** Orbes brillantes que flotan en el aire y ayudan a llegar al nido (tabla abajo).
- **4 niveles, 4 amenazas reales:** veneno, cables eléctricos, cazadores (con láser que se fija: ¡muévete!) y tormentas con rayos con aviso.
- **Macho y hembra juegan distinto** (el macho es más grande y resistente; la hembra, más ágil).
- **1 o 2 jugadores** en la misma pantalla, sonido sintetizado, 10 logros, estrellas por nivel y enciclopedia.
- **Visor 3D del cóndor.** Al elegir *Macho* o *Hembra* en el menú se abre una ventana aparte con el cóndor en 3D Low-Poly (ver abajo).
- **Funciona en celular** (botones táctiles, pantalla horizontal o vertical).


## Visor 3D del cóndor

Al tocar **Macho** o **Hembra** en el menú se abre una ventana aparte con el cóndor en 3D Low-Poly, girando 360° sobre una
isla flotante. Solo tiene el cóndor, el botón **¡Aletear!** (con saltito y chispas) y la ✕ para cerrar; también se puede
arrastrar para girarlo a mano. Cada cierto tiempo abre las alas para mostrarlas completas. El macho tiene cresta, cabeza
roja-anaranjada y ojos café; la hembra no tiene cresta, tiene la cabeza gris y los ojos rojizos.

## Volar y caminar a los dos lados, y puntos de control

- Con **←** y **→** el cóndor vuela y camina hacia la izquierda o la derecha, y mira hacia donde va (la cámara le deja
  espacio de ese lado). Si no tocas nada, sigue hacia donde miras. Dentro de una térmica va más despacio; alterna ← y →
  para dar vueltas y quedarte.
- Cada nivel tiene **3 banderas de punto de control** (marcadas en la barra de progreso del HUD). Al pasar por una se iza,
  guarda tu avance y te da +25 de energía. Si pierdes todas las vidas, **vuelves a la última bandera** con 2 vidas y
  −10 % de puntos. En pareja, si una cae y su compañera llega a una bandera, la rescata. Si pierdes antes de la primera
  bandera, termina la partida (puedes *Reintentar el nivel*).

## Poderes

| Poder | Efecto | Duración |
|---|---|---|
| Escudo del Apu | Te protege de cables, disparos y rayos (**no** del veneno, porque el cóndor no lo detecta) | 8 s |
| Corriente de cola | Vuelas más rápido y caes más despacio | 6 s |
| Térmica portátil | Una columna de aire caliente te sube gratis | 5 s |
| Imán de plumas | Las plumas vuelan hacia ti | 9 s |
| Recarga de energía | Recuperas 50 de energía | instantáneo |

Cada nivel trae sus poderes (`poderes` en `NIVELES`) y sus valores están en `PODERES` y `FISICA` (`datos.js`).
Si recoges los 5 distintos en una partida ganas el logro *Superpoderes*.

## Controles

| Acción | 1 jugador | Jugador 1 (2 j.) | Jugador 2 |
|---|---|---|---|
| Aletear (mantener) | ↑ / Espacio | W | ↑ |
| Ir a la derecha / izquierda | → / ← | D / A | → / ← |
| Picada | ↓ | S | ↓ |
| Vista de cóndor | V | E | L |

Pausa: `Esc` o `P` · Sonido: `M`. En celular: botones en pantalla (1 jugador).

## Estructura

```
app.py                 Flask: sirve el juego y la API GET/POST /api/puntajes (SQLite)
requirements.txt
static/
  index.html           estructura: canvas, HUD, avisos, controles táctiles
  css/estilos.css      interfaz Low-Poly (variables, Grid/Flexbox, adaptable)
  js/datos.js          datos reales con fuente, niveles, preguntas, física
  js/lowpoly.js        motor de dibujo: terreno facetado, volcán, cóndor, etc.
  js/condor3d.js       cóndor 3D (visor del menú y personaje del juego): mini motor 3D propio, sin librerías
  js/sonido.js         efectos, viento y melodía con Web Audio
  js/interfaz.js       pantallas, HUD, almacenamiento y fetch a la API
  js/juego.js          bucle (requestAnimationFrame), vuelo, peligros, niveles
```

Los datos están **separados de la lógica**: para cambiar la dificultad edita `FISICA` y `NIVELES` en `datos.js`.

## API de puntajes (Python)

- `GET /api/puntajes` → los 10 mejores.
- `POST /api/puntajes` con `{nombre, puntos, limpio, datos, jugadores, fecha}`.
  El servidor valida tipos y rangos (nombre obligatorio de hasta 16 caracteres, puntos 0–1.000.000, etc.)
  y responde `400` con un mensaje claro si algo está mal.

## Dato real → mecánica (base para la parte B del informe)

| Dato real | En el juego |
|---|---|
| Aletea cerca del 1 % del tiempo; planea en térmicas | Aletear gasta; térmicas elevan gratis; combo de planeo |
| El despegue concentra gran parte del esfuerzo de aleteo | Despegar del suelo cuesta el triple de energía |
| Es carroñero: limpia el páramo | Comer carroña da energía y llena "Páramo limpio" |
| Busca con la vista y siguiendo a otras aves | Gallinazos sobre la comida segura; Vista de cóndor |
| Sus patas no sirven para cazar | Come en el suelo, quieto y expuesto |
| Anida en riscos de 3.000 a 5.000 m | Meta: llegar al nido; la altitud se muestra en el HUD |
| Un solo huevo cada dos años | Nivel 4: el nido con un solo huevo |
| Macho más grande, con cresta; hembra sin cresta | Dos cóndores con estadísticas distintas |
| Veneno: 63 % de los casos registrados | Carroña envenenada de color morado (nivel 2 en adelante) |
| Choques con tendidos eléctricos | Torres y cables con desviadores |
| Disparos de personas | Cazadores con mira que se fija |
| 94 a 150 cóndores en Ecuador | Mensaje final de conservación y pregunta del nivel 4 |

Los 19 datos del juego están en `js/datos.js`, cada uno con su fuente.
**Verifícalos con las fuentes originales y cítalos en APA 7 en tu informe**: el juego usa estas:

- Williams, H. J. et al. (2020). *Physical limits of flight performance in the heaviest soaring bird*. PNAS.
- Restrepo-Cardona, J. S. et al. (2022). *Anthropogenic threats to the Vulnerable Andean Condor in northern South America*. PLOS ONE.
- Primicias (2019). *Día del Cóndor Andino en Ecuador*.
- Wikipedia, «Andean condor» (úsala solo como punto de partida y confirma con las citas que contiene).

## Validación con 5 personas (parte C del informe)

Antes de jugar y después de jugar, haz las mismas 3 preguntas (están en el juego, nivel 1, 2 y 4):

1. ¿Cuánto tiempo pasa aleteando un cóndor mientras vuela?
2. ¿Cuál es la principal causa de casos de cóndores heridos o muertos registrados en el norte de Sudamérica?
3. ¿Cuántos cóndores se estima que quedan en Ecuador?

Anota cuántas aciertan antes y después, y observa qué mecánica entendieron sin ayuda.

## Para el equipo

- Trabajen en ramas y hagan commits **todos** (el reparto de roles está en el PDF del proyecto).
- Ideas para mejorar el juego a su manera: nuevos niveles en `NIVELES`, más datos en `DATOS_CONDOR`, nuevas
  amenazas (pesca, incendios), modo contrarreloj, mejores puntajes por nivel.
- Para publicarlo: súbanlo a un servicio que ejecute Flask (Render, PythonAnywhere) o publiquen solo `static/`
  en GitHub Pages (funciona sin la API y guarda puntajes en el navegador).
