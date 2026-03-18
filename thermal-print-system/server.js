const express = require('express');
const multer = require('multer');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const {
    getPrinters,
    connectPrinter,
    disconnectPrinter,
    printText,
    printImage,
    printQR,
    getStatus
} = require('./src/printers');

const app = express();
const port = 3000;

// Setup single instance memory storage for images
const upload = multer({ storage: multer.memoryStorage() });

// Auto-generate local token for basic security to prevent unauthorized access
const AUTH_TOKEN = crypto.randomBytes(16).toString('hex');
console.log('====================================================');
console.log('SECURITY TOKEN (Required for API usage):');
console.log(AUTH_TOKEN);
console.log('====================================================');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
// We also pass the token to the frontend indirectly or let the frontend prompt for it
// For localhost simplicity, we will just allow the local UI to run, and the UI can inject the token if needed
// Actually, since it's local only, a simple way is to pass the token to a dedicated endpoint, or require it in a header.
// Let's create an endpoint the UI can fetch it from (since UI is served from same origin localhost).
app.use(express.static(path.join(__dirname, 'src/public')));

// Protect API routes
const requireToken = (req, res, next) => {
    // For localhost convenience, we allow fetching the token from the UI itself if we want,
    // or we check the header.
    const token = req.headers['authorization'] || req.headers['x-auth-token'];

    // Only allow localhost connections
    const remoteIp = req.connection.remoteAddress;
    if (!remoteIp.includes('127.0.0.1') && !remoteIp.includes('::1')) {
        return res.status(403).json({ error: 'Only localhost access is allowed' });
    }

    if (token === AUTH_TOKEN || req.path === '/token') {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

app.use('/api', requireToken);

// Expose token to local UI only (since we restrict by IP above)
app.get('/api/token', (req, res) => {
    res.json({ token: AUTH_TOKEN });
});

// Routes

app.get('/api/printers', async (req, res) => {
    try {
        const printers = await getPrinters();
        res.json({ printers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/connect', async (req, res) => {
    const { connectionString, type } = req.body;
    if (!connectionString) {
        return res.status(400).json({ error: 'connectionString is required' });
    }

    try {
        await connectPrinter(connectionString, type || 'bluetooth');
        res.json({ success: true, message: 'Connected successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/disconnect', async (req, res) => {
    try {
        await disconnectPrinter();
        res.json({ success: true, message: 'Disconnected successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/print/text', async (req, res) => {
    const { text, align, style, width } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    try {
        await printText(text, align, style, width);
        res.json({ success: true, message: 'Printed text successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/print/image', upload.single('image'), async (req, res) => {
    const width = req.body.width ? parseInt(req.body.width, 10) : 58;
    const density = req.body.density ? parseInt(req.body.density, 10) : 0;

    let imageBuffer = null;

    if (req.file) {
        imageBuffer = req.file.buffer;
    } else if (req.body.imageBase64) {
        const base64Data = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, "");
        imageBuffer = Buffer.from(base64Data, 'base64');
    }

    if (!imageBuffer) {
        return res.status(400).json({ error: 'No image provided' });
    }

    try {
        await printImage(imageBuffer, width, density);
        res.json({ success: true, message: 'Printed image successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/print/qr', async (req, res) => {
    const { data, size } = req.body;
    if (!data) return res.status(400).json({ error: 'data is required' });

    try {
        await printQR(data, size);
        res.json({ success: true, message: 'Printed QR successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/status', (req, res) => {
    try {
        const status = getStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Thermal Printer Web Tool is running at http://localhost:${port}`);
});
