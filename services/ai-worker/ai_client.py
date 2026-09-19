import os
import google.generativeai as genai
import logging

logger = logging.getLogger(__name__)

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Use a standard Gemini model (e.g. gemini-1.5-flash for fast text generation)
model = genai.GenerativeModel('gemini-1.5-flash')

async def analyze_transaction(amount: float) -> str:
    """
    Calls the Gemini API to analyze the transaction amount and generate a financial recommendation.
    Includes robust error handling.
    """
    try:
        if not os.getenv("GEMINI_API_KEY"):
            logger.warning("GEMINI_API_KEY no encontrada. Generando recomendación mockeada.")
            return f"[Mock] Sugerencia: El monto de {amount} indica un gasto normal."

        prompt = f"Actúa como un asesor financiero experto. El usuario acaba de transferir {amount} USD. En un máximo de 2 oraciones, dale un pequeño tip o recomendación financiera sobre este gasto."

        # Since genai library is synchronous for generate_content by default in some versions, 
        # we can use generate_content_async if available, or fallback to generate_content.
        # We will use generate_content_async.
        response = await model.generate_content_async(prompt)
        
        return response.text.strip()
    
    except Exception as e:
        logger.error(f"Error al llamar a Gemini API: {e}")
        return "Recomendación no disponible por el momento (Error de IA)."
