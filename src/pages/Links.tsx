import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useUserProfileContext } from '../contexts/UserProfileContext';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import { Menu, Instagram, Facebook, Globe, BookOpen, MessageCircle, Save } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface CompanyLinks {
    id?: string;
    company_id: string;
    instagram: string | null;
    facebook: string | null;
    website: string | null;
    ebook: string | null;
    whatsapp: string | null;
}

export default function Links() {
    const { theme } = useTheme();
    const { profile } = useUserProfileContext();
    const { addToast } = useToast();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [links, setLinks] = useState<CompanyLinks>({
        company_id: profile?.company_id || '',
        instagram: '',
        facebook: '',
        website: '',
        ebook: '',
        whatsapp: ''
    });

    useEffect(() => {
        if (profile?.company_id) {
            fetchLinks();
        }
    }, [profile]);

    const fetchLinks = async () => {
        try {
            const { data, error } = await supabase
                .from('company_links')
                .select('*')
                .eq('company_id', profile?.company_id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                setLinks(data);
            }
        } catch (error) {
            console.error('Error fetching links:', error);
        }
    };

    const formatWhatsAppLink = (phone: string): string => {
        // Remove all non-numeric characters
        const cleaned = phone.replace(/\D/g, '');

        // Add country code if not present
        const withCountryCode = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;

        return `https://wa.me/${withCountryCode}`;
    };

    const handleSave = async () => {
        if (!profile?.company_id) return;

        setSaving(true);
        try {
            const dataToSave = {
                ...links,
                company_id: profile.company_id,
                // Format WhatsApp link if phone is provided
                whatsapp: links.whatsapp ? formatWhatsAppLink(links.whatsapp) : null
            };

            const { error } = await supabase
                .from('company_links')
                .upsert(dataToSave, {
                    onConflict: 'company_id'
                });

            if (error) throw error;

            addToast('Links salvos com sucesso!', 'success');
        } catch (error) {
            console.error('Error saving links:', error);
            addToast('Erro ao salvar links.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ backgroundColor: theme === 'dark' ? '#000000' : '#ffffff' }} className="min-h-screen transition-colors duration-300">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="md:ml-64 p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    {/* Mobile Menu Button */}
                    <button
                        className={`md:hidden mb-6 p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-white hover:bg-white/10' : 'text-slate-900 hover:bg-slate-100'}`}
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                Links
                            </h1>
                            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                Configure os links das suas redes sociais e recursos.
                            </p>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>

                    {/* Links Form */}
                    <div className="space-y-6">
                        {/* Instagram */}
                        <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'}`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 flex items-center justify-center">
                                    <Instagram className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        Instagram
                                    </h3>
                                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Link do seu perfil
                                    </p>
                                </div>
                            </div>
                            <input
                                type="url"
                                value={links.instagram || ''}
                                onChange={(e) => setLinks({ ...links, instagram: e.target.value })}
                                placeholder="https://instagram.com/seuperfil"
                                className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-colors ${theme === 'dark'
                                    ? 'bg-black border-slate-700 text-white placeholder-slate-500 focus:border-blue-500'
                                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                                    }`}
                            />
                        </div>

                        {/* Facebook */}
                        <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'}`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                                    <Facebook className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        Facebook
                                    </h3>
                                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Link da sua página
                                    </p>
                                </div>
                            </div>
                            <input
                                type="url"
                                value={links.facebook || ''}
                                onChange={(e) => setLinks({ ...links, facebook: e.target.value })}
                                placeholder="https://facebook.com/suapagina"
                                className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-colors ${theme === 'dark'
                                    ? 'bg-black border-slate-700 text-white placeholder-slate-500 focus:border-blue-500'
                                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                                    }`}
                            />
                        </div>

                        {/* Website */}
                        <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'}`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-slate-600 flex items-center justify-center">
                                    <Globe className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        Site
                                    </h3>
                                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Link do seu website
                                    </p>
                                </div>
                            </div>
                            <input
                                type="url"
                                value={links.website || ''}
                                onChange={(e) => setLinks({ ...links, website: e.target.value })}
                                placeholder="https://seusite.com.br"
                                className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-colors ${theme === 'dark'
                                    ? 'bg-black border-slate-700 text-white placeholder-slate-500 focus:border-blue-500'
                                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                                    }`}
                            />
                        </div>

                        {/* Ebook */}
                        <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'}`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        E-book
                                    </h3>
                                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Link para download do seu e-book
                                    </p>
                                </div>
                            </div>
                            <input
                                type="url"
                                value={links.ebook || ''}
                                onChange={(e) => setLinks({ ...links, ebook: e.target.value })}
                                placeholder="https://drive.google.com/..."
                                className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-colors ${theme === 'dark'
                                    ? 'bg-black border-slate-700 text-white placeholder-slate-500 focus:border-blue-500'
                                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                                    }`}
                            />
                        </div>

                        {/* WhatsApp */}
                        <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'}`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                                    <MessageCircle className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        WhatsApp
                                    </h3>
                                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Número de telefone (será convertido em link do WhatsApp)
                                    </p>
                                </div>
                            </div>
                            <input
                                type="tel"
                                value={links.whatsapp || ''}
                                onChange={(e) => setLinks({ ...links, whatsapp: e.target.value })}
                                placeholder="(11) 99999-9999"
                                className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-colors ${theme === 'dark'
                                    ? 'bg-black border-slate-700 text-white placeholder-slate-500 focus:border-blue-500'
                                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                                    }`}
                            />
                            {links.whatsapp && (
                                <p className={`mt-2 text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Link gerado: {formatWhatsAppLink(links.whatsapp)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
