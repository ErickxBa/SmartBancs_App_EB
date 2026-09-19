FROM node:20-alpine

WORKDIR /app

# Instalar dependencias primero para cache de Docker
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copiar el resto del código
COPY . .

# Construir la aplicación
RUN npm run build

# Exponer el puerto
EXPOSE 3000

# Comando para iniciar la aplicación en producción
CMD ["npm", "run", "start:prod"]
