# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies (sometimes required by bcrypt or other native modules)
RUN apk add --no-cache make gcc g++ python3 openssl

# Copy dependency definitions
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Production Runtime
FROM node:18-alpine AS runner

WORKDIR /app

# Install runtime dependencies needed by Prisma on Alpine
RUN apk add --no-cache openssl

# Set NODE_ENV to production
ENV NODE_ENV=production

# Install only production dependencies and prisma CLI for migrations
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npm install -g prisma@5.10.2

# Copy generated Prisma Client and built application from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist

# Ensure uploads directory exists
RUN mkdir -p uploads

# Expose port
EXPOSE 3000

# Run database migrations and start server
# Note: In production, it's safer to run migrations as an init container, but for ease of use we run it here.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
