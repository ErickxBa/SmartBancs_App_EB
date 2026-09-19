# Registro de Decisiones Arquitectónicas (ADR)

Este documento mantiene un registro de las decisiones técnicas críticas tomadas durante el desarrollo de SmartBancs App, justificando el *por qué* de cada enfoque para cumplir con las condiciones del negocio (Alta concurrencia, protección del Core y baja latencia).

## 1. Patrón ETL para Integración Legacy (Fase 1)
*   **Decisión:** Utilizar Python con la librería `pandas` para simular la extracción y limpieza (ETL) desde el core "Bancs".
*   **Justificación:** El sistema legado produce datos sucios (fechas mixtas, nulos, strings de moneda con espacios). Pandas ofrece un motor vectorizado C++ bajo el capó que permite limpiar millones de registros en segundos, estandarizando tipos de datos y filtrando corrupciones antes de que contaminen la base de datos de IA o el Data Warehouse.

## 2. Prevención de Deadlocks y Race Conditions (Fase 2)
*   **Decisión:** Utilizar Bloqueo Pesimista (`SELECT FOR UPDATE`) combinado con **Ordenamiento Canónico** en la base de datos PostgreSQL durante las transferencias.
*   **Justificación:** A 10,000 TPS, existe un riesgo altísimo de *Race Conditions* (doble gasto) y *Deadlocks* (bloqueos mutuos). 
    *   *Bloqueo Pesimista:* Evita que dos hilos Node.js modifiquen el mismo saldo al mismo tiempo.
    *   *Ordenamiento Canónico:* Ordenamos alfabéticamente las IDs de la cuenta origen y destino antes de bloquearlas (`[accountFrom, accountTo].sort()`). Matemáticamente, esto asegura que sin importar la dirección de la transferencia (A -> B o B -> A simultáneamente), el motor de la base de datos siempre bloqueará la cuenta A primero, y luego la B, previniendo por completo el abrazo mortal (*deadlock*).
*   **Alternativas Rechazadas:** Bloqueo Optimista (mediante versión en columnas) fue rechazado porque a alta concurrencia generaría demasiados reintentos y errores a nivel de aplicación, degradando el performance general.

## 3. Desacoplamiento de Eventos Transaccionales (Fase 2 -> 3)
*   **Decisión:** Implementar CQRS (`@nestjs/cqrs`) y enviar un evento al Bus In-Memory inmediatamente después de un `COMMIT` exitoso en PostgreSQL.
*   **Justificación:** Para mantener la respuesta de la API por debajo de 2 segundos, el controlador REST debe retornar `200 OK` en cuanto el dinero se mueva. Cualquier tarea secundaria (alertas, envío al broker RabbitMQ, invocación de IA) será manejada por los Event Handlers sin bloquear el *Event Loop* de Fastify/Express que procesó la transacción primaria.
