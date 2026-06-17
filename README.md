# SERVITEX — Sistema de Gestión Comercial y Control de Fórmulas de Teñido

> Sistema web fullstack para la gestión de Órdenes de Compra y Recetas Técnicas de teñido textil. Desarrollado con React + Node.js y desplegado en producción sobre [Render](https://render.com).

🌐 **Producción Frontend:** https://servitex.onrender.com  
🔗 **API Backend:** https://servitex-backend.onrender.com  
📦 **Repositorio:** https://github.com/STEPHANOstudents/servitex-v5

---

## 📁 Estructura del Proyecto

```
Servitex/
├── backend/                            # API REST (Node.js + Express + TypeScript + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma               # 20 modelos de BD — esquema normalizado 3FN
│   │   └── seed.ts                     # Poblar catálogos iniciales (9 tablas)
│   ├── src/
│   │   ├── server.ts                   # Express + CORS + rutas registradas
│   │   ├── controllers/
│   │   │   ├── catalogos.controller.ts # GET /api/catalogos — datos de referencia
│   │   │   ├── ordenes.controller.ts   # CRUD de Órdenes de Compra
│   │   │   └── recetas.controller.ts   # CRUD de Recetas Técnicas
│   │   ├── services/
│   │   │   ├── catalogos.service.ts    # Leer los 9 catálogos en una sola consulta
│   │   │   ├── ordenes.service.ts      # Transacciones Prisma de OC (con FK)
│   │   │   └── recetas.service.ts      # Motor Químico + transacciones Prisma (con FK)
│   │   ├── routes/
│   │   │   ├── catalogos.routes.ts     # GET /api/catalogos
│   │   │   ├── ordenes.routes.ts       # /api/ordenes
│   │   │   └── recetas.routes.ts       # /api/recetas
│   │   ├── validators/
│   │   │   ├── ordenes.validator.ts    # Validación de entrada para OC
│   │   │   └── recetas.validator.ts    # Validación de entrada para Recetas
│   │   ├── engines/
│   │   │   └── quimico.engine.ts       # Motor Químico (cálculo de baños y gramos)
│   │   ├── types/
│   │   │   ├── ordenes.types.ts        # Interfaces TypeScript del módulo OC
│   │   │   └── recetas.types.ts        # Interfaces TypeScript del módulo Lab
│   │   └── lib/
│   │       ├── prisma.ts               # Instancia compartida de Prisma Client
│   │       └── catalogos.cache.ts      # Caché en memoria de IDs de catálogo
│   ├── .env                            # Variables de entorno locales (NO subir a Git)
│   ├── .env.example                    # Plantilla de variables de entorno
│   ├── prisma.config.ts                # Config Prisma v7 (adapter pg + dotenv)
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/                           # UI (React 19 + Vite + TypeScript)
    ├── public/
    │   └── _redirects                  # Regla SPA para Render Static Site
    ├── src/
    │   ├── App.tsx                     # Componente raíz + navegación por tabs
    │   ├── main.tsx                    # Punto de entrada React
    │   ├── index.css                   # Estilos globales — Tema claro profesional (Inter)
    │   ├── lab.css                     # Estilos adicionales del módulo Lab/Recetas
    │   ├── components/
    │   │   ├── FilaDetalle.tsx          # Fila dinámica de lotes (artículo desde catálogo)
    │   │   ├── FormularioOrden.tsx      # Formulario de Orden de Compra
    │   │   ├── FormularioReceta.tsx     # Formulario Técnico — carga catálogos de API
    │   │   ├── TableroControl.tsx       # Tablero de Órdenes de Compra
    │   │   ├── TableroRecetas.tsx       # Historial de Recetas (grid de tarjetas)
    │   │   ├── ModalDetalleReceta.tsx   # Modal con desglose químico completo
    │   │   └── ModalFinanciero.tsx      # Modal con liquidación financiera de OC
    │   ├── services/
    │   │   ├── api.ts                  # HTTP client — módulo Órdenes
    │   │   ├── recetasApi.ts           # HTTP client — módulo Recetas
    │   │   └── catalogosApi.ts         # HTTP client — GET /api/catalogos
    │   └── types/
    │       ├── ordenes.ts              # Tipos: OC, Detalles, objetos FK anidados
    │       └── recetas.ts              # Tipos: Recetas, Motor Químico, Preload
    ├── index.html
    ├── vite.config.ts
    ├── package.json
    └── tsconfig.json
```

---

## 🧱 Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 8 |
| **Estilos** | CSS puro — Tema claro profesional, Google Fonts Inter |
| **Backend** | Node.js, Express 5, TypeScript |
| **ORM** | Prisma 7 con `@prisma/adapter-pg` |
| **Base de Datos** | PostgreSQL 16 (Render managed DB) |
| **Deploy Frontend** | Render Static Site |
| **Deploy Backend** | Render Web Service |
| **Control de versiones** | Git + GitHub (`STEPHANOstudents/servitex-v5`) |

---

## 🗄️ Modelo de Base de Datos — 20 Tablas Normalizadas (3FN)

El esquema fue normalizado a **Tercera Forma Normal (3FN)**. Se eliminaron todos los `enum` de Prisma y se reemplazaron por **tablas de catálogo** con relaciones FK.

### Tablas de Catálogo (9 tablas de referencia)

| Tabla | Descripción |
|---|---|
| `tipos_cliente` | EMPRESA, PERSONA_NATURAL, TALLER_EXTERNO, DISTRIBUIDOR |
| `estados_orden` | PENDIENTE, EN_PROCESO, COMPLETADA, ANULADA |
| `composiciones_fibra` | ALGODON, NYLON, POLIESTER, MULTIFIBRA_* (6 variantes) |
| `articulos_textiles` | Avío, Prenda, Hilo, Tela cruda, Cierre, etc. |
| `unidades_medida` | METROS, KILOS, PIEZAS |
| `colorantes_catalogo` | 27 colorantes reactivos, ácidos y dispersos |
| `tipos_incidencia` | COLOR_FUERA_RANGO, REPROCESO, DAÑO_ARTICULO |
| `fases_proceso` | PREBLANQUEO, TENIDO, TENIDO_ALGODON, ACABADO, etc. |
| `tipos_reporte` | ORDENES_POR_PERIODO, INGRESOS_POR_CLIENTE, etc. |

### Tablas Operativas (11 tablas de negocio)

| Tabla | Descripción |
|---|---|
| `clientes` | Maestro de clientes (FK → tipos_cliente) |
| `ordenes_compra` | Cabecera de OC (FK → clientes, estados_orden) |
| `detalles_orden` | Lotes a teñir (FK → ordenes_compra, articulos_textiles, unidades_medida) |
| `recetas_tecnicas` | Formulario técnico (FK → detalles_orden, articulos_textiles, composiciones_fibra) |
| `colorantes_formula` | Colorantes de una receta (FK → recetas_tecnicas, colorantes_catalogo) |
| `bitacora_estados` | Historial de cambios de estado de OC |
| `lotes_produccion` | Control de producción por lote |
| `incidencias_calidad` | Registro de problemas en el proceso |
| `entregas` | Registro de entregas al cliente |
| `reportes` | Reportes generados del sistema |
| `detalle_reporte` | Filas de un reporte |

### Jerarquía principal:
```
tipos_cliente ──────┐
                    ▼
                 clientes ─────────── estados_orden
                    │                      │
                    ▼                      │
              ordenes_compra ◄─────────────┘
                    │
                    ▼
              detalles_orden ── articulos_textiles ── unidades_medida
                    │
                    ▼
            recetas_tecnicas ── composiciones_fibra
                    │
                    ▼
          colorantes_formula ── colorantes_catalogo
```

---

## 🔌 API REST — Endpoints

### Módulo 0: Catálogos (`/api/catalogos`)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/catalogos` | Devuelve los 9 catálogos en una sola consulta (para llenar los `<select>` del frontend) |

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "tiposCliente":       [{ "id": 1, "codigo": "EMPRESA", "etiqueta": "Empresa" }],
    "estadosOrden":       [{ "id": 1, "codigo": "PENDIENTE", "etiqueta": "Pendiente", "esEstadoFinal": false }],
    "composicionesFibra": [{ "id": 1, "codigo": "ALGODON", "etiqueta": "Algodón", "totalBanos": 9 }],
    "articulosTextiles":  [{ "id": 1, "nombre": "Avío" }],
    "unidadesMedida":     [{ "id": 1, "codigo": "METROS", "simbolo": "m", "etiqueta": "Metros" }],
    "colorantesCatalogo": [{ "id": 1, "nombre": "Ramazol Yellow" }],
    "tiposIncidencia":    [...],
    "fasesProceso":       [...],
    "tiposReporte":       [...]
  }
}
```

### Módulo 1: Órdenes de Compra (`/api/ordenes`)

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/ordenes` | Crear OC completa (cabecera + detalles en transacción atómica) |
| `GET` | `/api/ordenes` | Listar OCs con paginación |
| `GET` | `/api/ordenes/:id` | OC por ID con liquidación financiera calculada |
| `PATCH` | `/api/ordenes/:id/estado` | Cambiar estado operativo |
| `GET` | `/api/health` | Health check |

