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
   → Preview en tiempo real de los baños (antes de guardar)
   → El Motor Químico calcula: litros, gramos y secuencia de baños
         │
         ▼
5. El técnico ejecuta los baños siguiendo la receta generada
6. Puede analizar el color resultante con la cámara o subiendo una foto
7. Se puede copiar una receta como base para nuevas fórmulas
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

## Funcionalidades del sistema

### Módulo 1 — Órdenes de Compra

- ✅ Registro de OC con número, cliente, tipo y observaciones
- ✅ Tabla dinámica de lotes con cálculo en tiempo real (subtotal, IGV 18%, total)
- ✅ Validación en frontend y backend
- ✅ Tablero de órdenes con estado visible en colores
- ✅ Modal de liquidación financiera detallada
- ✅ Cambio de estado operativo con bitácora automática de cada transición

### Módulo 2 — Laboratorio / Recetas Técnicas

- ✅ Formulario técnico con catálogos cargados desde la API
- ✅ **Preview de baños en tiempo real** — muestra la secuencia química completa mientras el técnico llena el formulario, antes de guardar
- ✅ Motor Químico automático al guardar (litros, gramos y secuencia de baños)
- ✅ Nivel de intensidad calculado automáticamente según la suma de porcentajes de colorantes
- ✅ **Análisis de color por imagen o cámara** — el técnico puede fotografiar el artículo teñido y el sistema extrae el color dominante (HEX + RGB)
- ✅ **Tablero de recetas con expansión inline** — al hacer clic en una carta se despliega el detalle de colorantes y opciones sin abrir un modal
- ✅ **Buscador de recetas** por color, artículo o cliente
- ✅ **Filtro por tipo de fibra** (Todos / Algodón / Nylon / Poliéster / Multifibra)
- ✅ Modal completo con desglose de todos los baños y resumen consolidado de gramos
- ✅ Historial de ajustes (iteraciones) de una receta con trazabilidad completa
- ✅ Función "Copiar como base" para reutilizar fórmulas anteriores

### Diseño y UX

- ✅ Tema claro profesional (blanco, grises suaves, acento teal/púrpura)
- ✅ Tipografía Inter (Google Fonts)
- ✅ Diseño responsivo: móvil, tablet y escritorio
- ✅ Animaciones y micro-interacciones en hover y transiciones
- ✅ Notificaciones toast (éxito / error) en todas las acciones

---

## Estructura del proyecto

