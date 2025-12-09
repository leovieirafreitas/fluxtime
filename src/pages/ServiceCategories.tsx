
import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useUserProfileContext } from '../contexts/UserProfileContext';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import { Menu, Plus, Pencil, Trash2, X, Tags } from 'lucide-react';

interface Category {
    id: string;
    name: string;
    color: string | null;
    is_public: boolean;
}

export default function ServiceCategories() {
    const { theme } = useTheme();
    const { profile } = useUserProfileContext();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({ name: '', color: '#3B82F6', is_public: true });
    const [saving, setSaving] = useState(false);

    const colors = [
        '#EF4444', // Red
        '#F97316', // Orange
        '#F59E0B', // Amber
        '#10B981', // Emerald
        '#06B6D4', // Cyan
        '#3B82F6', // Blue
        '#6366F1', // Indigo
        '#8B5CF6', // Violet
        '#EC4899', // Pink
        '#64748B', // Slate
    ];

    useEffect(() => {
        if (profile?.company_id) {
            fetchCategories();
        }
    }, [profile]);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('service_categories')
                .select('*')
                .eq('company_id', profile?.company_id)
                .order('name');

            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (category?: Category) => {
        if (category) {
            setEditingCategory(category);
            setFormData({ name: category.name, color: category.color || '#3B82F6', is_public: category.is_public !== false });
        } else {
            setEditingCategory(null);
            setFormData({ name: '', color: '#3B82F6', is_public: true });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
        setFormData({ name: '', color: '#3B82F6', is_public: true });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta categoria? Os serviços vinculados não serão excluídos, apenas desvinculados.')) return;

        try {
            const { error } = await supabase
                .from('service_categories')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
            alert('Erro ao excluir categoria.');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        setSaving(true);
        try {
            if (editingCategory) {
                // Update
                const { error } = await supabase
                    .from('service_categories')
                    .update({
                        name: formData.name,
                        color: formData.color,
                        is_public: formData.is_public
                    })
                    .eq('id', editingCategory.id);

                if (error) throw error;
            } else {
                // Create
                const { error } = await supabase
                    .from('service_categories')
                    .insert({
                        company_id: profile?.company_id,
                        name: formData.name,
                        color: formData.color,
                        is_public: formData.is_public
                    });

                if (error) throw error;
            }
            fetchCategories();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving category:', error);
            alert('Erro ao salvar categoria.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'}`}>
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className={`md:ml-64 p-4 md:p-8 transition-all duration-300`}>
                <div className="max-w-5xl mx-auto space-y-6">
                    {/* Header Mobile */}
                    <button
                        className={`md:hidden mb-4 p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-white hover:bg-white/10' : 'text-slate-900 hover:bg-slate-100'}`}
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-sm mb-1">
                                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Catálogo</span>
                                <span className={theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}>/</span>
                                <span className="font-medium">Combos (Categorias)</span>
                            </div>
                            <h1 className="text-2xl font-bold">Gerenciar Combos</h1>
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Novo Combo
                        </button>
                    </div>

                    {/* Content */}
                    <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        {loading ? (
                            <div className="p-8 text-center text-slate-500">Carregando...</div>
                        ) : categories.length === 0 ? (
                            <div className="p-12 text-center flex flex-col items-center">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                    <Tags className="w-8 h-8 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-medium mb-1">Nenhum combo criado</h3>
                                <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Crie combos (categorias) para organizar seus serviços.
                                </p>
                                <button
                                    onClick={() => handleOpenModal()}
                                    className="text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Criar primeiro combo
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                                {categories.map(category => (
                                    <div
                                        key={category.id}
                                        className={`p-4 rounded-lg border flex items-center justify-between group ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-4 h-12 rounded-full"
                                                style={{ backgroundColor: category.color || '#3B82F6' }}
                                            ></div>
                                            <div>
                                                <span className="font-medium text-lg block">{category.name}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${category.is_public ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    {category.is_public ? 'Visível no site' : 'Oculto'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleOpenModal(category)}
                                                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(category.id)}
                                                className={`p-2 rounded-lg transition-colors hover:bg-red-50 text-slate-400 hover:text-red-600`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className={`w-full max-w-md rounded-xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
                            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                                <h3 className="text-lg font-bold">{editingCategory ? 'Editar Combo' : 'Novo Combo'}</h3>
                                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-500">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Nome do Combo</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ex: Cabelo, Barba..."
                                        className={`w-full px-3 py-2 rounded-lg border outline-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-3">Cor de identificação</label>
                                    <div className="flex flex-wrap gap-3">
                                        {colors.map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, color: c })}
                                                className={`w-8 h-8 rounded-full transition-transform ${formData.color === c ? 'scale-125 ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-110'}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>

                                </div>

                                <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-800 pt-4">
                                    <div>
                                        <label className="block text-sm font-medium">Visibilidade no Site</label>
                                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                            Se desativado, aparece apenas internamente.
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={formData.is_public}
                                            onChange={e => setFormData({ ...formData, is_public: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!formData.name || saving}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {saving ? 'Salvando...' : 'Salvar'}
                                    </button>
                                </div>
                            </form>
                        </div >
                    </div >
                )
            }
        </div >
    );
}
