# Thermal Printer Web Tool

A production-ready web application and local Node.js bridge to connect and print to 58mm (or 80mm) Bluetooth and Serial thermal printers from your laptop (Windows 10/11 & Linux).

## Overview
This tool bridges your browser and a thermal printer. It provides a clean, easy-to-use web UI to print text, upload and print images (automatically dithered and resized for thermal receipts), and print QR codes. It supports:
- **Bluetooth** connection (via MAC address / Windows paired devices)
- **Serial / COM** fallback (via COM3, COM4, /dev/rfcomm0)

## Project Structure
- `server.js` - The main Express application running the local API and serving the UI.
- `src/printers/index.js` - The bridge logic interacting with the `escpos` libraries.
- `src/utils/image.js` - The image processing utility using `jimp` to resize, grayscale, and dither images.
- `src/public/` - The web UI files (`index.html`, `style.css`, `script.js`).
- `examples/` - Example Node.js scripts demonstrating API usage.

## Installation

### Prerequisites
- Node.js v18 or higher installed on your machine.
- For Linux environments, you may need Bluetooth development headers:
  ```bash
  sudo apt-get install libbluetooth-dev
  ```
- A paired or USB/Serial connected Thermal Printer.

### Setup
1. Clone the repository or navigate into the folder:
   ```bash
   cd thermal-print-system
   ```
2. Install the necessary dependencies:
   ```bash
   npm install
   ```

## User Quick Start

### 1. Pair the Printer (Windows 10/11)
1. Turn on your thermal printer.
2. Go to **Settings > Bluetooth & devices > Add device**.
3. Select **Bluetooth**.
4. Find your printer (often named `Printer001`, `MPT-II`, `POS-58`, etc.).
5. Enter the PIN if prompted (usually `0000` or `1234`).
6. *Finding the COM port (Optional, for Serial Fallback):*
   - Open **Device Manager**.
   - Expand the **Ports (COM & LPT)** section. Look for a "Standard Serial over Bluetooth link (COMx)" to find the COM port number assigned to the printer.

### 2. Run the Local Bridge
Start the Node.js server. Open a terminal in the project directory and run:
```bash
npm start
# or
node server.js
```
*Note: A security token will be printed to the console upon starting. The UI will automatically fetch this via an internal mechanism on localhost to prevent unauthorized external access.*

### 3. Open the Web UI
Open your Chrome or Edge browser and navigate to:
```
http://localhost:3000
```

### 4. Connect and Print
1. **Connect:** Use the "Discovered Bluetooth Printers" dropdown, or enter a MAC address/COM port manually. Select the connection type (Bluetooth or Serial) and click **Connect Printer**.
2. **Print Text:** Enter text, adjust alignment or style, and click **Print Text**.
3. **Print Image:** Choose a PNG or JPG file. The tool will generate a dithered 1-bit preview. Click **Print Image**.
4. **Print QR:** Enter the URL or data and click **Print QR**.

## Troubleshooting
- **Printer Connected, but not printing:**
  - Verify you selected the correct COM port or MAC address.
  - If Bluetooth API fails to discover, pair the printer via OS settings, check the COM port in Device Manager, and connect via **Serial (COM)** in the UI.
- **Port Permission Error:**
  - On Linux: Ensure your user is in the `dialout` group: `sudo usermod -a -G dialout $USER`.
  - On Windows: Run the command prompt as Administrator if the COM port is locked.
- **Dependency Installation Errors (node-gyp):**
  - Make sure you have the appropriate build tools installed (e.g., Visual Studio Build Tools for Windows, or `build-essential` on Linux).

## Running Tests
To test the API programmatically, you can run the example script provided.
1. Start the server (`node server.js`).
2. Open `examples/test.js` and insert the generated token from the server console.
3. Update `CONNECTION_STRING` to match your printer's COM port or MAC address.
4. Run:
   ```bash
   node examples/test.js
   ```

## License
MIT License
