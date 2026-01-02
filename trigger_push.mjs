import https from 'node:https';

const data = JSON.stringify({
    appointment_id: "86f11993-af65-436c-ac66-fe1313cb401a"
});

const options = {
    hostname: 'efyivbwumwhakzdpfarn.supabase.co',
    port: 443,
    path: '/functions/v1/send-push-notification',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeWl2Ynd1bXdoYWt6ZHBmYXJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxOTU2MDYsImV4cCI6MjA4MDc3MTYwNn0.bVsE9mxQk-2TiNS_mrBpEQ4PE25gejZfLfTaGzzrujs',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
    res.on('end', () => {
        console.log('\n');
    });
});

req.on('error', (error) => {
    console.error('ERRO:', error);
});

req.write(data);
req.end();