```
Servitex/
├── backend/                         ← Servidor Node.js + API REST
│   ├── prisma/
│   │   ├── schema.prisma            ← Define las 20 tablas de la base de datos
│   │   ├── seed.ts                  ← Puebla los catálogos iniciales (colorantes, fibras, etc.)
│   │   └── reset-db.ts              ← Script para resetear la BD en desarrollo
│   ├── src/
│   │   ├── server.ts                ← Punto de entrada: Express, CORS y rutas
│   │   ├── controllers/             ← Reciben la petición HTTP y devuelven la respuesta
│   │   │   ├── catalogos.controller.ts
│   │   │   ├── ordenes.controller.ts
│   │   │   ├── recetas.controller.ts
│   │   │   ├── clientes.controller.ts
│   │   │   └── color.controller.ts  ← Análisis de color por imagen (HEX + RGB)
│   │   ├── services/                ← Lógica de negocio y acceso a BD
│   │   │   ├── catalogos.service.ts
│   │   │   ├── ordenes.service.ts
│   │   │   ├── recetas.service.ts
│   │   │   └── clientes.service.ts
│   │   ├── routes/                  ← Definen las URLs de la API
│   │   │   ├── catalogos.routes.ts  →  GET  /api/catalogos
│   │   │   ├── ordenes.routes.ts    →  CRUD /api/ordenes
│   │   │   ├── recetas.routes.ts    →  CRUD /api/recetas
│   │   │   ├── clientes.routes.ts   →  CRUD /api/clientes
│   │   │   └── color.routes.ts      →  POST /api/color/analizar
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
        ├── index.css                ← Estilos globales (tema claro, variables CSS)
        ├── lab.css                  ← Estilos del módulo Laboratorio
        ├── components/
        │   ├── FormularioOrden.tsx   ← Formulario para crear una Orden de Compra
        │   ├── FilaDetalle.tsx       ← Fila dinámica de lotes dentro del formulario
        │   ├── TableroControl.tsx    ← Tablero de Órdenes de Compra
        │   ├── ModalFinanciero.tsx   ← Liquidación financiera de una OC
        │   ├── FormularioReceta.tsx  ← Formulario técnico + preview de baños en tiempo real
        │   ├── TableroRecetas.tsx    ← Historial de Recetas con búsqueda, filtros y expansión inline
        │   ├── ModalDetalleReceta.tsx← Desglose completo + análisis de color por cámara/imagen
        │   └── LotesProceso.tsx     ← Vista de lotes en estado de formulación o proceso
        ├── services/
        │   ├── api.ts               ← Funciones HTTP para el módulo de Órdenes
        │   ├── recetasApi.ts        ← Funciones HTTP para el módulo de Recetas
        │   └── catalogosApi.ts      ← Función HTTP para obtener los catálogos
        └── types/
            ├── ordenes.ts           ← Tipos TypeScript del módulo de Órdenes
            └── recetas.ts           ← Tipos TypeScript del módulo de Recetas y Motor Químico
```

---

## Base de datos — 20 tablas normalizadas (3FN)

La base de datos está diseñada en **Tercera Forma Normal (3FN)**: cada valor se guarda en un solo lugar y se relaciona mediante claves foráneas (FK). Se divide en **9 tablas de catálogo** (valores fijos que puebla el seed) y **11 tablas operativas** (datos reales del negocio).

---

### 🗂️ Tablas de Catálogo (9 tablas)

Estas tablas contienen valores de referencia. El usuario no las edita directamente; se pueblan automáticamente con el comando `seed`.

---

#### 1. `tipos_cliente`
| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `codigo` | VARCHAR(30) | ✅ UNIQUE | Ej: `EMPRESA`, `PERSONA_NATURAL`, `TALLER_EXTERNO`, `DISTRIBUIDOR` |
| `etiqueta` | VARCHAR(100) | ✅ | Texto legible para mostrar en pantalla |
| `descripcion` | VARCHAR(300) | ❌ | Descripción opcional |

---

#### 2. `estados_orden`
| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `codigo` | VARCHAR(30) | ✅ UNIQUE | Ej: `PENDIENTE`, `EN_PROCESO`, `COMPLETADA`, `ANULADA` |
| `etiqueta` | VARCHAR(100) | ✅ | Texto legible |
| `descripcion` | VARCHAR(300) | ❌ | Descripción opcional |
| `es_estado_final` | BOOLEAN | ✅ (default: false) | `true` si es un estado terminal |

---

#### 3. `composiciones_fibra`
| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `codigo` | VARCHAR(50) | ✅ UNIQUE | Ej: `ALGODON`, `NYLON`, `MULTIFIBRA_ALGODON_NYLON` |
| `etiqueta` | VARCHAR(150) | ✅ | Texto legible |
| `total_banos` | INT | ✅ | Número de baños que genera el Motor Químico (4, 7 o 9) |
| `descripcion_ruta` | VARCHAR(300) | ❌ | Descripción del proceso de teñido |

---

#### 4. `articulos_textiles`
| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `nombre` | VARCHAR(150) | ✅ UNIQUE | Ej: `Avío`, `Prenda`, `Hilo`, `Tela cruda`, `Cierre` |
| `descripcion` | VARCHAR(300) | ❌ | Descripción opcional |
| `activo` | BOOLEAN | ✅ (default: true) | Permite desactivar sin borrar |

