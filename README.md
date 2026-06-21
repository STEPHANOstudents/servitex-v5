# SERVITEX — Sistema de Gestión para Tintorería Textil

> **¿Qué es Servitex?**
> Servitex es una aplicación web que digitaliza y automatiza las operaciones de una tintorería textil. Reemplaza el uso de hojas de cálculo y papel para dos tareas clave:
> 1. Registrar **Órdenes de Compra** (qué se va a teñir, para quién y a qué precio).
> 2. Generar **Recetas Técnicas de Teñido** (qué productos químicos usar, en qué cantidad y en qué secuencia de baños).

🌐 **Demo en vivo:** https://servitex.onrender.com
🔗 **API Backend:** https://servitex-backend.onrender.com/api/health
📦 **Repositorio:** https://github.com/STEPHANOstudents/servitex-v5

---

## ¿Para quién es este sistema?

| Usuario | Qué hace en el sistema |
|---|---|
| **Administrador / Vendedor** | Crea Órdenes de Compra, registra clientes, cambia estados y consulta la liquidación financiera |
| **Técnico de Laboratorio** | Crea Recetas Técnicas; el sistema calcula automáticamente todos los baños y gramos de cada producto |

---

## ¿Cómo funciona? (Flujo de uso)

```
1. El cliente llega con artículos textiles para teñir
         │
         ▼
2. Se crea una Orden de Compra (OC)
   → Número de OC, nombre del cliente, tipo de cliente
   → Se agregan lotes: artículo, color, cantidad, precio
   → El sistema calcula subtotal, IGV y total automáticamente
         │
         ▼
3. La OC avanza por estados: PENDIENTE → EN_PROCESO → COMPLETADA
   → Cada cambio queda registrado en la bitácora automáticamente
         │
         ▼
4. El técnico crea la Receta Técnica para cada lote
   → Ingresa: peso, tipo de fibra, relación de baño y colorantes
   → El Motor Químico calcula: litros, gramos y secuencia de baños
         │
         ▼
5. El técnico ejecuta los baños siguiendo la receta generada
6. Se puede ver el historial y copiar recetas como base para nuevas fórmulas
```

---

## Tecnologías utilizadas

| Capa | Tecnología | Para qué sirve |
|---|---|---|
| **Frontend** | React 19 + TypeScript + Vite | La pantalla que ve el usuario |
| **Estilos** | CSS puro + Google Fonts Inter | Diseño visual limpio y responsivo |
| **Backend** | Node.js + Express 5 + TypeScript | Servidor que procesa peticiones y lógica de negocio |
| **ORM** | Prisma 7 + `@prisma/adapter-pg` | Conecta el código con la base de datos |
| **Base de Datos** | PostgreSQL 16 | Almacenamiento persistente de todos los datos |
| **Deploy Frontend** | Render Static Site | Hospeda los archivos HTML/CSS/JS |
| **Deploy Backend** | Render Web Service | Hospeda el servidor Node.js |
| **Control de versiones** | Git + GitHub | Historial de cambios y colaboración |

---

## Estructura del proyecto

```
Servitex/
├── backend/                         ← Servidor Node.js + API REST
│   ├── prisma/
│   │   ├── schema.prisma            ← Define las 20 tablas de la base de datos
│   │   └── seed.ts                  ← Puebla los catálogos iniciales (colorantes, fibras, etc.)
│   ├── src/
│   │   ├── server.ts                ← Punto de entrada: configura Express, CORS y rutas
│   │   ├── controllers/             ← Reciben la petición HTTP y devuelven la respuesta
│   │   ├── services/                ← Contienen la lógica de negocio y acceso a BD
│   │   ├── routes/                  ← Definen las URLs de la API
│   │   ├── engines/
│   │   │   └── quimico.engine.ts    ← ⭐ Motor Químico: calcula litros, gramos y baños
│   │   ├── validators/              ← Validan que los datos de entrada sean correctos
│   │   ├── types/                   ← Interfaces TypeScript
│   │   └── lib/
│   │       ├── prisma.ts            ← Instancia compartida del cliente de base de datos
│   │       └── catalogos.cache.ts   ← Caché en memoria para evitar consultas repetidas
│   ├── .env.example                 ← Plantilla de variables de entorno
│   └── prisma.config.ts             ← Configuración de Prisma v7
│
└── frontend/                        ← Aplicación React
    └── src/
        ├── App.tsx                  ← Navegación entre pestañas y estado global
        ├── index.css                ← Estilos globales
        ├── lab.css                  ← Estilos del módulo Laboratorio
        ├── components/              ← Componentes visuales (formularios, tableros, modales)
        ├── services/                ← Funciones para llamar a la API
        └── types/                   ← Tipos TypeScript del proyecto
```

