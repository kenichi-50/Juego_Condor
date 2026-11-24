# Guardianes del Cóndor · Cumbres Low-Poly

Juego web educativo sobre el cóndor andino, desarrollado con **HTML, CSS, JavaScript y Python (Flask + SQLite)**.

Todo el arte está hecho con triángulos de colores planos (estilo **Low-Poly**) dibujados en un `<canvas>`. No utiliza imágenes, librerías gráficas externas ni archivos de audio.

El objetivo del juego es aprender sobre el comportamiento, la alimentación, las características y las amenazas del cóndor andino mediante mecánicas de vuelo, exploración y supervivencia.

## Cómo ejecutarlo

```bash
pip install -r requirements.txt
python app.py
```

Abre en el navegador:

```text
http://127.0.0.1:5000
```

También puedes abrir `static/index.html` directamente. El juego funciona sin el servidor de Python y guarda los puntajes en el navegador.

## Qué lo hace diferente

- **Vuelo con física propia.** Planear consume poca energía, mientras que aletear requiere un mayor esfuerzo. Las térmicas permiten ganar altura aprovechando las corrientes de aire caliente y reduciendo el consumo energético. Despegar desde el suelo cuesta el triple de energía que un aleteo normal.
- **Combo de planeo.** Cuanto más tiempo vuelas sin aletear, más se multiplican tus puntos (×1 a ×5). Es el dato real «aletea cerca del 1 % del tiempo» convertido en una mecánica del juego.
- **Movimiento terrestre.** El cóndor puede caminar hacia ambos lados, con movimiento alternado de sus patas, alas plegadas, balanceo corporal y aceleración progresiva.
- **Aterrizaje y despegue.** El cuerpo y las alas cambian progresivamente de posición al pasar del vuelo al suelo y viceversa.
- **Sistema de supervivencia.** Todas las actividades consumen energía. Si el cóndor se queda sin energía o pierde todas sus vidas, muere definitivamente.
- **Comer es un riesgo.** Al bajar a comer carroña, el cóndor permanece quieto durante un momento mientras se completa el anillo de progreso.
- **Carroña morada = veneno.** La comida envenenada es de color morado y suelta vapor morado; la normal es café. Los gallinazos sobre la comida segura y la Vista de cóndor son pistas adicionales.
- **Mismo cóndor 3D dentro del juego.** El personaje que aparece en el visor es el mismo que vuela y camina durante la partida, dibujado en tiempo real.
- **Estados de movimiento diferenciados.** El HUD muestra si el cóndor está aleteando, planeando, en una térmica, en picada, en reposo, caminando, comiendo, aterrizando, despegando o sin vida.
- **Poderes.** Orbes brillantes que flotan en el aire y ayudan a llegar al nido.
- **4 niveles y 4 amenazas:** veneno, cables eléctricos, cazadores y tormentas con rayos.
- **Macho y hembra juegan distinto.** El macho es más grande y resistente; la hembra es más pequeña y ágil.
- **1 o 2 jugadores** en la misma pantalla, sonido sintetizado, 11 logros, estrellas por nivel y enciclopedia.
- **Visor 3D del cóndor.** Al elegir macho o hembra en el menú se puede observar el modelo tridimensional.
- **Interfaz adaptable.** El escenario y los menús aprovechan el espacio disponible de la pantalla sin deformar los gráficos.
- **Ranking de puntuaciones.** Permite registrar y consultar los mejores resultados obtenidos durante las partidas.

## Visor 3D del cóndor

Al tocar **Macho** o **Hembra** en el menú se abre una ventana aparte con el cóndor en 3D Low-Poly, girando 360° sobre una isla flotante.

El visor incluye el botón **¡Aletear!**, que permite observar el movimiento de las alas, acompañado de un pequeño salto y partículas.

También se puede arrastrar el modelo para girarlo manualmente. Cada cierto tiempo, el cóndor abre las alas para mostrarlas completamente.

El macho tiene cresta, cabeza roja-anaranjada y ojos café; la hembra no tiene cresta, tiene la cabeza gris y los ojos rojizos.

## Movimiento terrestre y aéreo

### Vuelo

