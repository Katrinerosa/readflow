FROM node:20-alpine AS build
WORKDIR /app

# Build arg for Directus URL (needed by reader at build time)
ARG PUBLIC_DIRECTUS_URL=http://localhost:8055
ENV PUBLIC_DIRECTUS_URL=${PUBLIC_DIRECTUS_URL}

# Install pnpm
RUN npm i -g pnpm

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all source code (needed before install for workspace setup)
COPY apps/reader ./apps/reader
COPY apps/web ./apps/web

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build reader first (uses PUBLIC_DIRECTUS_URL from env)
RUN pnpm -C apps/reader build

# Build web (includes copy-reader step)
RUN pnpm -C apps/web build

# --- Runtime image
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Install pnpm
RUN npm i -g pnpm

# Copy package files
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/apps/web/package.json ./apps/web/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=build /app/apps/web/dist ./apps/web/dist

EXPOSE 3000
WORKDIR /app/apps/web
CMD ["node", "./dist/server/entry.mjs"]
