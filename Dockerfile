FROM oven/bun:alpine

RUN apk add --no-cache git curl

WORKDIR /app

# Copy source code first (better layer caching)
COPY . .

# Install all dependencies
RUN bun install && \
    cd packages/core && bun install && \
    cd ../.. && \
    cd apps/mobile && bun install && \
    cd ../..

# Generate Prisma client
RUN bun run db:generate

# Build the core package
RUN bun run build:core

# Add mobile-specific dependencies
RUN cd apps/mobile && bun add react-native-web react-dom@19.2.0

# Fix dotslash issue in Alpine containers — remove problematic React Native DevTools binary
RUN rm -rf /root/.cache/dotslash && \
    rm -rf /app/node_modules/.bun/@react-native+debugger-shell@*/node_modules/@react-native/debugger-shell/bin/react-native-devtools

# Copy start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 3000 8081

ENTRYPOINT ["/start.sh"]
