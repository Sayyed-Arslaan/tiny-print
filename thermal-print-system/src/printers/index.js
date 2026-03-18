const escpos = require('escpos');
// install escpos-usb escpos-network escpos-serialport escpos-bluetooth if you need them
escpos.Bluetooth = require('escpos-bluetooth');
escpos.Serial = require('escpos-serialport');
const { processImage } = require('../utils/image');
const path = require('path');
const fs = require('fs');

let device = null;
let printer = null;

/**
 * List available Bluetooth printers
 */
async function getPrinters() {
    return new Promise((resolve, reject) => {
        try {
            // escpos-bluetooth uses node-bluetooth which might need special handling
            // Here we can use the native Bluetooth search
            const bluetooth = require('node-bluetooth');
            const devices = [];
            const deviceObj = new bluetooth.DeviceINQ();

            deviceObj.on('found', function found(address, name) {
                devices.push({
                    id: address,
                    name: name,
                    type: 'bluetooth'
                });
            });

            deviceObj.on('finished', function finished() {
                resolve(devices);
            });

            deviceObj.inquire();
        } catch (err) {
            console.error("Bluetooth discovery failed. Fallback to list empty or serial ports.", err);
            // Fallback: we could also list Serial ports if needed
            resolve([]);
        }
    });
}

/**
 * Connect to a printer
 * @param {string} connectionString - Bluetooth MAC address or COM port path
 * @param {string} type - 'bluetooth' or 'serial'
 */
function connectPrinter(connectionString, type = 'bluetooth') {
    return new Promise((resolve, reject) => {
        if (device) {
            device.close();
            device = null;
            printer = null;
        }

        try {
            if (type === 'bluetooth') {
                device = new escpos.Bluetooth(connectionString, 1); // 1 is channel usually
            } else if (type === 'serial') {
                device = new escpos.Serial(connectionString, {
                    baudRate: 9600,
                    autoOpen: false
                });
            } else {
                return reject(new Error('Unknown connection type. Use bluetooth or serial.'));
            }

            device.open((err) => {
                if (err) {
                    console.error('Failed to open device', err);
                    device = null;
                    return reject(err);
                }

                // Default thermal printer options. Assuming 58mm -> 32 characters per line normally, we can configure this via options.
                const options = { encoding: "GB18030" }; // Common encoding for thermal printers
                printer = new escpos.Printer(device, options);
                console.log('Printer connected successfully to:', connectionString);
                resolve(true);
            });
        } catch (error) {
            reject(error);
        }
    });
}

function disconnectPrinter() {
    return new Promise((resolve, reject) => {
        if (device) {
            device.close((err) => {
                if (err) return reject(err);
                device = null;
                printer = null;
                resolve(true);
            });
        } else {
            resolve(true);
        }
    });
}

/**
 * Print Text
 */
async function printText(text, align = 'CT', style = 'NORMAL', width = 58) {
    if (!printer) throw new Error('Printer not connected');

    return new Promise((resolve, reject) => {
        try {
            printer.font('a')
                   .align(align) // 'CT', 'LT', 'RT'
                   .style(style) // 'B' (bold), 'I' (italic), 'U' (underline), 'U2', 'BI', 'BIU', 'BIU2', 'NORMAL'
                   .size(1, 1)
                   .text(text)
                   .feed(3)
                   .cut(); // Cut paper if printer supports it (many 58mm don't, but sending cut is usually safe)
            resolve();
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Print an image
 */
async function printImage(imageBuffer, width = 58, density = 0) {
    if (!printer) throw new Error('Printer not connected');

    // Calculate target width in pixels
    // 58mm ≈ 464px, 80mm ≈ 576px (or similar)
    const targetWidth = width === 80 ? 576 : 464;

    try {
        const processedJimpImage = await processImage(imageBuffer, targetWidth, density);

        // Save the processed image to a temp file because escpos.Image.load wants a path
        const tempPath = path.join(__dirname, '..', '..', 'temp_image.png');
        await processedJimpImage.write(tempPath);

        return new Promise((resolve, reject) => {
            escpos.Image.load(tempPath, function(image) {
                printer.align('CT')
                       .raster(image) // Can use raster or image
                       .feed(3)
                       .cut();

                // Clean up
                fs.unlinkSync(tempPath);
                resolve();
            });
        });
    } catch (err) {
        throw err;
    }
}

/**
 * Print a QR Code
 */
async function printQR(data, size = 6) {
    if (!printer) throw new Error('Printer not connected');

    return new Promise((resolve, reject) => {
        try {
            printer.align('CT')
                   .qrimage(data, { type: 'png', mode: 'dhdw', size: size }, function(err) {
                       if (err) return reject(err);
                       printer.feed(3)
                              .cut();
                       resolve();
                   });
        } catch (err) {
            reject(err);
        }
    });
}

function getStatus() {
    return {
        connected: !!printer,
        device: device ? device.device : null
    };
}

module.exports = {
    getPrinters,
    connectPrinter,
    disconnectPrinter,
    printText,
    printImage,
    printQR,
    getStatus
};