---

#### 5. `unidades_medida`
| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `codigo` | VARCHAR(20) | ✅ UNIQUE | Ej: `METROS`, `KILOS`, `PIEZAS` |
| `simbolo` | VARCHAR(10) | ✅ | Ej: `m`, `kg`, `pza` |
| `etiqueta` | VARCHAR(100) | ✅ | Texto legible |

---

#### 6. `colorantes_catalogo`
| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `nombre` | VARCHAR(200) | ✅ UNIQUE | Ej: `Ramazol Yellow`, `Acid Blue 113` |
| `tipo_colorante` | VARCHAR(50) | ✅ (default: `REACTIVO`) | `REACTIVO`, `ACIDO` o `DISPERSO` |
| `activo` | BOOLEAN | ✅ (default: true) | Permite desactivar sin borrar |
| `created_at` | TIMESTAMP | ✅ (default: now) | Fecha de registro |

---

#### 7. `tipos_incidencia`
| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `codigo` | VARCHAR(30) | ✅ UNIQUE | Ej: `COLOR_FUERA_RANGO`, `REPROCESO`, `DAÑO_ARTICULO` |
| `etiqueta` | VARCHAR(150) | ✅ | Texto legible |
| `descripcion` | VARCHAR(300) | ❌ | Descripción opcional |

---

#### 8. `fases_proceso`
| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `codigo` | VARCHAR(30) | ✅ UNIQUE | Ej: `PREBLANQUEO`, `TENIDO`, `TENIDO_ALGODON`, `ACABADO` |
| `etiqueta` | VARCHAR(150) | ✅ | Texto legible |
| `orden` | INT | ✅ | Posición de la fase en el proceso |
| `descripcion` | VARCHAR(300) | ❌ | Descripción opcional |

---

#### 9. `tipos_reporte`
| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `codigo` | VARCHAR(50) | ✅ UNIQUE | Ej: `ORDENES_POR_PERIODO`, `INGRESOS_POR_CLIENTE` |
| `etiqueta` | VARCHAR(200) | ✅ | Texto legible |
| `descripcion` | VARCHAR(300) | ❌ | Descripción opcional |

---

### 🏭 Tablas Operativas (11 tablas)

---

#### 10. `clientes`
| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `nombre` | VARCHAR(200) | ✅ | Nombre del cliente |
| `tipo_cliente_id` | INT | ✅ FK → `tipos_cliente` | Tipo de cliente |
| `ruc` | VARCHAR(11) | ❌ UNIQUE | RUC del cliente |
| `telefono` | VARCHAR(15) | ❌ | Teléfono de contacto |
| `correo` | VARCHAR(150) | ❌ | Correo electrónico |
| `direccion` | VARCHAR(300) | ❌ | Dirección |
| `created_at` | TIMESTAMP | ✅ (default: now) | Fecha de creación |
| `updated_at` | TIMESTAMP | ✅ (auto) | Última modificación |

---

#### 11. `ordenes_compra`
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
| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `orden_compra_id` | INT | ✅ FK → `ordenes_compra` (CASCADE) | OC a la que pertenece |
| `articulo_id` | INT | ✅ FK → `articulos_textiles` | Artículo a teñir |
| `unidad_medida_id` | INT | ✅ FK → `unidades_medida` | Unidad del lote |
| `cantidad` | FLOAT | ✅ | Cantidad (metros, kilos o piezas) |
| `color_solicitado` | VARCHAR(150) | ✅ | Color pedido por el cliente |
| `precio_por_metro` | FLOAT | ✅ | Precio unitario del servicio |
| `total` | FLOAT | ✅ | `cantidad × precio_por_metro` |
| `created_at` | TIMESTAMP | ✅ (default: now) | Fecha de creación |
| `updated_at` | TIMESTAMP | ✅ (auto) | Última modificación |

---

