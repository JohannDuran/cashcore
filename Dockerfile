# ============================================
# ETAPA 1: DEPENDENCIAS
# ============================================
FROM node:24-alpine AS deps

WORKDIR /app

# Copiar archivos de dependencias y la config de pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copiar schema de Prisma (necesario para prisma generate en postinstall)
COPY prisma ./prisma

# Instalar dependencias
# El postinstall ejecuta "prisma generate" automáticamente
# --dangerously-allow-all-builds: permite los build scripts nativos
#   (prisma, sharp, esbuild...) de forma NO interactiva. Seguro en Docker
#   porque las dependencias vienen del lockfile verificado.
RUN corepack enable pnpm && pnpm install --frozen-lockfile --dangerously-allow-all-builds

# ============================================
# ETAPA 2: BUILD
# ============================================
FROM node:24-alpine AS builder

WORKDIR /app

# Copiar node_modules de la etapa anterior (incluye @prisma/client generado)
COPY --from=deps /app/node_modules ./node_modules

# Copiar todo el código fuente (el .dockerignore excluye .env, .next, .git, etc.)
COPY . .

# ---- Variables NEXT_PUBLIC_* necesarias en BUILD TIME ----
# Next.js incrusta las variables NEXT_PUBLIC_* dentro del bundle del navegador
# durante "next build". Deben estar presentes aquí, NO solo en runtime.
# docker-compose las pasa vía build.args (ver docker-compose.yml).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY

# Construir la aplicación
# Tu script build: "prisma generate && next build --webpack"
# prisma generate ya se ejecutó en deps, pero no pasa nada si corre de nuevo
RUN corepack enable pnpm && pnpm build

# ============================================
# ETAPA 3: PRODUCCIÓN
# ============================================
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Puerto donde correrá la app (Next.js standalone usa 3000 por defecto)
ENV PORT=3000
# Escuchar en todas las interfaces de red del contenedor (no solo la IP interna).
# Necesario para que el healthcheck (127.0.0.1) pueda alcanzar la app.
ENV HOSTNAME=0.0.0.0

# Crear usuario sin privilegios
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos públicos
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Preparar el directorio .next con permisos correctos para que Next.js
# pueda escribir la caché de prerenderizado en runtime.
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

# Copiar la app compilada en modo standalone (con dueño nextjs)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copiar assets estáticos (con dueño nextjs)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Cambiar al usuario sin privilegios
USER nextjs

# Exponer puerto 3000
EXPOSE 3000

# Iniciar la aplicación
CMD ["node", "server.js"]