- Con ← y → el cóndor cambia su dirección horizontal.
- Si no se presionan los controles horizontales, continúa volando hacia donde mira.
- Dentro de una térmica puede desplazarse de un lado a otro para mantenerse en la corriente de aire.
- Al bajar en picada recoge sus alas y aumenta su velocidad de descenso.

### Caminata

- El cóndor puede caminar hacia la izquierda y hacia la derecha.
- Las patas se mueven alternativamente mediante una animación del modelo 3D.
- Las alas permanecen plegadas durante el movimiento terrestre.
- La aceleración y desaceleración son progresivas.
- Al soltar los controles, el cóndor se detiene y entra en reposo.
- Su posición sigue las irregularidades del terreno.
- Las corrientes térmicas no provocan despegues involuntarios desde el suelo.

### Aterrizaje y despegue

Durante el aterrizaje, el cóndor cambia progresivamente la posición de su cuerpo y prepara sus patas para tocar el suelo.

Durante el despegue, extiende sus alas y adopta nuevamente la posición de vuelo.

Ambas transiciones cuentan con estados independientes que se muestran en el HUD.

## Sistema de energía y supervivencia

El jugador debe administrar su energía durante toda la partida. Cada actividad tiene un consumo diferente, por lo que es importante aprovechar las corrientes térmicas, evitar aleteos innecesarios y buscar alimento.

| Actividad | Consumo de energía base |
|---|---:|
| Reposo | 0,2 unidades/s |
| Caminata | 0,5 unidades/s |
| Planeo | 1,1 unidades/s |
| Vuelo en térmica | 0,4 unidades/s |
| Aleteo | 4,6 unidades por impulso |
| Despegue | 13,8 unidades por impulso |
| Tormenta | 3 unidades/s adicionales |
| Vista de cóndor | 8 unidades por uso |
| Aterrizaje brusco | 4 unidades |

El consumo de aleteo y despegue varía según las características del macho y la hembra.

### Recuperación de energía

| Elemento | Energía recuperada |
|---|---:|
| Carroña segura | 45 unidades |
| Punto de control | 25 unidades |
| Poder de recarga | 50 unidades |
| Pluma | 1,5 unidades |

La energía recuperada no puede superar la capacidad máxima del personaje.

### Advertencias

- Energía baja: cuando alcanza el 20 % de su capacidad máxima.
- Energía crítica: cuando alcanza el 10 % de su capacidad máxima.
- Agotamiento: cuando la energía llega a cero.

### Muerte definitiva

El cóndor muere cuando:

- Su energía llega a cero.
- Pierde todas sus vidas debido a las amenazas del entorno.

El escudo no protege contra la muerte por agotamiento.

Cuando el cóndor muere en el aire, cae hasta el suelo y permanece inmóvil.

En el modo individual, la muerte finaliza la partida. En el modo cooperativo, el jugador superviviente puede continuar hasta completar el juego o perder la vida.

Al finalizar la partida, se muestran los resultados y se permite registrar la puntuación en el ranking.

## Puntos de control

Cada nivel tiene **3 banderas de punto de control**, marcadas en la barra de progreso del HUD.

Al pasar por una bandera:

- Se activa el punto de control.
- Se registra el avance dentro del nivel.
- Los jugadores vivos recuperan 25 unidades de energía.

Los puntos de control no permiten revivir jugadores ni reiniciar automáticamente la partida después de morir.

Los jugadores supervivientes recuperan una vida al completar un nivel, sin superar el máximo permitido.

## Interfaz adaptable

La interfaz utiliza CSS Grid, Flexbox y reglas adaptativas para aprovechar el espacio disponible en diferentes dispositivos.

Características:

- Ajuste automático al tamaño de la ventana.
- Aprovechamiento del espacio horizontal y vertical.
- Conservación de las proporciones del escenario.
- Distribución adaptable de textos, botones y menús.
- HUD con información de energía, vidas, puntuación y progreso.
- Controles táctiles para dispositivos móviles.
- Compatibilidad con orientación horizontal y vertical.

El escenario mantiene una resolución lógica de 960 × 540 píxeles, independientemente del tamaño de visualización. Esto permite conservar el comportamiento de la física y las coordenadas del juego.

