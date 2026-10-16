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

Y el script `preinstall` **bloquea npm y yarn** (`pnpm dlx only-allow pnpm`): si alguien intenta `npm install` o `yarn`, el proceso se detiene con un error. Así se evita generar lockfiles distintos por usar otro gestor.

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

### Después de instalar (todas las plataformas) — PASO CRÍTICO

> ⚠️ **Reinicia el entorno por completo.** Volta agrega su carpeta al PATH, pero las terminales y editores **que ya estaban abiertos no ven ese cambio**. Este es el error nº 1 con Volta: instalas, pero `volta` "no se reconoce" o `node -v` sigue mostrando tu versión vieja, porque la terminal es anterior a la instalación.
>
> - **Cierra TODO:** todas las terminales **y** el editor completo (VS Code entero, no solo el panel de terminal).
> - En Windows, si tras reabrir sigue sin reconocerse, **cierra sesión de Windows y vuelve a entrar** (o reinicia). El PATH de usuario se recarga ahí.

Abre una terminal **nueva** y verifica:

```bash
volta --version
```

Si imprime un número de versión, Volta quedó listo. Si dice "command not found" / "no se reconoce", revisa [Solución de problemas](#11-solución-de-problemas).

---

## 4. Paso 2 — Activar Volta y dejar que gestione Node/pnpm

Ejecuta una vez por máquina (coloca los shims de Volta en el PATH):

```bash
volta setup
```

Luego **cierra y reabre la terminal otra vez** para que tome efecto.

### Evita el conflicto con otros gestores de versiones de Node

Volta solo puede fijar la versión del proyecto si **es él quien provee `node`**. Si tienes otra fuente de Node delante en el PATH, verás una versión equivocada aunque Volta esté instalado. Las fuentes que suelen "ganarle" a Volta:

- **pnpm gestionando Node** (binario en `AppData\Local\pnpm\bin\node.exe`). Ocurre si activaste `pnpm env use` o `manage-package-manager-versions`.
- **Homebrew en macOS** (binario en `/opt/homebrew/bin/node` o `/usr/local/bin/node`). Ocurre si instalaste Node con `brew install node`.
- **nvm / nvm-windows**, o un Node instalado a mano desde nodejs.org.

**Cómo saber quién provee tu Node:**

```bash
# Windows (PowerShell)
(Get-Command node).Source
# macOS / Linux
which node
```

- Si la ruta contiene `Volta` → correcto, Volta manda. ✅
- Si contiene `pnpm`, `homebrew`, `nvm` o `nodejs` → esa fuente está ganando. Debes dejar de usarla para Node y asegurar que la carpeta de Volta quede **antes** en el PATH. En el caso de pnpm, revisa que no tengas Node gestionado por pnpm (`pnpm env`) y reinicia la terminal.

**macOS (Homebrew) — caso frecuente.** Si `which node` muestra `/opt/homebrew/bin/node`, Homebrew está ganando. El PATH se lee de izquierda a derecha: **la primera coincidencia gana**, así que `.volta/bin` debe aparecer **antes** que `/opt/homebrew/bin`. Arréglalo así:

1. Localiza dónde se define cada uno:
   ```bash
   grep -n -E 'volta|VOLTA_HOME|brew shellenv|homebrew' ~/.zshrc ~/.zprofile ~/.bash_profile ~/.profile 2>/dev/null
   ```
2. En el **mismo archivo** donde esté la línea de Homebrew (`brew shellenv`), agrega **al final del todo** (después de Homebrew) estas dos líneas. Usan `:$PATH`, que antepone, así que lo último ejecutado queda primero:
   ```bash
   export VOLTA_HOME="$HOME/.volta"
   export PATH="$VOLTA_HOME/bin:$PATH"
   ```
   Si esas líneas ya existían pero **arriba** de Homebrew, muévelas al final.
3. Recarga el shell: `source ~/.zshrc` (o cierra y abre la terminal).
4. Verifica el **orden** del PATH (Volta debe salir primero):
   ```bash
   echo $PATH | tr ':' '\n' | grep -nE 'volta|homebrew'
   ```
5. (Recomendado) Elimina el Node de Homebrew para que no vuelva a competir:
   ```bash
   brew uninstall node
   ```
6. Verifica: `which node` debe mostrar una ruta con `.volta`, y `node -v` → `v24.20.0`.

> Si tras recargar Homebrew sigue primero, probablemente Homebrew se define en un archivo que zsh carga **después** del tuyo (p. ej. Volta en `~/.zshrc` pero `brew shellenv` en `~/.zprofile`). Pon las dos líneas de Volta al final de **ese mismo** archivo donde esté `brew shellenv`.

> **Regla de oro:** elige **un solo** gestor de Node (aquí, Volta). No instales Node por otras vías (ni Homebrew, ni nvm, ni nodejs.org). Así el campo `volta` del `package.json` siempre manda.

### Nota sobre pnpm

Volta también gestiona pnpm. Normalmente **no hace falta nada**: al entrar al proyecto, Volta lee el campo `volta` del `package.json` y usa Node 24 + pnpm 12 automáticamente. Si al correr `pnpm` ves un aviso de que no está gestionado por Volta:

```bash
volta install pnpm@12.14.0
```

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

1. `preinstall` bloquea npm/yarn (`only-allow pnpm`) y avisa si Volta falta (esto último no bloquea).
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

**`volta` no se reconoce / command not found, aunque ya lo instalé.**
Casi siempre es una **terminal vieja**: la abriste antes de instalar Volta y no ve el PATH actualizado. Cierra **TODAS** las terminales **y el editor completo** (VS Code entero), reábrelo y prueba de nuevo. En Windows, si persiste, cierra sesión de Windows o reinicia. Confirma que Volta esté en disco (debería estar en `C:\Program Files\Volta\` o `%LOCALAPPDATA%\Volta`).

**`node -v` muestra una versión distinta a la fijada en `volta` del `package.json` (p. ej. ves 24.22.0 en vez de 24.20.0).**
Significa que **otra fuente está proveyendo Node**, no Volta. Diagnostícalo:

```bash
# Windows (PowerShell)
(Get-Command node).Source
# macOS / Linux
which node
```

- Si la ruta contiene `pnpm` (`AppData\Local\pnpm\bin`), `homebrew` (`/opt/homebrew/bin`), `nvm` o `nodejs` → esa herramienta está ganándole a Volta en el PATH. Ese es el motivo exacto de ver la versión equivocada.
- **Solución (Windows):** asegúrate de que Volta esté activo (`volta --version`), no uses otra fuente para Node (si es pnpm, no uses `pnpm env use`), **reinicia la terminal** y verifica que `(Get-Command node).Source` apunte a una ruta con `Volta`.
- **Solución (macOS/Homebrew):** pon `export PATH="$VOLTA_HOME/bin:$PATH"` al final de tu `~/.zshrc`, ejecuta `brew uninstall node`, recarga con `source ~/.zshrc` y verifica con `which node` (debe mostrar `.volta`). Ver detalle en [Paso 2 → macOS (Homebrew)](#evita-el-conflicto-con-otros-gestores-de-versiones-de-node).
- En todos los casos: recuerda estar **dentro** de la carpeta del proyecto (Volta aplica la versión por carpeta, leyendo el `package.json`).

**El `pnpm install` falla con un error de `engines` / versión incompatible.**
Es la red de seguridad (`engine-strict`). Tu Node o pnpm no está en el rango permitido (Node `^24`, pnpm `^12`). Soluciónalo dejando que Volta gestione las versiones: con Volta instalado, entra a la carpeta y vuelve a intentar.

**Windows: errores de symlink o permisos al instalar Node con Volta.**
Activa el *Modo de desarrollador* (ver [Paso 1 → Windows](#windows)).

**`prisma generate` o `db push` falla.**
Revisa que `.env` exista y que `DATABASE_URL` / `DIRECT_URL` sean válidas. `db push` usa `DIRECT_URL`.

**Intenté usar npm o yarn y me dio error.**
Es intencional: el `preinstall` bloquea cualquier gestor que no sea pnpm (`only-allow pnpm`). Usa `pnpm` siempre. Si ya quedaron residuos de otro gestor (p. ej. un `package-lock.json`), ejecuta `pnpm run clean` y luego `pnpm install`.

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
