
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://efyivbwumwhakzdpfarn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeWl2Ynd1bXdoYWt6ZHBmYXJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxOTU2MDYsImV4cCI6MjA4MDc3MTYwNn0.bVsE9mxQk-2TiNS_mrBpEQ4PE25gejZfLfTaGzzrujs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log("Checking 'clients' table...");
    const { data, error } = await supabase
        .from('clients') // Trying English 'clients' first, usually standard
        .select('*')
        .limit(1);

    if (error) {
        console.log("Error with 'clients':", error.message);

        console.log("Checking 'clientes' table...");
        const { data: d2, error: e2 } = await supabase
            .from('clientes') // Trying Portuguese 'clientes' as user mentioned
            .select('*')
            .limit(1);

        if (e2) {
            console.log("Error with 'clientes':", e2.message);
        } else {
            console.log("Found 'clientes':", d2);
        }
    } else {
        console.log("Found 'clients':", data);
    }
}

check();
