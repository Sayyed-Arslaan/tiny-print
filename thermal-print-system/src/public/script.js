// Initialization
let AUTH_TOKEN = null;
let currentAlign = 'LT';
let currentStyle = 'NORMAL';
let processedImageBase64 = null;

const UI = {
    statusText: document.getElementById('status-text'),
    btnStatus: document.getElementById('btn-status'),
    printerSelect: document.getElementById('printer-select'),
    btnRefreshPrinters: document.getElementById('btn-refresh-printers'),
    manualConnect: document.getElementById('manual-connect'),
    connectionType: document.getElementById('connection-type'),
    btnConnect: document.getElementById('btn-connect'),
    btnDisconnect: document.getElementById('btn-disconnect'),
    paperWidth: document.getElementById('paper-width'),
    imageDensity: document.getElementById('image-density'),
    densityValue: document.getElementById('density-value'),
    btnAlignLeft: document.getElementById('btn-align-left'),
    btnAlignCenter: document.getElementById('btn-align-center'),
    btnAlignRight: document.getElementById('btn-align-right'),
    btnStyleBold: document.getElementById('btn-style-bold'),
    textInput: document.getElementById('text-input'),
    btnPrintText: document.getElementById('btn-print-text'),
    imageUpload: document.getElementById('image-upload'),
    btnPrintImage: document.getElementById('btn-print-image'),
    imagePreview: document.getElementById('image-preview'),
    qrInput: document.getElementById('qr-input'),
    qrSize: document.getElementById('qr-size'),
    btnPrintQr: document.getElementById('btn-print-qr'),
    consoleOutput: document.getElementById('console-output'),
    btnClearConsole: document.getElementById('btn-clear-console')
};

// Utilities
function logMsg(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const span = document.createElement('span');
    span.style.color = type === 'error' ? '#ff4c4c' : (type === 'success' ? '#00ff00' : '#b3b3b3');
    span.innerText = `[${timestamp}] ${message}\n`;
    UI.consoleOutput.appendChild(span);
    UI.consoleOutput.scrollTop = UI.consoleOutput.scrollHeight;
}

// Ensure proper URL fetching from same origin
async function apiCall(endpoint, method = 'GET', body = null) {
    if (!AUTH_TOKEN && endpoint !== '/api/token') {
        logMsg('Wait, fetching auth token first...', 'info');
        await fetchAuthToken();
    }

    const headers = {
        'x-auth-token': AUTH_TOKEN
    };

    // For FormData we don't set Content-Type, browser sets it with boundary
    if (body && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const options = {
        method,
        headers
    };

    if (body) {
        options.body = body instanceof FormData ? body : JSON.stringify(body);
    }

    try {
        const response = await fetch(endpoint, options);
        if (!response.ok) {
            let errInfo;
            try {
                const errData = await response.json();
                errInfo = errData.error || response.statusText;
            } catch (e) {
                errInfo = response.statusText;
            }
            throw new Error(`API Error (${response.status}): ${errInfo}`);
        }
        return await response.json();
    } catch (error) {
        logMsg(`API Call Failed (${endpoint}): ${error.message}`, 'error');
        throw error;
    }
}

async function fetchAuthToken() {
    try {
        const res = await fetch('/api/token');
        const data = await res.json();
        AUTH_TOKEN = data.token;
        logMsg('Token acquired successfully.', 'success');
    } catch (error) {
        logMsg('Failed to acquire token.', 'error');
    }
}

// Handlers
async function checkStatus() {
    try {
        const data = await apiCall('/api/status');
        if (data.connected) {
            UI.statusText.innerText = 'Connected';
            UI.statusText.className = 'status-connected';
            logMsg(`Printer is connected.`, 'success');
        } else {
            UI.statusText.innerText = 'Disconnected';
            UI.statusText.className = 'status-disconnected';
            logMsg(`Printer is disconnected.`);
        }
    } catch (error) {
        // Log handled in apiCall
    }
}

async function loadPrinters() {
    logMsg('Discovering Bluetooth printers... (This may take a moment)');
    UI.btnRefreshPrinters.disabled = true;
    try {
        const data = await apiCall('/api/printers');
        UI.printerSelect.innerHTML = '<option value="">-- Select a printer --</option>';
        if (data.printers && data.printers.length > 0) {
            data.printers.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.innerText = `${p.name} (${p.id})`;
                UI.printerSelect.appendChild(opt);
            });
            logMsg(`Found ${data.printers.length} Bluetooth printers.`, 'success');
        } else {
            logMsg('No Bluetooth printers found. Try manual connection.', 'info');
        }
    } catch (error) {
        logMsg('Error discovering printers.', 'error');
    } finally {
        UI.btnRefreshPrinters.disabled = false;
    }
}

async function connectPrinter() {
    const selectedPrinter = UI.printerSelect.value;
    const manualInput = UI.manualConnect.value.trim();
    const type = UI.connectionType.value;

    const connectionString = manualInput || selectedPrinter;

    if (!connectionString) {
        logMsg('Please select a printer or enter a manual connection string.', 'error');
        return;
    }

    logMsg(`Connecting to ${connectionString} via ${type}...`);
    UI.btnConnect.disabled = true;
    try {
        const data = await apiCall('/api/connect', 'POST', { connectionString, type });
        logMsg(data.message, 'success');
        checkStatus();
    } catch (error) {
        logMsg('Failed to connect.', 'error');
    } finally {
        UI.btnConnect.disabled = false;
    }
}

