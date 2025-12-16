
interface ClientSession {
    phone: string;
    name: string;
    email: string;
    expiresAt: number;
}

const SESSION_KEY = 'client_session';

// Simple obfuscation to prevent casual local storage editing
// Note: This is NOT encryption. Sensitive logic should always be server-side.
export const saveClientSession = (data: Omit<ClientSession, 'expiresAt'>) => {
    const session: ClientSession = {
        ...data,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours validity
    };
    try {
        const json = JSON.stringify(session);
        // Base64 encode to obfuscate
        const encoded = btoa(unescape(encodeURIComponent(json)));
        localStorage.setItem(SESSION_KEY, encoded);
    } catch (e) {
        console.error('Error saving session', e);
    }
};

export const getClientSession = (): ClientSession | null => {
    const encoded = localStorage.getItem(SESSION_KEY);
    if (!encoded) return null;

    try {
        // Check if it's legacy plain JSON first (migration path)
        if (encoded.trim().startsWith('{')) {
            const legacy = JSON.parse(encoded);
            // Migrate to secure format
            if (legacy.phone) {
                saveClientSession({
                    phone: legacy.phone,
                    name: legacy.name,
                    email: legacy.email
                });
                return { ...legacy, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
            }
            return null;
        }

        const json = decodeURIComponent(escape(atob(encoded)));
        const session = JSON.parse(json) as ClientSession;

        // Check expiration
        if (session.expiresAt && Date.now() > session.expiresAt) {
            clearClientSession();
            return null;
        }

        return session;
    } catch (e) {
        console.error('Error parsing session', e);
        // If error, clear invalid session
        clearClientSession();
        return null;
    }
};

export const clearClientSession = () => {
    localStorage.removeItem(SESSION_KEY);
};

export const isAuthenticated = (): boolean => {
    return !!getClientSession();
};
