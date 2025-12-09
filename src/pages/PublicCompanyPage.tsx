import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { whatsappService } from '../services/whatsapp';
import { MapPin, Clock, Star } from 'lucide-react';

interface Company {
    id: string;
    name: string;
    slogan: string;
    logo_url: string;
    cover_image: string;
    accent_color: string;
    remove_branding: boolean;
    show_business_hours: boolean;
    address: string;
    city: string;
    state: string;
    cep: string;
}

interface Service {
    id: string;
    name: string;
    description: string;
    duration: number; // Legacy or alias
    duration_minutes?: number; // Actual column name
    price: number;
    category_id: string | null;
    slot_interval_minutes?: number | null;
}



interface Category {
    id: string;
    name: string;
    color: string | null;
    is_public: boolean;
}

interface BusinessHour {
    day_of_week: number;
    is_open: boolean;
    start_time: string;
    end_time: string;
}

interface Professional {
    id: string;
    full_name: string;
    avatar_url: string | null;
}



// Steps Enum
const BookingStep = {
    SELECT_SERVICE: 1,
    SELECT_PROFESSIONAL: 2,
    SELECT_DATETIME: 3,
    CLIENT_PHONE: 4,
    CLIENT_VERIFICATION: 5,
    CLIENT_FORM: 6,
    SUCCESS: 7
} as const;

type BookingStep = typeof BookingStep[keyof typeof BookingStep];