---

## Base de datos — 20 tablas normalizadas (3FN)

La base de datos está diseñada en **Tercera Forma Normal (3FN)**: cada valor se guarda en un solo lugar y se relaciona mediante claves foráneas (FK). Se divide en **9 tablas de catálogo** (valores fijos que puebla el seed) y **11 tablas operativas** (datos reales del negocio).

---

### 🗂️ Tablas de Catálogo (9 tablas)

Estas tablas contienen valores de referencia. El usuario no las edita directamente; se pueblan automáticamente con el comando `seed`.

---

#### 1. `tipos_cliente`
Tipos de cliente válidos en el sistema.

| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `codigo` | VARCHAR(30) | ✅ UNIQUE | Clave interna. Ej: `EMPRESA`, `PERSONA_NATURAL`, `TALLER_EXTERNO`, `DISTRIBUIDOR` |
| `etiqueta` | VARCHAR(100) | ✅ | Texto legible para mostrar en pantalla |
| `descripcion` | VARCHAR(300) | ❌ | Descripción opcional |

---

#### 2. `estados_orden`
Estados del ciclo de vida de una Orden de Compra.

| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `codigo` | VARCHAR(30) | ✅ UNIQUE | Clave interna. Ej: `PENDIENTE`, `EN_PROCESO`, `COMPLETADA`, `ANULADA` |
| `etiqueta` | VARCHAR(100) | ✅ | Texto legible |
| `descripcion` | VARCHAR(300) | ❌ | Descripción opcional |
| `es_estado_final` | BOOLEAN | ✅ (default: false) | `true` si es un estado terminal (no se puede cambiar luego) |

---

#### 3. `composiciones_fibra`
Tipos de fibra textil. Determina qué ruta sigue el Motor Químico.

| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `codigo` | VARCHAR(50) | ✅ UNIQUE | Ej: `ALGODON`, `NYLON`, `POLIESTER`, `MULTIFIBRA_ALGODON_NYLON` |
| `etiqueta` | VARCHAR(150) | ✅ | Texto legible |
| `total_banos` | INT | ✅ | Número de baños que genera el Motor Químico (4, 7 o 9) |
| `descripcion_ruta` | VARCHAR(300) | ❌ | Descripción del proceso de teñido |

---

#### 4. `articulos_textiles`
Artículos que puede procesar el taller.

| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `nombre` | VARCHAR(150) | ✅ UNIQUE | Ej: `Avío`, `Prenda`, `Hilo`, `Tela cruda`, `Cierre` |
| `descripcion` | VARCHAR(300) | ❌ | Descripción opcional |
| `activo` | BOOLEAN | ✅ (default: true) | Permite desactivar artículos sin borrarlos |

---

#### 5. `unidades_medida`
Unidades de los lotes de teñido.

| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `codigo` | VARCHAR(20) | ✅ UNIQUE | Ej: `METROS`, `KILOS`, `PIEZAS` |
| `simbolo` | VARCHAR(10) | ✅ | Ej: `m`, `kg`, `pza` |
| `etiqueta` | VARCHAR(100) | ✅ | Texto legible |

---

#### 6. `colorantes_catalogo`
Catálogo maestro de los 27 colorantes disponibles en el taller.

| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `nombre` | VARCHAR(200) | ✅ UNIQUE | Ej: `Ramazol Yellow`, `Acid Blue 113` |
| `tipo_colorante` | VARCHAR(50) | ✅ (default: `REACTIVO`) | `REACTIVO`, `ACIDO` o `DISPERSO` |
| `activo` | BOOLEAN | ✅ (default: true) | Permite desactivar sin borrar |
| `created_at` | TIMESTAMP | ✅ (default: now) | Fecha de registro |

---

