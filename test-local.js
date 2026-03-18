async function runTest() {
    try {
        let res = await fetch('http://localhost:3000/api/token');
        let data = await res.json();
        const AUTH_TOKEN = data.token;
        console.log("Token:", AUTH_TOKEN);

        console.log('1. Fetching available printers...');
        res = await fetch('http://localhost:3000/api/printers', {
            headers: { 'x-auth-token': AUTH_TOKEN }
        });
        data = await res.json();
        console.log("Printers:", data);

        console.log('2. Fetching status...');
        res = await fetch('http://localhost:3000/api/status', {
            headers: { 'x-auth-token': AUTH_TOKEN }
        });
        data = await res.json();
        console.log("Status:", data);

        console.log('API running properly');
    } catch (err) {
        console.error('Test failed:', err);
    }
}
runTest();
