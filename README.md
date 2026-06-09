# SERVITEX — Sistema de Gestión Comercial y Control de Fórmulas de Teñido

> Sistema web fullstack para la gestión de Órdenes de Compra y Recetas Técnicas de teñido textil. Desarrollado con React + Node.js y desplegado en producción sobre [Render](https://render.com).

🌐 **Producción:** https://servitex.onrender.com  
🔗 **API Backend:** https://servitex-backend.onrender.com

---

## 📁 Estructura del Proyecto

```
Servitex/
├── backend/                        # API REST (Node.js + Express + TypeScript + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma           # Modelos de base de datos (PostgreSQL)
│   │   └── migrations/             # Historial de migraciones (autogenerado)
│   ├── src/
│   │   ├── server.ts               # Punto de entrada — Express + CORS + rutas
│   │   ├── controllers/
│   │   │   ├── ordenes.controller.ts   # Lógica HTTP de Órdenes de Compra
│   │   │   └── recetas.controller.ts   # Lógica HTTP de Recetas Técnicas
│   │   ├── services/
│   │   │   ├── ordenes.service.ts      # Transacciones Prisma de OC
│   │   │   └── recetas.service.ts      # Motor Químico + transacciones Prisma
│   │   ├── routes/
│   │   │   ├── ordenes.routes.ts       # Endpoints /api/ordenes
│   │   │   └── recetas.routes.ts       # Endpoints /api/recetas
│   │   ├── validators/
│   │   │   └── ordenes.validator.ts    # Validación de datos de entrada
│   │   ├── engines/                    # Motor Químico (cálculo de baños)
│   │   ├── types/                      # Tipos TypeScript del backend
│   │   └── lib/                        # Instancia compartida de Prisma Client
│   ├── .env                        # Variables de entorno locales (NO subir a Git)
│   ├── .env.example                # Plantilla de variables de entorno
│   ├── prisma.config.ts            # Config Prisma v7 (adapter pg + dotenv)
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/                       # UI (React 19 + Vite + TypeScript)
    ├── public/
    │   └── _redirects              # Regla SPA para Render Static Site
    ├── src/
    │   ├── App.tsx                 # Componente raíz + navegación por tabs
    │   ├── main.tsx                # Punto de entrada React
    │   ├── index.css               # Estilos globales (dark mode, design system)
    │   ├── components/
    │   │   ├── FilaDetalle.tsx         # Fila dinámica de la tabla de colores/lotes
    │   │   ├── FormularioOrden.tsx     # Formulario completo de Orden de Compra
    │   │   ├── FormularioReceta.tsx    # Formulario Técnico de Receta de Teñido
    │   │   ├── TableroControl.tsx      # Tablero de Órdenes de Compra (Kanban)
    │   │   ├── TableroRecetas.tsx      # Historial de Recetas (grid de tarjetas)
    │   │   ├── ModalDetalleReceta.tsx  # Modal con desglose químico completo
    │   │   └── ModalFinanciero.tsx     # Modal con liquidación financiera de OC
    │   ├── services/
    │   │   ├── api.ts              # Llamadas HTTP al backend (Órdenes)
    │   │   └── recetasApi.ts       # Llamadas HTTP al backend (Recetas)
    │   └── types/
    │       ├── ordenes.ts          # Tipos TypeScript: OC, Detalles, Respuestas
    │       └── recetas.ts          # Tipos TypeScript: Recetas, Motor Químico
    ├── index.html
    ├── vite.config.ts              # Config Vite: puerto 5173, proxy /api → :3000
    ├── package.json
    └── tsconfig.json
```

---

## 🧱 Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 8 |
| **Backend** | Node.js, Express 5, TypeScript, ts-node |
| **ORM** | Prisma 7 (con adapter `@prisma/adapter-pg`) |
| **Base de Datos** | PostgreSQL (Render managed DB) |
| **Deploy Frontend** | Render Static Site |
| **Deploy Backend** | Render Web Service |
| **Control de Versiones** | Git + GitHub (`STEPHANOstudents/servitex-v5`) |

---

## 🗄️ Modelo de Base de Datos

La base de datos tiene **4 tablas** (modelos Prisma) en PostgreSQL:

```
clientes
  └── ordenes_compra (FK: clienteId)
        └── detalles_orden (FK: ordenCompraId, CASCADE DELETE)
              └── recetas_tecnicas (FK: detalleOrdenId 1-1, CASCADE DELETE)
                    └── colorantes_formula (FK: recetaTecnicaId, CASCADE DELETE)
```

### Tablas:
- **`clientes`** — Catálogo maestro de clientes (nombre, tipo, RUC, etc.)
- **`ordenes_compra`** — Cabecera de la OC (número, estado, observaciones)
- **`detalles_orden`** — Filas dinámicas de lotes a teñir (cantidad, color, precio)
- **`recetas_tecnicas`** — Formulario técnico del laboratorio (peso, fibra, relación baño)
- **`colorantes_formula`** — Colorantes individuales de una receta con su porcentaje

### Enums:
- `TipoCliente`: `EMPRESA | PERSONA_NATURAL | TALLER_EXTERNO | DISTRIBUIDOR`
- `EstadoOrden`: `PENDIENTE | EN_PROCESO | COMPLETADA | ANULADA`
- `ComposicionFibra`: `ALGODON | NYLON | POLIESTER | MULTIFIBRA_*` (6 variantes)

---

## 🔌 API REST — Endpoints

### Módulo 1: Órdenes de Compra (`/api/ordenes`)

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/ordenes` | Crear OC completa (cabecera + detalles en una transacción) |
| `GET` | `/api/ordenes` | Listar todas las OCs con detalles (paginado, filtros por estado/cliente) |
| `GET` | `/api/ordenes/:id` | Obtener OC por ID con liquidación financiera |
| `GET` | `/api/ordenes/numero/:numeroOC` | Buscar OC por código de documento |
| `PATCH` | `/api/ordenes/:id/estado` | Actualizar solo el estado operativo |
| `GET` | `/api/health` | Health check del servidor |

### Módulo 2: Recetas Técnicas (`/api/recetas`)

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/recetas` | Crear receta técnica (el backend calcula litros, nivel de intensidad y ejecuta el Motor Químico) |
| `GET` | `/api/recetas` | Listar todas las recetas (más reciente primero) |
| `GET` | `/api/recetas/:id` | Obtener receta con desglose completo del Motor Químico (baños, litros y gramos) |

### Formato de Respuesta Estándar
```json
{
  "success": true,
  "message": "Descripción del resultado",
  "data": { ... },
  "timestamp": "2026-06-09T06:00:00.000Z"
}
```

---

## 🌐 Arquitectura de Comunicación

```
[Usuario]
    │
    ▼
[Render Static Site]                         [Render Web Service]
https://servitex.onrender.com  ───fetch──►  https://servitex-backend.onrender.com
   React SPA (dist/)                            Express API (Node.js)
   VITE_API_URL → backend URL                       │
                                                     ▼
                                         [Render PostgreSQL]
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

> El proxy de Vite (`vite.config.ts`) redirige automáticamente todas las peticiones `/api/*` al backend en localhost:3000. En producción esto no aplica — el frontend usa directamente la URL del backend via `VITE_API_URL`.

---

## ⚙️ Variables de Entorno

### Backend (`backend/.env`)

```env
PORT=3000
DATABASE_URL="postgresql://servitex_db_user:PASSWORD@HOST.oregon-postgres.render.com/servitex_db?sslmode=require"
NODE_ENV=development
FRONTEND_URL=https://servitex.onrender.com
```

> Para desarrollo local puedes apuntar a la misma BD de Render o a un PostgreSQL local.

### Frontend (`frontend/.env` — solo para producción local)

```env
VITE_API_URL=https://servitex-backend.onrender.com
```

> En desarrollo local esta variable no es necesaria: Vite redirige `/api` al backend local mediante el proxy.

---

## 🚀 Instalación y Desarrollo Local

### Requisitos previos
- Node.js ≥ 18
- npm ≥ 9
- Acceso a la base de datos PostgreSQL (Render o local)

### 1. Clonar el repositorio

```bash
git clone https://github.com/STEPHANOstudents/servitex-v5.git
cd servitex-v5
```

### 2. Configurar el Backend

```bash
cd backend
npm install
```

Crea el archivo `backend/.env` basándote en `.env.example`:

```env
PORT=3000
DATABASE_URL="postgresql://servitex_db_user:PASSWORD@HOST.render.com/servitex_db?sslmode=require"
NODE_ENV=development
```

Sincronizar el schema con la base de datos:

```bash
npx prisma db push
```

Iniciar el servidor de desarrollo:

```bash
npm run dev
# ✅ Servidor corriendo en http://localhost:3000
```

### 3. Configurar el Frontend

```bash
cd frontend
npm install
npm run dev
# ✅ App disponible en http://localhost:5173
```

> Debes tener el backend corriendo al mismo tiempo para que el proxy funcione.

---

## 🛠️ Comandos Disponibles

### Backend

```bash
npm run dev              # Servidor en modo desarrollo (ts-node, hot-reload)
npm run build            # Compilar TypeScript → dist/
npm start                # Ejecutar el build compilado (producción)
npm run prisma:generate  # Regenerar Prisma Client después de cambios en schema
npm run prisma:migrate   # Crear y aplicar una nueva migración
npm run prisma:studio    # Abrir Prisma Studio (UI visual de la base de datos)
npm run prisma:reset     # Resetear la base de datos (cuidado en producción)
```

### Frontend

```bash
npm run dev      # Servidor de desarrollo Vite (http://localhost:5173)
npm run build    # Build de producción → dist/
npm run preview  # Vista previa del build de producción
npm run lint     # Linter ESLint
```

---

## ☁️ Deploy en Render

El proyecto tiene **3 servicios en Render**:

### 1. PostgreSQL Database
- **Nombre:** `servitex_db`
- **Plan:** Free
- **Región:** Oregon (US West)
- La URL de conexión externa se obtiene en: *Dashboard → servitex_db → Connections → External Database URL*

### 2. Web Service (Backend)
- **Nombre:** `servitex-backend`
- **Repositorio:** `STEPHANOstudents/servitex-v5`
- **Root Directory:** `backend`
- **Build Command:** `npm install && npx prisma generate && npm run build`
- **Start Command:** `npm start`
- **Variables de entorno en Render:**
  ```
  DATABASE_URL   = <External Database URL de Render>
  NODE_ENV       = production
  FRONTEND_URL   = https://servitex.onrender.com
  ```

### 3. Static Site (Frontend)
- **Nombre:** `servitex`
- **Repositorio:** `STEPHANOstudents/servitex-v5`
- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **Variables de entorno en Render:**
  ```
  VITE_API_URL = https://servitex-backend.onrender.com
  ```

### Sincronizar la base de datos (primera vez o tras cambios de schema)

```bash
cd backend
npx prisma db push
# ✅ Your database is now in sync with your Prisma schema.
```

> Render redespliega automáticamente cada vez que se hace `git push` a la rama `main`.

---

## 🔒 CORS

El backend permite peticiones únicamente desde:
- `http://localhost:5173` (desarrollo local)
- `http://localhost:3000` (desarrollo local)
- Cualquier subdominio `*.onrender.com` (todos los servicios de Render)
- La URL definida en `FRONTEND_URL` (env var explícita)

---

## 📋 Funcionalidades del Sistema

### Módulo 1: Órdenes de Compra
- ✅ Registro de OC con cabecera (número, cliente, tipo, observaciones)
- ✅ Tabla dinámica de lotes/colores (añadir/eliminar filas)
- ✅ Cálculo en tiempo real: subtotal por fila, IGV 18%, total general
- ✅ Validación completa en frontend y backend
- ✅ Tablero Kanban con filtros por estado
- ✅ Modal de liquidación financiera detallada

### Módulo 2: Recetas Técnicas (Laboratorio)
- ✅ Formulario técnico: peso, artículo, composición de fibra, relación de baño
- ✅ Fórmula del color: colorantes con porcentajes individuales
- ✅ **Motor Químico automático:** calcula los baños de teñido según la fibra:
  - Algodón: 9 baños (5 teñido + 4 preblanqueo)
  - Nylon / Poliéster: 4 baños
  - Multifibra: 7 baños
- ✅ Cálculo automático de litros por baño y gramos de cada producto
- ✅ Nivel de intensidad automático (Pastel / Claro / Intermedio / Intenso)
- ✅ Historial de recetas en grid de tarjetas con paginación
- ✅ Modal de desglose químico completo

---

## 👨‍💻 Notas de Desarrollo

- El proyecto usa **Prisma v7** con `prisma.config.ts` (nueva config declarativa). La URL de conexión se configura en `prisma.config.ts` mediante el adaptador `@prisma/adapter-pg`, no en el `schema.prisma`.
- El frontend usa **rutas relativas** (`/api/...`) en desarrollo (el proxy de Vite las redirige al backend) y la **URL absoluta** del backend (`VITE_API_URL`) en producción.
- El archivo `frontend/public/_redirects` es necesario para que Render sirva correctamente una SPA: redirige todas las rutas a `index.html` con código 200.
- El backend compila TypeScript a `dist/` para producción (`npm run build` → `npm start`), pero en desarrollo usa `ts-node` directamente.
