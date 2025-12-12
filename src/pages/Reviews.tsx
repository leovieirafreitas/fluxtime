import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useUserProfileContext } from '../contexts/UserProfileContext';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import { Menu, Star, Copy, Check, ExternalLink } from 'lucide-react';

interface Review {
    id: string;
    company_id: string;
    client_name: string;
    rating: number;
    comment: string | null;
    created_at: string;
}

export default function Reviews() {
    const { theme } = useTheme();
    const { profile } = useUserProfileContext();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [averageRating, setAverageRating] = useState(0);
    const [companySlug, setCompanySlug] = useState('');

    const reviewLink = companySlug ? `${window.location.origin}/${companySlug}#reviews` : '';

    useEffect(() => {
        if (profile?.company_id) {
            fetchCompanySlug();
            fetchReviews();
        }
    }, [profile]);

    const fetchCompanySlug = async () => {
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('custom_link, name')
                .eq('id', profile?.company_id)
                .single();

            if (error) throw error;

            // Use custom_link if available, otherwise convert name to slug
            const slug = data?.custom_link || data?.name?.toLowerCase().replace(/\s+/g, '-') || '';
            setCompanySlug(slug);
        } catch (error) {
            console.error('Error fetching company slug:', error);
        }
    };

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('reviews')
                .select('*')
                .eq('company_id', profile?.company_id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setReviews(data || []);

            // Calculate average rating
            if (data && data.length > 0) {
                const avg = data.reduce((sum, review) => sum + review.rating, 0) / data.length;
                setAverageRating(Math.round(avg * 10) / 10);
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(reviewLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const renderStars = (rating: number, size: 'sm' | 'lg' = 'sm') => {
        const sizeClass = size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';
        return (
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`${sizeClass} ${star <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : theme === 'dark' ? 'text-slate-700' : 'text-slate-300'
                            }`}
                    />
                ))}
            </div>
        );
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
                    <div className="mb-8">
                        <h1 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            Avaliações
                        </h1>
                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            Compartilhe o link de avaliação com seus clientes e acompanhe o feedback.
                        </p>
                    </div>

                    {/* Link Card */}
                    <div className={`p-6 rounded-xl border mb-8 ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center gap-2 mb-3">
                            <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                Link de avaliação
                            </h2>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 uppercase tracking-wide">
                                Essencial
                            </span>
                        </div>
                        <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            Compartilhe este link com seus clientes para que eles possam avaliar seu serviço.
                        </p>
                        <div className="flex gap-2">
                            <div className={`flex-1 px-4 py-2.5 rounded-lg border ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                                <code className="text-sm break-all">{reviewLink}</code>
                            </div>
                            <button
                                onClick={copyLink}
                                className={`px-4 py-2.5 rounded-lg border transition-colors ${theme === 'dark'
                                    ? 'bg-black border-slate-700 text-white hover:bg-slate-900'
                                    : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                                    }`}
                            >
                                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                            </button>
                            <a
                                href={reviewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`px-4 py-2.5 rounded-lg border transition-colors ${theme === 'dark'
                                    ? 'bg-black border-slate-700 text-white hover:bg-slate-900'
                                    : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                                    }`}
                            >
                                <ExternalLink className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'}`}>
                            <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                Total de avaliações
                            </p>
                            <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {reviews.length}
                            </p>
                        </div>
                        <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'}`}>
                            <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                Avaliação média
                            </p>
                            <div className="flex items-center gap-2">
                                <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                    {averageRating > 0 ? averageRating.toFixed(1) : '-'}
                                </p>
                                {averageRating > 0 && renderStars(Math.round(averageRating), 'lg')}
                            </div>
                        </div>
                    </div>

                    {/* Reviews List */}
                    <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-slate-800 bg-black' : 'border-slate-200 bg-slate-50'}`}>
                            <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                Avaliações recentes
                            </h2>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : reviews.length === 0 ? (
                            <div className="p-12 text-center">
                                <Star className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-slate-700' : 'text-slate-300'}`} />
                                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Nenhuma avaliação ainda. Compartilhe o link com seus clientes!
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800 dark:divide-slate-800">
                                {reviews.map((review) => (
                                    <div key={review.id} className={`p-6 transition-colors ${theme === 'dark' ? 'hover:bg-slate-900' : 'hover:bg-slate-50'}`}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <p className={`font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                    {review.client_name}
                                                </p>
                                                {renderStars(review.rating)}
                                            </div>
                                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                                {new Date(review.created_at).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                        {review.comment && (
                                            <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                                {review.comment}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
