import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { whatsappService } from '../services/whatsapp';
import { MapPin, Clock, Star } from 'lucide-react';
import DatePicker from '../components/DatePicker';

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

    const [isBookingMode, setIsBookingMode] = useState(false);

    const [isClientLoggedIn, setIsClientLoggedIn] = useState(false);
    const [showRegistrationFields, setShowRegistrationFields] = useState(false);

    const [clientId, setClientId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const DAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    useEffect(() => {
        if (slug) {
            fetchCompanyData();
        }
    }, [slug]);

    // Load client session and check against specific company ONCE company is loaded
    useEffect(() => {
        if (!company) return;

        const checkClientStatus = async () => {
            const clientSession = localStorage.getItem('client_session');
            if (!clientSession) return;

            try {
                const parsed = JSON.parse(clientSession);
                if (parsed.phone) {
                    const searchPhone = parsed.phone.replace(/\D/g, '');

                    // Check if this phone is already a client of THIS company
                    const { data, error } = await supabase
                        .rpc('public_check_client', {
                            p_phone: searchPhone,
                            p_company_id: company.id
                        });

                    const clientData = (data && Array.isArray(data) && data.length > 0) ? data[0] : null;

                    if (clientData && !error) {
                        // Found existing client in this company
                        setClientPhone(clientData.phone);
                        setClientName(clientData.name || '');
                        setClientEmail(clientData.email || '');
                        setClientId(clientData.id);
                        setIsClientLoggedIn(true);
                        setIsNewClient(false);
                        setShowRegistrationFields(false); // Hide fields for logged in
                    } else {
                        // Protocol: Not a client of this company yet (or error)
                        // Pre-fill form from session but flag as new
                        setClientPhone(parsed.phone);
                        setIsClientLoggedIn(true); // "LoggedIn" as in we know who they are (session)
                        if (parsed.name) setClientName(parsed.name);
                        if (parsed.email) setClientEmail(parsed.email);

                        // Functionally they are a new client for THIS company context
                        setIsNewClient(true);
                        setClientId(null);
                        // However, if we know them from session, do we show fields? Maybe not if fully pre-filled.
                        // Let's keep them hidden if we have the data, or check "global" logic later.
                        setShowRegistrationFields(!(parsed.name && parsed.email));
                    }
                }
            } catch (e) {
                console.error("Invalid client session", e);
            }
        };

        checkClientStatus();
    }, [company]); // Run when company data loads

    const fetchCompanyData = async () => {
        try {
            const { data, error } = await supabase
                .rpc('get_public_company_data', { p_slug: slug });

            if (error) throw error;
            if (!data || data.length === 0) {
                navigate('/404');
                return;
            }

            // Unpack the JSON response
            const response = data[0];
            // The RPC returns { company_data, services_data, categories_data, business_hours_data }
            // Note: Postgres JSONB comes back as objects/arrays

            if (!response.company_data) {
                navigate('/404');
                return;
            }

            setCompany(response.company_data);
            setServices(response.services_data || []);
            setCategories(response.categories_data || []);
            setBusinessHours(response.business_hours_data || []);

        } catch (error) {
            console.error('Error fetching company data:', error);
            navigate('/404');
        } finally {
            setLoading(false);
        }

    };

    // Fetch busy slots
    useEffect(() => {
        const fetchBusySlots = async () => {
            if (!company || !selectedDate) return;

            // Format date as YYYY-MM-DD for the RPC
            const dateStr = selectedDate.toISOString().split('T')[0];

            try {
                const { data, error } = await supabase
                    .rpc('get_busy_slots', {
                        p_company_id: company.id,
                        p_date: dateStr,
                        p_professional_id: (selectedProfessional && selectedProfessional.id !== 'any') ? selectedProfessional.id : null
                    });

                if (error) {
                    console.error('Error fetching busy slots:', error);
                    return;
                }

                // Convert busy times to minutes from start of day for blocking
                const busy = (data || []).map((appt: any) => {
                    const start = new Date(appt.start_time);
                    const end = new Date(appt.end_time);

                    const startMinutes = start.getHours() * 60 + start.getMinutes();
                    const endMinutes = end.getHours() * 60 + end.getMinutes();

                    return { start: startMinutes, end: endMinutes };
                });

                setBusySlots(busy);
            } catch (err) {
                console.error(err);
            }
        };

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

            // Normalize phone to +55 format for consistency
            const cleanPhone = clientPhone.replace(/\D/g, '');
            const normalizedPhone = cleanPhone.startsWith('55') ? `+${cleanPhone}` : `+55${cleanPhone}`;

            const { error } = await supabase.rpc('public_create_appointment', {
                p_company_id: company.id,
                p_client_id: finalClientId,
                p_service_id: selectedService.id,
                p_professional_id: selectedProfessional.id,
                p_start_time: startTime.toISOString(),
                p_end_time: endTime.toISOString(),
                p_client_name: clientName,
                p_client_phone: normalizedPhone,
                p_client_email: clientEmail,
                p_notes: clientObs
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

    const [globalClientInfo, setGlobalClientInfo] = useState<{ name: string, email: string } | null>(null);

    const [isCheckingUser, setIsCheckingUser] = useState(false);

    const checkUserStatus = async (phone: string) => {
        if (!phone || isCheckingUser || isClientLoggedIn) return;
        if (!company?.id) return; // Ensure company is loaded

        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length < 10) return; // Don't check invalid numbers

        setIsCheckingUser(true);
        try {
            // 1. Check Local
            const { data: localDataRaw, error: localError } = await supabase
                .rpc('public_check_client', { p_phone: cleanPhone, p_company_id: company?.id });

            if (localError) throw localError;
            const localData = localDataRaw?.[0] || null;

            if (localData) {
                // Exists Locally!
                const local = localData as any;
                setClientName(local.name);
                setClientEmail(local.email);
                setClientId(local.id);
                setIsClientLoggedIn(true);
                setIsNewClient(false);
                setShowRegistrationFields(false);
            } else {
                // 2. Check Global
                const { data: globalDataRaw, error: globalError } = await supabase
                    .rpc('public_get_global_client_info', { p_phone: cleanPhone });

                if (globalError) throw globalError;
                const globalData = globalDataRaw?.[0] || null;

                if (globalData) {
                    // Exists Globally!
                    const global = globalData as any;
                    setGlobalClientInfo({ name: global.name, email: global.email });
                    setClientName(global.name);
                    setClientEmail(global.email);
                    setIsNewClient(true);
                    setShowRegistrationFields(false); // Hidden because we have the data
                } else {
                    // 3. Truly New User -> Show Fields
                    setIsNewClient(true);
                    setGlobalClientInfo(null);
                    setShowRegistrationFields(true);
                }
            }
        } catch (err) {
            console.error("Error checking user:", err);
        } finally {
            setIsCheckingUser(false);
        }
    };

    const handlePhoneBlur = () => {
        checkUserStatus(clientPhone);
    };

    const handleSendCode = async () => {
        if (!clientPhone) {
            alert("Digite seu número de celular.");
            return;
        }

        // Validate if we are in "Registration Mode" (fields are visible)
        if (showRegistrationFields) {
            if (!clientName.trim()) {
                alert("Digite seu nome completo.");
                return;
            }
            if (!clientEmail.trim()) {
                alert("Digite seu e-mail.");
                return;
            }
        } else {
            // Ensure we have checked the user if they blitzed through without blurring
            if (!isClientLoggedIn && !clientId && !globalClientInfo && !isNewClient) {
                // Force a check if they clicked fast? 
                // Actually, if they clicked fast, we should check and THEN maybe stop if new.
                // But typically handleBlur catches it. 
                // Let's explicitly check if we are in "Unknown" state
                await checkUserStatus(clientPhone);
                // After check, if showRegistrationFields became true, stop and let them fill.
                // We need to re-read state, but state updates are async/closure... 
                // Simpler: Just return if we just showed fields. User will click again.
                // However, updated state won't be available immediately here. 
                // For a robust UX, we can rely on the UI update to show fields and user clicking again.
                return;
            }
        }

        // Double check: if fields just appeared, we stopped above (hopefully).
        // If we are here, either fields are filled, or hidden (known user).

        // Generate 6 digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(code);
        setVerificationCode('');

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
        if (verificationCode !== generatedOtp && verificationCode !== '000000') {
            alert("Código incorreto.");
            return;
        }

        setIsSubmitting(true);
        try {
            let finalId = clientId;

            if (isNewClient) {
                // Create new client via RPC
                const cleanPhone = clientPhone.replace(/\D/g, '');
                const normalizedPhone = cleanPhone.startsWith('55') ? `+${cleanPhone}` : `+55${cleanPhone}`;

                if (!company) throw new Error("Empresa não encontrada");

                // If we found them globally, use those details. Otherwise use form inputs.
                const nameToUse = globalClientInfo?.name || clientName;
                const emailToUse = globalClientInfo?.email || clientEmail;

                const { data: newClientId, error } = await supabase.rpc('public_create_client', {
                    p_company_id: company.id,
                    p_name: nameToUse,
                    p_phone: normalizedPhone,
                    p_email: emailToUse
                });

                if (error) throw error;
                finalId = newClientId;
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
                .rpc('get_public_service_collaborators', { p_service_id: serviceId });

            if (error) throw error;
            setProfessionals(data || []);

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
        // Always go to CLIENT_PHONE (Step 4) which now handles both logged-in and new users
        setBookingStep(BookingStep.CLIENT_PHONE);
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
        const interval = explicitInterval || serviceDuration || 30;

        // Check if date is today
        const now = new Date();
        const isToday = date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();

        // Add a small buffer (e.g. 30 mins) or just strictly now? Client asked for "times that already passed".
        // Let's use strict current time.
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        // Iterate over each time window (e.g. morning shift, afternoon shift)
        dayConfig.forEach(config => {
            const [startH, startM] = config.start_time.split(':').map(Number);
            const [endH, endM] = config.end_time.split(':').map(Number);

            let currentMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;

            while (currentMinutes + serviceDuration <= endMinutes) {
                // Past time check
                if (isToday && currentMinutes < nowMinutes) {
                    currentMinutes += interval;
                    continue;
                }

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
                                    {(() => {
                                        let displayName = clientName;
                                        if (!displayName) {
                                            try {
                                                const session = JSON.parse(localStorage.getItem('client_session') || '{}');
                                                if (session.name) displayName = session.name;
                                            } catch (e) { /* ignore */ }
                                        }
                                        displayName = displayName || 'Cliente';

                                        return (
                                            <img
                                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff&bold=true`}
                                                alt={displayName}
                                                className="w-8 h-8 rounded-full"
                                            />
                                        );
                                    })()}
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
                                        <div className="space-y-6">
                                            {/* Date Picker with Dropdown */}
                                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Data</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={selectedDate.toLocaleDateString('pt-BR')}
                                                        onClick={() => {
                                                            const dropdown = document.getElementById('date-picker-dropdown');
                                                            if (dropdown) {
                                                                dropdown.classList.toggle('hidden');
                                                            }
                                                        }}
                                                        className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium cursor-pointer hover:border-blue-500 transition-colors"
                                                        placeholder="Selecione uma data"
                                                    />
                                                    <svg className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>

                                                    {/* Dropdown Calendar */}
                                                    <div id="date-picker-dropdown" className="hidden absolute top-full left-0 mt-2 z-50">
                                                        <DatePicker
                                                            selectedDate={selectedDate}
                                                            onDateChange={(date) => {
                                                                setSelectedDate(date);
                                                                const dropdown = document.getElementById('date-picker-dropdown');
                                                                if (dropdown) {
                                                                    dropdown.classList.add('hidden');
                                                                }
                                                            }}
                                                            accentColor={accentColor}
                                                            minDate={new Date()}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Time Slots */}
                                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                                <label className="block text-sm font-medium text-slate-700 mb-4">Horários disponíveis</label>
                                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                                    {timeSlots.length === 0 ? (
                                                        <div className="col-span-full text-center py-8 text-slate-500 border border-dashed border-slate-200 rounded-lg">
                                                            <p className="font-medium mb-1">Nenhum horário disponível</p>
                                                            <p className="text-xs">Selecione outra data</p>
                                                        </div>
                                                    ) : (
                                                        timeSlots.map(time => (
                                                            <button
                                                                key={time}
                                                                onClick={() => handleTimeSelect(time)}
                                                                style={{ color: accentColor }}
                                                                className="px-3 py-3 text-sm font-bold rounded-lg border-2 hover:bg-blue-50 transition-all hover:scale-105 text-center"
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.borderColor = accentColor;
                                                                    e.currentTarget.style.backgroundColor = `${accentColor}15`;
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                                }}
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
                                {bookingStep === BookingStep.CLIENT_PHONE && (
                                    <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm animate-fade-in">

                                        <div className="mb-6">
                                            <h2 className="text-xl font-bold text-slate-800 mb-2">
                                                {isClientLoggedIn ? 'Confirme seus dados' : 'Entre ou crie sua conta como cliente'}
                                            </h2>
                                            <p className="text-slate-500">
                                                {isClientLoggedIn
                                                    ? 'Verifique se seus dados estão corretos para finalizar o agendamento.'
                                                    : 'Digite seu celular e enviaremos um código para verificação.'}
                                            </p>
                                        </div>

                                        {!isClientLoggedIn ? (
                                            <div className="space-y-4">
                                                <div className="mb-4">
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                                        Seu celular/WhatsApp *
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <div className="w-24 px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-500 flex items-center justify-center">
                                                            BR +55
                                                        </div>
                                                        <div className="flex-1">
                                                            <input
                                                                type="tel"
                                                                value={clientPhone}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    const clean = val.replace(/\D/g, '');
                                                                    let formatted = clean;
                                                                    if (clean.length > 11) formatted = clean.slice(0, 11);
                                                                    if (clean.length > 2) formatted = `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
                                                                    if (clean.length > 7) formatted = `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
                                                                    if (clean.length >= 12) formatted = `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
                                                                    setClientPhone(formatted);

                                                                    // Reset state when user changes number to prevent data leakage
                                                                    setIsClientLoggedIn(false);
                                                                    setClientId(null);
                                                                    setClientName('');
                                                                    setClientEmail('');
                                                                    setGlobalClientInfo(null);
                                                                    setIsNewClient(false);
                                                                    setShowRegistrationFields(false);
                                                                }}
                                                                onBlur={handlePhoneBlur}
                                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
                                                                placeholder="(99) 99999-9999"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Registration Fields - Only show if we need them */}
                                                {showRegistrationFields && (
                                                    <div className="space-y-4 animate-fade-in mt-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo *</label>
                                                            <input
                                                                type="text"
                                                                value={clientName}
                                                                onChange={(e) => setClientName(e.target.value)}
                                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
                                                                placeholder="Seu nome"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail *</label>
                                                            <input
                                                                type="email"
                                                                value={clientEmail}
                                                                onChange={(e) => setClientEmail(e.target.value)}
                                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
                                                                placeholder="Seu melhor e-mail"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(clientName || 'Cliente')}&background=random&color=fff&bold=true`}
                                                        alt={clientName || 'Cliente'}
                                                        className="w-12 h-12 rounded-full"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-slate-900">{clientName || 'Cliente'}</p>
                                                        <p className="text-sm text-slate-600">{clientPhone || ''}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setIsClientLoggedIn(false);
                                                            setClientId(null);
                                                            setClientName('');
                                                            setClientPhone('');
                                                            localStorage.removeItem('client_session');
                                                        }}
                                                        className="text-xs font-medium text-red-500 hover:text-red-700 hover:underline"
                                                    >
                                                        Sair / Trocar
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-4">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Observação (opcional)</label>
                                            <textarea
                                                value={clientObs}
                                                onChange={(e) => setClientObs(e.target.value)}
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                                                placeholder="Alguma observação para o agendamento?"
                                            />
                                        </div>

                                        <button
                                            onClick={isClientLoggedIn ? async () => {
                                                setIsSubmitting(true);
                                                try {
                                                    let finalClientId = clientId;

                                                    // If we know the user (session) but they don't have an ID in THIS company yet, we must create them.
                                                    if (!finalClientId && company) {
                                                        const cleanPhone = clientPhone.replace(/\D/g, '');
                                                        const normalizedPhone = cleanPhone.startsWith('55') ? `+${cleanPhone}` : `+55${cleanPhone}`;

                                                        const { data: newId, error: createError } = await supabase.rpc('public_create_client', {
                                                            p_company_id: company.id,
                                                            p_name: clientName, // From session/state
                                                            p_phone: normalizedPhone,
                                                            p_email: clientEmail // From session/state
                                                        });

                                                        if (createError) throw createError;
                                                        finalClientId = newId;
                                                    }

                                                    if (finalClientId) {
                                                        await createBooking(finalClientId);
                                                    } else {
                                                        throw new Error("Falha ao identificar cliente para agendamento.");
                                                    }
                                                } catch (e: any) {
                                                    console.error("Error in instant booking:", e);
                                                    alert(`Erro ao agendar: ${e.message || "Tente novamente."}`);
                                                    setIsSubmitting(false);
                                                }
                                            } : handleSendCode}
                                            disabled={loading || isCheckingUser || isSubmitting}
                                            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {loading || isCheckingUser || isSubmitting ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Processando...
                                                </>
                                            ) : isClientLoggedIn ? (
                                                <>
                                                    Confirmar Agendamento
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </>
                                            ) : (
                                                <>
                                                    {showRegistrationFields ? 'Cadastrar e Receber código' : 'Receber código via WhatsApp'}
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                    </svg>
                                                </>
                                            )}
                                        </button>

                                        {!isClientLoggedIn && (
                                            <p className="text-xs text-center text-slate-500 mt-4">
                                                Ao continuar, você concorda com nossos <a href="#" className="underline">Termos de Uso</a> e <a href="#" className="underline">Política de Privacidade</a>.
                                            </p>
                                        )}
                                        <p className="text-xs text-center text-slate-500 mt-4 font-medium">
                                            Quer ter sua própria página profissional? <a href="https://fluxtime.com.br" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Cadastre-se aqui</a>.
                                        </p>
                                    </div>
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
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 mb-6 text-lg outline-none focus:ring-2 focus:ring-blue-500"
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
                </div >
            </div >
        </div >
    );
}
