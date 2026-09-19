import pandas as pd
import logging
from pathlib import Path
import os
from sqlalchemy import create_engine

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ETL-Bancs")

def extract(file_path: str) -> pd.DataFrame:
    logger.info(f"Extrayendo datos de: {file_path}")
    df = pd.read_json(file_path)
    logger.info(f"Registros extraídos: {len(df)}")
    return df

def transform(df: pd.DataFrame) -> pd.DataFrame:
    logger.info("Iniciando transformación...")
    initial_count = len(df)

    df = df.drop_duplicates(subset=["transaction_ref"])
    df = df.dropna(subset=["account_from", "amount"])
    
    df["created_at"] = pd.to_datetime(df["created_at"], dayfirst=True, errors="coerce", utc=True)
    
    df["amount"] = df["amount"].astype(str).str.replace(r"[^\d.]", "", regex=True)
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    
    df["tx_type"] = df["tx_type"].str.upper()
    df = df[(df["amount"] > 0) & (df["created_at"].notna())].copy()

    logger.info(f"Transformación completada. Registros válidos: {len(df)} (Descartados: {initial_count - len(df)})")
    return df

def load(df: pd.DataFrame):
    # En un entorno real se lee desde el .env
    db_url = os.getenv("DATABASE_URL", "postgresql://app_user:app_password@localhost:5432/smartbancs")
    logger.info(f"Conectando a la base de datos de Data Warehouse...")
    
    engine = create_engine(db_url)
    
    # Renombrar columnas para coincidir con la DB si fuera necesario
    # Por ahora asumiendo que insertaremos en una tabla analítica 'bancs_raw_transactions'
    table_name = "bancs_raw_transactions"
    
    try:
        df.to_sql(table_name, engine, if_exists="append", index=False)
        logger.info(f"Datos limpios guardados exitosamente en PostgreSQL (tabla '{table_name}').")
    except Exception as e:
        logger.error(f"Error al cargar en PostgreSQL: {e}")

if __name__ == "__main__":
    current_dir = Path(__file__).parent
    raw_df = extract(current_dir / "bancs_raw_data.json")
    clean_df = transform(raw_df)
    load(clean_df)