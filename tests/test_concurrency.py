import asyncio
# pyrefly: ignore [missing-import]
import aiohttp
import time

# Usa las IDs del seed.sql
ACCOUNT_A = 'd9b2d63d-a233-4123-8478-1234567890ab'
ACCOUNT_B = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
URL = 'http://localhost:3000/transactions'

async def send_transfer(session, from_acc, to_acc, amount, req_id):
    payload = {
        "accountFrom": from_acc,
        "accountTo": to_acc,
        "amount": amount
    }
    start = time.time()
    try:
        async with session.post(URL, json=payload) as response:
            status = response.status
            data = await response.json() if status == 200 else await response.text()
            latency = (time.time() - start) * 1000
            print(f"[Req {req_id}] {from_acc[:4]} -> {to_acc[:4]} | Status: {status} | Latency: {latency:.2f}ms")
    except Exception as e:
        print(f"[Req {req_id}] FAILED: {e}")

async def main():
    print("Iniciando prueba de carga cruzada (Deadlock Testing)...")
    async with aiohttp.ClientSession() as session:
        tasks = []
        # Lanzamos 50 transferencias concurrentes. 25 de A->B y 25 de B->A al mismo tiempo.
        # Si no existiera el ordenamiento canónico, esto causaría un Deadlock.
        for i in range(50):
            if i % 2 == 0:
                tasks.append(send_transfer(session, ACCOUNT_A, ACCOUNT_B, 10, i))
            else:
                tasks.append(send_transfer(session, ACCOUNT_B, ACCOUNT_A, 5, i))
        
        await asyncio.gather(*tasks)
    print("Prueba finalizada.")

if __name__ == '__main__':
    asyncio.run(main())