#### 7. `tipos_incidencia`
Tipos de problemas que pueden ocurrir durante el teñido.

| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `codigo` | VARCHAR(30) | ✅ UNIQUE | Ej: `COLOR_FUERA_RANGO`, `REPROCESO`, `DAÑO_ARTICULO` |
| `etiqueta` | VARCHAR(150) | ✅ | Texto legible |
| `descripcion` | VARCHAR(300) | ❌ | Descripción opcional |

---

#### 8. `fases_proceso`
Fases del proceso de teñido generadas por el Motor Químico.

| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `codigo` | VARCHAR(30) | ✅ UNIQUE | Ej: `PREBLANQUEO`, `TENIDO`, `TENIDO_ALGODON`, `ACABADO` |
| `etiqueta` | VARCHAR(150) | ✅ | Texto legible |
| `orden` | INT | ✅ | Posición de la fase en el proceso |
| `descripcion` | VARCHAR(300) | ❌ | Descripción opcional |

---

#### 9. `tipos_reporte`
Tipos de reportes disponibles en el sistema.

| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `codigo` | VARCHAR(50) | ✅ UNIQUE | Ej: `ORDENES_POR_PERIODO`, `INGRESOS_POR_CLIENTE` |
| `etiqueta` | VARCHAR(200) | ✅ | Texto legible |
| `descripcion` | VARCHAR(300) | ❌ | Descripción opcional |

---

### 🏭 Tablas Operativas (11 tablas)

Estas tablas contienen los datos reales del negocio que genera el uso diario de la aplicación.

---

#### 10. `clientes`
Maestro de clientes del taller.

| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `nombre` | VARCHAR(200) | ✅ | Nombre del cliente |
| `tipo_cliente_id` | INT | ✅ FK → `tipos_cliente` | Tipo de cliente |
| `ruc` | VARCHAR(11) | ❌ UNIQUE | RUC del cliente (opcional) |
| `telefono` | VARCHAR(15) | ❌ | Teléfono de contacto |
| `correo` | VARCHAR(150) | ❌ | Correo electrónico |
| `direccion` | VARCHAR(300) | ❌ | Dirección |
| `created_at` | TIMESTAMP | ✅ (default: now) | Fecha de creación |
| `updated_at` | TIMESTAMP | ✅ (auto) | Última modificación |

> **Regla:** No pueden existir dos clientes con el mismo `nombre` y `tipo_cliente_id` al mismo tiempo.

---

#### 11. `ordenes_compra`
Cabecera de cada pedido comercial recibido.

| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `numero_oc` | VARCHAR(50) | ✅ UNIQUE | Número de la orden. Ej: `OC-2026-001` |
| `cliente_id` | INT | ✅ FK → `clientes` | Cliente que hizo el pedido |
| `estado_id` | INT | ✅ FK → `estados_orden` | Estado actual de la OC |
| `observaciones` | TEXT | ❌ | Notas adicionales |
| `created_at` | TIMESTAMP | ✅ (default: now) | Fecha de creación |
| `updated_at` | TIMESTAMP | ✅ (auto) | Última modificación |

---

#### 12. `detalles_orden`
Cada lote individual de artículos dentro de una OC.

| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `orden_compra_id` | INT | ✅ FK → `ordenes_compra` (CASCADE) | OC a la que pertenece |
| `articulo_id` | INT | ✅ FK → `articulos_textiles` | Artículo a teñir |
| `unidad_medida_id` | INT | ✅ FK → `unidades_medida` | Unidad del lote |
| `cantidad` | FLOAT | ✅ | Cantidad del lote (metros, kilos o piezas) |
| `color_solicitado` | VARCHAR(150) | ✅ | Color pedido por el cliente. Ej: `Azul Navy` |
| `precio_por_metro` | FLOAT | ✅ | Precio unitario del servicio |
| `total` | FLOAT | ✅ | `cantidad × precio_por_metro` (calculado automáticamente) |
| `created_at` | TIMESTAMP | ✅ (default: now) | Fecha de creación |
| `updated_at` | TIMESTAMP | ✅ (auto) | Última modificación |

> **CASCADE:** Si se elimina la OC, se eliminan automáticamente todos sus detalles.

---

