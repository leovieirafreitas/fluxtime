import { useState, useEffect } from 'react';
import { Menu, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUserProfileContext } from '../contexts/UserProfileContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import Sidebar from '../components/Sidebar';
import ConfirmModal from '../components/ConfirmModal';

export default function SiteCustomization() {
    const { profile } = useUserProfileContext();
    const { theme } = useTheme();
    const { addToast } = useToast();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'appearance' | 'ordering'>('appearance');

    // Estados do formulário
    const [customLink, setCustomLink] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [slogan, setSlogan] = useState('');
    const [coverImage, setCoverImage] = useState('');
    const [removeBranding, setRemoveBranding] = useState(false);
    const [showBusinessHours, setShowBusinessHours] = useState(true);
    const [accentColor, setAccentColor] = useState('#6366f1');

    // Confirm modal state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const colors = [
        '#6366f1', // Indigo
        '#a855f7', // Purple
        '#94a3b8', // Gray
        '#ef4444', // Red
        '#fb923c', // Orange
        '#fbbf24', // Amber
        '#4ade80', // Green
        '#22d3ee', // Cyan
        '#60a5fa', // Blue
        '#c084fc', // Purple Light
        '#f472b6', // Pink
    ];

    useEffect(() => {
        if (profile?.company_id) {
            fetchCustomization();
        }
    }, [profile]);

    const fetchCustomization = async () => {
        if (!profile?.company_id) return;

        try {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .eq('id', profile.company_id)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setCustomLink(data.custom_link || '');
                setLogoUrl(data.logo_url || '');
                setSlogan(data.slogan || '');
                setCoverImage(data.cover_image || '');
                setRemoveBranding(data.remove_branding || false);
                setShowBusinessHours(data.show_business_hours !== false);
                setAccentColor(data.accent_color || '#6366f1');
            }
        } catch (error) {
            console.error('Error fetching customization:', error);
            addToast('Erro ao carregar configurações', 'error');
        }
    };

    // ... existing state ...

    const handleSave = async () => {
        if (!profile?.company_id) return;

        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('companies')
                .update({
                    custom_link: customLink,
                    logo_url: logoUrl,
                    slogan: slogan,
                    cover_image: coverImage,
                    remove_branding: removeBranding,
                    show_business_hours: showBusinessHours,
                    accent_color: accentColor,
                })
                .eq('id', profile.company_id)
                .select();

            if (error) {
                console.error('Supabase error:', error);
                addToast(`Erro ao salvar: ${error.message}`, 'error');
                throw error;
            }

            console.log('Saved successfully:', data);
            addToast('Configurações salvas com sucesso!', 'success');
        } catch (error: any) {
            console.error('Error saving customization:', error);
            addToast(`Erro ao salvar configurações: ${error.message || 'Erro desconhecido'}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ backgroundColor: theme === 'dark' ? '#000000' : '#ffffff' }} className="min-h-screen transition-colors duration-300">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="md:ml-64 p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    {/* Botão de Menu Mobile */}
                    <button
                        className={`md:hidden mb-6 p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-white hover:bg-white/10' : 'text-slate-900 hover:bg-slate-100'
                            }`}
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>



                    {/* Header com Tabs e Botão Salvar */}
                    <div className="flex items-center justify-between mb-8">
                        {/* Tabs */}
                        <div className="flex gap-1">
                            <button
                                onClick={() => setActiveTab('appearance')}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'appearance'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : theme === 'dark'
                                        ? 'text-slate-400 hover:text-slate-300 hover:bg-black'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                            >
                                Aparência
                            </button>
                            <button
                                onClick={() => setActiveTab('ordering')}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'ordering'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : theme === 'dark'
                                        ? 'text-slate-400 hover:text-slate-300 hover:bg-black'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                            >
                                Ordenação
                            </button>
                        </div>

                        {/* Botão Salvar */}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 shadow-sm"
                        >
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>

                    {/* Content */}
                    {activeTab === 'appearance' && (
                        <div className="space-y-8">
                            {/* Título e Descrição */}
                            <div>
                                <h2 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                    Customização
                                </h2>
                                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Personalize o site do seu negócio, adicione fotos, ordene seus serviços e escolha uma cor de destaque.
                                </p>
                            </div>

                            {/* Link Personalizado */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <label className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        Link personalizado
                                    </label>
                                    <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                                        Essencial
                                    </span>
                                </div>
                                <div className={`flex items-center gap-2 p-3 rounded-lg border ${theme === 'dark' ? 'bg-black border-slate-700' : 'bg-blue-50 border-blue-200'
                                    }`}>
                                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-blue-600'}`}>
                                        https://app.fluxtime.com.br/
                                    </span>
                                    <input
                                        type="text"
                                        value={customLink}
                                        onChange={(e) => setCustomLink(e.target.value)}
                                        placeholder="seulink"
                                        className={`flex-1 bg-transparent outline-none text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-blue-700'
                                            }`}
                                    />
                                </div>
                                <button className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                                    Saiba mais
                                </button>
                            </div>

                            {/* Logo ou Foto de Perfil */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <label className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        Logo ou foto de perfil
                                    </label>
                                </div>
                                <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Insira a logo do seu negócio ou uma imagem que o represente.
                                </p>
                                {logoUrl ? (
                                    <div className="relative inline-block">
                                        <img src={logoUrl} alt="Logo" className="w-24 h-24 rounded-lg object-cover" />
                                        <button
                                            onClick={() => {
                                                setConfirmModal({
                                                    isOpen: true,
                                                    title: 'Remover logo',
                                                    message: 'Tem certeza que deseja remover a logo? Esta ação não pode ser desfeita.',
                                                    onConfirm: async () => {
                                                        try {
                                                            setSaving(true);
                                                            if (logoUrl && logoUrl.includes('company_logos')) {
                                                                const oldPath = logoUrl.split('company_logos/')[1];
                                                                if (oldPath) {
                                                                    await supabase.storage
                                                                        .from('company_logos')
                                                                        .remove([oldPath]);
                                                                }
                                                            }
                                                            setLogoUrl('');
                                                            await supabase
                                                                .from('companies')
                                                                .update({ logo_url: '' })
                                                                .eq('id', profile?.company_id);
                                                            addToast('Logo removida com sucesso.', 'success');
                                                        } catch (error) {
                                                            console.error('Error removing logo:', error);
                                                            addToast('Erro ao remover logo.', 'error');
                                                        } finally {
                                                            setSaving(false);
                                                        }
                                                    }
                                                });
                                            }}
                                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                            disabled={saving}
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${theme === 'dark'
                                        ? 'border-slate-700 hover:border-slate-600 text-slate-400'
                                        : 'border-slate-300 hover:border-slate-400 text-slate-600'
                                        }`}>
                                        <Upload className="w-5 h-5" />
                                        <span className="text-sm font-medium">Adicionar logo</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;

                                                if (file.size > 2 * 1024 * 1024) {
                                                    addToast('A imagem deve ter no máximo 2MB', 'error');
                                                    return;
                                                }

                                                try {
                                                    setSaving(true);
                                                    const fileExt = file.name.split('.').pop();
                                                    const fileName = `${profile?.company_id}/${Date.now()}.${fileExt}`;

                                                    // 1. Upload new logo
                                                    const { error: uploadError } = await supabase.storage
                                                        .from('company_logos')
                                                        .upload(fileName, file);

                                                    if (uploadError) throw uploadError;

                                                    // 2. Clean up old logos (Robust cleanup)
                                                    try {
                                                        const { data: listData } = await supabase.storage
                                                            .from('company_logos')
                                                            .list(profile?.company_id);

                                                        if (listData) {
                                                            const filesToDelete = listData
                                                                .filter(f => f.name !== fileName.split('/').pop()) // Don't delete the new one
                                                                .filter(f => !f.name.startsWith('cover_')) // Don't delete covers
                                                                .map(f => `${profile?.company_id}/${f.name}`);

                                                            if (filesToDelete.length > 0) {
                                                                await supabase.storage
                                                                    .from('company_logos')
                                                                    .remove(filesToDelete);
                                                            }
                                                        }
                                                    } catch (cleanupError) {
                                                        console.error('Error cleaning up old logos:', cleanupError);
                                                    }

                                                    // 3. Get public URL
                                                    const { data: { publicUrl } } = supabase.storage
                                                        .from('company_logos')
                                                        .getPublicUrl(fileName);

                                                    setLogoUrl(publicUrl);
                                                } catch (error) {
                                                    console.error('Error uploading logo:', error);
                                                    addToast('Erro ao fazer upload da logo', 'error');
                                                } finally {
                                                    setSaving(false);
                                                }
                                            }}
                                        />
                                    </label>
                                )}
                            </div>

                            {/* Slogan */}
                            <div>
                                <label className={`text-sm font-medium mb-2 block ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                    Slogan
                                </label>
                                <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Adicione um slogan ao seu negócio.
                                </p>
                                <input
                                    type="text"
                                    value={slogan}
                                    onChange={(e) => setSlogan(e.target.value)}
                                    placeholder="Digite seu slogan"
                                    className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-colors ${theme === 'dark'
                                        ? 'bg-black border-slate-700 text-white hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                        : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                        }`}
                                />
                            </div>

                            {/* Imagem de Capa */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <label className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        Imagem de capa
                                    </label>
                                    <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                                        Essencial
                                    </span>
                                </div>
                                {coverImage ? (
                                    <div className="relative">
                                        <img src={coverImage} alt="Capa" className="w-full h-48 rounded-lg object-cover" />
                                        <button
                                            onClick={() => {
                                                setConfirmModal({
                                                    isOpen: true,
                                                    title: 'Remover imagem de capa',
                                                    message: 'Tem certeza que deseja remover a imagem de capa? Esta ação não pode ser desfeita.',
                                                    onConfirm: async () => {
                                                        try {
                                                            setSaving(true);
                                                            if (coverImage && coverImage.includes('company_logos')) {
                                                                const oldPath = coverImage.split('company_logos/')[1];
                                                                if (oldPath) {
                                                                    await supabase.storage
                                                                        .from('company_logos')
                                                                        .remove([oldPath]);
                                                                }
                                                            }
                                                            setCoverImage('');
                                                            await supabase
                                                                .from('companies')
                                                                .update({ cover_image: '' })
                                                                .eq('id', profile?.company_id);
                                                            addToast('Capa removida com sucesso.', 'success');
                                                        } catch (error) {
                                                            console.error('Error removing cover:', error);
                                                            addToast('Erro ao remover capa.', 'error');
                                                        } finally {
                                                            setSaving(false);
                                                        }
                                                    }
                                                });
                                            }}
                                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                            disabled={saving}
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className={`w-full flex flex-col items-center justify-center gap-2 py-8 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${theme === 'dark'
                                        ? 'border-slate-700 hover:border-slate-600 text-slate-400'
                                        : 'border-slate-300 hover:border-slate-400 text-slate-600'
                                        }`}>
                                        <Upload className="w-6 h-6" />
                                        <span className="text-sm font-medium">Adicionar imagem de capa</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;

                                                if (file.size > 5 * 1024 * 1024) { // 5MB limit for cover
                                                    addToast('A imagem deve ter no máximo 5MB', 'error');
                                                    return;
                                                }

                                                try {
                                                    setSaving(true);
                                                    const fileExt = file.name.split('.').pop();
                                                    // Use a 'covers' folder or prefix
                                                    const fileName = `${profile?.company_id}/cover_${Date.now()}.${fileExt}`;

                                                    // 1. Upload new cover
                                                    const { error: uploadError } = await supabase.storage
                                                        .from('company_logos') // Reusing bucket as likely permissions are same, maybe change if dedicated bucket exists
                                                        .upload(fileName, file);

                                                    if (uploadError) throw uploadError;

                                                    // 2. Clean up old covers
                                                    try {
                                                        const { data: listData } = await supabase.storage
                                                            .from('company_logos')
                                                            .list(profile?.company_id);

                                                        if (listData) {
                                                            const filesToDelete = listData
                                                                .filter(f => f.name.startsWith('cover_') && f.name !== fileName.split('/').pop())
                                                                .map(f => `${profile?.company_id}/${f.name}`);

                                                            if (filesToDelete.length > 0) {
                                                                await supabase.storage
                                                                    .from('company_logos')
                                                                    .remove(filesToDelete);
                                                            }
                                                        }
                                                    } catch (cleanupError) {
                                                        console.error('Error cleaning up old covers:', cleanupError);
                                                    }

                                                    // 3. Get public URL
                                                    const { data: { publicUrl } } = supabase.storage
                                                        .from('company_logos')
                                                        .getPublicUrl(fileName);

                                                    setCoverImage(publicUrl);
                                                } catch (error) {
                                                    console.error('Error uploading cover:', error);
                                                    addToast('Erro ao fazer upload da capa', 'error');
                                                } finally {
                                                    setSaving(false);
                                                }
                                            }}
                                        />
                                    </label>
                                )}
                            </div>

                            {/* Remover Marca da FluxTime */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <label className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        Remover marca da FluxTime?
                                    </label>
                                    <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                                        Essencial
                                    </span>
                                </div>
                                <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Desative caso queira manter a marca "Feito com a FluxTime" no seu site.
                                </p>
                                <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-black border-slate-700' : 'bg-slate-50 border-slate-200'
                                    }`}>
                                    <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                                        <img src="/img/MarcaSite.png" alt="FluxTime" className="h-5 w-auto object-contain" />
                                        <span className="font-medium">Feito com a FluxTime</span>
                                    </div>
                                </div>
                                <label className="flex items-center gap-3 mt-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={removeBranding}
                                        onChange={(e) => setRemoveBranding(e.target.checked)}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Remover marca da FluxTime
                                    </span>
                                </label>
                            </div>

                            {/* Omitir Horário de Funcionamento */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <label className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        Omitir horário de funcionamento?
                                    </label>
                                    <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                                        Essencial
                                    </span>
                                </div>
                                <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Ative caso queira omitir o horário de funcionamento no seu site.
                                </p>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={!showBusinessHours}
                                        onChange={(e) => setShowBusinessHours(!e.target.checked)}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Omitir horário de funcionamento
                                    </span>
                                </label>
                            </div>

                            {/* Cor de Destaque */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <label className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        Cor de destaque
                                    </label>
                                    <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                                        Essencial
                                    </span>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {colors.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setAccentColor(color)}
                                            className={`w-12 h-12 rounded-full transition-all ${accentColor === color ? 'ring-4 ring-offset-2 ring-blue-500' : ''
                                                }`}
                                            style={{ backgroundColor: color }}
                                        >
                                            {accentColor === color && (
                                                <svg className="w-6 h-6 mx-auto text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ordering' && (
                        <div>
                            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                Funcionalidade de ordenação em desenvolvimento
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant="danger"
            />
        </div>
    );
}
