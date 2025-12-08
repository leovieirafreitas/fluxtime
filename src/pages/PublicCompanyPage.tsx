import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
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
    duration: number;
    price: number;
}

interface BusinessHour {
    day_of_week: number;
    is_open: boolean;
    start_time: string;
    end_time: string;
}

export default function PublicCompanyPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [company, setCompany] = useState<Company | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
    const [loading, setLoading] = useState(true);

    const DAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    useEffect(() => {
        if (slug) {
            fetchCompanyData();
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
                    <div className="flex items-center gap-3">
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
                    <nav className="hidden md:flex items-center gap-6">
                        <a href="#services" className="text-slate-700 hover:text-slate-900 font-medium">Serviços</a>
                        <a href="#about" className="text-slate-700 hover:text-slate-900 font-medium">Sobre</a>
                    </nav>
                    <button
                        style={{ backgroundColor: accentColor }}
                        className="px-6 py-2.5 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                        Agendar agora
                    </button>
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
                    {/* Left Column - Services */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Services Section */}
                        <section id="services">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-slate-900">Serviços</h2>
                                <a href="#services" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                                    Ver todos →
                                </a>
                            </div>
                            <div className="space-y-4">
                                {services.map((service) => (
                                    <div
                                        key={service.id}
                                        className="bg-white rounded-xl p-6 border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-slate-900 mb-1">{service.name}</h3>
                                                <p className="text-sm text-slate-600 mb-3">{service.description} • {formatDuration(service.duration)}</p>
                                                <p className="text-xl font-bold" style={{ color: accentColor }}>
                                                    {formatPrice(service.price)}
                                                </p>
                                            </div>
                                            <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
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
                                <button className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">
                                    Avaliar
                                </button>
                            </div>
                        </section>
                    </div>

                    {/* Right Column - Booking Widget */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl p-6 border border-slate-200 sticky top-24">
                            <h3 className="font-semibold text-slate-900 mb-4">Acessar área do cliente</h3>
                            <button
                                style={{ backgroundColor: accentColor }}
                                className="w-full py-3 text-white rounded-lg font-medium hover:opacity-90 transition-opacity mb-4"
                            >
                                Agendar agora
                            </button>
                            {!company.remove_branding && (
                                <div className="flex items-center justify-center gap-2 text-sm text-slate-500 pt-4 border-t border-slate-100">


                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
