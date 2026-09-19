import asyncio
import os
import json
import logging
import aio_pika
import asyncpg
from ai_client import analyze_transaction

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Environment Variables
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://admin:admin123@localhost:5672/")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://app_user:app_password@localhost:5432/smartbancs")

# If using asyncpg, we need to ensure the DSN starts with postgresql:// not postgresql+asyncpg://
if DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

async def update_transaction_recommendation(pool: asyncpg.Pool, transaction_id: str, recommendation: str):
    """
    Updates the transaction record in PostgreSQL with the AI recommendation.
    """
    query = """
        UPDATE transactions 
        SET recommendation = $1 
        WHERE id = $2
    """
    try:
        async with pool.acquire() as conn:
            await conn.execute(query, recommendation, transaction_id)
            logger.info(f"Recomendación guardada en Postgres para tx {transaction_id}")
    except Exception as e:
        logger.error(f"Error guardando en BD para tx {transaction_id}: {e}")

async def process_message(message: aio_pika.IncomingMessage, pool: asyncpg.Pool):
    """
    Callback function that is executed when a message is consumed from RabbitMQ.
    """
    async with message.process(ignore_processed=True):
        try:
            body = message.body.decode('utf-8')
            data = json.loads(body)
            
            transaction_id = data.get("transactionId")
            amount = data.get("amount")
            trace_id = data.get("traceId", "unknown")
            
            logger.info(f"Procesando evento tx.completed | traceId: {trace_id} | tx: {transaction_id} | amount: {amount}")
            
            # Call AI
            recommendation = await analyze_transaction(float(amount))
            logger.info(f"IA Result para {transaction_id}: {recommendation}")
            
            # Save to DB
            await update_transaction_recommendation(pool, transaction_id, recommendation)
            
            # Ack the message explicitly (though `async with message.process()` does it automatically if no exception)
            await message.ack()
            
        except Exception as e:
            logger.error(f"Error procesando mensaje: {e}")
            # Reject the message and do not requeue it if it's a poison pill (to avoid infinite loops)
            # In a real system, you might route it to a Dead Letter Queue (DLQ).
            await message.reject(requeue=False)

async def main():
    logger.info("Iniciando AI Worker...")
    
    # 1. Connect to PostgreSQL
    pool = await asyncpg.create_pool(DATABASE_URL)
    logger.info("Conectado a PostgreSQL.")
    
    # 2. Connect to RabbitMQ
    connection = None
    for attempt in range(10):
        try:
            connection = await aio_pika.connect_robust(RABBITMQ_URL)
            logger.info(f"Conectado a RabbitMQ en {RABBITMQ_URL.split('@')[-1]}")
            break
        except Exception as e:
            logger.warning(f"Error conectando a RabbitMQ (Intento {attempt+1}/10): {e}")
            await asyncio.sleep(5)
            
    if not connection:
        logger.error("No se pudo conectar a RabbitMQ después de varios intentos. Saliendo...")
        return
    
    async with connection:
        channel = await connection.channel()
        # Set prefetch count to limit concurrent unacked messages per consumer
        await channel.set_qos(prefetch_count=10)
        
        # Declare the exchange (must match NestJS)
        exchange = await channel.declare_exchange("smartbancs", aio_pika.ExchangeType.TOPIC, durable=True)
        
        # Declare the queue
        queue = await channel.declare_queue("ai_recommendations_queue", durable=True)
        
        # Bind the queue to the routing key
        await queue.bind(exchange, routing_key="tx.completed")
        
        logger.info("Esperando mensajes en tx.completed. Para salir presiona CTRL+C")
        
        # Start consuming
        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                # Process each message as an asyncio Task to not block the consumer loop
                asyncio.create_task(process_message(message, pool))

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker detenido manualmente.")