## Poderes

| Poder | Efecto | Duración |
|---|---|---|
| Escudo del Apu | Protege de cables, disparos y rayos, pero no del veneno ni del agotamiento | 8 s |
| Corriente de cola | Vuelas más rápido y caes más despacio | 6 s |
| Térmica portátil | Una columna de aire caliente permite subir con menor consumo energético | 5 s |
| Imán de plumas | Las plumas vuelan hacia ti | 9 s |
| Recarga de energía | Recupera 50 unidades de energía | Instantáneo |

Cada nivel trae sus propios poderes (`poderes` en `NIVELES`) y sus valores están definidos en `PODERES` y `FISICA`, dentro de `datos.js`.

Si recoges los cinco poderes distintos en una partida, ganas el logro *Superpoderes*.

## Controles

| Acción | 1 jugador | Jugador 1 (2 j.) | Jugador 2 |
|---|---|---|---|
| Aletear / Despegar | ↑ / W / Espacio | W | ↑ |
| Ir a la derecha | → / D | D | → |
| Ir a la izquierda | ← / A | A | ← |
| Picada | ↓ / S | S | ↓ |
| Vista de cóndor | V / E | E | L |
| Pausa | Esc / P | Esc / P | Esc / P |
| Sonido | M | M | M |

En dispositivos móviles se utilizan los botones táctiles disponibles en pantalla para el modo individual.

## Estructura

```text
app.py
requirements.txt
README.md
.gitignore

static/
  index.html
  css/
    estilos.css
  js/
    datos.js
    lowpoly.js
    condor3d.js
    sonido.js
    interfaz.js
    juego.js
```

| Archivo | Responsabilidad |
|---|---|
| `app.py` | Servidor Flask y API de puntajes mediante SQLite. |
| `requirements.txt` | Dependencias de Python. |
| `index.html` | Estructura del juego, canvas, HUD, avisos y controles táctiles. |
| `estilos.css` | Interfaz Low-Poly y distribución adaptativa mediante Grid y Flexbox. |
| `datos.js` | Datos educativos, fuentes, niveles, preguntas, parámetros físicos y energéticos. |
| `lowpoly.js` | Motor de dibujo del terreno, volcán, vegetación y elementos del escenario. |
| `condor3d.js` | Motor tridimensional del cóndor y animación independiente de sus patas y alas. |
| `sonido.js` | Efectos, viento y melodías mediante Web Audio. |
| `interfaz.js` | Pantallas, HUD, almacenamiento local y comunicación con la API. |
| `juego.js` | Bucle principal, física de vuelo y caminata, energía, animaciones, peligros, muerte y niveles. |

Los datos están separados de la lógica. Para cambiar la dificultad o los parámetros del juego, edita `FISICA` y `NIVELES` en `datos.js`.

## API de puntajes (Python)

El servidor Flask utiliza SQLite para almacenar las puntuaciones.

- `GET /api/puntajes`: devuelve los 10 mejores puntajes.
- `POST /api/puntajes`: registra una puntuación.

La estructura de los datos enviados es:

```json
{
  "nombre": "Jugador",
  "puntos": 1500,
  "limpio": 80,
  "datos": 10,
  "jugadores": 1,
  "fecha": "2026-11-24"
}
```

El servidor valida los tipos y rangos de los datos, incluyendo el nombre obligatorio de hasta 16 caracteres y una puntuación entre 0 y 1.000.000.

Si los datos son incorrectos, devuelve un código HTTP `400` con un mensaje de error.

Cuando el servidor no está disponible, el juego utiliza el almacenamiento local del navegador.

## Dato real → mecánica (base para la parte B del informe)