**Body POST:**
```json
{
  "numeroOC": "OC-001",
  "clienteNombre": "Empresa XYZ",
  "tipoClienteCodigo": "EMPRESA",
  "detalles": [
    { "cantidad": 100, "articuloId": 1, "colorSolicitado": "Navy Blue", "precioPorMetro": 5.0 }
  ]
}
```

**Body PATCH estado:**
```json
{ "estadoCodigo": "EN_PROCESO" }
```

### Módulo 2: Recetas Técnicas (`/api/recetas`)

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/recetas` | Crear receta (backend calcula litros, intensidad y ejecuta el Motor Químico) |
| `GET` | `/api/recetas` | Listar recetas (más reciente primero) |
| `GET` | `/api/recetas/:id` | Receta con desglose completo del Motor Químico |

**Body POST:**
```json
{
  "detalleOrdenId": 1,
  "pesoRealKg": 2.5,
  "articuloId": 1,
  "composicionFibraCodigo": "ALGODON",
  "relacionBano": 40,
  "descripcionColor": "Navy Blue",
  "colorantes": [
    { "coloranteId": 1, "porcentaje": 0.5 }
  ]
}
```

### Formato de Respuesta Estándar
```json
{
  "success": true,
  "message": "Descripción del resultado",
  "data": { ... },
  "timestamp": "2026-06-17T14:00:00.000Z"
}
```

---

## 🌐 Arquitectura de Comunicación

```
[Usuario]
    │
    ▼
