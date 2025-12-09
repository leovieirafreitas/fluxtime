
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://efyivbwumwhakzdpfarn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeWl2Ynd1bXdoYWt6ZHBmYXJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxOTU2MDYsImV4cCI6MjA4MDc3MTYwNn0.bVsE9mxQk-2TiNS_mrBpEQ4PE25gejZfLfTaGzzrujs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    const phone = '92995199964';
    console.log(`Checking 'clients' table for phone ${phone}...`);

    const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('phone', phone);

    if (error) {
        console.log("Error:", error.message);
    } else {
        console.log("Found:", JSON.stringify(data, null, 2));
        if (data.length === 0) {
            console.log("No client found with this number. Creating one for testing...");
            // Attempt to insert if missing (might fail due to RLS but worth a try if public insert policies allow it, usually they don't without more config)
            // Actually, I can't insert without a policy, but let's see if it exists first.
        }
    }
}

check();
