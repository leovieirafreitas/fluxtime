/**
 * Configurações de Segurança do FluxTime
 * 
 * Este arquivo contém configurações para proteger dados sensíveis
 * e prevenir exposição de informações no console do navegador.
 */

// Desabilitar logs em produção
export const ENABLE_CONSOLE_LOGS = import.meta.env.DEV;

// Configuração de segurança para requisições
export const SECURITY_CONFIG = {
    // Mascarar dados sensíveis nos logs
    maskSensitiveData: true,

    // Campos que devem ser mascarados
    sensitiveFields: ['password', 'token', 'apiKey', 'secret', 'authorization'],

    // Prevenir exposição de erros detalhados em produção
    hideDetailedErrors: !import.meta.env.DEV,

    // Timeout para requisições (em ms)
    requestTimeout: 30000,
};

/**
 * Mascara dados sensíveis em objetos
 */
export function maskSensitiveData(data: any): any {
    if (!SECURITY_CONFIG.maskSensitiveData) return data;

    if (typeof data !== 'object' || data === null) return data;

    const masked = Array.isArray(data) ? [...data] : { ...data };

    for (const key in masked) {
        const lowerKey = key.toLowerCase();

        // Verificar se é um campo sensível
        const isSensitive = SECURITY_CONFIG.sensitiveFields.some(field =>
            lowerKey.includes(field.toLowerCase())
        );

        if (isSensitive && typeof masked[key] === 'string') {
            // Mascarar mantendo apenas primeiros e últimos caracteres
            const value = masked[key];
            if (value.length > 4) {
                masked[key] = `${value.substring(0, 2)}${'*'.repeat(value.length - 4)}${value.substring(value.length - 2)}`;
            } else {
                masked[key] = '****';
            }
        } else if (typeof masked[key] === 'object') {
            // Recursivamente mascarar objetos aninhados
            masked[key] = maskSensitiveData(masked[key]);
        }
    }

    return masked;
}

/**
 * Logger seguro que mascara dados sensíveis
 */
export const secureLogger = {
    log: (...args: any[]) => {
        if (ENABLE_CONSOLE_LOGS) {
            console.log(...args.map(maskSensitiveData));
        }
    },

    error: (...args: any[]) => {
        if (ENABLE_CONSOLE_LOGS) {
            console.error(...args.map(maskSensitiveData));
        } else {
            // Em produção, apenas registrar erro genérico
            console.error('Ocorreu um erro. Contate o suporte.');
        }
    },

    warn: (...args: any[]) => {
        if (ENABLE_CONSOLE_LOGS) {
            console.warn(...args.map(maskSensitiveData));
        }
    },

    info: (...args: any[]) => {
        if (ENABLE_CONSOLE_LOGS) {
            console.info(...args.map(maskSensitiveData));
        }
    }
};

/**
 * Desabilitar console em produção
 */
export function disableConsoleInProduction() {
    if (!import.meta.env.DEV) {
        // Sobrescrever métodos do console
        const noop = () => { };
        console.log = noop;
        console.debug = noop;
        console.info = noop;
        console.warn = noop;
        // Manter console.error mas com mensagens genéricas
        const originalError = console.error;
        console.error = (..._args: any[]) => {
            originalError('Erro na aplicação. Contate o suporte.');
        };
    }
}

/**
 * Validar força da senha
 */
export function validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong';
} {
    const errors: string[] = [];
    let strength: 'weak' | 'medium' | 'strong' = 'weak';

    if (password.length < 8) {
        errors.push('A senha deve ter pelo menos 8 caracteres');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('A senha deve conter pelo menos uma letra maiúscula');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('A senha deve conter pelo menos uma letra minúscula');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('A senha deve conter pelo menos um número');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('A senha deve conter pelo menos um caractere especial');
    }

    // Calcular força
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const isLongEnough = password.length >= 12;

    const strengthScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChars, isLongEnough]
        .filter(Boolean).length;

    if (strengthScore >= 4) strength = 'strong';
    else if (strengthScore >= 3) strength = 'medium';

    return {
        isValid: errors.length === 0,
        errors,
        strength
    };
}

/**
 * Sanitizar entrada de usuário
 */
export function sanitizeInput(input: string): string {
    return input
        .trim()
        .replace(/[<>]/g, '') // Remover < e > para prevenir XSS
        .substring(0, 500); // Limitar tamanho
}

/**
 * Verificar se está em ambiente seguro (HTTPS)
 */
export function isSecureContext(): boolean {
    return window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost';
}
