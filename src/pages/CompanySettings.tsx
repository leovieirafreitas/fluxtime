import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { supabase } from '../lib/supabase';
import { Building2, MapPin, Phone, Search, Menu } from 'lucide-react';
import Sidebar from '../components/Sidebar';

interface CompanyData {
    name: string;
    description: string;
    segment: string;
    client_label: string;
    phone: string;
    cep: string;
    address: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    logo_url: string;
}

export default function CompanySettings() {
    const { theme } = useTheme();
    const { profile } = useUserProfile();
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [companyData, setCompanyData] = useState<CompanyData>({
        name: '',
        description: '',
        segment: 'Barbearia',
        client_label: 'Cliente',
        phone: '',
        cep: '',
        address: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        logo_url: ''
    });

    useEffect(() => {
        if (profile?.company_id) {
            fetchCompanyData();
        }
    }, [profile]);

    const fetchCompanyData = async () => {
        if (!profile?.company_id) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .eq('id', profile.company_id)
                .single();

            if (error) throw error;

            if (data) {
                setCompanyData({
                    name: data.name || '',
                    description: data.description || '',
                    segment: data.segment || 'Barbearia',
                    client_label: data.client_label || 'Cliente',
                    phone: data.phone || '',
                    cep: data.cep || '',
                    address: data.address || '',
                    number: data.number || '',
                    complement: data.complement || '',
                    neighborhood: data.neighborhood || '',
                    city: data.city || '',
                    state: data.state || '',
                    logo_url: data.logo_url || ''
                });
            }
        } catch (error) {
            console.error('Error fetching company data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCepSearch = async () => {
        if (!companyData.cep || companyData.cep.length < 8) return;

        try {
            const cepClean = companyData.cep.replace(/\D/g, '');
            const response = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
            const data = await response.json();

            if (!data.erro) {
                setCompanyData(prev => ({
                    ...prev,
                    address: data.logradouro || '',
                    neighborhood: data.bairro || '',
                    city: data.localidade || '',
                    state: data.uf || ''
                }));
            }
        } catch (error) {
            console.error('Error fetching CEP:', error);
        }
    };

    const handleSave = async () => {
        if (!profile?.company_id) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('companies')
                .update({
                    name: companyData.name,
                    description: companyData.description,
                    segment: companyData.segment,
                    client_label: companyData.client_label,
                    phone: companyData.phone,
                    cep: companyData.cep,
                    address: companyData.address,
                    number: companyData.number,
                    complement: companyData.complement,
                    neighborhood: companyData.neighborhood,
                    city: companyData.city,
                    state: companyData.state,
                    logo_url: companyData.logo_url
                })
                .eq('id', profile.company_id);

            if (error) throw error;

            // Mostrar feedback de sucesso
            const successMsg = document.createElement('div');
            successMsg.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${theme === 'dark' ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-900'
                } animate-fade-in`;
            successMsg.innerHTML = `
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <span class="font-medium">Dados salvos com sucesso!</span>
            `;
            document.body.appendChild(successMsg);
            setTimeout(() => successMsg.remove(), 3000);

        } catch (error) {
            console.error('Error saving company data:', error);

            // Mostrar feedback de erro
            const errorMsg = document.createElement('div');
            errorMsg.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${theme === 'dark' ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-900'
                } animate-fade-in`;
            errorMsg.innerHTML = `
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
                <span class="font-medium">Erro ao salvar dados</span>
            `;
            document.body.appendChild(errorMsg);
            setTimeout(() => errorMsg.remove(), 3000);
        } finally {
            setSaving(false);
        }
    };


    return (
        <div
            style={{ backgroundColor: theme === 'dark' ? '#000000' : '#f8fafc' }}
            className="min-h-screen transition-colors duration-300"
        >
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="md:ml-64 p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Botão de Menu Mobile */}
                    <button
                        className={`md:hidden mb-6 p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-white hover:bg-white/10' : 'text-slate-900 hover:bg-slate-100'
                            }`}
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                Dados cadastrais
                            </h1>
                            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                Gerencie as informações do seu negócio e mantenha seus dados sempre atualizados
                            </p>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>

                    {/* Logo e Nome */}
                    <div className={`rounded-xl p-6 mb-6 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                                <Building2 className="w-8 h-8 text-white" />
                            </div>
                            <div className="flex-1">
                                {loading ? (
                                    <>
                                        <div className={`h-8 rounded-lg mb-2 ${theme === 'dark' ? 'skeleton' : 'skeleton-light'}`} style={{ width: '60%' }}></div>
                                        <div className={`h-12 rounded-lg ${theme === 'dark' ? 'skeleton' : 'skeleton-light'}`}></div>
                                    </>
                                ) : (
                                    <>
                                        <input
                                            type="text"
                                            value={companyData.name}
                                            onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                                            className={`text-xl font-bold w-full bg-transparent border-none outline-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}
                                            placeholder="Nome da empresa"
                                        />
                                        <textarea
                                            value={companyData.description}
                                            onChange={(e) => setCompanyData({ ...companyData, description: e.target.value })}
                                            className={`text-sm w-full bg-transparent border-none outline-none resize-none mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}
                                            placeholder="Fale sobre seu negócio aqui..."
                                            rows={2}
                                            maxLength={2000}
                                        />
                                        <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {companyData.description.length}/2000
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Informações */}
                    <div className={`rounded-xl p-6 mb-6 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
                        <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            Informações
                        </h2>

                        {loading ? (
                            <div className="space-y-4">
                                <div className={`h-14 rounded-lg ${theme === 'dark' ? 'skeleton' : 'skeleton-light'}`}></div>
                                <div className={`h-14 rounded-lg ${theme === 'dark' ? 'skeleton' : 'skeleton-light'}`}></div>
                                <div className={`h-14 rounded-lg ${theme === 'dark' ? 'skeleton' : 'skeleton-light'}`}></div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                        <Building2 className="w-4 h-4 inline mr-2" />
                                        Segmento de atuação *
                                    </label>
                                    <input
                                        type="text"
                                        value={companyData.segment}
                                        onChange={(e) => setCompanyData({ ...companyData, segment: e.target.value })}
                                        className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark'
                                            ? 'bg-slate-800 border-slate-700 text-white'
                                            : 'bg-slate-50 border-slate-200 text-slate-900'
                                            }`}
                                        placeholder="Barbearia"
                                    />
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Como você chama o seu cliente? *
                                    </label>
                                    <select
                                        value={companyData.client_label}
                                        onChange={(e) => setCompanyData({ ...companyData, client_label: e.target.value })}
                                        className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark'
                                            ? 'bg-slate-800 border-slate-700 text-white'
                                            : 'bg-slate-50 border-slate-200 text-slate-900'
                                            }`}
                                    >
                                        <option value="Cliente">Cliente</option>
                                        <option value="Paciente">Paciente</option>
                                        <option value="Aluno">Aluno</option>
                                    </select>
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                        <Phone className="w-4 h-4 inline mr-2" />
                                        Telefone comercial *
                                    </label>
                                    <div className="flex gap-2">
                                        <select
                                            className={`px-4 py-3 rounded-lg border ${theme === 'dark'
                                                ? 'bg-slate-800 border-slate-700 text-white'
                                                : 'bg-slate-50 border-slate-200 text-slate-900'
                                                }`}
                                        >
                                            <option>🇧🇷 +55</option>
                                        </select>
                                        <input
                                            type="tel"
                                            value={companyData.phone}
                                            onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                                            className={`flex-1 px-4 py-3 rounded-lg border ${theme === 'dark'
                                                ? 'bg-slate-800 border-slate-700 text-white'
                                                : 'bg-slate-50 border-slate-200 text-slate-900'
                                                }`}
                                            placeholder="92999519964"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Endereço */}
                    <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                <MapPin className="w-5 h-5 inline mr-2" />
                                Endereço comercial
                            </h2>
                        </div>

                        {loading ? (
                            <div className="space-y-4">
                                <div className={`h-14 rounded-lg ${theme === 'dark' ? 'skeleton' : 'skeleton-light'}`}></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className={`h-14 rounded-lg ${theme === 'dark' ? 'skeleton' : 'skeleton-light'}`}></div>
                                    <div className={`h-14 rounded-lg ${theme === 'dark' ? 'skeleton' : 'skeleton-light'}`}></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className={`h-14 rounded-lg ${theme === 'dark' ? 'skeleton' : 'skeleton-light'}`}></div>
                                    <div className={`h-14 rounded-lg ${theme === 'dark' ? 'skeleton' : 'skeleton-light'}`}></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className={`h-14 rounded-lg ${theme === 'dark' ? 'skeleton' : 'skeleton-light'}`}></div>
                                    <div className={`h-14 rounded-lg ${theme === 'dark' ? 'skeleton' : 'skeleton-light'}`}></div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                        CEP
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={companyData.cep}
                                            onChange={(e) => setCompanyData({ ...companyData, cep: e.target.value })}
                                            className={`flex-1 px-4 py-3 rounded-lg border ${theme === 'dark'
                                                ? 'bg-slate-800 border-slate-700 text-white'
                                                : 'bg-slate-50 border-slate-200 text-slate-900'
                                                }`}
                                            placeholder="69095-040"
                                        />
                                        <button
                                            onClick={handleCepSearch}
                                            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                                        >
                                            <Search className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Logradouro
                                        </label>
                                        <input
                                            type="text"
                                            value={companyData.address}
                                            onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                                            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark'
                                                ? 'bg-slate-800 border-slate-700 text-white'
                                                : 'bg-slate-50 border-slate-200 text-slate-900'
                                                }`}
                                            placeholder="Rua Canário"
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Número
                                        </label>
                                        <input
                                            type="text"
                                            value={companyData.number}
                                            onChange={(e) => setCompanyData({ ...companyData, number: e.target.value })}
                                            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark'
                                                ? 'bg-slate-800 border-slate-700 text-white'
                                                : 'bg-slate-50 border-slate-200 text-slate-900'
                                                }`}
                                            placeholder="11"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Complemento
                                        </label>
                                        <input
                                            type="text"
                                            value={companyData.complement}
                                            onChange={(e) => setCompanyData({ ...companyData, complement: e.target.value })}
                                            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark'
                                                ? 'bg-slate-800 border-slate-700 text-white'
                                                : 'bg-slate-50 border-slate-200 text-slate-900'
                                                }`}
                                            placeholder="Exemplo: Apt., casa, andar, etc."
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Bairro
                                        </label>
                                        <input
                                            type="text"
                                            value={companyData.neighborhood}
                                            onChange={(e) => setCompanyData({ ...companyData, neighborhood: e.target.value })}
                                            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark'
                                                ? 'bg-slate-800 border-slate-700 text-white'
                                                : 'bg-slate-50 border-slate-200 text-slate-900'
                                                }`}
                                            placeholder="Insira seu bairro"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Cidade
                                        </label>
                                        <input
                                            type="text"
                                            value={companyData.city}
                                            onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                                            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark'
                                                ? 'bg-slate-800 border-slate-700 text-white'
                                                : 'bg-slate-50 border-slate-200 text-slate-900'
                                                }`}
                                            placeholder="Manaus"
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Estado
                                        </label>
                                        <input
                                            type="text"
                                            value={companyData.state}
                                            onChange={(e) => setCompanyData({ ...companyData, state: e.target.value })}
                                            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark'
                                                ? 'bg-slate-800 border-slate-700 text-white'
                                                : 'bg-slate-50 border-slate-200 text-slate-900'
                                                }`}
                                            placeholder="AM"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