[Render Static Site]                          [Render Web Service]
https://servitex.onrender.com  ──fetch──►  https://servitex-backend.onrender.com
   React SPA (dist/)                             Express API (Node.js)
   VITE_API_URL → backend URL                         │
                                                       ▼
                                           [Render PostgreSQL 16]
                                           dpg-d8jnvhs2m8qs739aqdfg-a
                                           .oregon-postgres.render.com
                                           Base de datos: servitex_db
```

**En desarrollo local:**
```
http://localhost:5173  ──proxy /api──►  http://localhost:3000
  (Vite dev server)                      (Express + ts-node)
        │                                       │
        └──────────────────────────────────────►│
                                                ▼
                                    [Render PostgreSQL remota]
                                    (misma BD de producción vía SSL)
```

> El proxy de Vite (`vite.config.ts`) redirige `/api/*` al backend en `localhost:3000`. En producción el frontend usa `VITE_API_URL`.

---

## ⚙️ Variables de Entorno

### Backend (`backend/.env`)

```env
PORT=3000
DATABASE_URL="postgresql://servitex_db_user:PASSWORD@HOST.oregon-postgres.render.com/servitex_db?sslmode=require"
NODE_ENV=development
FRONTEND_URL=https://servitex.onrender.com
```

### Frontend (`frontend/.env` — solo producción local)

```env
VITE_API_URL=https://servitex-backend.onrender.com
```

> En desarrollo local no es necesaria: Vite proxy redirige `/api` al backend local.

---

## 🚀 Instalación y Desarrollo Local

### Requisitos previos
- Node.js ≥ 18
- npm ≥ 9
- Acceso a PostgreSQL (Render o local)

### 1. Clonar el repositorio

```bash
git clone https://github.com/STEPHANOstudents/servitex-v5.git
cd servitex-v5
```

### 2. Configurar y arrancar el Backend

```bash
cd backend
npm install
```

Crea `backend/.env` basándote en `.env.example`:

```env
PORT=3000
DATABASE_URL="postgresql://..."
NODE_ENV=development
```

Sincronizar el schema con la base de datos (primera vez o tras cambios):

```bash
# Aplicar las 20 tablas a la BD (RESETEA LOS DATOS)
npx prisma db push --force-reset --config prisma.config.ts

# Poblar los 9 catálogos de referencia
npx ts-node prisma/seed.ts
```

Iniciar el servidor de desarrollo:

```bash
npm run dev
# ✅ Servidor corriendo en http://localhost:3000
```

### 3. Configurar y arrancar el Frontend

```bash
cd frontend
npm install
npm run dev
# ✅ App disponible en http://localhost:5173
```

> El backend debe estar corriendo para que el proxy funcione.

---

## 🛠️ Comandos Disponibles

### Backend

```bash
npm run dev              # Servidor desarrollo (ts-node)
npm run build            # prisma generate + tsc → dist/
npm start                # Ejecutar el build compilado (producción)
npm run seed             # Poblar catálogos iniciales
npm run prisma:generate  # Regenerar Prisma Client
npm run prisma:studio    # Abrir Prisma Studio (UI visual de la BD)
```

### Frontend

```bash
npm run dev      # Servidor Vite (http://localhost:5173)
npm run build    # Build de producción → dist/
npm run preview  # Vista previa del build
npm run lint     # ESLint
```

---

## ☁️ Deploy en Render

El proyecto tiene **3 servicios en Render**:

### 1. PostgreSQL Database
- **Nombre:** `servitex_db`
- **Plan:** Free — PostgreSQL 16
- **Región:** Oregon (US West)
- La URL de conexión externa se obtiene en: *Dashboard → servitex_db → Connections → External Database URL*

### 2. Web Service (Backend)
- **Nombre:** `servitex-backend`
- **Root Directory:** `backend`
- **Build Command:** `npm install && npm run build`
  > El script `build` en `package.json` ejecuta `prisma generate --config prisma.config.ts && tsc`
- **Start Command:** `npm start`
- **Variables de entorno en Render:**
  ```
  DATABASE_URL   = <External Database URL de Render>
  NODE_ENV       = production
  FRONTEND_URL   = https://servitex.onrender.com
  ```

### 3. Static Site (Frontend)
- **Nombre:** `servitex`
- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **Variables de entorno en Render:**
  ```
  VITE_API_URL = https://servitex-backend.onrender.com
  ```

### Actualizar el schema en producción (tras cambios en `schema.prisma`)

```bash
# Desde tu máquina local, apuntando a la BD de Render:
cd backend
npx prisma db push --force-reset --config prisma.config.ts
npx ts-node prisma/seed.ts
git push origin main   # Render redespliega automáticamente
```

> ⚠️ `--force-reset` elimina todos los datos. Úsalo solo en etapa de desarrollo. En producción real usa migraciones (`prisma migrate deploy`).

---

## 🔒 CORS

El backend permite peticiones desde:
- `http://localhost:5173` (Vite dev)
- `http://localhost:3000` (backend local)
- Cualquier subdominio `*.onrender.com`
- La URL definida en `FRONTEND_URL`

---

## 📋 Funcionalidades del Sistema

### Módulo 1: Órdenes de Compra
- ✅ Registro de OC: número, cliente, tipo de cliente (desde catálogo), observaciones
- ✅ Tabla dinámica de lotes: artículo (SELECT catálogo), color, cantidad, precio
- ✅ Cálculo en tiempo real: subtotal por fila, IGV 18%, total general
- ✅ Validación en frontend y backend
- ✅ Tablero de cartillas con estado visible
- ✅ Modal de liquidación financiera detallada
- ✅ Bitácora automática de cambios de estado

### Módulo 2: Recetas Técnicas (Laboratorio)
- ✅ Formulario técnico con catálogos cargados desde la API:
  - Artículo textil (SELECT)
  - Composición de fibra (botones con total de baños)
  - Colorantes con buscador y porcentajes individuales (SELECT + checkbox)
- ✅ **Motor Químico automático:** calcula baños según la fibra:
  - Algodón: 9 baños (4 Preblanqueo + 5 Teñido)
  - Nylon / Poliéster: 4 baños
  - Multifibra: 7 baños
- ✅ Cálculo automático de litros y gramos de cada producto químico
- ✅ Nivel de intensidad automático (Pastel / Claro / Intermedio / Intenso)
- ✅ Historial de recetas en grid de tarjetas con paginación
- ✅ Modal de desglose químico con resumen consolidado
- ✅ Función "Copiar como base" para reutilizar fórmulas

### Diseño
- ✅ Tema claro profesional (blanco, grises suaves, acento teal)
- ✅ Tipografía Inter (Google Fonts)
- ✅ Responsivo (móvil, tablet, escritorio)
- ✅ Animaciones y micro-interacciones

---

## 🗂️ Normalización de la Base de Datos

El esquema fue refactorizado de **5 tablas con enums** a **20 tablas normalizadas**:

| Antes (v1) | Después (v3) |
|---|---|
| `enum TipoCliente` en Prisma | Tabla `tipos_cliente` con FK |
| `enum EstadoOrden` en Prisma | Tabla `estados_orden` con FK |
| `enum ComposicionFibra` en Prisma | Tabla `composiciones_fibra` con FK |
| `descripcionArticulo: String` (texto libre) | Tabla `articulos_textiles` con FK |
| `nombreColorante: String` (texto libre) | Tabla `colorantes_catalogo` con FK |

**Formas Normales aplicadas:**
- **1FN:** Todos los campos son atómicos. Sin grupos repetidos.
- **2FN:** Cada atributo depende de toda la clave primaria (no hay dependencias parciales).
- **3FN:** Los atributos solo dependen de la clave primaria (sin dependencias transitivas). Los enums y textos libres se pasaron a tablas independientes.

---

## 👨‍💻 Notas de Desarrollo

- **Prisma v7** usa `prisma.config.ts` (API declarativa). La URL de conexión se configura en el adaptador `@prisma/adapter-pg`, no en el `schema.prisma`.
- **El build del backend** (`npm run build`) ejecuta `prisma generate --config prisma.config.ts && tsc`. Esto regenera el cliente Prisma en cada deploy de Render.
- **Catálogos en memoria:** `catalogos.cache.ts` carga los IDs de catálogo al arrancar el servidor para evitar consultas repetitivas en cada request.
- **Motor Químico:** `quimico.engine.ts` usa el código de fibra como string (e.g. `'ALGODON'`) — ya no depende de enums de Prisma.
- El archivo `frontend/public/_redirects` es necesario para que Render sirva la SPA correctamente.
