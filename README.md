# SERVITEX — Sistema de Gestión Comercial y Control de Fórmulas de Teñido

## Estructura del Proyecto

```
Servitex/
├── backend/                    # API REST (Node.js + Express + TypeScript)
│   ├── prisma/
│   │   └── schema.prisma       # Modelos de base de datos (PostgreSQL)
│   ├── src/
│   │   └── server.ts           # Servidor Express principal
│   ├── .env                    # Variables de entorno (DATABASE_URL, PORT)
│   ├── .env.example            # Plantilla de variables de entorno
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/                   # UI (React 18 + Vite + TypeScript)
    ├── src/
    │   ├── App.tsx
    │   └── main.tsx
    ├── index.html
    └── package.json
```

## Comandos de Desarrollo

### Backend
```bash
cd backend
npm run dev           # Servidor en modo desarrollo (ts-node)
npm run build         # Compilar TypeScript a JavaScript
npm run prisma:migrate  # Crear/aplicar migraciones de BD
npm run prisma:generate # Regenerar cliente Prisma
npm run prisma:studio   # Abrir Prisma Studio (UI visual de BD)
```

### Frontend
```bash
cd frontend
npm run dev           # Servidor de desarrollo Vite (http://localhost:5173)
npm run build         # Build de producción
npm run preview       # Preview del build de producción
```

## Configuración Inicial Requerida

1. Crear una base de datos PostgreSQL llamada `servitex_db`
2. Editar `backend/.env` y reemplazar la `DATABASE_URL` con tus credenciales:
   ```
   DATABASE_URL="postgresql://TU_USUARIO:TU_PASSWORD@localhost:5432/servitex_db"
   ```
3. Ejecutar la migración inicial:
   ```bash
   cd backend
   npm run prisma:migrate
   ```
