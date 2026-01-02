// Teste para verificar se as chaves VAPID estão corretas
const publicKeyFromEnv = 'BKaf0mfF_6CH6z30N48VErxSfc-CwSqcd-COM2VEv3cgTivebwA8jk-I50YDrZCtM_zFLsXRhtOYVm9I5rlb41E';
const privateKey = '9P-Wc1H01bsVdyJct1C02WIHYSGir5QHjDJvIYtrOiM';

console.log('Chave pública (do .env):', publicKeyFromEnv);
console.log('Comprimento:', publicKeyFromEnv.length);
console.log('Chave privada:', privateKey);
console.log('Comprimento:', privateKey.length);

// Verificar se são base64url válidos
try {
    const decoded = Buffer.from(publicKeyFromEnv, 'base64');
    console.log('✅ Chave pública é base64 válido, tamanho decodificado:', decoded.length, 'bytes');
} catch (e) {
    console.error('❌ Erro ao decodificar chave pública:', e.message);
}

try {
    const decoded = Buffer.from(privateKey, 'base64');
    console.log('✅ Chave privada é base64 válido, tamanho decodificado:', decoded.length, 'bytes');
} catch (e) {
    console.error('❌ Erro ao decodificar chave privada:', e.message);
}