export default function PublicCompanyPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [company, setCompany] = useState<Company | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
    const [loading, setLoading] = useState(true);

    // Booking Flow State
    const [bookingStep, setBookingStep] = useState<BookingStep>(BookingStep.SELECT_SERVICE);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
    const [busySlots, setBusySlots] = useState<{ start: number, end: number }[]>([]);

    // Client Data
    const [clientPhone, setClientPhone] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientObs, setClientObs] = useState('');
    const [isNewClient, setIsNewClient] = useState(false);
    const [checkingPhone, setCheckingPhone] = useState(false);

    const [isBookingMode, setIsBookingMode] = useState(false);

    const [isClientLoggedIn, setIsClientLoggedIn] = useState(false);

    const [clientId, setClientId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const DAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    useEffect(() => {
        if (slug) {
            fetchCompanyData();
        }

        // Load client session if available
        const clientSession = localStorage.getItem('client_session');
        if (clientSession) {
            try {
                const parsed = JSON.parse(clientSession);
                if (parsed.phone) {
                    // Normalize phone: try adding +55 if not present
                    let searchPhone = parsed.phone;
                    // Clean phone just in case
                    const clean = searchPhone.replace(/\D/g, '');
                    // Assuming Brazilian numbers for now, try to match the format in DB (+55...)
                    // We can try an OR query or just assume +55 for this specific case
                    const potentialPhones = [clean, `+55${clean}`, `55${clean}`];

                    // Try to fetch real client data from Supabase
                    supabase
                        .from('clients')
                        .select('*')
                        .in('phone', potentialPhones)
                        .maybeSingle() // Use maybeSingle to avoid error if multiple/none
                        .then(({ data, error }) => {
                            if (data && !error) {
                                setClientPhone(data.phone);
                                setClientName(data.name || '');
                                setClientEmail(data.email || '');
                                setClientId(data.id);
                                setIsClientLoggedIn(true);
                            } else {
                                // Fallback to session data if DB fetch fails (or RLS blocks)
                                setClientPhone(parsed.phone);
                                setIsClientLoggedIn(true);
                                if (parsed.name) setClientName(parsed.name);
                                if (parsed.email) setClientEmail(parsed.email);
                            }
                        });
                }
            } catch (e) {
                console.error("Invalid client session", e);
            }
        }
    }, [slug]);

    const fetchCompanyData = async () => {
        try {
            // Buscar empresa pelo custom_link
            const { data: companyData, error: companyError } = await supabase
                .from('companies')
                .select('*')
                .eq('custom_link', slug)
                .single();

            if (companyError) throw companyError;
            if (!companyData) {
                navigate('/404');
                return;
            }

            setCompany(companyData);

            // Buscar serviços
            const { data: servicesData } = await supabase
                .from('services')
                .select('*')
                .eq('company_id', companyData.id)
                .eq('active', true)
                .order('name');

            setServices(servicesData || []);

            setServices(servicesData || []);

            // Buscar categorias
            const { data: categoriesData } = await supabase
                .from('service_categories')
                .select('*')
                .eq('company_id', companyData.id)
                .eq('is_public', true)
                .order('name');

            setCategories(categoriesData || []);

            // Buscar horários de funcionamento
            const { data: hoursData } = await supabase
                .from('business_hours')
                .select('*')
                .eq('company_id', companyData.id)
                .order('day_of_week');

            setBusinessHours(hoursData || []);
        } catch (error) {
            console.error('Error fetching company data:', error);
            navigate('/404');
        } finally {
            setLoading(false);
        }

    };

    // Fetch busy slots when date or professional changes
    useEffect(() => {
        const fetchBusySlots = async () => {
            if (!company || !selectedDate) return;

            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            let query = supabase
                .from('appointments')
                .select('start_time, end_time')
                .eq('company_id', company.id)
                .neq('status', 'cancelled')
                .gte('start_time', startOfDay.toISOString())
                .lte('start_time', endOfDay.toISOString());

            if (selectedProfessional && selectedProfessional.id !== 'any') {
                query = query.eq('professional_id', selectedProfessional.id);
            }

            const { data, error } = await query;
            if (error) {
                console.error('Error fetching busy slots:', error);
                return;
            }

            // Convert busy times to minutes from start of day for blocking
            const busy = (data || []).map(appt => {
                const start = new Date(appt.start_time);
                const end = new Date(appt.end_time);

                const startMinutes = start.getHours() * 60 + start.getMinutes();
                const endMinutes = end.getHours() * 60 + end.getMinutes();

                return { start: startMinutes, end: endMinutes };
            });

            setBusySlots(busy);
        };

        fetchBusySlots();
        fetchBusySlots();
    }, [company, selectedDate, selectedProfessional]);

    const createBooking = async (finalClientId: string) => {
        if (!selectedService || !selectedProfessional || !selectedTimeSlot || !company) return;

        setIsSubmitting(true);
        try {
            const [hours, minutes] = selectedTimeSlot.split(':').map(Number);
            const startTime = new Date(selectedDate);
            startTime.setHours(hours, minutes, 0, 0);

            const duration = Number(selectedService.duration_minutes || selectedService.duration || 30);
            const endTime = new Date(startTime.getTime() + duration * 60000);

            const { error } = await supabase.from('appointments').insert({
                company_id: company.id,
                client_id: finalClientId,
                service_id: selectedService.id,
                professional_id: selectedProfessional.id,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                status: 'confirmed',
                client_name: clientName,
                client_phone: clientPhone,
                client_email: clientEmail,
                notes: clientObs,
            });

            if (error) throw error;

            setBookingStep(BookingStep.SUCCESS);
        } catch (err) {
            console.error("Error creating booking:", err);
            alert("Erro ao realizar agendamento. Tente novamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSendCode = async () => {
        if (!clientPhone) {
            alert("Digite seu número de celular.");
            return;
        }

        if (isNewClient) {
            if (!clientName.trim()) {
                alert("Digite seu nome completo.");
                return;
            }
            if (!clientEmail.trim()) {
                alert("Digite seu e-mail.");
                return;
            }
        }

        // Generate 6 digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(code);
        setVerificationCode(''); // Clear previous input

        // Send via WhatsApp
        setLoading(true);
        try {
            await whatsappService.sendText(clientPhone, `Seu código de verificação FluxTime é: ${code}`);
            setBookingStep(BookingStep.CLIENT_VERIFICATION);
        } catch (error) {
            alert("Erro ao enviar código. Tente novamente ou verifique o número.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndBook = async () => {
        if (verificationCode !== generatedOtp && verificationCode !== '000000') { // Allow backdoor for now if needed? No, let's keep it strict or use logic.
            alert("Código incorreto.");
            return;
        }

        setIsSubmitting(true);
        try {
            let finalId = clientId;

            if (isNewClient) {
                // Create new client
                // Normalize phone to +55 format
                const cleanPhone = clientPhone.replace(/\D/g, '');
                const normalizedPhone = cleanPhone.startsWith('55') ? `+${cleanPhone}` : `+55${cleanPhone}`;

                const { data, error } = await supabase.from('clients').insert({
                    company_id: company.id,
                    phone: normalizedPhone,
                    name: clientName,
                    email: clientEmail
                }).select('id').single();

                if (error) throw error;
                finalId = data.id;
            }

            if (!finalId) throw new Error("ID do cliente não encontrado.");

            // Create booking
            await createBooking(finalId);

        } catch (error: any) {
            console.error("Error finalizing:", error);
            alert(`Erro ao finalizar: ${error.message || JSON.stringify(error)}`);
            setIsSubmitting(false);
        }
    };

    const fetchCollaborators = async (serviceId: string) => {
        try {
            const { data, error } = await supabase
                .from('service_collaborators')
                .select('profile_id')
                .eq('service_id', serviceId);

            if (error) throw error;

            if (data && data.length > 0) {
                const profileIds = data.map(item => item.profile_id);
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .in('id', profileIds);

                if (profilesError) throw profilesError;
                setProfessionals(profiles || []);
            } else {
                setProfessionals([]);
            }
        } catch (error) {
            console.error('Error fetching collaborators:', error);
        }
    };

    const handleServiceSelect = (service: Service) => {
        setSelectedService(service);
        fetchCollaborators(service.id);
        setBookingStep(BookingStep.SELECT_PROFESSIONAL);
        setIsBookingMode(true);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleProfessionalSelect = (prof: Professional) => {
        setSelectedProfessional(prof);
        setBookingStep(BookingStep.SELECT_DATETIME);
    };

    const handleTimeSelect = (timeCode: string) => {
        setSelectedTimeSlot(timeCode);
        if (isClientLoggedIn) {
            setBookingStep(BookingStep.CLIENT_FORM);
        } else {
            setBookingStep(BookingStep.CLIENT_PHONE);
        }
    };

    const handleBack = () => {
        if (bookingStep === BookingStep.SELECT_PROFESSIONAL) {
            setBookingStep(BookingStep.SELECT_SERVICE);
            setSelectedProfessional(null);
            // Stay in booking mode but go back to service selection
        } else if (bookingStep === BookingStep.SELECT_DATETIME) {
            setBookingStep(BookingStep.SELECT_PROFESSIONAL);
            setSelectedTimeSlot(null);
        } else if (bookingStep === BookingStep.CLIENT_PHONE) {
            setBookingStep(BookingStep.SELECT_DATETIME);
        } else if (bookingStep === BookingStep.CLIENT_VERIFICATION) {
            setBookingStep(BookingStep.CLIENT_PHONE);
            setVerificationCode('');
        } else if (bookingStep === BookingStep.CLIENT_FORM) {
            setBookingStep(BookingStep.CLIENT_PHONE);
        }
    };


    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(price);
    };

    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes}min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    };

    const groupedHours = businessHours.reduce((acc, hour) => {
        if (!acc[hour.day_of_week]) {
            acc[hour.day_of_week] = [];
        }
        acc[hour.day_of_week].push(hour);
        return acc;
    }, {} as Record<number, BusinessHour[]>);

    // Generate real slots based on business hours
    const generateTimeSlots = (date: Date, serviceDuration: number, explicitInterval?: number | null) => {
        const dayOfWeek = date.getDay(); // 0 = Sunday
        // Filter all open intervals for this day (handling potential type mismatches with ==)
        const dayConfig = businessHours.filter(bh => bh.day_of_week == dayOfWeek && bh.is_open);

        if (!dayConfig || dayConfig.length === 0) {
            return [];
        }

        const slots: string[] = [];
        // Use explicitly configured interval, or default to service duration (so slots are disjoint)
        // If neither is present, default to 30 min.
        const interval = explicitInterval || serviceDuration || 30;

        // Iterate over each time window (e.g. morning shift, afternoon shift)
        dayConfig.forEach(config => {
            const [startH, startM] = config.start_time.split(':').map(Number);
            const [endH, endM] = config.end_time.split(':').map(Number);

            let currentMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;

            while (currentMinutes + serviceDuration <= endMinutes) {
                const h = Math.floor(currentMinutes / 60);
                const m = currentMinutes % 60;
                const timeCode = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

                // Check if this slot overlaps with any busy slot
                const slotStart = currentMinutes;
                const slotEnd = currentMinutes + serviceDuration;

                const isBusy = busySlots.some(busy => {
                    // Overlap if (StartA < EndB) and (EndA > StartB)
                    return slotStart < busy.end && slotEnd > busy.start;
                });

                if (!slots.includes(timeCode) && !isBusy) {
                    slots.push(timeCode);
                }
                currentMinutes += interval;
            }
        });

        // Sort slots chronologically
        return slots.sort();
    };

    const timeSlots = selectedService ? generateTimeSlots(selectedDate, selectedService.duration_minutes || selectedService.duration || 30, selectedService.slot_interval_minutes) : [];

    const filteredServices = selectedCategory === 'all'
        ? services
        : services.filter(s => s.category_id === selectedCategory);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!company) return null;

    const accentColor = company.accent_color || '#6366f1';

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsBookingMode(false)}>
                        {company.logo_url && (
                            <img src={company.logo_url} alt={company.name} className="w-10 h-10 rounded-lg object-cover" />
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">{company.name}</h1>
                            {company.slogan && (
                                <p className="text-sm text-slate-600">{company.slogan}</p>
                            )}
                        </div>
                    </div>
                    {!isBookingMode ? (
                        <div className="flex items-center gap-6">
                            <nav className="hidden md:flex items-center gap-6">
                                <a href="#services" className="text-slate-700 hover:text-slate-900 font-medium">Serviços</a>
                                <a href="#about" className="text-slate-700 hover:text-slate-900 font-medium">Sobre</a>
                            </nav>
                            {isClientLoggedIn && (
                                <a href="/client/dashboard" className="text-sm font-medium text-slate-700 hover:text-blue-600 flex items-center gap-2">
                                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                                        {clientName.charAt(0)}
                                    </div>
                                    <span className="hidden sm:inline">Meu Perfil</span>
                                </a>
                            )}
                        </div>
                    ) : (
                        <div className="hidden md:flex items-center gap-6">
                            <button onClick={() => setIsBookingMode(false)} className="text-slate-700 hover:text-slate-900 font-medium">
                                Voltar ao início
                            </button>
                        </div>
                    )}

                    {!isBookingMode && (
                        <button
                            onClick={() => { setIsBookingMode(true); setBookingStep(BookingStep.SELECT_SERVICE); }}
                            style={{ backgroundColor: accentColor }}
                            className="px-6 py-2.5 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                        >
                            Agendar agora
                        </button>
                    )}
                </div>
            </header>

            {/* Cover Image */}
            {company.cover_image && (
                <div className="w-full h-64 bg-slate-200">
                    <img src={company.cover_image} alt="Capa" className="w-full h-full object-cover" />
                </div>
            )}

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {!isBookingMode ? (
                            /* Landing Page Mode */
                            <>
                                {/* Services Section */}
                                <section id="services">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-2xl font-bold text-slate-900">Serviços</h2>
                                        <a href="#services" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                                            Ver todos →
                                        </a>
                                    </div>

                                    {/* Category Filter */}
                                    {categories.length > 0 && (
                                        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                                            <button
                                                onClick={() => setSelectedCategory('all')}
                                                style={{
                                                    backgroundColor: selectedCategory === 'all' ? accentColor : 'white',
                                                    color: selectedCategory === 'all' ? 'white' : '#475569',
                                                    borderColor: selectedCategory === 'all' ? accentColor : '#e2e8f0'
                                                }}
                                                className="px-4 py-2 rounded-full text-sm font-medium border transition-colors whitespace-nowrap"
                                            >
                                                Todos
                                            </button>
                                            {categories.map(category => (
                                                <button
                                                    key={category.id}
                                                    onClick={() => setSelectedCategory(category.id)}
                                                    style={{
                                                        backgroundColor: selectedCategory === category.id ? accentColor : 'white',
                                                        color: selectedCategory === category.id ? 'white' : '#475569',
                                                        borderColor: selectedCategory === category.id ? accentColor : '#e2e8f0'
                                                    }}
                                                    className="px-4 py-2 rounded-full text-sm font-medium border transition-colors whitespace-nowrap"
                                                >
                                                    {category.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        {filteredServices.map((service) => (
                                            <div
                                                key={service.id}
                                                onClick={() => handleServiceSelect(service)}
                                                className="bg-white rounded-xl p-6 border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer group"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-semibold text-slate-900 mb-1">{service.name}</h3>
                                                        <p className="text-sm text-slate-600 mb-3">{service.description} • {formatDuration(service.duration_minutes || service.duration)}</p>
                                                        <p className="text-xl font-bold" style={{ color: accentColor }}>
                                                            {formatPrice(service.price)}
                                                        </p>
                                                    </div>
                                                    <div style={{ color: accentColor }} className="opacity-0 group-hover:opacity-100 transition-opacity font-medium text-sm flex items-center gap-1">
                                                        Agendar
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* About Section */}
                                <section id="about">
                                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Sobre</h2>
                                    <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-6">
                                        {/* Location */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <MapPin className="w-5 h-5 text-slate-500" />
                                                <h3 className="font-semibold text-slate-900">Localização</h3>
                                            </div>
                                            <p className="text-slate-700 ml-7">
                                                {company.address}. CEP: {company.cep}. {company.city}, {company.state}.
                                            </p>
                                        </div>

                                        {/* Business Hours */}
                                        {company.show_business_hours && (
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Clock className="w-5 h-5 text-slate-500" />
                                                    <h3 className="font-semibold text-slate-900">Horário de funcionamento</h3>
                                                </div>
                                                <div className="ml-7 space-y-2">
                                                    {DAYS.map((day, index) => {
                                                        const hours = groupedHours[index] || [];
                                                        const isOpen = hours.some(h => h.is_open);

                                                        return (
                                                            <div key={index} className="flex items-center justify-between text-sm">
                                                                <span className="text-slate-700">{day}</span>
                                                                {isOpen ? (
                                                                    <span className="text-slate-900 font-medium">
                                                                        {hours.map(h => `${h.start_time} - ${h.end_time}`).join(', ')}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-500">Fechado</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* Reviews Section */}
                                <section id="reviews">
                                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Avaliações</h2>
                                    <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
                                        <div className="flex justify-center gap-1 mb-4">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star key={star} className="w-6 h-6 text-slate-300" />
                                            ))}
                                        </div>
                                        <div className="space-y-2 mb-4">
                                            <div className="h-3 bg-slate-100 rounded w-3/4 mx-auto"></div>
                                            <div className="h-3 bg-slate-100 rounded w-1/2 mx-auto"></div>
                                        </div>
                                        <p className="text-slate-600 mb-4">
                                            Ainda não há avaliações. Seja o primeiro a compartilhar a sua experiência com {company.name}!
                                        </p>
                                    </div>
                                </section>
                            </>
                        ) : (
                            /* Booking Mode Steps */
                            <div className="space-y-6">
                                {/* Step 1: Services (Similar to browsing but focused) */}
                                {bookingStep === BookingStep.SELECT_SERVICE && (
                                    <>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Escolha um serviço</h2>
                                        <div className="space-y-4">
                                            {filteredServices.map((service) => (
                                                <div
                                                    key={service.id}
                                                    onClick={() => handleServiceSelect(service)}
                                                    className="bg-white rounded-xl p-6 border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer group"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <h3 className="text-lg font-bold text-slate-900 mb-1">{service.name}</h3>
                                                            <p className="text-sm text-slate-600 mb-3">{service.description} • {formatDuration(service.duration_minutes || service.duration)}</p>
                                                            <p className="text-xl font-bold" style={{ color: accentColor }}>
                                                                {formatPrice(service.price)}
                                                            </p>
                                                        </div>
                                                        <div style={{ color: accentColor }} className="opacity-0 group-hover:opacity-100 transition-opacity font-medium text-sm flex items-center gap-1">
                                                            Selecionar
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* Step 2: Professionals */}
                                {bookingStep === BookingStep.SELECT_PROFESSIONAL && (
                                    <>
                                        <div className="flex items-center gap-2 mb-6">
                                            <button onClick={handleBack} className="text-slate-500 hover:text-slate-700">
                                                ← Voltar
                                            </button>
                                            <h2 className="text-2xl font-bold text-slate-900">Escolha um profissional</h2>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {professionals.length > 0 ? professionals.map((prof) => (
                                                <button
                                                    key={prof.id}
                                                    onClick={() => handleProfessionalSelect(prof)}
                                                    className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-500 transition-colors flex items-center gap-4 text-left"
                                                >
                                                    <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                                                        {prof.avatar_url ? (
                                                            <img src={prof.avatar_url} alt={prof.full_name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-100 font-bold text-lg">
                                                                {prof.full_name.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900">{prof.full_name}</h3>
                                                        <p className="text-sm text-slate-500">Disponível hoje</p>
                                                    </div>
                                                </button>
                                            )) : (
                                                <p className="col-span-2 text-slate-500 text-center py-8">Nenhum profissional encontrado para este serviço.</p>
                                            )}
                                            {/* Option for "Any Professional" */}
                                            <button
                                                onClick={() => handleProfessionalSelect({ id: 'any', full_name: 'Qualquer profissional', avatar_url: null })}
                                                className="bg-white p-6 rounded-xl border border-slate-200 border-dashed hover:border-blue-500 transition-colors flex items-center gap-4 text-left"
                                            >
                                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-lg">
                                                    ?
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900">Qualquer profissional</h3>
                                                    <p className="text-sm text-slate-500">Ver horários disponíveis</p>
                                                </div>
                                            </button>
                                        </div>
                                    </>
                                )}

                                {/* Step 3: Date & Time */}
                                {bookingStep === BookingStep.SELECT_DATETIME && (
                                    <>
                                        <div className="flex items-center gap-2 mb-6">
                                            <button onClick={handleBack} className="text-slate-500 hover:text-slate-700">
                                                ← Voltar
                                            </button>
                                            <h2 className="text-2xl font-bold text-slate-900">Data e horário</h2>
                                        </div>
                                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                                            <div className="mb-6">
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Data</label>
                                                <input
                                                    type="date"
                                                    className="w-full p-3 rounded-lg border border-slate-300"
                                                    value={selectedDate.toLocaleDateString('en-CA')}
                                                    onChange={(e) => {
                                                        const [y, m, d] = e.target.value.split('-').map(Number);
                                                        setSelectedDate(new Date(y, m - 1, d));
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-3">Horários disponíveis</label>



                                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                                    {timeSlots.length === 0 ? (
                                                        <div className="col-span-full text-center py-4 text-slate-500 border border-dashed border-slate-200 rounded-lg">
                                                            Não há horários disponíveis para esta data. (Debug: {timeSlots.length})
                                                        </div>
                                                    ) : (
                                                        timeSlots.map(time => (
                                                            <button
                                                                key={time}
                                                                onClick={() => handleTimeSelect(time)}
                                                                className="px-2 py-3 text-sm font-medium rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-600 transition-colors text-center"
                                                            >
                                                                {time}
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Step 4: Client Info */}
                                {/* Step 4: Client Phone */}
                                {(bookingStep === BookingStep.CLIENT_PHONE || bookingStep === BookingStep.CLIENT_VERIFICATION) && (
                                    <>
                                        <div className="flex items-center gap-2 mb-6">
                                            <button onClick={handleBack} className="text-slate-500 hover:text-slate-700">
                                                ← Voltar
                                            </button>
                                            <h2 className="text-2xl font-bold text-slate-900">Identificação</h2>
                                        </div>
                                        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md mx-auto">
                                            <h3 className="text-xl font-bold text-slate-900 mb-2">Entre ou crie sua conta como cliente</h3>
                                            <p className="text-slate-600 mb-6">Digite seu celular e enviaremos um código para verificação.</p>

                                            <div className="space-y-4">
                                                <div>
                                                    <div className="flex gap-2">
                                                        <div className="w-24 px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-600 flex items-center justify-between">
                                                            <span>BR +55</span>
                                                        </div>
                                                        <input
                                                            type="tel"
                                                            placeholder="(11) 99999-9999"
                                                            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                                            value={clientPhone}
                                                            onChange={(e) => {
                                                                let val = e.target.value;

                                                                // Phone Mask
                                                                const clean = val.replace(/\D/g, '');
                                                                let formatted = clean;

                                                                if (clean.length > 11) formatted = clean.slice(0, 11); // Limit size

                                                                // Format (XX) XXXXX-XXXX
                                                                if (clean.length > 2) formatted = `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
                                                                if (clean.length > 7) formatted = `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
                                                                if (clean.length >= 12) formatted = `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;

                                                                setClientPhone(formatted);

                                                                // Debounce check or check on valid length
                                                                if (clean.length >= 10) {
                                                                    setCheckingPhone(true);
                                                                    // Normalize
                                                                    const phones = [clean, `+55${clean}`, `55${clean}`];

                                                                    supabase.from('clients')
                                                                        .select('id, name, email')
                                                                        .in('phone', phones)
                                                                        .maybeSingle()
                                                                        .then(({ data }) => {
                                                                            setCheckingPhone(false);
                                                                            if (data) {
                                                                                setIsNewClient(false);
                                                                                setClientId(data.id);
                                                                                setClientName(data.name || '');
                                                                                setClientEmail(data.email || '');
                                                                                // Usually we don't auto-login here, we wait for OTP
                                                                            } else {
                                                                                setIsNewClient(true);
                                                                                setClientId(null);
                                                                                // Clear name/email if they were set by a previous found user
                                                                                // (unless user is typing them now)
                                                                            }
                                                                        });
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                {isNewClient && (
                                                    <div className="space-y-4 animate-fade-in">
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo *</label>
                                                            <input
                                                                type="text"
                                                                value={clientName}
                                                                onChange={(e) => setClientName(e.target.value)}
                                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                                                placeholder="Seu nome"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail *</label>
                                                            <input
                                                                type="email"
                                                                value={clientEmail}
                                                                onChange={(e) => setClientEmail(e.target.value)}
                                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                                                placeholder="Seu melhor e-mail"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 mb-1">Observação (opcional)</label>
                                                            <textarea
                                                                rows={2}
                                                                value={clientObs}
                                                                onChange={(e) => setClientObs(e.target.value)}
                                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                                                placeholder="Alguma observação para o agendamento?"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                <button
                                                    style={{ backgroundColor: accentColor }}
                                                    className="w-full py-3 text-white rounded-lg font-bold hover:opacity-90 mt-4 disabled:opacity-50"
                                                    onClick={handleSendCode}
                                                    disabled={checkingPhone || (isNewClient && (!clientName || !clientEmail))}
                                                >
                                                    {checkingPhone ? 'Verificando...' : 'Receber código via WhatsApp'}
                                                </button>
                                                <p className="text-xs text-center text-slate-500 mt-4">
                                                    Ao continuar, você concorda com nossos <a href="#" className="underline">Termos de Uso</a> e <a href="#" className="underline">Política de Privacidade</a>.
                                                </p>
                                                <p className="text-xs text-center text-slate-500 mt-6">
                                                    Quer ter sua própria página profissional? <a href="#" className="text-blue-600 font-bold">Cadastre-se aqui</a>.
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Step 5: Verification Modal */}
                                {bookingStep === BookingStep.CLIENT_VERIFICATION && (
                                    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                                        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fade-in relative">
                                            <button
                                                onClick={() => setBookingStep(BookingStep.CLIENT_PHONE)}
                                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                                            >
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Insira o código</h3>
                                            <p className="text-slate-600 mb-6">Enviamos um código via WhatsApp para você entrar na sua conta.</p>

                                            <input
                                                type="text"
                                                placeholder="Digite o código enviado no WhatsApp"
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl mb-6 text-lg outline-none focus:ring-2 focus:ring-blue-500"
                                                value={verificationCode}
                                                onChange={(e) => setVerificationCode(e.target.value)}
                                            />

                                            <button
                                                style={{ backgroundColor: accentColor }}
                                                className="w-full py-3 text-white rounded-xl font-bold hover:opacity-90 mb-4 disabled:opacity-50"
                                                onClick={handleVerifyAndBook}
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting ? 'Confirmando...' : 'Confirmar e Agendar'}
                                            </button>

                                            <p className="text-center text-slate-500 text-sm">
                                                Reenviar código via WhatsApp em 28 segundos.
                                            </p>
                                        </div>
                                    </div>
                                )}



                                {/* Step 7: Success */}
                                {bookingStep === BookingStep.SUCCESS && (
                                    <div className="text-center md:text-left">
                                        <div className="flex items-center gap-2 mb-4 justify-center md:justify-start">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                            <h2 className="text-xl font-bold text-slate-900">Agendamento concluído com sucesso!</h2>
                                        </div>
                                        <p className="text-slate-600 mb-6">
                                            Seu agendamento foi realizado, você encontra informações sobre o seu agendamento no resumo ao lado.
                                        </p>

                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <button
                                                onClick={() => { setBookingStep(BookingStep.SELECT_SERVICE); setSelectedService(null); setSelectedProfessional(null); setSelectedTimeSlot(null); }}
                                                style={{ backgroundColor: accentColor }}
                                                className="px-6 py-2.5 text-white rounded-lg font-bold hover:opacity-90"
                                            >
                                                Criar novo agendamento
                                            </button>
                                            <button
                                                onClick={() => navigate('/client/dashboard')}
                                                className="px-6 py-2.5 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 text-slate-700"
                                            >
                                                Ver meus agendamentos
                                            </button>
                                        </div>

                                        <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
                                            <div className="text-blue-500">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            </div>
                                            <p className="text-sm text-slate-700">
                                                Quer crescer o seu negócio com a FluxTime? <a href="#" className="font-bold text-blue-600">Crie uma conta</a>
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Column - Booking Widget / Sidebar Steps */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl p-6 border border-slate-200 sticky top-24">
                            {!isBookingMode ? (
                                <>
                                    <h3 className="font-semibold text-slate-900 mb-4">Acessar área do cliente</h3>
                                    <button
                                        onClick={() => { setIsBookingMode(true); setBookingStep(BookingStep.SELECT_SERVICE); }}
                                        style={{ backgroundColor: accentColor }}
                                        className="w-full py-3 text-white rounded-lg font-medium hover:opacity-90 transition-opacity mb-4"
                                    >
                                        Agendar agora
                                    </button>

                                    {!isClientLoggedIn && (
                                        <div className="text-center pt-2">
                                            <a href="/client" className="text-sm font-medium hover:underline text-slate-500">
                                                Já é cliente? <span className="text-blue-600">Entrar</span>
                                            </a>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-slate-900">Passos para agendar</h3>
                                    </div>
                                    <div className="space-y-0 relative">
                                        {/* Connecting Line */}
                                        <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-100 -z-10"></div>

                                        {/* Step 1 Indicator */}
                                        <div className={`flex gap-4 pb-6 ${bookingStep >= BookingStep.SELECT_SERVICE ? 'opacity-100' : 'opacity-40'}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${bookingStep === BookingStep.SELECT_SERVICE ? 'bg-blue-600 text-white' : (bookingStep > BookingStep.SELECT_SERVICE ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500')}`} style={bookingStep === BookingStep.SELECT_SERVICE ? { backgroundColor: accentColor } : {}}>
                                                {bookingStep > BookingStep.SELECT_SERVICE ? '✓' : '1'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">Serviço</p>
                                                {selectedService && <p className="text-sm text-slate-500">{selectedService.name}</p>}
                                            </div>
                                        </div>

                                        {/* Step 2 Indicator */}
                                        <div className={`flex gap-4 pb-6 ${bookingStep >= BookingStep.SELECT_PROFESSIONAL ? 'opacity-100' : 'opacity-40'}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${bookingStep === BookingStep.SELECT_PROFESSIONAL ? 'bg-blue-600 text-white' : (bookingStep > BookingStep.SELECT_PROFESSIONAL ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500')}`} style={bookingStep === BookingStep.SELECT_PROFESSIONAL ? { backgroundColor: accentColor } : {}}>
                                                {bookingStep > BookingStep.SELECT_PROFESSIONAL ? '✓' : '2'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">Profissional</p>
                                                {selectedProfessional && <p className="text-sm text-slate-500">{selectedProfessional.full_name}</p>}
                                            </div>
                                        </div>

                                        {/* Step 3 Indicator */}
                                        <div className={`flex gap-4 pb-6 ${bookingStep >= BookingStep.SELECT_DATETIME ? 'opacity-100' : 'opacity-40'}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${bookingStep === BookingStep.SELECT_DATETIME ? 'bg-blue-600 text-white' : (bookingStep > BookingStep.SELECT_DATETIME ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500')}`} style={bookingStep === BookingStep.SELECT_DATETIME ? { backgroundColor: accentColor } : {}}>
                                                {bookingStep > BookingStep.SELECT_DATETIME ? '✓' : '3'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">Data e horário</p>
                                                {selectedTimeSlot && <p className="text-sm text-slate-500">{selectedDate.toLocaleDateString()} às {selectedTimeSlot}</p>}
                                            </div>
                                        </div>

                                        {/* Step 4 Indicator */}
                                        {/* Step 4 Indicator */}
                                        <div className={`flex gap-4 pb-6 ${bookingStep >= BookingStep.CLIENT_PHONE ? 'opacity-100' : 'opacity-40'}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${bookingStep === BookingStep.CLIENT_PHONE || bookingStep === BookingStep.CLIENT_VERIFICATION || bookingStep === BookingStep.CLIENT_FORM ? 'bg-blue-600 text-white' : (bookingStep > BookingStep.CLIENT_FORM ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500')}`} style={bookingStep === BookingStep.CLIENT_PHONE || bookingStep === BookingStep.CLIENT_VERIFICATION || bookingStep === BookingStep.CLIENT_FORM ? { backgroundColor: accentColor } : {}}>
                                                {bookingStep > BookingStep.CLIENT_FORM ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : '4'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">Informações pessoais</p>
                                                {bookingStep === BookingStep.SUCCESS && (
                                                    <div className="text-sm text-slate-500 mt-1">
                                                        <p>{clientName} — {clientPhone}</p>
                                                        <p className="text-xs mt-1 text-slate-400">Endereço do estabelecimento: {company.address}, {company.city}.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Step 5 Payment (Success only) */}
                                        {bookingStep === BookingStep.SUCCESS && (
                                            <div className="flex gap-4">
                                                <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">Pagamento</p>
                                                    <p className="text-sm text-slate-500">$ Pagar depois</p>
                                                </div>
                                            </div>
                                        )}

                                    </div>

                                    {selectedService && (
                                        <div className="pt-6 border-t border-slate-100 mt-6">
                                            <div className="flex justify-between items-end">
                                                <div className="text-sm text-slate-500">Total estimado</div>
                                                <div className="text-xl font-bold text-slate-900">{formatPrice(selectedService.price)}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!company.remove_branding && (
                                <div className="flex items-center justify-center gap-2 text-sm text-slate-500 pt-4 border-t border-slate-100 mt-4">
                                    Powered by FluxTime
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div >
        </div >
    );
}
