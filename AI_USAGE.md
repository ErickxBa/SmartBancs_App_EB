# Declaración de Uso de Inteligencia Artificial

En cumplimiento con las directrices del reto técnico "SmartBancs App", este documento detalla de forma transparente el uso de herramientas de Inteligencia Artificial durante el ciclo de desarrollo de la solución.

## Herramientas Empleadas

Se utilizó **Antigravity / Gemini 3.1 Pro (High)** como asistente de codificación avanzado (Agentic AI) integrado directamente en el entorno de desarrollo.

## Uso por Fases del Desarrollo

1. **Diseño y Arquitectura:**
   - La IA se utilizó como caja de resonancia (*sparring partner*) teórica para debatir y refinar patrones arquitectónicos complejos. Validó la viabilidad de usar el patrón CQRS acoplado a un Event Bus (RabbitMQ) y el uso de bloqueos pesimistas para la concurrencia a nivel de base de datos relacional.
   - Apoyó en la generación de diagramas (Mermaid/Estructuras) y en la estructuración de la documentación técnica en Markdown.

2. **Scaffolding y Configuración (DevOps):**
   - Se empleó para generar rápidamente el esqueleto de carpetas del monorepositorio y para escribir los archivos de orquestación de infraestructura (`docker-compose.yml`, `Dockerfile`s). Esto garantizó que PostgreSQL, Redis, RabbitMQ y los microservicios funcionaran de forma armónica en una red de Docker (`smartbancs_net`).

3. **Generación de Código:**
   - **Backend (TypeScript/NestJS):** La IA asistió acelerando el boilerplate de los controladores, comandos, eventos, y la configuración del motor de base de datos TypeORM. Además, colaboró en codificar la lógica del ordenamiento canónico de IDs para evadir los Deadlocks en las transferencias concurrentes.
   - **Data Engineering / ETL (Python):** Se utilizó para plantear el script en Pandas que simula la extracción y transformación de datos defectuosos simulando el core legado.
   - **AI Worker (Python):** Ayudó a conectar el ecosistema de consumo de RabbitMQ con la API asíncrona de `aio_pika` y la inyección del SDK de Gemini AI (`google-generativeai`).

4. **Depuración y Resolución de Errores (Troubleshooting):**
   - Durante las pruebas de integración en Docker, se experimentaron *Crash Loops* en el microservicio de Python (`smartbancs_ai_worker`) porque intentaba conectarse a RabbitMQ en fracciones de segundo antes de que la aplicación Erlang/AMQP subyacente estuviera lista para recibir conexiones (`AMQPConnectionError: [Errno 111]`).
   - La IA analizó los logs, y recomendó e implementó dos correcciones de fiabilidad:
     1. Un `healthcheck` y dependencia condicional `service_healthy` en `docker-compose.yml`.
     2. Un bloque de reintentos asíncronos en el código Python de `worker.py` para garantizar resiliencia transaccional.
   - Asimismo, solucionó un error en RabbitMQ de *Precondition Failed* al alinear la configuración del Exchange (`durable=True`) entre NestJS y el cliente de Python.

## Conclusión

La Inteligencia Artificial fungió como un catalizador de productividad y una herramienta especializada de depuración de sistemas distribuidos. No obstante, las decisiones lógicas, el diseño conceptual del SLA de 2 segundos, la separación de contextos (Bounded Contexts) y la configuración del escenario operativo se fundamentaron bajo la dirección y conocimientos previos de arquitectura de software del desarrollador.
