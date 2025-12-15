import { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Tag, Percent, DollarSign, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUserProfileContext } from '../contexts/UserProfileContext';

interface Coupon {
    id: string;
    code: string;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    max_uses: number | null;
    used_count: number;
    expiration_date: string | null;
    active: boolean;
}

export default function Coupons() {
    const { profile } = useUserProfileContext();
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        code: '',
        discount_type: 'percent',
        discount_value: '',
        max_uses: '',
        expiration_date: ''
    });

    useEffect(() => {
        if (profile?.company_id) {
            fetchCoupons();
        }
    }, [profile?.company_id]);

    const fetchCoupons = async () => {
        try {
            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .eq('company_id', profile?.company_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCoupons(data || []);
        } catch (error) {
            console.error('Error fetching coupons:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este cupom?')) return;

        try {
            const { error } = await supabase
                .from('coupons')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setCoupons(coupons.filter(c => c.id !== id));
        } catch (error) {
            console.error('Error deleting coupon:', error);
            alert('Erro ao excluir cupom.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('coupons')
                .insert({
                    company_id: profile?.company_id,
                    code: formData.code.toUpperCase(),
                    discount_type: formData.discount_type,
                    discount_value: parseFloat(formData.discount_value),
                    max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
                    expiration_date: formData.expiration_date || null,
                    active: true
                });

            if (error) throw error;

            setIsModalOpen(false);
            setFormData({
                code: '',
                discount_type: 'percent',
                discount_value: '',
                max_uses: '',
                expiration_date: ''
            });
            fetchCoupons();
        } catch (error) {
            console.error('Error creating coupon:', error);
            alert('Erro ao criar cupom. Verifique se o código já existe.');
        }
    };

    const filteredCoupons = coupons.filter(c =>
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8">Carregando...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Cupons de Desconto</h1>
                    <p className="text-slate-500">Gerencie os cupons promocionais da sua loja.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Novo Cupom
                </button>
            </div>

            {/* Search */}
            <div className="mb-6 relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                    type="text"
                    placeholder="Buscar cupom pelo código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full md:w-80 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Código</th>
                            <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Desconto</th>
                            <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Uso</th>
                            <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Validade</th>
                            <th className="text-right py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredCoupons.map((coupon) => (
                            <tr key={coupon.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                            <Tag className="w-4 h-4" />
                                        </div>
                                        <span className="font-bold text-slate-900">{coupon.code}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${coupon.discount_type === 'percent'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-green-100 text-green-700'
                                        }`}>
                                        {coupon.discount_type === 'percent'
                                            ? <Percent className="w-3 h-3" />
                                            : <DollarSign className="w-3 h-3" />
                                        }
                                        {coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : `R$ ${coupon.discount_value}`}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-slate-600 text-sm">
                                    {coupon.used_count} / {coupon.max_uses ? coupon.max_uses : '∞'}
                                </td>
                                <td className="py-4 px-6 text-slate-600 text-sm">
                                    {coupon.expiration_date
                                        ? new Date(coupon.expiration_date).toLocaleDateString('pt-BR')
                                        : 'Sem validade'}
                                </td>
                                <td className="py-4 px-6 text-right">
                                    <button
                                        onClick={() => handleDelete(coupon.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredCoupons.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-500">
                                    Nenhum cupom encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-900">Novo Cupom</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Código do Cupom</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder="EX: VERÃO2025"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                                    <select
                                        value={formData.discount_type}
                                        onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="percent">Porcentagem (%)</option>
                                        <option value="fixed">Valor Fixo (R$)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={formData.discount_value}
                                        onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Limite de Uso</label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Opcional"
                                        value={formData.max_uses}
                                        onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Validade</label>
                                    <input
                                        type="date"
                                        value={formData.expiration_date}
                                        onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2 text-slate-700 font-medium hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                    Criar Cupom
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
