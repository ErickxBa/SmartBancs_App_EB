# Informe Postmortem: Incidente de Degradación de Transferencias

**Fecha del Incidente:** [Fecha Simulada - Inicio de Quincena]  
**Autor:** Equipo de Ingeniería SRE / Operaciones SmartBancs  
**Estado:** Resuelto  

---

## 1. Resumen Ejecutivo
Durante el pico transaccional correspondiente al pago de nóminas de quincena, los usuarios reportaron masivamente que las transferencias financieras no se completaban. El monitoreo de Prometheus y Grafana alertó sobre un incremento severo en la latencia del API (`POST /transactions`), múltiples errores de *Timeout* en la conexión con la base de datos y la detección de bloqueos mutuos (*Deadlocks*) en las tablas transaccionales de PostgreSQL.

## 2. Cronología del Incidente
- **T0:** Incremento severo del tráfico transaccional (inicio de procesamiento masivo de nóminas e interacciones de usuarios).
- **T+5m:** Prometheus levanta la alerta de latencias superiores a 5 segundos (Incumplimiento del SLA < 2s).
- **T+8m:** Aumento dramático de errores HTTP 500. Los logs de NestJS y Postgres muestran errores de tipo `Lock wait timeout exceeded` y `Deadlock detected`.
- **T+15m:** Se declara el incidente (SEV-1). Se inician las acciones de contención inmediata (ver sección 3).
- **T+25m:** Las acciones temporales estabilizan el sistema de base de datos.
- **T+30m:** La latencia general vuelve a sus valores normales operacionales. Se declara el fin de la emergencia.

## 3. Acciones Inmediatas (Contención Operativa)
Para estabilizar el sistema de manera rápida y evitar que la cascada de fallos afectara a todos los usuarios, se ejecutaron las siguientes acciones tácticas:

1. **Terminación de conexiones en estado crítico:** Mediante la consola administrativa de base de datos se ejecutó la finalización abrupta (`pg_terminate_backend(pid)`) de las consultas colgadas y de las sesiones en estado inactivo que mantenían bloqueos (*locks*).
2. **Rate Limiting (Limitación de Tasa):** Se implementó un *throttling* agresivo a nivel del API Gateway / Balanceador de Carga, devolviendo códigos `429 Too Many Requests` a una parte del tráfico. Esto representó una degradación elegante del servicio para proteger la base de datos y evitar el colapso total de PostgreSQL.
3. **Pausado de Flujos Asíncronos Pesados:** Se detuvo momentáneamente el Worker de Sincronización (*Sync Worker*) que enviaba datos al sistema legado Bancs, reduciendo la contención de red y disco en un 20%.

## 4. Análisis de la Causa Raíz (RCA)
La investigación liderada a través de las trazas de telemetría y los registros del orquestador de base de datos revelaron lo siguiente:

El cuello de botella fundamental y la latencia excesiva derivaron de **Condiciones de Carrera (Race Conditions) y Deadlocks recurrentes** al actualizar los saldos de cuentas bajo extrema concurrencia.

*   **El Mecanismo de Fallo:** Bajo un flujo alto, ocurrieron múltiples transferencias cruzadas simultáneas (Ejemplo clásico: La Cuenta A transfiere a la B, y en el mismo instante, la Cuenta B transfiere a la Cuenta A). Al utilizar bloqueos pesimistas (`SELECT FOR UPDATE`) sin un orden de recursos estricto, la transacción 1 bloqueó el registro de A y esperó a bloquear B, mientras que la transacción 2 bloqueó B y esperó a bloquear A. 
*   Esto generó un *Deadlock*. Postgres eventualmente detecta esto y mata una transacción para resolverlo, pero la sobrecarga del sistema manejando estos bloqueos y los tiempos de espera (*lock waits*) de las demás peticiones agotaron rápidamente el "pool" de conexiones del microservicio NestJS (produciendo los *Timeouts*).

## 5. Acciones Preventivas y de Remediación (Solución Definitiva)
Para garantizar que la arquitectura sea resiliente y soporte futuros picos transaccionales, se propusieron e implementaron las siguientes mejoras sistémicas.

### A Nivel de Código y Arquitectura Transaccional:
1. **Ordenamiento Canónico de IDs de Cuentas (Solución Aplicada):** Se refactorizó la lógica del manejador CQRS (`ProcessTransactionHandler`). Ahora, antes de ejecutar un `SELECT FOR UPDATE`, el sistema siempre ordena las cuentas de menor a mayor ID (Ej. independientemente de quién envía a quién, el sistema siempre bloquea primero la Cuenta con el ID `1` y luego la Cuenta `2`). Esto hace que sea matemáticamente imposible que ocurran abrazos mortales entre cuentas.
2. **Optimización de Timeouts y Manejo de Errores:** Se ajustó la configuración de TypeORM y del `TimeoutInterceptor` en NestJS para cancelar inmediatamente las transacciones si el motor tarda más de 2 segundos en responder, devolviendo un error claro de indisponibilidad temporal en lugar de retener el *thread* de ejecución.

### A Nivel de Infraestructura y Datos:
1. **Separación de Responsabilidades (CQRS de DB):** Proyectar una arquitectura de Base de Datos en clúster (Master/Read-Replicas). Todas las validaciones de consulta iniciales (como verificar saldos parciales) pueden apuntar a la base de lectura o a Redis.
2. **Validaciones Previas en Caché (Redis):** Integrar chequeos en memoria Redis de alta velocidad antes de tocar PostgreSQL, lo que filtra las transacciones inválidas por falta de fondos sin añadir estrés a la base de datos relacional.
3. **Alertas Proactivas Inteligentes:** Ajustar los umbrales de Prometheus para que se notifique al equipo SRE mediante Slack/PagerDuty inmediatamente cuando la métrica de bloqueos de PostgreSQL (`pg_locks`) aumente bruscamente, en lugar de alertar cuando la latencia HTTP ya ha degradado la experiencia del usuario.