#### 13. `recetas_tecnicas`
| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `detalle_orden_id` | INT | ✅ FK (UNIQUE, CASCADE) | Lote al que pertenece (1 receta por lote) |
| `plantilla_id` | INT | ❌ FK → `plantillas_receta` | Plantilla base usada (si se copió de una existente) |
| `articulo_id` | INT | ✅ FK → `articulos_textiles` | Artículo textil |
| `composicion_fibra_id` | INT | ✅ FK → `composiciones_fibra` | Tipo de fibra (determina la ruta del Motor Químico) |
| `peso_real_kg` | FLOAT | ✅ | Peso real del lote en kg |
| `relacion_bano` | FLOAT | ✅ | Relación de baño en L/kg |
| `litros_agua` | FLOAT | ✅ | `peso_real_kg × relacion_bano` |
| `descripcion_color` | VARCHAR(200) | ✅ | Nombre o código del color |
| `nivel_intensidad` | FLOAT | ✅ | `1.0` Pastel / `2.0` Claro / `3.0` Intermedio / `4.0` Intenso |
| `observaciones_tecnicas` | TEXT | ❌ | Notas técnicas |
| `estado` | VARCHAR(30) | ✅ (default: `FORMULACION`) | Estado: `FORMULACION`, `PROCESO`, `APROBADO` |
| `secuencia_banos` | JSON | ❌ | Resultado completo del Motor Químico |
| `iteraciones` | JSON | ❌ (default: `[]`) | Historial de ajustes y versiones |
| `color_hex` | VARCHAR(7) | ❌ | Color analizado por cámara. Ej: `#3A5FCD` |
| `color_rgb` | JSON | ❌ | Color analizado en formato `{r, g, b}` |
| `color_miniatura` | TEXT | ❌ | Imagen en base64 del recorte analizado |
| `created_at` | TIMESTAMP | ✅ (default: now) | Fecha de creación |
| `updated_at` | TIMESTAMP | ✅ (auto) | Última modificación |

---

#### 14. `colorantes_formula`
| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `receta_tecnica_id` | INT | ✅ FK → `recetas_tecnicas` (CASCADE) | Receta a la que pertenece |
| `colorante_id` | INT | ✅ FK → `colorantes_catalogo` | Colorante del catálogo |
| `porcentaje` | FLOAT | ✅ | % de concentración del colorante |
| `created_at` | TIMESTAMP | ✅ (default: now) | Fecha de creación |
| `updated_at` | TIMESTAMP | ✅ (auto) | Última modificación |

---

#### 15. `notas_entrega`
| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `orden_compra_id` | INT | ✅ FK (UNIQUE) | OC entregada (1 nota por OC) |
| `estado` | VARCHAR(20) | ✅ (default: `PENDIENTE`) | Estado de la entrega |
| `receptor_nombre` | VARCHAR(200) | ✅ | Nombre de quien recibe |
| `fecha_entrega` | TIMESTAMP | ❌ | Fecha real de entrega |
| `observaciones` | TEXT | ❌ | Notas |
| `created_at` | TIMESTAMP | ✅ | Fecha de creación |
| `updated_at` | TIMESTAMP | ✅ | Última modificación |

---

#### 16. `bitacora_estados`
Log inmutable de cada cambio de estado de una OC. Solo se inserta, nunca se modifica ni se borra.

| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `orden_compra_id` | INT | ✅ FK (CASCADE) | OC que cambió de estado |
| `estado_anterior_id` | INT | ✅ FK → `estados_orden` | Estado **desde** el que salió |
| `estado_nuevo_id` | INT | ✅ FK → `estados_orden` | Estado **al que** pasó |
| `observacion` | VARCHAR(300) | ❌ | Motivo del cambio |
| `changed_at` | TIMESTAMP | ✅ (default: now) | Fecha y hora exacta del cambio |

---

