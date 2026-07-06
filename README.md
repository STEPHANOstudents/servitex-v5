# SERVITEX — Sistema de Gestión para Tintorería Textil

> **¿Qué es Servitex?**
> Servitex es una aplicación web que digitaliza y automatiza las operaciones de una tintorería textil. Reemplaza el uso de hojas de cálculo y papel para tres tareas clave:
> 1. Registrar y controlar **Órdenes de Compra** (qué se va a teñir, para quién, cantidad y a qué precio).
> 2. Generar **Recetas Técnicas de Teñido** y calcular baños químicos automáticos usando un **Motor Químico**.
> 3. Generar y exportar **Reportes de Inteligencia Comercial y Operativa** en formato **PDF** para la toma de decisiones.

🌐 **Demo en vivo:** https://servitex.onrender.com
🔗 **API Backend:** https://servitex-backend.onrender.com/api/health
📦 **Repositorio:** https://github.com/STEPHANOstudents/servitex-v5

---

## Control de Accesos por Roles

| Rol | Qué hace en el sistema | Vistas Accesibles | Restricciones / Bloqueos |
|---|---|---|---|
| **Administradora (PROPIETARIA)** | Control comercial completo, financiero y técnico de laboratorio | *Todas las vistas:* Tablero OC, Nueva OC, Recetas, Formulario Técnico, Lotes, Reportes | Ninguna. Tiene permisos totales. |
| **Operario** | Visualiza el tablero del taller y ejecuta recetas de teñido | Tablero OC, Recetas, Lotes en Proceso | Bloqueado de crear OCs, crear recetas, cambiar estados de OC, duplicar recetas y ver reportes generales |

---

## ¿Cómo funciona? (Flujo de uso)

```
1. El cliente llega con artículos textiles para teñir
         │
         ▼
2. La propietaria crea una Orden de Compra (OC) en estado PENDIENTE
   → Número de OC, cliente, tipo de cliente y lotes (artículo, color, metros, precio)
   → El sistema calcula subtotal, IGV (18%) y total automáticamente
         │
         ▼
3. El técnico (Propietaria) crea la Receta Técnica para el lote
   → Ingresa: peso real en kg, fibra, relación de baño y colorantes catalogo
   → Preview interactivo en tiempo real de la secuencia de baños antes de guardar
   → El Motor Químico calcula: litros, gramos de insumos y fases de baño automáticamente
   → Al guardar la primera receta, la OC pasa automáticamente a EN_PROCESO
         │
         ▼
4. Los operarios visualizan y ejecutan las recetas desde su tablero
   → Consultan detalles de baños y consolidado de gramos necesarios
   → Realizan el análisis de color cargando fotos o usando la cámara web (HEX/RGB)
         │
         ▼
5. La propietaria aprueba el teñido en Lab Histórico
   → Una vez que todos los lotes de una OC están en estado APROBADO, la OC pasa a COMPLETADA
         │
         ▼
6. La propietaria genera reportes visuales en PDF para toma de decisiones
```

---

## Tecnologías utilizadas

| Capa | Tecnología | Para qué sirve |
|---|---|---|
| **Frontend** | React 19 + TypeScript + Vite | Interfaz de usuario interactiva y fluida |
| **Estilos** | CSS vanilla + Google Fonts (Inter) | Diseño visual premium, adaptativo y animaciones fluidas |
| **Librería de Gráficos** | Recharts (React 19 compatible) | Renderizado de gráficos de barras, líneas y analíticas |
| **Backend** | Node.js + Express 5 + TypeScript | API REST segura y procesamiento de lógica de negocio |
| **Autenticación** | JWT (JSON Web Tokens) + Bcryptjs | Firma de sesión de 8 horas y encriptación de claves |
| **ORM** | Prisma 7 + `@prisma/adapter-pg` | Conexión directa y segura con base de datos |
| **Base de Datos** | PostgreSQL 16 | Almacenamiento seguro y persistente de todas las tablas |
| **Deploy** | Render Web Services / Static Sites | Hosting seguro en la nube para backend, frontend y BD |

---

## Funcionalidades del sistema

### 🔒 Módulo de Seguridad y Autenticación (¡NUEVO!)
- **Autenticación JWT en Memoria:** Login seguro. Los tokens JWT se manejan exclusivamente en memoria del frontend para prevenir ataques XSS.
- **Middleware de Roles:** Controladores en backend protegidos para asegurar que solo la propietaria (`PROPIETARIA`) pueda crear o alterar datos críticos.
- **Cierre por Inactividad:** Cierre de sesión automático tras 15 minutos sin interactuar con la aplicación, protegiendo las terminales del taller.
- **Interfaz Protegida:** Deshabilitación y ocultación visual de botones ("Nueva OC", "+ Nueva Receta", "Duplicar", dropdowns de estado) para usuarios con rol `OPERARIO`.

