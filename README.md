# SmartBancs App - MVP

Este repositorio contiene la implementación del Producto Viable Mínimo (MVP) para "SmartBancs App", una plataforma diseñada para procesar transacciones en tiempo real con alta concurrencia y ofrecer recomendaciones financieras impulsadas por IA.

## Prerrequisitos

Para ejecutar este proyecto localmente, necesitas tener instalados:

- [Docker](https://docs.docker.com/get-docker/) y [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) (v20 o superior) - Opcional, para desarrollo local.
- [Python](https://www.python.org/) (3.11 o superior) - Opcional, para desarrollo local.

## Configuración Inicial

1. Clona este repositorio.
2. Copia el archivo de ejemplo de variables de entorno y ajusta las credenciales si es necesario:
   ```bash
   cp .env.example .env
   ```
   *Nota: Asegúrate de tener configurada tu `GEMINI_API_KEY` en el archivo `.env` para que el servicio de IA funcione correctamente.*

## Ejecución del MVP

El proyecto está dockerizado para asegurar una ejecución determinista. Puedes levantar toda la infraestructura (PostgreSQL, Redis, RabbitMQ, API en NestJS, Worker de IA en Python, Worker de Sincronización, y Prometheus/Grafana) con un solo comando en tu terminal:

```bash
docker-compose up -d --build
```

Esto levantará y orquestará los siguientes servicios:
- **API Transaccional (NestJS):** http://localhost:3000
- **Base de Datos (PostgreSQL):** Puerto 5432
- **Caché (Redis):** Puerto 6379
- **RabbitMQ (Mensajería Asíncrona):** Puertos 5672 (AMQP) y 15672 (Management UI)
- **Grafana (Monitoreo):** http://localhost:3001
- **Prometheus (Métricas):** http://localhost:9090

## Prueba de la Solución

Puedes probar el endpoint de transacciones enviando un `POST` a la API:

```bash
curl -X POST http://localhost:3000/transactions \
-H "Content-Type: application/json" \
-d '{
  "fromAccountId": 1,
  "toAccountId": 2,
  "amount": 150.00
}'
```

Deberías recibir una respuesta `200 OK` inmediatamente (en menos de 2 segundos), mientras el Worker de IA procesará el análisis de la transacción en segundo plano y actualizará la base de datos de forma asíncrona.

## Monitoreo y Observabilidad

- Accede a **Grafana** en `http://localhost:3001` (Usuario: `admin`, Contraseña: la definida en tu `.env` o `admin` por defecto) para ver los dashboards de telemetría.
- Accede a **RabbitMQ UI** en `http://localhost:15672` (Usuario: `admin`, Contraseña: `admin123`) para ver los eventos fluyendo en la cola `tx.completed`.

## Detener la Solución

Para detener la ejecución de los contenedores y limpiar los volúmenes, ejecuta:

```bash
docker-compose down -v
```

## Estructura del Documento Técnico
El documento técnico requerido se divide modularmente dentro de la carpeta `docs/`. Te invitamos a leer:
- `docs/Arquitectura/arquitectura.md`: Diseño de alto nivel, CQRS, Integración con Bancs y manejo de IA.
- `docs/Decisiones/Decisiones.md`: Fundamentación del stack tecnológico.
- `docs/Postmortem/postmortem.md`: Respuesta operativa al incidente simulado.