#### 17. `incidencias_proceso`
| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `detalle_orden_id` | INT | ✅ FK (CASCADE) | Lote con el problema |
| `tipo_incidencia_id` | INT | ✅ FK → `tipos_incidencia` | Tipo de problema |
| `descripcion` | TEXT | ✅ | Descripción del problema |
| `accion_tomada` | TEXT | ❌ | Qué se hizo para resolverlo |
| `resuelta` | BOOLEAN | ✅ (default: false) | ¿Problema resuelto? |
| `created_at` | TIMESTAMP | ✅ | Fecha de registro |
| `updated_at` | TIMESTAMP | ✅ | Última modificación |

---

#### 18. `plantillas_receta`
| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `nombre_plantilla` | VARCHAR(200) | ✅ UNIQUE | Nombre descriptivo |
| `composicion_fibra_id` | INT | ✅ FK → `composiciones_fibra` | Tipo de fibra |
| `relacion_bano` | FLOAT | ✅ | Relación de baño estándar |
| `descripcion_color` | VARCHAR(200) | ✅ | Color de referencia |
| `activa` | BOOLEAN | ✅ (default: true) | Permite desactivar sin borrar |
| `created_at` | TIMESTAMP | ✅ | Fecha de creación |
| `updated_at` | TIMESTAMP | ✅ | Última modificación |

---

#### 19. `colorantes_plantilla`
| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `plantilla_id` | INT | ✅ FK (CASCADE) | Plantilla a la que pertenece |
| `colorante_id` | INT | ✅ FK → `colorantes_catalogo` | Colorante del catálogo |
| `porcentaje` | FLOAT | ✅ | % de concentración |

---

#### 20. `reportes_generados`
| Columna | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | INT | ✅ PK | Identificador único |
| `tipo_reporte_id` | INT | ✅ FK → `tipos_reporte` | Tipo de reporte |
| `fecha_desde` | TIMESTAMP | ✅ | Inicio del período |
| `fecha_hasta` | TIMESTAMP | ✅ | Fin del período |
| `resumen_json` | JSON | ✅ | Datos del reporte |
| `generado_en` | TIMESTAMP | ✅ (default: now) | Cuándo se generó |

---

## Mapa de relaciones entre tablas

```
tipos_cliente ──FK──► clientes ──FK──► ordenes_compra ──FK──► estados_orden
                                            │ 1:N                │
                                            │                    │ (antes/después)
                                            ▼                    ▼
                                      detalles_orden      bitacora_estados
                                           │ 1:N
                                           ├──FK──► articulos_textiles
                                           ├──FK──► unidades_medida
                                           ├──FK──► notas_entrega (1:1)
                                           │
                                           ├──── recetas_tecnicas ──FK──► composiciones_fibra
                                           │          │ 1:N               plantillas_receta
                                           │          └──── colorantes_formula ──FK──► colorantes_catalogo
                                           │
                                           └──── incidencias_proceso ──FK──► tipos_incidencia

plantillas_receta ──FK──► colorantes_plantilla ──FK──► colorantes_catalogo
tipos_reporte ──FK──► reportes_generados
```

---

## ⭐ Motor Químico — Cómo funciona

El Motor Químico (`quimico.engine.ts`) calcula automáticamente toda la secuencia de baños dado el **peso del artículo** y el **tipo de fibra**.

### Fórmulas base

```
litros por baño  =  peso_real_kg  ×  relación_de_baño
gramos de químico  =  concentración (g/L)  ×  litros_de_agua
```

### Nivel de intensidad del color

| Suma de % de colorantes | Nivel | Descripción | Sal Industrial | Potasa Cáustica |
|---|---|---|---|---|
| ≤ 0.01% | 1 | Pasteles | 10 g/L | 3 g/L |
| 0.01% – 0.1% | 2 | Claros | 20 g/L | 3 g/L |
| 0.1% – 1.0% | 3 | Intermedios | 40 g/L | 4 g/L |
| > 1.0% | 4 | Intensos | 80 g/L | 5 g/L |