### 📦 Módulo 1 — Órdenes de Compra
- **Creación Dinámica:** Registro de OC con lotes dinámicos. Suma, IGV y totales calculados al instante.
- **Bitácora Inmutable:** Registro automático en la tabla `bitacora_estados` con fecha y motivo de cada transición de estado de una OC.
- **Liquidación Financiera:** Modal detallado con desglose de metros totales, lotes, subtotal y total neto.

### ⚗️ Módulo 2 — Laboratorio / Recetas Técnicas
- **Preview interactivo en tiempo real:** Visualización instantánea de los baños químicos y dosis calculadas en el formulario mientras se digitan los datos físicos.
- **Análisis de Color digital:** Captura fotográfica del textil teñido a través de la cámara web para extraer el color HEX/RGB dominante y guardarlo en el historial.
- **Historial de Iteraciones (Ajustes):** Registro cronológico de variaciones en los porcentajes de colorantes aplicados a una receta, con cálculo automático de gramos.
- **UX Inteligente:** En caso de errores al guardar, la aplicación alerta con un toast y desplaza (scroll) automáticamente al usuario hacia los campos erróneos al inicio del formulario.

### 📊 Módulo 3 — Reportes e Inteligencia de Negocio (¡NUEVO!)
- **Consumo de Productos:** Gráfico de barras horizontal que expone el consumo acumulado en kilogramos del Top 5 de colorantes químicos.
- **Fidelidad de Clientes:** Ranking interactivo de los clientes más activos, mostrando medallas con el podio en oro y total de lotes teñidos/metros procesados.
- **Producción Temporal:** Gráfico de líneas dinámico que registra los metros totales teñidos, agrupados por períodos de tiempo ajustables: **Mes**, **Trimestre** o **Año**.
- **Generación de Reportes PDF:** Botón que genera un documento membretado formal e institucional de SERVITEX listo para descargar o imprimir. Cuenta con logotipo, metadatos, descripciones, tabla limpia de datos y líneas de firma para auditoría.

---

## Estructura del proyecto

```
Servitex/
├── backend/                         ← Servidor Node.js + API REST
│   ├── prisma/
│   │   ├── schema.prisma            ← Esquema de base de datos normalizado (20 tablas)
│   │   ├── seed.ts                  ← Población de catálogos y usuarios iniciales (Karen, Stephano, Maicol)
│   │   └── fix-tipos-reporte.ts     ← Limpieza idempotente para los nuevos reportes
│   ├── src/
│   │   ├── server.ts                ← Entrada del servidor, CORS, middlewares y registro de rutas
│   │   ├── controllers/             ← Manejadores HTTP
│   │   │   ├── auth.controller.ts   ← Login y perfil de usuario
│   │   │   ├── reportes.controller.ts ← Snapshots e inteligencia comercial
│   │   │   ├── recetas.controller.ts
│   │   │   └── ...
│   │   ├── services/                ← Lógica de negocio (Consultas Prisma y transacciones)
│   │   │   ├── auth.service.ts
│   │   │   ├── reportes.service.ts  ← Consultas raw optimizadas para estadísticas
│   │   │   └── ...
│   │   ├── routes/                  ← Enrutadores express protegidos
│   │   │   ├── auth.routes.ts
│   │   │   ├── reportes.routes.ts
│   │   │   └── ...
│   │   ├── middlewares/
│   │   │   └── auth.middleware.ts   ← Verificador de tokens JWT y roles de acceso
│   │   └── engines/
│   │       └── quimico.engine.ts    ← Motor Químico de cálculo
│   └── tsconfig.json
│
└── frontend/                        ← Aplicación React
    └── src/
        ├── App.tsx                  ← Router principal, control de sesión global
        ├── index.css                ← Estilos globales de la app y temas de color
        ├── lab.css                  ← Estilos visuales del laboratorio y tablas
        ├── hooks/
        │   └── useInactivityLogout.ts ← Control de inactividad de sesión (15 min)
        ├── components/
        │   ├── Login.tsx            ← Tarjeta de login estilizada y responsiva
        │   ├── Reportes.tsx         ← Panel de analíticas, Recharts y generación de PDFs
        │   ├── FormularioReceta.tsx ← Parámetros, colorantes, preview e inteligencia UX
        │   └── ...
        ├── services/
        │   ├── authApi.ts           ← Consultas HTTP de sesión
        │   ├── authHeaders.ts       ← Manejo del token en memoria volatil
        │   ├── reportesApi.ts       ← Consultas HTTP de analíticas
        │   └── ...
        └── types/
            ├── auth.ts              ← Definición de perfiles y tokens
            ├── reportes.ts          ← Estructuras de datos para analíticas
            └── ...
```

