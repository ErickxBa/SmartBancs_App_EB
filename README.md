# SmartBancs App - Reto Técnico de Arquitectura

Este repositorio contiene la implementación del Producto Viable Mínimo (MVP) para **SmartBancs App**, una plataforma diseñada para procesar transacciones en tiempo real con alta concurrencia, ofrecer recomendaciones financieras impulsadas por IA y presentar un panel de observabilidad integral.

---

## 1. Arquitectura y Stack Tecnológico

El sistema ha sido diseñado priorizando **baja latencia**, **consistencia de datos** y **procesamiento asíncrono no bloqueante** bajo un enfoque de Arquitectura Orientada a Eventos y el patrón CQRS.

*   **API Transaccional (Backend):** Desarrollada en **NestJS (TypeScript)**. Expone endpoints RESTful, maneja la validación de DTOs y procesa las transferencias.
*   **Base de Datos Relacional:** **PostgreSQL**. Se aplican bloqueos pesimistas (`SELECT FOR UPDATE`) y ordenamiento canónico de UUIDs para mitigar *Race Conditions* y *Deadlocks* bajo cargas de 10,000 TPS.
*   **Caché de Lectura:** **Redis**. Diseñado para absorver la carga de lectura de saldos.
*   **Bus de Mensajería:** **RabbitMQ**. Desacopla el flujo crítico transaccional de los procesos analíticos secundarios (IA).
*   **Inteligencia Artificial (AI Worker):** Microservicio escrito en **Python**. Escucha asíncronamente eventos de RabbitMQ, consume modelos fundacionales (ej. Gemini) y actualiza métricas sin penalizar el flujo transaccional.
*   **Observabilidad:** **Prometheus** (recolección de métricas) y **Grafana** (visualización y cuadros de mando).
*   **Frontend (Dashboard):** Servido por **Nginx**. Una SPA en HTML/CSS/JS (Glassmorphism) que permite crear cuentas, transferir fondos, visualizar eventos en tiempo real y ejecutar pruebas de estrés.

---

## 2. Prerrequisitos

Para ejecutar este proyecto localmente, es indispensable contar con:
*   [Docker](https://docs.docker.com/get-docker/) y [Docker Compose](https://docs.docker.com/compose/install/) instalados.
*   Puertos libres en tu máquina: `8080` (Frontend), `3000` (API), `3001` (Grafana), `5432` (Postgres), `5672`/`15672` (RabbitMQ), `6379` (Redis), `9090` (Prometheus).

---

## 3. Configuración y Despliegue (IaC)

Toda la infraestructura está empaquetada como código para garantizar un despliegue predecible.

1.  **Clona el repositorio** en tu entorno local.
2.  **Configura las variables de entorno:**
    ```bash
    cp .env.example .env
    ```
    *(Asegúrate de configurar `GEMINI_API_KEY` dentro del archivo `.env` para consumir predicciones reales, caso contrario el Worker operará en modo Mock automático).*
3.  **Levanta la plataforma:**
    ```bash
    docker-compose up -d --build
    ```
    Este comando inicializa simultáneamente los **10 contenedores** interconectados a través de la red `smartbancs_net`.

---

## 4. Uso y Demostración Práctica

### A. Interfaz Gráfica (Recomendado)
Dirígete a **[http://localhost:8080](http://localhost:8080)** para abrir el Dashboard.
Desde aquí podrás:
1.  **Registrar nuevas cuentas** dinámicamente.
2.  **Ejecutar Transferencias** y observar en la tabla lateral cómo se integran las respuestas asíncronas de IA.
3.  **Stress Test:** Presionar el botón "Simular Pico Transaccional" para enviar 50 peticiones concurrentes y auditar el comportamiento de la infraestructura.

### B. Pruebas vía API (Alternativa)
Si deseas utilizar Postman o cURL:
```bash
curl -X POST http://localhost:3000/transactions \
-H "Content-Type: application/json" \
-d '{
  "accountFrom": "UUID_ORIGEN",
  "accountTo": "UUID_DESTINO",
  "amount": 150.00
}'
```

---

## 5. Monitoreo, Observabilidad e Incidentes

El sistema genera trazabilidad end-to-end utilizando `TraceID` en todas las operaciones.
*   **Grafana:** Accede a **[http://localhost:3001](http://localhost:3001)** (Credenciales: las definidas en `.env`, por defecto `admin`/`admin`). Podrás observar el panel con el volumen de TPS, latencias y contadores de negocio.
*   **RabbitMQ UI:** Accede a **[http://localhost:15672](http://localhost:15672)** (Usuario: `admin` / `admin123`) para visualizar la cola `tx.completed`.
*   **Simulación de Incidente:** El botón de **Stress Test** en el frontend emulará un cuello de botella, lo cual quedará inmediatamente evidenciado en los histogramas de Prometheus.

---

## 6. Integración de Datos y ETL

El proyecto incluye un pipeline ETL escrito en Python ubicado en el directorio `/etl`.
Este pipeline está diseñado para ingestar datos sucios desde el sistema core legado ("Bancs"):
*   **Script:** `etl/bancs_transform.py`
*   **Proceso:** Carga `bancs_raw_data.json`, utiliza *Pandas* para desduplicar, formatear fechas/montos, descartar nulos, e inyecta la información pulida en la base de datos PostgreSQL (`bancs_raw_transactions`) para su explotación analítica. Al ejecutarse de forma independiente, garantiza **cero interferencia** con el flujo transaccional OLTP de alta velocidad.

---

## 7. Limpieza del Entorno

Para detener el ambiente y destruir los volúmenes, ejecuta:
```bash
docker-compose down -v
```

---