### Secuencias de baños por tipo de fibra

| Fibra | Baños | Proceso |
|---|---|---|
| **Algodón** | 9 | 4 de Preblanqueo + 5 de Teñido y Acabado |
| **Nylon** | 4 | Teñido directo con ácido + Acabado |
| **Poliéster** | 4 | Misma ruta que Nylon |
| **Multifibra Algodón + Nylon** | 7 | Teñido Algodón → Teñido Nylon → Acabado |
| **Multifibra Algodón + Poliéster** | 7 | Teñido Algodón → Teñido Poliéster → Acabado |
| **Multifibra Nylon + Poliéster** | 7 | Teñido Poliéster → Teñido Nylon → Acabado |

---

## API REST — Endpoints

### `GET /api/health` — Verifica que el servidor esté activo

### `GET /api/catalogos` — Todos los catálogos en una sola llamada

### Órdenes de Compra — `/api/ordenes`

| Método | Endpoint | Qué hace |
|---|---|---|
| `POST` | `/api/ordenes` | Crea una OC completa (cabecera + lotes en transacción) |
| `GET` | `/api/ordenes` | Lista todas las OC con paginación |
| `GET` | `/api/ordenes/:id` | Detalle con liquidación financiera |
| `PATCH` | `/api/ordenes/:id/estado` | Cambia el estado de la OC |

### Recetas Técnicas — `/api/recetas`

| Método | Endpoint | Qué hace |
|---|---|---|
| `POST` | `/api/recetas` | Crea receta y ejecuta el Motor Químico |
| `GET` | `/api/recetas` | Lista el historial de recetas |
| `GET` | `/api/recetas/:id` | Detalle con todos los baños y gramos |
| `POST` | `/api/recetas/:id/iteracion` | Registra un ajuste de color sobre una receta |
| `PATCH` | `/api/recetas/:id/aprobar` | Aprueba la receta (estado final) |

### Análisis de Color — `/api/color`

| Método | Endpoint | Qué hace |
|---|---|---|
| `POST` | `/api/color/analizar` | Recibe una imagen y devuelve el color dominante (HEX + RGB) |
| `POST` | `/api/color/guardar/:id` | Guarda el color analizado en la receta |

### Clientes — `/api/clientes`

| Método | Endpoint | Qué hace |
|---|---|---|
| `GET` | `/api/clientes` | Lista todos los clientes |
| `POST` | `/api/clientes` | Crea un cliente nuevo |

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
- Node.js ≥ 18 y npm ≥ 9
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

- **Prisma v7** usa `prisma.config.ts` declarativo. La URL de PostgreSQL se configura en el adaptador `@prisma/adapter-pg`, no en el `schema.prisma`.
- **El build del backend** ejecuta `prisma generate && tsc` en cada deploy para regenerar el cliente.
- **Caché de catálogos:** `catalogos.cache.ts` carga los IDs en memoria al arrancar para evitar consultas repetidas.
- **Motor Químico:** recibe el código de fibra como `string` (`'ALGODON'`, `'NYLON'`…), independiente de los enums de Prisma.
- **Preview de baños:** el frontend replica las fórmulas del Motor Químico localmente (`calculatePreviewBaths`) para mostrar resultados en tiempo real sin llamar a la API.
- **Análisis de color:** usa la API del navegador `getUserMedia` para acceder a la cámara, y Canvas API para extraer píxeles del área seleccionada. El resultado se envía al backend para persistirlo.
- **SPA en Render:** `frontend/public/_redirects` contiene `/* /index.html 200`. Sin esto, recargar cualquier ruta devuelve 404.
- **`--force-reset` solo en desarrollo.** En producción real usar `prisma migrate deploy`.

---

Proyecto académico — **Sistemas de Información**
📦 https://github.com/STEPHANOstudents/servitex-v5