---

## Base de datos — 20 tablas normalizadas (3FN)

El almacenamiento cumple estrictamente con la **Tercera Forma Normal (3FN)** para garantizar la integridad y evitar redundancias. Cuenta con las siguientes tablas:

### 🗂️ Catálogos de Sistema
1. `usuarios`: Cuentas de acceso al sistema con roles (`PROPIETARIA`, `OPERARIO`).
2. `tipos_cliente`: Perfiles de clientes (`EMPRESA`, `PERSONA_NATURAL`, etc.).
3. `estados_orden`: Estados del ciclo de vida de una orden (`PENDIENTE`, `EN_PROCESO`, `COMPLETADA`).
4. `composiciones_fibra`: Fibras textiles soportadas y número de baños que requieren.
5. `articulos_textiles`: Catálogo de tipos de tela, avíos o prendas.
6. `unidades_medida`: Magnitudes de los lotes (`METROS`, `KILOS`, `PIEZAS`).
7. `colorantes_catalogo`: Insumos de tintura cargados en el almacén.
8. `tipos_incidencia`: Clasificación de fallos en el teñido.
9. `fases_proceso`: Fases secuenciales del proceso químico.
10. `tipos_reporte`: Categorías de analítica del sistema.

### 🏭 Tablas Operativas y de Movimiento
11. `clientes`: Información de contacto y facturación.
12. `ordenes_compra`: Cabecera de solicitudes de teñido.
13. `detalles_orden`: Lotes asociados a una Orden de Compra.
14. `recetas_tecnicas`: Parámetros físicos, baños calculados y color analizado por lote.
15. `colorantes_formula`: Proporciones exactas de colorante en cada receta.
16. `notas_entrega`: Registros de despacho y entrega a clientes.
17. `bitacora_estados`: Historial inmutable de movimientos de estado de las órdenes.
18. `incidencias_proceso`: Bitácora de fallas técnicas presentadas.
19. `plantillas_receta`: Recetas base guardadas para reutilización rápida.
20. `colorantes_plantilla`: Colorantes definidos en una plantilla.
21. `reportes_generados`: Historial inmutable de snapshots de reportes emitidos.

---

## API REST — Nuevos Endpoints Protegidos

Todos los nuevos endpoints requieren una cabecera `Authorization: Bearer <JWT_TOKEN>` para validar la identidad y el rol.

### Autenticación — `/api/auth`
*   `POST /api/auth/login`: Verifica credenciales y devuelve el perfil del usuario junto con un token JWT firmado de 8 horas.
*   `GET /api/auth/perfil`: Retorna el perfil del usuario firmado en el token (nombre, rol y correo).

### Reportes Generales — `/api/reportes` (Exclusivo Propietaria)
*   `GET /api/reportes/consumo-colorantes`: Obtiene el consumo acumulado en gramos y kilogramos de colorantes.
*   `GET /api/reportes/fidelidad-clientes`: Retorna el ranking de actividad y volumen de metros teñidos por cliente.
*   `GET /api/reportes/produccion-temporal?agrupacion=mes|trimestre|año`: Obtiene la producción de metros teñidos según el período indicado.

---

## Instalación y Configuración Local

### Requisitos previos
- Node.js ≥ 18
- Base de datos PostgreSQL activa

### Configuración del Servidor (Backend)
1. Ingresa a la carpeta del servidor:
   ```bash
   cd backend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Crea tu archivo de variables de entorno `.env` basándote en `.env.example`:
   ```env
   PORT=3000
   DATABASE_URL="postgresql://USUARIO:PASSWORD@HOST.render.com/servitex_db?sslmode=require"
   JWT_SECRET="un_secreto_largo_y_seguro_para_los_tokens_de_servitex_2026"
   FRONTEND_URL=http://localhost:5173
   ```
4. Aplica las migraciones de Prisma y ejecuta la semilla:
   ```bash
   npx prisma db push
   npx ts-node prisma/seed.ts
   npx ts-node prisma/fix-tipos-reporte.ts
   ```
5. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

### Configuración de la Interfaz (Frontend)
1. Abre una segunda terminal e ingresa al frontend:
   ```bash
   cd frontend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Crea un archivo `.env` en la raíz de `frontend` (opcional si deseas conectarte a una API de producción):
   ```env
   VITE_API_URL=http://localhost:3000
   ```
4. Inicia el servidor Vite:
   ```bash
   npm run dev
   ```
5. Abre en tu navegador la dirección http://localhost:5173 e inicia sesión.
