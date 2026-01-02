const https = require('https');

const data = JSON.stringify({
    appointment_id: "5415ca96-a6ad-44a5-b946-a09568fecd9e"
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
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
