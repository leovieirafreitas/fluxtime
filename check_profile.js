
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://efyivbwumwhakzdpfarn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeWl2Ynd1bXdoYWt6ZHBmYXJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxOTU2MDYsImV4cCI6MjA4MDc3MTYwNn0.bVsE9mxQk-2TiNS_mrBpEQ4PE25gejZfLfTaGzzrujs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

    if (error) {
        console.error(error);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

check();