#### 13. `recetas_tecnicas`
Formulario técnico de laboratorio para un lote. Relación 1:1 con `detalles_orden`.

| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `detalle_orden_id` | INT | ✅ FK → `detalles_orden` (UNIQUE, CASCADE) | Lote al que pertenece (1 receta por lote) |
| `plantilla_id` | INT | ❌ FK → `plantillas_receta` (SetNull) | Plantilla base usada (si se copió de una existente) |
| `articulo_id` | INT | ✅ FK → `articulos_textiles` | Artículo textil a teñir |
| `composicion_fibra_id` | INT | ✅ FK → `composiciones_fibra` | Tipo de fibra (determina la ruta del Motor Químico) |
| `peso_real_kg` | FLOAT | ✅ | Peso real del lote en kg |
| `relacion_bano` | FLOAT | ✅ | Relación de baño en L/kg. Ej: `40` |
| `litros_agua` | FLOAT | ✅ | `peso_real_kg × relacion_bano` — calculado por el Motor Químico |
| `descripcion_color` | VARCHAR(200) | ✅ | Nombre o código del color a lograr |
| `nivel_intensidad` | FLOAT | ✅ | `1.0` Pastel / `2.0` Claro / `3.0` Intermedio / `4.0` Intenso |
| `observaciones_tecnicas` | TEXT | ❌ | Notas técnicas adicionales |
| `estado` | VARCHAR(30) | ✅ (default: `FORMULACION`) | Estado de la receta |
| `secuencia_banos` | JSON | ❌ | Resultado completo del Motor Químico (todos los baños con litros y gramos) |
| `iteraciones` | JSON | ❌ (default: `[]`) | Historial de ajustes y versiones de la receta |
| `created_at` | TIMESTAMP | ✅ (default: now) | Fecha de creación |
| `updated_at` | TIMESTAMP | ✅ (auto) | Última modificación |

---

#### 14. `colorantes_formula`
Cada colorante individual y su porcentaje dentro de una receta.

| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `receta_tecnica_id` | INT | ✅ FK → `recetas_tecnicas` (CASCADE) | Receta a la que pertenece |
| `colorante_id` | INT | ✅ FK → `colorantes_catalogo` | Colorante del catálogo |
| `porcentaje` | FLOAT | ✅ | % de concentración del colorante en la fórmula |
| `created_at` | TIMESTAMP | ✅ (default: now) | Fecha de creación |
| `updated_at` | TIMESTAMP | ✅ (auto) | Última modificación |

---

#### 15. `notas_entrega`
Registro de entrega de una OC al cliente. Relación 1:1 con `ordenes_compra`.

| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `orden_compra_id` | INT | ✅ FK → `ordenes_compra` (UNIQUE) | OC entregada (1 nota por OC) |
| `estado` | VARCHAR(20) | ✅ (default: `PENDIENTE`) | Estado de la entrega |
| `receptor_nombre` | VARCHAR(200) | ✅ | Nombre de la persona que recibe |
| `fecha_entrega` | TIMESTAMP | ❌ | Fecha y hora real de entrega |
| `observaciones` | TEXT | ❌ | Notas de la entrega |
| `created_at` | TIMESTAMP | ✅ (default: now) | Fecha de creación |
| `updated_at` | TIMESTAMP | ✅ (auto) | Última modificación |

---

#### 16. `bitacora_estados`
Log inmutable de cada cambio de estado de una OC. Solo se inserta, nunca se modifica.

| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `orden_compra_id` | INT | ✅ FK → `ordenes_compra` (CASCADE) | OC que cambió de estado |
| `estado_anterior_id` | INT | ✅ FK → `estados_orden` | Estado **desde** el que salió la OC |
| `estado_nuevo_id` | INT | ✅ FK → `estados_orden` | Estado **al que** pasó la OC |
| `observacion` | VARCHAR(300) | ❌ | Comentario o motivo del cambio |
| `changed_at` | TIMESTAMP | ✅ (default: now) | Fecha y hora exacta del cambio |

> **Ejemplo de registros:**
> | id | orden_compra_id | estado_anterior | estado_nuevo | changed_at |
> |---|---|---|---|---|
> | 1 | 12 | PENDIENTE | EN_PROCESO | 2026-06-20 09:00 |
> | 2 | 12 | EN_PROCESO | COMPLETADA | 2026-06-20 16:45 |

