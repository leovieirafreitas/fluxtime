
const API_URL = import.meta.env.VITE_EVOLUTION_API_URL;
const API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY;
const INSTANCE = 'fluxtime'; // User provided instance name

interface SendMessageResponse {
    key: {
        remoteJid: string;
        fromMe: boolean;
        id: string;
    };
    message: {
        conversation: string;
    };
    messageTimestamp: number;
    status: string;
}

export const whatsappService = {
    /**
     * Sends a text message via WhatsApp using the Evolution API.
     * @param phone The phone number (e.g., '5592999999999')
     * @param text The message text
     */
    async sendText(phone: string, text: string): Promise<SendMessageResponse | null> {
        if (!API_URL || !API_KEY) {
            console.error('Evolution API credentials not configured.');
            return null;
        }

        // Clean phone number: remove non-digits
        let cleanPhone = phone.replace(/\D/g, '');

        // Ensure Brazil DDI (55) if missing
        if (!cleanPhone.startsWith('55') && cleanPhone.length >= 10) {
            cleanPhone = '55' + cleanPhone;
        }

        try {
            const url = `${API_URL}/message/sendText/${INSTANCE}`;
            const body = {
                number: cleanPhone,
                text: text,
                options: {
                    delay: 1200,
                    presence: "composing",
                    linkPreview: false
                }
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': API_KEY
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('WhatsApp API Error:', response.status, errorData);
                throw new Error(`Failed to send message: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error sending WhatsApp message:', error);
            throw error;
        }
    }
};
