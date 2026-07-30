# Stage 1: Build the Vite React application
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first for better caching
COPY package.json package-lock.json ./
RUN npm install --fetch-timeout=600000 --fetch-retries=5 --network-timeout=600000

# Copy the rest of the application and build
COPY . ./
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine
# Copy the custom nginx configuration for frontend (react-router support)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built assets from the previous stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 inside the container
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