---

#### 17. `incidencias_proceso`
Registro de problemas ocurridos durante el teñido de un lote.

| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `detalle_orden_id` | INT | ✅ FK → `detalles_orden` (CASCADE) | Lote donde ocurrió el problema |
| `tipo_incidencia_id` | INT | ✅ FK → `tipos_incidencia` | Tipo de problema registrado |
| `descripcion` | TEXT | ✅ | Descripción detallada del problema |
| `accion_tomada` | TEXT | ❌ | Qué se hizo para resolverlo |
| `resuelta` | BOOLEAN | ✅ (default: false) | ¿Se resolvió el problema? |
| `created_at` | TIMESTAMP | ✅ (default: now) | Fecha de registro |
| `updated_at` | TIMESTAMP | ✅ (auto) | Última modificación |

---

#### 18. `plantillas_receta`
Fórmulas de color reutilizables guardadas por el laboratorio.

| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `nombre_plantilla` | VARCHAR(200) | ✅ UNIQUE | Nombre descriptivo. Ej: `Azul Navy Algodón Intenso` |
| `composicion_fibra_id` | INT | ✅ FK → `composiciones_fibra` | Tipo de fibra de la plantilla |
| `relacion_bano` | FLOAT | ✅ | Relación de baño estándar de la plantilla |
| `descripcion_color` | VARCHAR(200) | ✅ | Color de referencia |
| `activa` | BOOLEAN | ✅ (default: true) | Permite desactivar sin borrar |
| `created_at` | TIMESTAMP | ✅ (default: now) | Fecha de creación |
| `updated_at` | TIMESTAMP | ✅ (auto) | Última modificación |

---

#### 19. `colorantes_plantilla`
Colorantes y porcentajes que componen una plantilla de receta.

| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `plantilla_id` | INT | ✅ FK → `plantillas_receta` (CASCADE) | Plantilla a la que pertenece |
| `colorante_id` | INT | ✅ FK → `colorantes_catalogo` | Colorante del catálogo |
| `porcentaje` | FLOAT | ✅ | % de concentración del colorante |

---

#### 20. `reportes_generados`
Snapshot de reportes generados. No tiene relaciones de salida hacia otras tablas operativas.

| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `tipo_reporte_id` | INT | ✅ FK → `tipos_reporte` | Tipo de reporte generado |
| `fecha_desde` | TIMESTAMP | ✅ | Inicio del período analizado |
| `fecha_hasta` | TIMESTAMP | ✅ | Fin del período analizado |
| `resumen_json` | JSON | ✅ | Datos del reporte en formato JSON |
| `generado_en` | TIMESTAMP | ✅ (default: now) | Fecha y hora en que se generó |

---

## Mapa de relaciones entre tablas

```
tipos_cliente ──FK──► clientes ──FK──► ordenes_compra ──FK──► estados_orden
                          │                  │ 1:N                │
                          │                  │                    │ (antes/después)
                          │                  ▼                    ▼
                          │          detalles_orden        bitacora_estados
                          │               │ 1:N
                          │               ├──FK──► articulos_textiles
                          │               ├──FK──► unidades_medida
                          │               │
                          │               ├──── recetas_tecnicas ──FK──► composiciones_fibra
                          │               │          │ 1:N               plantillas_receta
                          │               │          └──── colorantes_formula ──FK──► colorantes_catalogo
                          │               │
                          │               ├──── incidencias_proceso ──FK──► tipos_incidencia
                          │               │
                          └──── notas_entrega

plantillas_receta ──FK──► colorantes_plantilla ──FK──► colorantes_catalogo
tipos_reporte ──FK──► reportes_generados
fases_proceso (tabla independiente — usada por el Motor Químico internamente)
```

---

## ⭐ Motor Químico — Cómo funciona

El Motor Químico (`quimico.engine.ts`) es el componente más importante del backend. Dado el **peso del artículo** y el **tipo de fibra**, calcula automáticamente toda la secuencia de baños.

### Fórmulas base

```
litros por baño  =  peso_real_kg  ×  relación_de_baño
gramos de químico  =  concentración (g/L)  ×  litros_de_agua
```

