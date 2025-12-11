import { createClient } from '@supabase/supabase-js';
import { disableConsoleInProduction } from './securityConfig';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltam variáveis de ambiente do Supabase');
}

// Desabilitar console em produção
disableConsoleInProduction();

// Criar cliente Supabase com configurações de segurança
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // Armazenar sessão de forma segura
        storage: window.localStorage,
        storageKey: 'fluxtime-auth',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // Prevenir exposição de tokens em URLs
        flowType: 'pkce',
    },
    global: {
        headers: {
            'X-Client-Info': 'fluxtime-web',
        },
    },
    // Desabilitar logs automáticos do Supabase em produção
    ...(import.meta.env.PROD && {
        realtime: {
            log_level: 'error' as any,
        },
    }),
});
