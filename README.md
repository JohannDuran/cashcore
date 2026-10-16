# CashCore

Aplicación de finanzas personales construida con **Next.js 16**, **React 19**, **Prisma** y **Supabase (PostgreSQL)**.

Esta guía te lleva **desde una máquina en blanco** hasta tener el proyecto corriendo, de forma idéntica en **Windows, Linux y macOS**. Si sigues los pasos en orden, no debería fallar nada.

---

## Índice

1. [Cómo funciona el control de versiones (lee esto primero)](#1-cómo-funciona-el-control-de-versiones-lee-esto-primero)
2. [Requisitos](#2-requisitos)
3. [Paso 1 — Instalar Volta](#3-paso-1--instalar-volta)
4. [Paso 2 — Activar pnpm con Volta](#4-paso-2--activar-pnpm-con-volta)
5. [Paso 3 — Clonar el repositorio](#5-paso-3--clonar-el-repositorio)
6. [Paso 4 — Variables de entorno (.env)](#6-paso-4--variables-de-entorno-env)
7. [Paso 5 — Instalar dependencias](#7-paso-5--instalar-dependencias)
8. [Paso 6 — Preparar la base de datos (Prisma)](#8-paso-6--preparar-la-base-de-datos-prisma)
9. [Paso 7 — Levantar el proyecto](#9-paso-7--levantar-el-proyecto)
10. [Scripts disponibles](#10-scripts-disponibles)
11. [Solución de problemas](#11-solución-de-problemas)
12. [Actualizar la versión de Node (mantenimiento)](#12-actualizar-la-versión-de-node-mantenimiento)

---

## 1. Cómo funciona el control de versiones (lee esto primero)

Para que **todas las máquinas usen exactamente las mismas versiones**, el proyecto combina tres capas, todas declaradas en `package.json`:

| Capa | Qué hace |
|------|----------|
| **`volta`** | Fija la versión de **Node** y **pnpm**. Volta las descarga y usa automáticamente al entrar al proyecto. |
| **`packageManager`** | Declara el gestor oficial (`pnpm@12.14.0`). |
| **`engines`** + `.npmrc` (`engine-strict=true`) | Red de seguridad: si tu Node/pnpm no cumple, el `install` **falla con un error claro** en vez de romper de forma rara. |

Además, el `.npmrc` fuerza instalaciones reproducibles:

- `frozen-lockfile=true` → nadie puede instalar versiones distintas a las del `pnpm-lock.yaml`.
- `save-exact=true` → las dependencias nuevas se fijan sin `^`.

> **El único paso manual por máquina es instalar Volta una vez.** Node y pnpm los gestiona Volta solo a partir de ahí. No instales Node "a mano" desde nodejs.org: deja que Volta lo haga.

---

## 2. Requisitos

- **Git** instalado ([git-scm.com](https://git-scm.com/downloads)).
- Conexión a internet (Volta descarga Node/pnpm la primera vez).
- Una terminal:
  - **Windows:** PowerShell (incluida) o Windows Terminal.
  - **Linux / macOS:** la terminal del sistema (bash/zsh).
- Acceso a un proyecto de **Supabase** (para las variables de entorno). Ver [Paso 4](#6-paso-4--variables-de-entorno-env).

No necesitas instalar Node ni pnpm por tu cuenta: eso lo cubre Volta.

---

## 3. Paso 1 — Instalar Volta

Volta es la herramienta que garantiza la misma versión de Node y pnpm en todas las máquinas. Instálalo **una sola vez** por computadora.

### Windows

Opción recomendada (con winget, ya incluido en Windows 10/11):

```powershell
winget install Volta.Volta
```

Alternativa (instalador manual): descarga el `.msi` desde [volta.sh](https://volta.sh).

> **Importante en Windows:** Volta necesita "Developer Mode" activado para funcionar bien con symlinks.
> Actívalo en: *Configuración → Privacidad y seguridad → Para desarrolladores → Modo de desarrollador: Activado.*

### macOS / Linux

```bash
curl https://get.volta.sh | bash
```

### Después de instalar (todas las plataformas)

**Cierra y vuelve a abrir la terminal** (en Windows, ciérrala por completo). Luego verifica:

```bash
volta --version
```

Si imprime un número de versión, Volta quedó listo. Si dice "command not found" / "no se reconoce", revisa [Solución de problemas](#11-solución-de-problemas).

---

## 4. Paso 2 — Activar pnpm con Volta

Volta gestiona pnpm, pero esta función debe habilitarse una vez por máquina:

```bash
volta setup
```

> Si más adelante al correr `pnpm` ves un aviso de que pnpm no está gestionado por Volta, ejecuta:
> ```bash
> volta install pnpm@12.14.0
> ```
> Normalmente **no hace falta**: al entrar al proyecto, Volta lee el campo `volta` del `package.json` y usa Node 24 + pnpm 12 automáticamente.

---

## 5. Paso 3 — Clonar el repositorio

```bash
git clone <URL-DEL-REPOSITORIO> cashcore
cd cashcore
```

En cuanto entras a la carpeta, Volta detecta el `package.json` y, la primera vez, descarga la versión exacta de Node y pnpm fijadas en el proyecto. Verifícalo:

```bash
node --version   # debe mostrar v24.x
pnpm --version   # debe mostrar 12.14.0
```

> Si los números no coinciden, es porque Volta no está instalado o no se reinició la terminal. Vuelve al [Paso 1](#3-paso-1--instalar-volta).

---

## 6. Paso 4 — Variables de entorno (.env)

El proyecto necesita un archivo `.env` en la raíz. Usa `.env.example` como plantilla.

### Windows (PowerShell)

```powershell
Copy-Item .env.example .env
```

### macOS / Linux

```bash
cp .env.example .env
```

Luego abre `.env` y completa los valores con los datos de tu proyecto de Supabase:

```dotenv
# Conexión a Supabase vía pooling (la usa la app en runtime)
DATABASE_URL=""

# Conexión directa a la base de datos (la usan las migraciones de Prisma)
DIRECT_URL=""

# Entorno de Supabase (cliente)
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
```

**Dónde obtener cada valor** (panel de Supabase → tu proyecto):

| Variable | Ubicación en Supabase |
|----------|-----------------------|
| `DATABASE_URL` | *Project Settings → Database → Connection string → Transaction pooler* (puerto 6543/5432 según tu config). |
| `DIRECT_URL` | *Project Settings → Database → Connection string → Session pooler / Direct*. |
| `NEXT_PUBLIC_SUPABASE_URL` | *Project Settings → API → Project URL*. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `ANON_KEY` | *Project Settings → API → Project API keys*. |

> **Nunca** subas el `.env` real al repositorio. Solo se versiona `.env.example`.

---

## 7. Paso 5 — Instalar dependencias

Desde la raíz del proyecto:

```bash
pnpm install
```

Qué ocurre durante el install:

1. `preinstall` verifica que Volta esté presente y avisa si falta (no bloquea).
2. pnpm instala **exactamente** las versiones del `pnpm-lock.yaml` (gracias a `frozen-lockfile`).
3. `postinstall` ejecuta `prisma generate`, que crea el cliente de Prisma.

> Usa **siempre `pnpm`**, no `npm` ni `yarn`. Mezclar gestores genera lockfiles distintos y rompe la reproducibilidad.

---

## 8. Paso 6 — Preparar la base de datos (Prisma)

Genera el cliente y sincroniza el esquema con tu base de datos:

```bash
pnpm run db:push
```

Este comando corre `prisma generate` y `prisma db push` (aplica el `prisma/schema.prisma` a la base de datos definida en `DIRECT_URL`).

Si quieres cargar datos de ejemplo (seed):

```bash
pnpm exec prisma db seed
```

---

## 9. Paso 7 — Levantar el proyecto

```bash
pnpm dev
```

Abre tu navegador en **[http://localhost:3001](http://localhost:3001)** (el proyecto usa el puerto **3001**, configurado en el script `dev`).

Para una build de producción:

```bash
pnpm build
pnpm start
```

---

## 10. Scripts disponibles

| Comando | Qué hace |
|---------|----------|
| `pnpm dev` | Servidor de desarrollo (Turbopack) en el puerto 3001. |
| `pnpm build` | Compila la app para producción. |
| `pnpm start` | Sirve la build de producción. |
| `pnpm lint` | Ejecuta ESLint. |
| `pnpm run db:push` | `prisma generate` + `prisma db push`. |
| `pnpm run clean` | Borra `.next`, `node_modules` y lockfiles ajenos. |
| `pnpm run restart` | `clean` + `install` + `dev` (reinicio limpio completo). |

---

## 11. Solución de problemas

**`volta` no se reconoce / command not found después de instalar.**
Cierra **todas** las terminales y vuelve a abrir una nueva (en Windows a veces hay que cerrar sesión o reiniciar). Volta modifica el PATH y los procesos abiertos no lo ven hasta reiniciar.

**`node --version` no muestra v24.x dentro del proyecto.**
Significa que Volta no está activo. Confirma `volta --version`; si falla, reinstala Volta ([Paso 1](#3-paso-1--instalar-volta)). Si funciona pero Node no cambia, asegúrate de estar **dentro** de la carpeta del proyecto (Volta aplica la versión por carpeta).

**El `pnpm install` falla con un error de `engines` / versión incompatible.**
Es la red de seguridad (`engine-strict`). Tu Node o pnpm no está en el rango permitido (Node `^24`, pnpm `^12`). Soluciónalo dejando que Volta gestione las versiones: con Volta instalado, entra a la carpeta y vuelve a intentar.

**Windows: errores de symlink o permisos al instalar Node con Volta.**
Activa el *Modo de desarrollador* (ver [Paso 1 → Windows](#windows)).

**`prisma generate` o `db push` falla.**
Revisa que `.env` exista y que `DATABASE_URL` / `DIRECT_URL` sean válidas. `db push` usa `DIRECT_URL`.

**Mezclé npm/yarn por error y ahora hay conflictos.**
Ejecuta `pnpm run clean` y luego `pnpm install`. Usa solo pnpm en adelante.

**`frozen-lockfile` bloquea el install tras cambiar dependencias.**
Si modificaste `package.json` a propósito, actualiza el lockfile con:
```bash
pnpm install --no-frozen-lockfile
```
y commitea el nuevo `pnpm-lock.yaml`.

---

## 12. Actualizar la versión de Node (mantenimiento)

Cuando quieras adoptar una nueva LTS de Node (p. ej. cuando Node 26 pase a Active LTS), actualiza **dos lugares** en `package.json` y commitea:

```jsonc
"engines": {
  "node": "^26.0.0",   // antes ^24.0.0
  "pnpm": "^12.0.0"
},
"volta": {
  "node": "26.x.y",    // la versión LTS exacta deseada
  "pnpm": "12.14.0"
}
```

Al hacer `pull`, cada máquina con Volta descargará y usará la nueva versión automáticamente al entrar al proyecto. Nadie tiene que instalar Node a mano.

---

## Stack técnico

- **Framework:** Next.js 16 (App Router, Turbopack)
- **UI:** React 19, Tailwind CSS 4, Radix UI, Framer Motion
- **Estado:** Zustand
- **ORM:** Prisma 6
- **Base de datos / Auth:** Supabase (PostgreSQL)
- **Gestor de paquetes:** pnpm 12 (vía Volta)
- **Runtime:** Node.js 24 LTS (vía Volta)