**Ejemplo:** Artículo de 2.5 kg, relación de baño 40 → **100 litros por baño**
La Potasa Cáustica tiene concentración 3.0 g/L → **300 gramos**

### Nivel de intensidad del color

Se suma el porcentaje de todos los colorantes de la fórmula:

| Suma de % de colorantes | Nivel | Color | Sal Industrial | Potasa Cáustica |
|---|---|---|---|---|
| ≤ 0.01% | 1 | Pasteles | 10 g/L | 3 g/L |
| 0.01% – 0.1% | 2 | Claros | 20 g/L | 3 g/L |
| 0.1% – 1.0% | 3 | Intermedios | 40 g/L | 4 g/L |
| > 1.0% | 4 | Intensos | 80 g/L | 5 g/L |

### Secuencias de baños por tipo de fibra

| Fibra | Total de baños | Resumen del proceso |
|---|---|---|
| **Algodón** | 9 baños | 4 de Preblanqueo + 5 de Teñido y Acabado |
| **Nylon** | 4 baños | Teñido directo con ácido acético + Acabado |
| **Poliéster** | 4 baños | Misma ruta que Nylon |
| **Multifibra Algodón + Nylon** | 7 baños | Teñido Algodón → Teñido Nylon → Acabado |
| **Multifibra Algodón + Poliéster** | 7 baños | Teñido Algodón → Teñido Poliéster → Acabado |
| **Multifibra Nylon + Poliéster** | 7 baños | Teñido Poliéster → Teñido Nylon → Acabado |

> **Regla especial en multifibras:** Cuando se combina Algodón con un sintético, el baño de Neutralizado del Algodón se elimina porque el Ácido Acético del baño sintético ya cumple esa función.

---

## API REST — Endpoints

### `GET /api/health`
Verifica que el servidor esté funcionando.

### `GET /api/catalogos`
Devuelve los 9 catálogos en una sola llamada (para poblar los formularios del frontend).

### Órdenes de Compra — `/api/ordenes`

| Método | Endpoint | Qué hace |
|---|---|---|
| `POST` | `/api/ordenes` | Crea una OC completa (cabecera + lotes en transacción atómica) |
| `GET` | `/api/ordenes` | Lista todas las OC con paginación |
| `GET` | `/api/ordenes/:id` | Detalle de una OC con liquidación financiera |
| `PATCH` | `/api/ordenes/:id/estado` | Cambia el estado operativo de la OC |

### Recetas Técnicas — `/api/recetas`

| Método | Endpoint | Qué hace |
|---|---|---|
| `POST` | `/api/recetas` | Crea receta y ejecuta el Motor Químico |
| `GET` | `/api/recetas` | Lista el historial de recetas |
| `GET` | `/api/recetas/:id` | Detalle con todos los baños y gramos calculados |

### Formato estándar de respuesta
```json
{
  "success": true,
  "message": "Descripción del resultado",
  "data": { "...": "..." },
  "timestamp": "2026-06-20T14:00:00.000Z"
}
```

---

## Arquitectura de comunicación

```
PRODUCCIÓN
  Usuario → [servitex.onrender.com] ──fetch──► [servitex-backend.onrender.com]
               React SPA (estática)                Express API (Node.js)
                                                          │
                                               [PostgreSQL 16 en Render]

DESARROLLO LOCAL
  http://localhost:5173 ──proxy /api──► http://localhost:3000
  (Vite dev server)                     (Express + ts-node)
                                                  │
                                       [PostgreSQL de Render vía SSL]
```

> El proxy de Vite redirige automáticamente `/api/*` al backend local. No hay que cambiar URLs entre entornos.

---

## Variables de entorno

### Backend — `backend/.env`
```env
PORT=3000
DATABASE_URL="postgresql://USUARIO:PASSWORD@HOST.render.com/servitex_db?sslmode=require"
NODE_ENV=development
FRONTEND_URL=https://servitex.onrender.com
```

### Frontend — `frontend/.env` (solo si apuntas a producción desde local)
```env
VITE_API_URL=https://servitex-backend.onrender.com
```

---

## Instalación y ejecución local

### Requisitos
- Node.js ≥ 18
- npm ≥ 9
- Credenciales de la base de datos PostgreSQL de Render

