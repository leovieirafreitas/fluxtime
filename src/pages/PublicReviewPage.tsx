import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Star, Send, CheckCircle } from 'lucide-react';

export default function PublicReviewPage() {
    const { companyId } = useParams<{ companyId: string }>();
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [clientName, setClientName] = useState('');
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [companyName, setCompanyName] = useState('');

    useEffect(() => {
        if (companyId) {
            fetchCompanyName();
        }
    }, [companyId]);

    const fetchCompanyName = async () => {
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('name')
                .eq('id', companyId)
                .single();

            if (error) throw error;
            setCompanyName(data?.name || 'Esta empresa');
        } catch (error) {
            console.error('Error fetching company:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!rating || !clientName.trim()) {
            alert('Por favor, preencha seu nome e selecione uma avaliação.');
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('reviews')
                .insert({
                    company_id: companyId,
                    client_name: clientName.trim(),
                    rating,
                    comment: comment.trim() || null
                });

            if (error) throw error;

            setSubmitted(true);
        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Erro ao enviar avaliação. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">
                        Avaliação enviada!
                    </h1>
                    <p className="text-slate-600">
                        Obrigado pelo seu feedback. Sua opinião é muito importante para nós!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        Avalie {companyName}
                    </h1>
                    <p className="text-slate-600">
                        Sua opinião nos ajuda a melhorar nossos serviços
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Seu nome *
                        </label>
                        <input
                            type="text"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="Digite seu nome"
                            required
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                        />
                    </div>

                    {/* Rating */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">
                            Como você avalia nosso serviço? *
                        </label>
                        <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="transition-transform hover:scale-110 focus:outline-none"
                                >
                                    <Star
                                        className={`w-12 h-12 ${star <= (hoverRating || rating)
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-slate-300'
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>
                        {rating > 0 && (
                            <p className="text-center mt-2 text-sm text-slate-600">
                                {rating === 1 && 'Muito insatisfeito'}
                                {rating === 2 && 'Insatisfeito'}
                                {rating === 3 && 'Neutro'}
                                {rating === 4 && 'Satisfeito'}
                                {rating === 5 && 'Muito satisfeito'}
                            </p>
                        )}
                    </div>

                    {/* Comment */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Comentário (opcional)
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Conte-nos mais sobre sua experiência..."
                            rows={4}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={submitting || !rating}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                Enviar avaliação
                            </>
                        )}
                    </button>
                </form>

                <p className="text-center text-xs text-slate-500 mt-6">
                    Suas informações serão usadas apenas para melhorar nossos serviços
                </p>
            </div>
        </div>
    );
}
