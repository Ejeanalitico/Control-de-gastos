# Use Node.js 20 LTS as the base image
FROM node:20-bookworm-slim

# Install build dependencies required for compiling native modules like sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies so we can build the frontend)
RUN npm install

# Rebuild sqlite3 from source explicitly against the container's GLIBC version
RUN npm rebuild sqlite3 --build-from-source

# Copy the rest of the application files
COPY . .

# Build both the Vite frontend and bundle the Express server
RUN npm run build

# Set production environment for runtime (avoids Vite dev server host block errors)
ENV NODE_ENV=production

# Expose the port (Railway binds dynamic port to PORT environment variable)
EXPOSE 3000

# Start the bundled server
CMD ["node", "dist/server.cjs"]