| Dato real | En el juego |
|---|---|
| Aletea cerca del 1 % del tiempo y planea en térmicas | Aletear consume más energía; las térmicas reducen el consumo y permiten ganar altura |
| El despegue concentra gran parte del esfuerzo de aleteo | Despegar del suelo cuesta el triple de energía |
| Es carroñero y contribuye a limpiar el páramo | Comer carroña recupera energía y aumenta el porcentaje de páramo limpio |
| Busca alimento con la vista y siguiendo a otras aves | Gallinazos sobre la comida segura y Vista de cóndor |
| Sus patas no sirven para cazar como las de un águila | Movimiento terrestre y alimentación sobre el suelo |
| Anida en riscos de 3.000 a 5.000 m | Meta: llegar al nido; la altitud se muestra en el HUD |
| Un solo huevo cada dos años | Nivel 4: el nido con un solo huevo |
| Macho más grande y con cresta; hembra sin cresta | Dos cóndores con estadísticas y modelos distintos |
| Veneno: 63 % de los casos registrados | Carroña envenenada de color morado desde el nivel 2 |
| Choques con tendidos eléctricos | Torres y cables eléctricos |
| Disparos de personas | Cazadores con mira que se fija |
| Entre 94 y 150 cóndores estimados en Ecuador según los censos de 2015 y 2018 | Mensaje final de conservación y pregunta del nivel 4 |

El juego incorpora 19 datos educativos definidos en `static/js/datos.js`, cada uno con su fuente.

Estos datos deben verificarse con las fuentes originales y citarse en formato APA 7 en el informe.

### Fuentes

- Williams, H. J. et al. (2020). *Physical limits of flight performance in the heaviest soaring bird*. PNAS.
- Restrepo-Cardona, J. S. et al. (2022). *Anthropogenic threats to the Vulnerable Andean Condor in northern South America*. PLOS ONE.
- Primicias (2019). *Día del Cóndor Andino en Ecuador*.
- Wikipedia, «Andean condor» (fuente introductoria que debe complementarse con sus referencias originales).

## Validación con 5 personas (parte C del informe)

Antes y después de jugar, se deben realizar las mismas tres preguntas:

1. ¿Cuánto tiempo pasa aleteando un cóndor mientras vuela?
2. ¿Cuál es la principal causa de casos de cóndores heridos o muertos registrados en el norte de Sudamérica?
3. ¿Cuántos cóndores se estimaron en Ecuador según los censos de 2015 y 2018?

Se debe registrar cuántas personas responden correctamente antes y después de jugar, además de observar qué mecánicas comprendieron sin ayuda.

## Pruebas funcionales

| Prueba | Resultado esperado |
|---|---|
| Cambiar el tamaño de la ventana | La interfaz se adapta al espacio disponible |
| Caminar hacia ambos lados | Las patas se mueven alternativamente |
| Soltar los controles en tierra | El cóndor se detiene |
| Aterrizar | El cuerpo cambia de posición y las alas se pliegan |
| Despegar | El cuerpo adopta la posición de vuelo y las alas se extienden |
| Caminar dentro de una térmica | El cóndor permanece en el suelo |
| Consumir carroña segura | Recupera energía |
| Alcanzar un punto de control | Recupera 25 unidades de energía |
| Agotar la energía | Muerte definitiva |
| Perder todas las vidas | Muerte definitiva |
| Morir después de activar una bandera | No revive automáticamente |
| Morir en modo cooperativo | El compañero superviviente puede continuar |
| Finalizar la partida | Se muestran los resultados y se permite registrar la puntuación |

## Control de versiones

El proyecto utiliza Git y GitHub para gestionar el desarrollo colaborativo.

- `main`: rama principal que contiene las funcionalidades estables.
- `pruebas`: rama destinada al desarrollo y validación de nuevas funcionalidades.

Las modificaciones se implementan y comprueban primero en la rama de pruebas antes de integrarse en la rama principal.

Cada integrante debe realizar sus propios commits de acuerdo con la distribución de responsabilidades del proyecto.

## Mejoras futuras

- Separación del ranking individual y cooperativo.
- Ampliación de las estadísticas de cada partida.
- Incorporación de nuevos niveles y amenazas.
- Ampliación de los datos educativos.
- Ajuste de la dificultad y equilibrio energético.
- Nuevos modos de juego.

## Publicación

El proyecto puede publicarse en un servicio compatible con Flask, como Render o PythonAnywhere, para utilizar la API de puntuaciones.

También puede publicarse únicamente el contenido de `static/` en GitHub Pages. En ese caso, el juego funciona sin la API y almacena las puntuaciones en el navegador.