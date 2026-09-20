const API_BASE = 'http://localhost:3000';

// Modal Logic
function closeModal() {
    document.getElementById('welcome-modal').classList.add('hidden');
}

// Formatters
const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
const formatUUID = (uuid) => `${uuid.substring(0, 8)}...`;

// Copiar al portapapeles
function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    alert('UUID copiado: ' + text);
}

// Fetch and render accounts
async function loadAccounts() {
    try {
        const response = await fetch(`${API_BASE}/accounts`);
        if (!response.ok) throw new Error('API Off');
        const accounts = await response.json();
        
        const tbody = document.getElementById('accountsTableBody');
        tbody.innerHTML = '';
        
        accounts.forEach(acc => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="uuid-cell" onclick="copyToClipboard('${acc.id}')" title="Click para copiar">${formatUUID(acc.id)}</td>
                <td style="font-weight: 600;">${formatCurrency(acc.balance)}</td>
                <td><button onclick="deleteAccount('${acc.id}')" style="background:transparent; border:none; cursor:pointer; color:var(--danger);" title="Eliminar cuenta"><i class="fas fa-trash-alt"></i></button></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error('Error loadAccounts', e);
    }
}

async function deleteAccount(id) {
    if (!confirm('¿Seguro que deseas eliminar esta cuenta permanentemente?')) return;
    try {
        const response = await fetch(`${API_BASE}/accounts/${id}`, { method: 'DELETE' });
        if (response.ok) await loadAccounts();
    } catch (e) {
        alert("Error eliminando cuenta.");
    }
}

// Fetch and render transactions
async function loadTransactions() {
    try {
        const response = await fetch(`${API_BASE}/transactions`);
        if (!response.ok) throw new Error('API Off');
        const txs = await response.json();
        
        const tbody = document.getElementById('transactionsTableBody');
        tbody.innerHTML = '';
        
        txs.forEach(tx => {
            const badgeClass = tx.status === 'success' ? 'badge-success' : 'badge-error';
            const aiText = tx.recommendation ? tx.recommendation : '<span style="color:#64748b">Esperando IA...</span>';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="uuid-cell" title="${tx.traceId}">${formatUUID(tx.traceId)}</td>
                <td><span class="${badgeClass}">${tx.status.toUpperCase()}</span></td>
                <td>${formatCurrency(tx.amount)}</td>
                <td>${aiText}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error('Error loadTransactions', e);
    }
}

// Create Account Handler
document.getElementById('createAccountForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
        const ownerName = document.getElementById('ownerName').value;
        const initialBalance = parseFloat(document.getElementById('initialBalance').value);
        
        const response = await fetch(`${API_BASE}/accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ownerName, initialBalance })
        });
        
        if (response.ok) {
            document.getElementById('ownerName').value = '';
            document.getElementById('initialBalance').value = '';
            await loadAccounts();
        }
    } catch (e) {
        alert("Error creando cuenta. Asegúrate que la API esté encendida.");
    } finally {
        btn.innerHTML = originalText;
    }
});

// Transfer Handler
document.getElementById('transferForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnTransfer');
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        const accountFrom = document.getElementById('accountFrom').value;
        const accountTo = document.getElementById('accountTo').value;
        const amount = parseFloat(document.getElementById('transferAmount').value);
        
        const response = await fetch(`${API_BASE}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountFrom, accountTo, amount })
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'Error en la transacción');
        }
        
        // Clear amounts
        document.getElementById('transferAmount').value = '';
        
        // Reload data
        await loadAccounts();
        await loadTransactions();
        
    } catch (e) {
        alert(e.message);
    } finally {
        btn.innerHTML = originalText;
    }
});

// Init & Polling
window.addEventListener('DOMContentLoaded', () => {
    loadAccounts();
    loadTransactions();
    
    // Auto-refresh tables every 3 seconds to catch async AI updates
    setInterval(() => {
        loadAccounts();
        loadTransactions();
    }, 3000);
});

// Stress Test (Simular Pico de Quincena)
async function runStressTest() {
    const btn = document.getElementById('btnStress');
    
    // Obtener las cuentas directamente de la tabla
    const tbody = document.getElementById('accountsTableBody');
    const rows = tbody.querySelectorAll('tr');
    
    if (rows.length < 2) {
        alert("Necesitas crear al menos 2 cuentas para realizar el Stress Test.");
        return;
    }
    
    // Extraer los UUIDs de las dos primeras cuentas usando la propiedad title (agregada previamente) o el texto
    // Vamos a buscar la lista de cuentas desde la API para estar seguros.
    try {
        const response = await fetch(`${API_BASE}/accounts`);
        const accounts = await response.json();
        
        if (accounts.length < 2) {
            alert("Necesitas crear al menos 2 cuentas para realizar el Stress Test.");
            return;
        }
        
        const accountFrom = accounts[0].id;
        const accountTo = accounts[1].id;
        const totalRequests = 50; // Vamos a mandar 50 transferencias asíncronas de $1
        
        if (!confirm(`¿Estás seguro? Esto enviará ${totalRequests} transacciones concurrentes desde la cuenta 1 a la cuenta 2 para saturar el servidor y probar la observabilidad.`)) {
            return;
        }
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saturando...';
        btn.disabled = true;
        
        let promises = [];
        for (let i = 0; i < totalRequests; i++) {
            promises.push(fetch(`${API_BASE}/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountFrom, accountTo, amount: 1.00 })
            }));
        }
        
        // Disparar todas las promesas en paralelo
        await Promise.allSettled(promises);
        
        btn.innerHTML = '<i class="fas fa-bolt"></i> Simular Pico Transaccional (Stress Test)';
        btn.disabled = false;
        
        alert("¡Pico Transaccional Simulado con Éxito! Revisa Grafana para ver el impacto en las métricas.");
        await loadAccounts();
        await loadTransactions();
        
    } catch (e) {
        alert("Error en el Stress Test.");
        btn.innerHTML = '<i class="fas fa-bolt"></i> Simular Pico Transaccional (Stress Test)';
        btn.disabled = false;
    }
}
