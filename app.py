"""
Guardianes del Cóndor: Cumbres Low-Poly  ·  servidor en Python (Flask + SQLite)

Sirve el juego (carpeta static/) y una pequeña API de puntajes:
  GET  /api/puntajes   -> los 10 mejores puntajes
  POST /api/puntajes   -> guarda {nombre, puntos, limpio, datos, jugadores, fecha}

Uso:
  pip install -r requirements.txt
  python app.py
  Abrir http://127.0.0.1:5000
"""
import re
import sqlite3
from datetime import date
from pathlib import Path

from flask import Flask, g, jsonify, request, send_from_directory

BASE = Path(__file__).parent
BASE_DATOS = BASE / "puntajes.db"
MAX_PUNTOS = 1_000_000          # tope razonable: evita puntajes absurdos
FECHA_OK = re.compile(r"^\d{4}-\d{2}-\d{2}$")

app = Flask(__name__, static_folder="static", static_url_path="")


# ---------- Base de datos (SQLite) ----------
def conexion():
    if "bd" not in g:
        g.bd = sqlite3.connect(BASE_DATOS)
        g.bd.row_factory = sqlite3.Row
    return g.bd


@app.teardown_appcontext
def cerrar(_error=None):
    bd = g.pop("bd", None)
    if bd is not None:
        bd.close()


def crear_tabla():
    with sqlite3.connect(BASE_DATOS) as bd:
        bd.execute(
            """CREATE TABLE IF NOT EXISTS puntajes (
                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                   nombre TEXT NOT NULL,
                   puntos INTEGER NOT NULL,
                   limpio INTEGER NOT NULL,
                   datos INTEGER NOT NULL,
                   jugadores INTEGER NOT NULL DEFAULT 1,
                   fecha TEXT NOT NULL
               )"""
        )


# ---------- Rutas ----------
@app.get("/")
def inicio():
    return send_from_directory(app.static_folder, "index.html")


@app.get("/api/puntajes")
def obtener_puntajes():
    filas = conexion().execute(
        "SELECT nombre, puntos, limpio, datos, jugadores, fecha "
        "FROM puntajes ORDER BY puntos DESC, id ASC LIMIT 10"
    ).fetchall()
    return jsonify([dict(f) for f in filas])


def entero(valor, minimo, maximo, campo):
    """Convierte a entero y valida el rango; lanza ValueError con un mensaje claro."""
    if isinstance(valor, bool):
        raise ValueError(f"'{campo}' debe ser un número")
    try:
        numero = int(valor)
    except (TypeError, ValueError):
        raise ValueError(f"'{campo}' debe ser un número")
    if not minimo <= numero <= maximo:
        raise ValueError(f"'{campo}' debe estar entre {minimo} y {maximo}")
    return numero


@app.post("/api/puntajes")
def nuevo_puntaje():
    datos = request.get_json(silent=True)
    if not isinstance(datos, dict):
        return jsonify(error="Se esperaba un JSON con los datos del puntaje"), 400

    nombre = " ".join(str(datos.get("nombre", "")).split())[:16]
    if not nombre:
        return jsonify(error="Falta el nombre"), 400

    try:
        registro = {
            "nombre": nombre,
            "puntos": entero(datos.get("puntos", 0), 0, MAX_PUNTOS, "puntos"),
            "limpio": entero(datos.get("limpio", 0), 0, 100, "limpio"),
            "datos": entero(datos.get("datos", 0), 0, 500, "datos"),
            "jugadores": entero(datos.get("jugadores", 1), 1, 2, "jugadores"),
        }
    except ValueError as error:
        return jsonify(error=str(error)), 400

    fecha = str(datos.get("fecha", ""))[:10]
    registro["fecha"] = fecha if FECHA_OK.match(fecha) else date.today().isoformat()

    bd = conexion()
    bd.execute(
        "INSERT INTO puntajes (nombre, puntos, limpio, datos, jugadores, fecha) "
        "VALUES (:nombre, :puntos, :limpio, :datos, :jugadores, :fecha)",
        registro,
    )
    bd.commit()
    return jsonify(registro), 201


crear_tabla()

if __name__ == "__main__":
    app.run(debug=True)
