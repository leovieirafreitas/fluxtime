import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useUserProfileContext } from '../contexts/UserProfileContext';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import { Menu, Upload, ChevronDown } from 'lucide-react';

interface Collaborator {
    id: string;
    full_name: string;
    avatar_url: string | null;
}

interface Category {
    id: string;
    name: string;
    color: string | null;
}



import { useToast } from '../contexts/ToastContext';

export default function NewService() {
    const { addToast } = useToast();
    const { theme } = useTheme();
    const { profile } = useUserProfileContext();
    const navigate = useNavigate();
    const { id } = useParams();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(!!id);

    // Data Sources
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [coverUrl] = useState<string | null>(null); // Placeholder for now

    // General Info
    const [duration, setDuration] = useState<string>(''); // Using string for select matching
    const [locationType, setLocationType] = useState('business_address');
    const [categoryId, setCategoryId] = useState<string>('');
    const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);

    // Price
    const [price, setPrice] = useState('');
    const [reservationFee, setReservationFee] = useState('');
    const [isReservationFeeEnabled, setIsReservationFeeEnabled] = useState(false);

    // Advanced
    const [visibility, setVisibility] = useState('public');
    const [guidelines, setGuidelines] = useState('');
    const [isGuidelinesEnabled, setIsGuidelinesEnabled] = useState(false);

    // Scheduling Rules
    const [slotInterval, setSlotInterval] = useState<string>('');
    const [isSlotIntervalEnabled, setIsSlotIntervalEnabled] = useState(false);

    const [schedulingWindow, setSchedulingWindow] = useState<string>('');
    const [isSchedulingWindowEnabled, setIsSchedulingWindowEnabled] = useState(false);

    const [minNotice, setMinNotice] = useState<string>('');
    const [isMinNoticeEnabled, setIsMinNoticeEnabled] = useState(false);

    const [bufferPre, setBufferPre] = useState<string>('');
    const [isBufferPreEnabled, setIsBufferPreEnabled] = useState(false);

    const [bufferPost, setBufferPost] = useState<string>('');
    const [isBufferPostEnabled, setIsBufferPostEnabled] = useState(false);

    // Custom Dropdown States
    const [isLocationTypeOpen, setIsLocationTypeOpen] = useState(false);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);


    useEffect(() => {
        if (profile?.company_id) {
            fetchCollaborators();
            fetchCategories();
        }
    }, [profile]);

    useEffect(() => {
        if (id && profile?.company_id) {
            fetchServiceDetails();
        }
    }, [id, profile]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.relative')) {
                setIsLocationTypeOpen(false);
                setIsCategoryOpen(false);
            }
        };

        if (isLocationTypeOpen || isCategoryOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isLocationTypeOpen, isCategoryOpen]);

    const fetchCollaborators = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('company_id', profile?.company_id);

            if (error) throw error;
            setCollaborators(data || []);
            // Only pre-select current user if we are creating a NEW service
            if (!id && profile?.id) {
                setSelectedCollaborators([profile.id]);
            }
        } catch (error) {
            console.error('Error fetching collaborators:', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('service_categories')
                .select('id, name, color')
                .eq('company_id', profile?.company_id)
                .order('name');

            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchServiceDetails = async () => {
        setLoading(true);
        try {
            // Fetch Service Data
            const { data: service, error } = await supabase
                .from('services')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            if (service) {
                setTitle(service.title || service.name || '');
                setDescription(service.description || '');
                // setCoverUrl(service.cover_url);
                setDuration(service.duration_minutes?.toString() || service.duration?.toString() || '');
                setLocationType(service.location_type || 'business_address');
                setCategoryId(service.category_id || '');

                // Format price for input
                setPrice(service.price ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(service.price) : '');

                setReservationFee(service.reservation_fee ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(service.reservation_fee) : '');
                setIsReservationFeeEnabled(service.is_reservation_fee_enabled || false);

                setVisibility(service.visibility || (service.active ? 'public' : 'private'));

                setGuidelines(service.guidelines || '');
                setIsGuidelinesEnabled(service.is_guidelines_enabled || false);

                // Rules
                if (service.slot_interval_minutes) {
                    setSlotInterval(service.slot_interval_minutes.toString());
                    setIsSlotIntervalEnabled(true);
                }
                if (service.scheduling_window_days) {
                    setSchedulingWindow(service.scheduling_window_days.toString());
                    setIsSchedulingWindowEnabled(true);
                }
                if (service.min_notice_minutes !== null) {
                    setMinNotice(service.min_notice_minutes.toString());
                    setIsMinNoticeEnabled(true);
                }
                if (service.buffer_pre_minutes) {
                    setBufferPre(service.buffer_pre_minutes.toString());
                    setIsBufferPreEnabled(true);
                }
                if (service.buffer_post_minutes) {
                    setBufferPost(service.buffer_post_minutes.toString());
                    setIsBufferPostEnabled(true);
                }
            }

            // Fetch Service Collaborators
            const { data: serviceCollaborators, error: collabError } = await supabase
                .from('service_collaborators')
                .select('profile_id')
                .eq('service_id', id);

            if (collabError) throw collabError;

            if (serviceCollaborators) {
                setSelectedCollaborators(serviceCollaborators.map(sc => sc.profile_id));
            }

        } catch (error) {
            console.error('Error fetching service details:', error);
            addToast('Erro ao carregar os detalhes do serviço.', 'error');
            navigate('/catalog/services');
        } finally {
            setLoading(false);
        }
    };


    const handleSave = async () => {
        if (!title || !profile?.company_id) {
            addToast('Por favor, preencha as informações essenciais (Título).', 'error');
            return;
        }

        setSaving(true);
        try {
            // Validate numbers
            const parsedPrice = parseFloat(price.replace('R$', '').replace(/\./g, '').replace(',', '.') || '0');
            const parsedResFee = isReservationFeeEnabled
                ? parseFloat(reservationFee.replace('R$', '').replace(/\./g, '').replace(',', '.') || '0')
                : null;

            const serviceData = {
                company_id: profile.company_id,
                title,
                name: title, // Populate legacy required field
                description,
                cover_url: coverUrl,
                duration_minutes: parseInt(duration) || 30, // Default 30 min
                location_type: locationType,
                category_id: categoryId || null,
                price: parsedPrice,
                reservation_fee: parsedResFee,
                is_reservation_fee_enabled: isReservationFeeEnabled,
                visibility,
                guidelines: isGuidelinesEnabled ? guidelines : null,
                is_guidelines_enabled: isGuidelinesEnabled,

                // Rules - Only save if enabled
                slot_interval_minutes: isSlotIntervalEnabled ? parseInt(slotInterval) : null,
                scheduling_window_days: isSchedulingWindowEnabled ? parseInt(schedulingWindow) : null,
                min_notice_minutes: isMinNoticeEnabled ? parseInt(minNotice) : null,
                buffer_pre_minutes: isBufferPreEnabled ? parseInt(bufferPre) : null,
                buffer_post_minutes: isBufferPostEnabled ? parseInt(bufferPost) : null,
            };

            let serviceId = id;

            if (id) {
                // Update existing service
                const { error } = await supabase
                    .from('services')
                    .update(serviceData)
                    .eq('id', id);

                if (error) throw error;
            } else {
                // Create new service
                const { data: service, error } = await supabase
                    .from('services')
                    .insert(serviceData)
                    .select()
                    .single();

                if (error) throw error;
                serviceId = service.id;
            }

            if (serviceId) {
                // Update collaborators
                // First delete existing ones if editing
                if (id) {
                    await supabase
                        .from('service_collaborators')
                        .delete()
                        .eq('service_id', id);
                }

                // Insert new ones
                const collaboratorData = selectedCollaborators.map(userId => ({
                    service_id: serviceId,
                    profile_id: userId
                }));

                if (collaboratorData.length > 0) {
                    const { error: collabError } = await supabase
                        .from('service_collaborators')
                        .insert(collaboratorData);
                    if (collabError) throw collabError;
                }

                navigate('/catalog/services');
            }
        } catch (error) {
            console.error('Error saving service:', error);
            addToast('Erro ao salvar serviço.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'}`}>
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className={`md:ml-64 p-4 md:p-8 transition-all duration-300`}>
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header Mobile */}
                    <button
                        className={`md:hidden mb-4 p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-white hover:bg-white/10' : 'text-slate-900 hover:bg-slate-100'}`}
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Serviços</span>
                            <span className={theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}>/</span>
                            <span className="font-medium">{id ? 'Editar serviço' : 'Novo serviço'}</span>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>

                    {/* Card: Header Info */}
                    <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div className="mb-6">
                            <button className={`w-full h-32 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 transition-colors ${theme === 'dark' ? 'border-slate-700 hover:border-slate-600 bg-black' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                                }`}>
                                <Upload className="w-5 h-5 text-slate-400" />
                                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Adicionar foto de capa</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 uppercase tracking-wide">Essencial</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Serviço sem nome"
                                className={`w-full text-2xl font-bold bg-transparent border-none outline-none placeholder-slate-300 dark:placeholder-slate-600`}
                            />
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Adicione uma descrição..."
                                rows={2}
                                className={`w-full bg-transparent border-none outline-none resize-none ${theme === 'dark' ? 'text-slate-300 placeholder-slate-600' : 'text-slate-600 placeholder-slate-400'}`}
                            />
                            <div className="text-right text-xs text-slate-400">0/2000</div>
                        </div>
                    </div>

                    {/* Card: Informações Gerais */}
                    <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'}`}>
                        <h2 className="text-lg font-bold mb-6">Informações gerais</h2>
                        <div className="space-y-6">
                            {/* Duração */}
                            <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                                <label className="flex items-center gap-2 text-sm font-medium">
                                    Duração *
                                </label>
                                <select
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    className={`w-full px-4 py-2.5 rounded-lg border outline-none appearance-none ${theme === 'dark' ? 'bg-black border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                >
                                    <option value="" disabled>Escolha uma duração</option>
                                    <option value="15">15 min</option>
                                    <option value="30">30 min</option>
                                    <option value="45">45 min</option>
                                    <option value="60">1h</option>
                                    <option value="90">1h 30min</option>
                                    <option value="120">2h</option>
                                </select>
                            </div>

                            {/* Local */}
                            <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                                <label className="flex items-center gap-2 text-sm font-medium">
                                    Tipo de local *
                                </label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsLocationTypeOpen(!isLocationTypeOpen)}
                                        className={`w-full px-4 py-2.5 rounded-lg border outline-none flex items-center justify-between transition-colors ${theme === 'dark' ? 'bg-black border-slate-700 text-white hover:border-slate-600' : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300'}`}
                                    >
                                        <span>
                                            {locationType === 'business_address' && 'Em meu estabelecimento'}
                                            {locationType === 'client_address' && 'No endereço do cliente'}
                                            {locationType === 'online' && 'Online'}
                                        </span>
                                        <ChevronDown className={`w-4 h-4 transition-transform ${isLocationTypeOpen ? 'rotate-180' : ''} ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                                    </button>
                                    {isLocationTypeOpen && (
                                        <div className={`absolute z-50 w-full mt-2 rounded-lg border shadow-lg overflow-hidden ${theme === 'dark' ? 'bg-black border-slate-700' : 'bg-white border-slate-200'}`}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setLocationType('business_address');
                                                    setIsLocationTypeOpen(false);
                                                }}
                                                className={`w-full px-4 py-2.5 text-left transition-colors ${locationType === 'business_address' ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600') : (theme === 'dark' ? 'hover:bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-900')}`}
                                            >
                                                Em meu estabelecimento
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setLocationType('client_address');
                                                    setIsLocationTypeOpen(false);
                                                }}
                                                className={`w-full px-4 py-2.5 text-left transition-colors ${locationType === 'client_address' ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600') : (theme === 'dark' ? 'hover:bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-900')}`}
                                            >
                                                No endereço do cliente
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setLocationType('online');
                                                    setIsLocationTypeOpen(false);
                                                }}
                                                className={`w-full px-4 py-2.5 text-left transition-colors ${locationType === 'online' ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600') : (theme === 'dark' ? 'hover:bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-900')}`}
                                            >
                                                Online
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Colaboradores */}
                            <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                                <label className="flex items-center gap-2 text-sm font-medium">
                                    Colaborador(es) *
                                </label>
                                <select
                                    value={selectedCollaborators[0] || ''}
                                    onChange={(e) => setSelectedCollaborators([e.target.value])}
                                    className={`w-full px-4 py-2.5 rounded-lg border outline-none appearance-none ${theme === 'dark' ? 'bg-black border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                >
                                    <option value="" disabled>Selecione um colaborador</option>
                                    {collaborators.map(collab => (
                                        <option key={collab.id} value={collab.id}>{collab.full_name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Categoria (Combo) */}
                            <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                                <label className="flex items-center gap-2 text-sm font-medium">
                                    Combo (Opcional)
                                </label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                                        className={`w-full px-4 py-2.5 rounded-lg border outline-none flex items-center justify-between transition-colors ${theme === 'dark' ? 'bg-black border-slate-700 text-white hover:border-slate-600' : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300'}`}
                                    >
                                        <span className={!categoryId ? (theme === 'dark' ? 'text-slate-500' : 'text-slate-400') : ''}>
                                            {categoryId ? categories.find(cat => cat.id === categoryId)?.name : 'Nenhum combo selecionado'}
                                        </span>
                                        <ChevronDown className={`w-4 h-4 transition-transform ${isCategoryOpen ? 'rotate-180' : ''} ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                                    </button>
                                    {isCategoryOpen && (
                                        <div className={`absolute z-50 w-full mt-2 rounded-lg border shadow-lg overflow-hidden max-h-60 overflow-y-auto ${theme === 'dark' ? 'bg-black border-slate-700' : 'bg-white border-slate-200'}`}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCategoryId('');
                                                    setIsCategoryOpen(false);
                                                }}
                                                className={`w-full px-4 py-2.5 text-left transition-colors ${!categoryId ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600') : (theme === 'dark' ? 'hover:bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-900')}`}
                                            >
                                                Nenhum combo selecionado
                                            </button>
                                            {categories.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setCategoryId(cat.id);
                                                        setIsCategoryOpen(false);
                                                    }}
                                                    className={`w-full px-4 py-2.5 text-left transition-colors ${categoryId === cat.id ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600') : (theme === 'dark' ? 'hover:bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-900')}`}
                                                >
                                                    {cat.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>


                        </div>
                    </div>

                    {/* Card: Preço */}
                    <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'}`}>
                        <h2 className="text-lg font-bold mb-6">Preço</h2>
                        <div className="space-y-6">
                            <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                                <label className="flex items-center gap-2 text-sm font-medium">
                                    Valor *
                                </label>
                                <div className="relative">
                                    <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>R$</span>
                                    <input
                                        type="text"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className={`w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none transition-colors ${theme === 'dark' ? 'bg-black border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>

                            <div className="flex items-start justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-sm">Taxa de reserva</span>
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 uppercase">Ativar pagamentos</span>
                                    </div>
                                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Cobre um sinal e diminua faltas e remarcações definindo um valor a ser pago para reservar um horário.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={isReservationFeeEnabled} onChange={(e) => setIsReservationFeeEnabled(e.target.checked)} />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            {isReservationFeeEnabled && (
                                <div className="mt-4 pl-[180px]">
                                    <div className="relative">
                                        <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>R$</span>
                                        <input
                                            type="text"
                                            value={reservationFee}
                                            onChange={(e) => setReservationFee(e.target.value)}
                                            className={`w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none transition-colors ${theme === 'dark' ? 'bg-black border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                                            placeholder="0,00"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Card: Avançado */}
                    <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'}`}>
                        <h2 className="text-lg font-bold mb-6">Avançado</h2>
                        <div className="space-y-6">
                            <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                                <label className="flex items-center gap-2 text-sm font-medium">
                                    Visibilidade <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 uppercase">Essencial</span>
                                </label>
                                <select
                                    value={visibility}
                                    onChange={(e) => setVisibility(e.target.value)}
                                    className={`w-full px-4 py-2.5 rounded-lg border outline-none appearance-none ${theme === 'dark' ? 'bg-black border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                >
                                    <option value="public">Público - Visível no seu site para todos</option>
                                    <option value="private">Privado - Visível apenas para a equipe</option>
                                    <option value="link_only">Apenas Link - Visível para quem tem o link</option>
                                </select>
                            </div>

                            <div className="flex items-start justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-sm">Orientações e consentimento</span>
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 uppercase">Essencial</span>
                                    </div>
                                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Garanta que seus clientes leiam orientações e estejam de acordo antes de agendar.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={isGuidelinesEnabled} onChange={(e) => setIsGuidelinesEnabled(e.target.checked)} />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            {isGuidelinesEnabled && (
                                <textarea
                                    value={guidelines}
                                    onChange={(e) => setGuidelines(e.target.value)}
                                    placeholder="Digite as orientações..."
                                    rows={3}
                                    className={`w-full px-4 py-2.5 rounded-lg border outline-none ${theme === 'dark' ? 'bg-black border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                                />
                            )}
                        </div>
                    </div>

                    {/* Card: Regras para agendar */}
                    <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-bold">Regras para agendar</h2>
                            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">Ver regras gerais ↗</button>
                        </div>
                        <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            Personalize suas regras para agendar para este serviço específico.
                        </p>

                        <div className="space-y-6">
                            {/* Incrementos */}
                            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm">Incrementos das vagas de horário</span>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 uppercase">Essencial</span>
                                        </div>
                                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                            O incremento minimo que seu cliente vê entre horários disponíveis na hora de agendar.
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={isSlotIntervalEnabled} onChange={(e) => setIsSlotIntervalEnabled(e.target.checked)} />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                                {isSlotIntervalEnabled && (
                                    <select
                                        value={slotInterval}
                                        onChange={(e) => setSlotInterval(e.target.value)}
                                        className={`w-full px-4 py-2.5 rounded-lg border outline-none appearance-none ${theme === 'dark' ? 'bg-black border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                    >
                                        <option value="15">15 min</option>
                                        <option value="30">30 min</option>
                                        <option value="60">1h</option>
                                    </select>
                                )}
                            </div>

                            {/* Janela de agendamento */}
                            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm">Janela de agendamento</span>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 uppercase">Essencial</span>
                                        </div>
                                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                            O período relativo até quando seus clientes podem marcar um agendamento.
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={isSchedulingWindowEnabled} onChange={(e) => setIsSchedulingWindowEnabled(e.target.checked)} />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                                {isSchedulingWindowEnabled && (
                                    <select
                                        value={schedulingWindow}
                                        onChange={(e) => setSchedulingWindow(e.target.value)}
                                        className={`w-full px-4 py-2.5 rounded-lg border outline-none appearance-none ${theme === 'dark' ? 'bg-black border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                    >
                                        <option value="30">Até 30 dias corridos no futuro</option>
                                        <option value="60">Até 60 dias corridos no futuro</option>
                                        <option value="90">Até 90 dias corridos no futuro</option>
                                    </select>
                                )}
                            </div>

                            {/* Antecedencia */}
                            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm">Antecedência para agendar</span>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 uppercase">Essencial</span>
                                        </div>
                                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                            É a antecedência mínima para agendar, ou seja, o tempo entre seu cliente agendar e o inicio do atendimento.
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={isMinNoticeEnabled} onChange={(e) => setIsMinNoticeEnabled(e.target.checked)} />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                                {isMinNoticeEnabled && (
                                    <select
                                        value={minNotice}
                                        onChange={(e) => setMinNotice(e.target.value)}
                                        className={`w-full px-4 py-2.5 rounded-lg border outline-none appearance-none ${theme === 'dark' ? 'bg-black border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                    >
                                        <option value="0">Não exigir antecedência</option>
                                        <option value="60">1 hora</option>
                                        <option value="1440">24 horas</option>
                                    </select>
                                )}
                            </div>

                            {/* Intervalo pré */}
                            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm">Intervalo pré-atendimento</span>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 uppercase">Essencial</span>
                                        </div>
                                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                            Tempo que será reservado <span className="underline">antes</span> de cada atendimento para preparo ou outros usos.
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={isBufferPreEnabled} onChange={(e) => setIsBufferPreEnabled(e.target.checked)} />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                                {isBufferPreEnabled && (
                                    <select
                                        value={bufferPre}
                                        onChange={(e) => setBufferPre(e.target.value)}
                                        className={`w-full px-4 py-2.5 rounded-lg border outline-none appearance-none ${theme === 'dark' ? 'bg-black border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                    >
                                        <option value="5">5 min</option>
                                        <option value="10">10 min</option>
                                        <option value="15">15 min</option>
                                    </select>
                                )}
                            </div>

                            {/* Intervalo pós */}
                            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm">Intervalo pós-atendimento</span>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 uppercase">Essencial</span>
                                        </div>
                                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                            Tempo que será reservado <span className="underline">depois</span> de cada atendimento para descanso ou outros usos.
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={isBufferPostEnabled} onChange={(e) => setIsBufferPostEnabled(e.target.checked)} />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                                {isBufferPostEnabled && (
                                    <select
                                        value={bufferPost}
                                        onChange={(e) => setBufferPost(e.target.value)}
                                        className={`w-full px-4 py-2.5 rounded-lg border outline-none appearance-none ${theme === 'dark' ? 'bg-black border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                    >
                                        <option value="5">5 min</option>
                                        <option value="10">10 min</option>
                                        <option value="15">15 min</option>
                                    </select>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
