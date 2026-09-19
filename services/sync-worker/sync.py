import os
import time
import logging
from sqlalchemy import create_engine, text

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("SyncWorker")

def main():
    db_url = os.getenv("DATABASE_URL", "postgresql://app_user:app_password@postgres:5432/smartbancs")
    
    # Retry mechanism to wait for DB
    engine = create_engine(db_url)
    
    logger.info("Iniciando Sync Worker (Patrón Outbox). Escuchando transacciones completadas...")
    
    while True:
        try:
            with engine.connect() as conn:
                # 1. Buscar transacciones marcadas como COMPLETED pero no SYNCED
                # Como simplificación, buscaremos status = 'COMPLETED' y lo actualizaremos a 'SYNCED'
                # En un entorno real se usaría un campo is_synced o una tabla outbox_events
                
                query_select = text("""
                    SELECT id, amount, "account_from", "account_to" 
                    FROM transactions 
                    WHERE status = 'COMPLETED' 
                    LIMIT 10
                """)
                
                result = conn.execute(query_select)
                rows = result.fetchall()
                
                if rows:
                    logger.info(f"Se encontraron {len(rows)} transacciones para sincronizar con Bancs Core.")
                    
                    for row in rows:
                        tx_id = row[0]
                        # Simular el envío al sistema central 'Bancs'
                        logger.info(f"Sincronizando TX {tx_id} con Sistema Central...")
                        time.sleep(0.1) # Simulando latencia de red
                        
                        # 2. Actualizar estado a SYNCED
                        query_update = text("""
                            UPDATE transactions 
                            SET status = 'SYNCED' 
                            WHERE id = :tx_id
                        """)
                        conn.execute(query_update, {"tx_id": tx_id})
                    
                    conn.commit()
                    logger.info(f"Lote de {len(rows)} transacciones sincronizado exitosamente.")
                
        except Exception as e:
            logger.error(f"Error en Sync Worker: {e}")
            
        # Esperar antes de la siguiente iteración (Rate Limiting)
        time.sleep(5)

if __name__ == "__main__":
    main()