### Paso 1 — Clonar el repositorio
```bash
git clone https://github.com/STEPHANOstudents/servitex-v5.git
cd servitex-v5
```

### Paso 2 — Configurar el Backend
```bash
cd backend
npm install
cp .env.example .env
# Editar .env con las credenciales reales
```

**Primera vez — aplicar schema y poblar catálogos:**
```bash
# ⚠️ --force-reset elimina todos los datos existentes
npx prisma db push --force-reset --config prisma.config.ts
npx ts-node prisma/seed.ts
```

**Iniciar el servidor:**
```bash
npm run dev
# ✅ http://localhost:3000/api/health debe responder OK
```

### Paso 3 — Configurar el Frontend (segunda terminal)
```bash
cd frontend
npm install
npm run dev
# ✅ http://localhost:5173
```

---

## Comandos de referencia rápida

### Backend
```bash
npm run dev              # Servidor en modo desarrollo
npm run build            # Compila TypeScript → dist/
npm start                # Ejecuta el build compilado
npm run seed             # Puebla los catálogos
npm run prisma:generate  # Regenera el cliente Prisma
npm run prisma:studio    # Interfaz visual de la BD
```

### Frontend
```bash
npm run dev      # Servidor Vite en localhost:5173
npm run build    # Build de producción → dist/
npm run preview  # Vista previa del build
npm run lint     # Revisión de código con ESLint
```

---

## Deploy en Render

El proyecto usa 3 servicios en Render:

### 1. PostgreSQL Database — `servitex_db`
- Plan Free, PostgreSQL 16, región Oregon

### 2. Web Service (Backend) — `servitex-backend`
| Config | Valor |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |

Variables de entorno:
```
DATABASE_URL  = <External Database URL de Render>
NODE_ENV      = production
FRONTEND_URL  = https://servitex.onrender.com
```

### 3. Static Site (Frontend) — `servitex`
| Config | Valor |
|---|---|
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

Variables de entorno:
```
VITE_API_URL = https://servitex-backend.onrender.com
```

---

## Notas técnicas para desarrolladores

- **Prisma v7** usa `prisma.config.ts` como archivo declarativo. La URL de PostgreSQL se configura en el adaptador `@prisma/adapter-pg`, no en el `schema.prisma`.
- **El build del backend** ejecuta `prisma generate && tsc`. Esto regenera el cliente Prisma en cada deploy.
- **Caché de catálogos:** `catalogos.cache.ts` carga los IDs de catálogo en memoria al arrancar el servidor para evitar consultas repetidas.
- **Motor Químico sin enums:** `quimico.engine.ts` recibe el código de fibra como `string` (`'ALGODON'`, `'NYLON'`…), lo que lo hace independiente de los tipos generados por Prisma.
- **SPA en Render:** `frontend/public/_redirects` contiene `/* /index.html 200`. Sin esto, recargar cualquier ruta en el navegador devuelve 404.
- **`--force-reset` solo en desarrollo.** En producción real con datos reales, usar `prisma migrate deploy`.

---

## Funcionalidades implementadas

### Módulo 1 — Órdenes de Compra
- ✅ Registro de OC con número, cliente, tipo y observaciones
- ✅ Tabla dinámica de lotes con cálculo en tiempo real (subtotal, IGV 18%, total)
- ✅ Validación en frontend y backend
- ✅ Tablero de órdenes con estado visible
- ✅ Modal de liquidación financiera detallada
- ✅ Cambio de estado operativo con bitácora automática

### Módulo 2 — Laboratorio / Recetas Técnicas
- ✅ Formulario técnico con catálogos cargados desde la API
- ✅ Motor Químico automático (litros, gramos, secuencia de baños)
- ✅ Nivel de intensidad calculado automáticamente
- ✅ Historial de recetas en grid de tarjetas
- ✅ Modal con desglose completo por baño
- ✅ Función "Copiar como base" para reutilizar fórmulas

### Diseño
- ✅ Tema claro profesional (blanco, grises, acento teal)
- ✅ Tipografía Inter (Google Fonts)
- ✅ Responsivo: móvil, tablet y escritorio
- ✅ Animaciones y notificaciones toast

---

Proyecto académico — **Sistemas de Información**
📦 https://github.com/STEPHANOstudents/servitex-v5
