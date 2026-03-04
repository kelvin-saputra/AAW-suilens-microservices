FROM oven/bun:1.3-alpine
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
RUN bunx drizzle-kit push
EXPOSE 3001
CMD ["sh", "-c", "bun", "run", "src/db/seed.ts", "&&", "bun", "run", "src/index.ts"]