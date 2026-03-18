const fs = require('fs');

/**
 * Example usage script.
 * Demonstrates how to connect to the printer programmatically via the local API.
 * Ensure the server is running (`npm start`) before executing this script.
 */

// Replace these variables with your actual token and printer connection string
const AUTH_TOKEN = 'ENTER_YOUR_GENERATED_TOKEN_HERE';
const CONNECTION_STRING = 'COM3'; // Or '00:11:22:33:44:55' for Bluetooth
const CONNECTION_TYPE = 'serial'; // 'bluetooth' or 'serial'

async function runTest() {
    try {
        console.log('1. Fetching available printers...');
        let res = await fetch('http://localhost:3000/api/printers', {
            headers: { 'x-auth-token': AUTH_TOKEN }
        });
        let data = await res.json();
        console.log(data);

        console.log(`2. Connecting to printer (${CONNECTION_STRING})...`);
        res = await fetch('http://localhost:3000/api/connect', {
            method: 'POST',
            headers: {
                'x-auth-token': AUTH_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                connectionString: CONNECTION_STRING,
                type: CONNECTION_TYPE
            })
        });
        data = await res.json();
        console.log(data);

        console.log('3. Printing text...');
        res = await fetch('http://localhost:3000/api/print/text', {
            method: 'POST',
            headers: {
                'x-auth-token': AUTH_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: 'Hello, this is a test from the script!\nThermal printing is working.',
                align: 'CT',
                style: 'B',
                width: 58
            })
        });
        data = await res.json();
        console.log(data);

        console.log('4. Disconnecting...');
        res = await fetch('http://localhost:3000/api/disconnect', {
            method: 'POST',
            headers: { 'x-auth-token': AUTH_TOKEN }
        });
        data = await res.json();
        console.log(data);

        console.log('Test completed.');
    } catch (err) {
        console.error('Test failed:', err);
    }
}

// runTest();
console.log('Update AUTH_TOKEN and CONNECTION_STRING in this file and uncomment runTest() to execute.');