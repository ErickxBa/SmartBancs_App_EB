import os
import asyncio
import google.generativeai as genai
import logging

logger = logging.getLogger(__name__)

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Use a standard Gemini model (e.g. gemini-flash-latest for fast text generation)
model = genai.GenerativeModel('gemini-flash-latest')

# Nota: Si por alguna extraña razón tu llave generara otro 404, 
# el modelo más seguro y universal de respaldo es 'gemini-pro'

async def analyze_transaction(amount: float) -> str:
    """
    Calls the Gemini API to analyze the transaction amount and generate a financial recommendation.
    Includes robust error handling.
    """
    try:
        if not os.getenv("GEMINI_API_KEY"):
            logger.warning("GEMINI_API_KEY no encontrada. Generando recomendación mockeada.")
            return f"[Mock] Sugerencia: El monto de {amount} indica un gasto normal."

        prompt = f"""Eres la Inteligencia Artificial integrada en "SmartBancs App", una moderna plataforma financiera.
        El usuario acaba de completar una transferencia en tiempo real por un monto de {amount} USD.
        Tu objetivo es ofrecer una recomendación financiera altamente personalizada, ágil y concisa (máximo 2 oraciones breves) basada en este monto.
        El tono debe ser profesional, aportar valor financiero inmediato y demostrar la innovación tecnológica de SmartBancs."""

        response = await asyncio.wait_for(
            model.generate_content_async(prompt),
            timeout=15.0
        )
        
        return response.text.strip()
    
    except Exception as e:
        logger.error(f"Error al llamar a Gemini API (Caída del servicio): {e}")
        logger.info("Activando mecanismo de resiliencia (Fallback Mock)...")
        return f"[SmartBancs IA] Tu transferencia de {amount} USD fue procesada en tiempo real. Tip de resiliencia: Automatiza tus ahorros programando transferencias recurrentes para fortalecer tu salud financiera."