async function disconnectPrinter() {
    logMsg('Disconnecting...');
    UI.btnDisconnect.disabled = true;
    try {
        const data = await apiCall('/api/disconnect', 'POST');
        logMsg(data.message, 'success');
        checkStatus();
    } catch (error) {
        logMsg('Failed to disconnect.', 'error');
    } finally {
        UI.btnDisconnect.disabled = false;
    }
}

async function printText() {
    const text = UI.textInput.value;
    const width = parseInt(UI.paperWidth.value, 10);

    if (!text.trim()) {
        logMsg('Please enter some text to print.', 'error');
        return;
    }

    logMsg('Sending print text command...');
    UI.btnPrintText.disabled = true;
    try {
        const data = await apiCall('/api/print/text', 'POST', {
            text,
            align: currentAlign,
            style: currentStyle,
            width
        });
        logMsg(data.message, 'success');
    } catch (error) {
        // error logged in apiCall
    } finally {
        UI.btnPrintText.disabled = false;
    }
}

let originalImageSrc = null;

function renderImagePreview() {
    if (!originalImageSrc) return;

    const img = new Image();
    img.onload = function() {
        const targetWidth = parseInt(UI.paperWidth.value, 10) === 80 ? 576 : 464;
        const aspect = img.height / img.width;
        const targetHeight = Math.round(targetWidth * aspect);
        const density = parseInt(UI.imageDensity.value, 10);

        const canvas = UI.imagePreview;
        const ctx = canvas.getContext('2d');

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Draw image on white background
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Simple client-side B/W threshold preview reflecting density shift
        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const data = imageData.data;
        for(let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
            let lum = (r * 0.299 + g * 0.587 + b * 0.114);

            // apply density
            lum = Math.max(0, Math.min(255, lum + density));

            const v = (a < 128 || lum >= 128) ? 255 : 0;
            data[i] = data[i+1] = data[i+2] = v;
            data[i+3] = 255;
        }
        ctx.putImageData(imageData, 0, 0);

        // Save base64 for upload
        processedImageBase64 = originalImageSrc; // Send original to backend to apply precise Floyd-Steinberg dithering
        UI.btnPrintImage.disabled = false;
    }
    img.src = originalImageSrc;
}

function processImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        originalImageSrc = event.target.result;
        renderImagePreview();
        logMsg('Image loaded and preview generated.');
    }
    reader.readAsDataURL(file);
}

UI.imageDensity.addEventListener('input', (e) => {
    UI.densityValue.innerText = e.target.value;
});

UI.imageDensity.addEventListener('change', (e) => {
    if (originalImageSrc) {
        renderImagePreview();
    }
});

async function printImage() {
    if (!processedImageBase64) return;
    const width = parseInt(UI.paperWidth.value, 10);
    const density = parseInt(UI.imageDensity.value, 10);

    logMsg('Sending print image command...');
    UI.btnPrintImage.disabled = true;
    try {
        const data = await apiCall('/api/print/image', 'POST', {
            imageBase64: processedImageBase64,
            width,
            density
        });
        logMsg(data.message, 'success');
    } catch (error) {
        // error logged
    } finally {
        UI.btnPrintImage.disabled = false;
    }
}

async function printQr() {
    const dataString = UI.qrInput.value.trim();
    const size = parseInt(UI.qrSize.value, 10);

    if (!dataString) {
        logMsg('Please enter data for QR code.', 'error');
        return;
    }

    logMsg('Sending print QR command...');
    UI.btnPrintQr.disabled = true;
    try {
        const data = await apiCall('/api/print/qr', 'POST', {
            data: dataString,
            size
        });
        logMsg(data.message, 'success');
    } catch (error) {
        // error logged
    } finally {
        UI.btnPrintQr.disabled = false;
    }
}

// Event Listeners
UI.btnStatus.addEventListener('click', checkStatus);
UI.btnRefreshPrinters.addEventListener('click', loadPrinters);
UI.btnConnect.addEventListener('click', connectPrinter);
UI.btnDisconnect.addEventListener('click', disconnectPrinter);
UI.btnPrintText.addEventListener('click', printText);
UI.imageUpload.addEventListener('change', processImageUpload);
UI.btnPrintImage.addEventListener('click', printImage);
UI.btnPrintQr.addEventListener('click', printQr);
UI.btnClearConsole.addEventListener('click', () => { UI.consoleOutput.innerHTML = ''; });

// Formatting Toggles
function updateFormatting(type, value, btn) {
    if (type === 'align') {
        currentAlign = value;
        [UI.btnAlignLeft, UI.btnAlignCenter, UI.btnAlignRight].forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    } else if (type === 'style') {
        if (currentStyle === 'NORMAL') {
            currentStyle = 'B';
            btn.classList.add('active');
        } else {
            currentStyle = 'NORMAL';
            btn.classList.remove('active');
        }
    }
}

UI.btnAlignLeft.addEventListener('click', () => updateFormatting('align', 'LT', UI.btnAlignLeft));
UI.btnAlignCenter.addEventListener('click', () => updateFormatting('align', 'CT', UI.btnAlignCenter));
UI.btnAlignRight.addEventListener('click', () => updateFormatting('align', 'RT', UI.btnAlignRight));
UI.btnStyleBold.addEventListener('click', () => updateFormatting('style', 'B', UI.btnStyleBold));

// Init
window.addEventListener('DOMContentLoaded', async () => {
    logMsg('Initializing Thermal Printer Web Tool...');
    await fetchAuthToken();
    checkStatus();
});
