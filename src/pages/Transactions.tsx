import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Menu, Download, Search, DollarSign, TrendingUp, TrendingDown, Clock, SearchX, Receipt, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { TransactionDetails } from '../components/TransactionDetails';
import CustomSelect from '../components/CustomSelect';

interface Transaction {
    id: string;
    appointment_id: string;
    client_name: string;
    client_phone?: string;
    service_name: string;
    amount: number;
    status: 'paid' | 'unpaid' | 'pending' | 'cancelled';
    payment_method: string;
    transaction_date: string;
    competence_date: string;
    updated_at: string;
    total_paid?: number;
    professional_name?: string;
    discount?: number;
    service_price?: number;
}

export default function Transactions() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { theme } = useTheme();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const { profile } = useUserProfile();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'realized' | 'pending' | 'unpaid' | 'fees'>('realized');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Opções de Anos baseadas na data de criação do usuário
    const currentYear = new Date().getFullYear();
    const startYear = (profile as any)?.created_at ? new Date((profile as any).created_at).getFullYear() : currentYear;

    // Gera array de anos do ano de criação até o ano atual
    const yearOptions = Array.from({ length: (currentYear - startYear) + 1 }, (_, i) => {
        const year = startYear + i;
        return { value: year, label: String(year) };
    });

    const months = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    // Estatísticas
    const [stats, setStats] = useState({
        totalReceived: 0,
        totalPending: 0,
        totalUnpaid: 0,
        totalReservationFees: 0,
        transactionCount: 0
    });

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // Resetar página quando filtros mudarem
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchTerm, selectedMonth, selectedYear]);

    useEffect(() => {
        if (profile?.company_id) {
            fetchTransactions();
        }
    }, [profile?.company_id, activeTab, selectedMonth, selectedYear]);

    const fetchTransactions = async () => {
        setIsLoading(true);
        try {
            // Calcular intervalo de datas baseado no mês/ano selecionado
            let startDate, endDate;

            if (selectedMonth === -1) {
                // Todo o ano: 1 de Jan a 31 de Dez
                startDate = new Date(selectedYear, 0, 1);
                endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
            } else {
                // Mês específico
                startDate = new Date(selectedYear, selectedMonth, 1);
                endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
            }

            const { data: appointmentsData, error } = await supabase
                .from('appointments')
                .select(`
                    id,
                    start_time,
                    end_time,
                    status,
                    payment_status,
                    payment_method,
                    total_amount,
                    remaining_amount,
                    updated_at,
                    created_at,
                    client_name,
                    client_phone,
                    client_email,
                    discount,
                    service:services(
                        id,
                        name,
                        price
                    ),
                    professional:profiles(
                        id,
                        full_name
                    )
                `)
                .eq('company_id', profile?.company_id)
                // .neq('status', 'cancelled') // Removido: Cancelados pagos devem aparecer
                .gte('start_time', startDate.toISOString())
                .lte('start_time', endDate.toISOString())
                .order('start_time', { ascending: false });

            if (error) throw error;

            // Transformar dados para o formato de transações
            const now = new Date(); // Data atual para verificação de atraso

            const transformedTransactions: Transaction[] = (appointmentsData || []).map((apt: any) => {
                // Se total_amount for explicitamente 0, deve ser 0. Só usa o preço do serviço se total_amount for null/undefined
                // Determinar o status da transação
                let transactionStatus: 'paid' | 'unpaid' | 'pending' | 'cancelled' = 'unpaid';
                const endTime = new Date(apt.end_time);

                // 1. Definição correta do valor pago (Evita contar valor total como 'pago' erroneamente)
                const servicePrice = apt.service?.price || 0;
                const discount = (apt.discount || 0);
                const totalAmount = (apt.total_amount !== null && apt.total_amount !== undefined) ? apt.total_amount : Math.max(0, servicePrice - discount);
                const remaining = apt.remaining_amount;

                let paidAmount = 0;
                if (apt.payment_status === 'paid') {
                    paidAmount = totalAmount;
                } else if (remaining !== null && remaining !== undefined) {
                    paidAmount = Math.max(0, totalAmount - remaining);
                } else {
                    // Se não está pago e não tem remaining (e payment_status != paid), assume 0 pago
                    // A menos que haja lógica específica, mas padrão é 0
                    paidAmount = 0;
                }

                // 2. Lógica de Status (Baseada em tempo para tudo que não for Pago/Cancelado)
                if (apt.payment_status === 'paid') {
                    transactionStatus = 'paid';
                } else if (apt.status === 'cancelled') {
                    transactionStatus = 'cancelled';
                } else {
                    // Status Pendente ou Unpaid (Confirmado, etc)
                    // Regra: Só vira 'Unpaid' (Dívida) se passar 24h do término.
                    // Antes disso, é 'Pending' (A receber).

                    const toleranceDeadline = new Date(endTime.getTime() + 24 * 60 * 60 * 1000); // 24h de tolerância

                    if (now > toleranceDeadline) {
                        transactionStatus = 'unpaid';
                    } else {
                        transactionStatus = 'pending';
                    }
                }

                const effectivePrice = Math.max(0, servicePrice - discount);

                // Cálculo inteligente do valor da transação
                let displayAmount = 0;

                if (transactionStatus === 'paid') {
                    // Se pagou, o valor é o que foi pago
                    displayAmount = paidAmount > 0 ? paidAmount : effectivePrice;
                } else if (transactionStatus === 'pending') {
                    // Pendente = (Preço - Desconto) - Pago
                    displayAmount = Math.max(0, effectivePrice - paidAmount);
                } else if (transactionStatus === 'cancelled') {
                    // Se cancelou, só conta se teve pagamento (taxa retida)
                    displayAmount = paidAmount;
                } else {
                    // Unpaid (Manual ou Atrasado)
                    // Deve mostrar o valor faltante (Dívida). Se pagou taxa, abate.
                    displayAmount = Math.max(0, effectivePrice - paidAmount);
                }

                return {
                    id: apt.id,
                    appointment_id: apt.id,
                    client_name: apt.client_name || 'Cliente sem nome',
                    client_phone: apt.client_phone,
                    service_name: apt.service?.name || 'Serviço',
                    amount: displayAmount,
                    status: transactionStatus,
                    payment_method: apt.payment_method || 'pix',
                    transaction_date: apt.start_time,
                    competence_date: apt.start_time,
                    updated_at: apt.updated_at || apt.created_at,
                    total_paid: paidAmount,
                    professional_name: apt.professional?.full_name || 'Não atribuído',
                    discount: discount,
                    service_price: servicePrice
                };
            });

            setTransactions(transformedTransactions);

            // Calcular estatísticas
            const paidTransactions = transformedTransactions.filter(t => t.status === 'paid');
            const received = paidTransactions.reduce((sum, t) => sum + t.amount, 0);

            const pending = transformedTransactions
                .filter(t => t.status === 'pending')
                .reduce((sum, t) => sum + t.amount, 0);

            const unpaid = transformedTransactions
                .filter(t => t.status === 'unpaid')
                .reduce((sum, t) => sum + t.amount, 0);

            const reservationFees = transformedTransactions
                .filter(t => (t.status === 'pending' || t.status === 'unpaid') && (t.total_paid || 0) > 0)
                .reduce((sum, t) => sum + (t.total_paid || 0), 0);

            // Debug: Log para verificar diferença com Dashboard
            console.log('=== DEBUG FINANCEIRO ===');
            console.log('Total de transações:', transformedTransactions.length);
            console.log('Transações pagas:', paidTransactions.length);
            console.log('Valores pagos:', paidTransactions.map(t => ({
                service: t.service_name,
                amount: t.amount,
                date: t.transaction_date
            })));
            console.log('Total Recebido:', received);
            console.log('========================');

            setStats({
                totalReceived: received,
                totalPending: pending,
                totalUnpaid: unpaid,
                totalReservationFees: reservationFees,
                transactionCount: transformedTransactions.length
            });

        } catch (error: any) {
            console.error('Erro ao buscar transações:', error);
            addToast('Erro ao carregar transações', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            paid: theme === 'dark'
                ? 'bg-green-900/30 text-green-400 border-green-800'
                : 'bg-green-100 text-green-800 border-green-200',
            unpaid: theme === 'dark'
                ? 'bg-red-900/30 text-red-400 border-red-800'
                : 'bg-red-100 text-red-800 border-red-200',
            pending: theme === 'dark'
                ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800'
                : 'bg-yellow-100 text-yellow-800 border-yellow-200',
            cancelled: theme === 'dark'
                ? 'bg-gray-900/30 text-gray-400 border-gray-800'
                : 'bg-gray-100 text-gray-800 border-gray-200',
        };

        const labels = {
            paid: 'Pago',
            unpaid: 'Não pago',
            pending: 'Pendente',
            cancelled: 'Cancelado'
        };

        return (
            <span className={`px-2 py-1 text-xs font-semibold rounded-md border ${styles[status as keyof typeof styles]}`}>
                {labels[status as keyof typeof labels]}
            </span>
        );
    };

    const filteredTransactions = transactions.filter(transaction => {
        // Filtro por aba
        if (activeTab === 'realized' && transaction.status !== 'paid') return false;
        if (activeTab === 'pending' && transaction.status !== 'pending') return false;
        if (activeTab === 'unpaid' && transaction.status !== 'unpaid') return false;
        if (activeTab === 'fees' && !((transaction.status === 'pending' || transaction.status === 'unpaid') && (transaction.total_paid || 0) > 0)) return false;

        // Filtro por busca
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            return (
                transaction.client_name.toLowerCase().includes(search) ||
                transaction.service_name.toLowerCase().includes(search) ||
                transaction.payment_method.toLowerCase().includes(search)
            );
        }

        return true;
    });

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

    const exportToCSV = () => {
        const headers = ['Transação', 'Cliente', 'Valor', 'Status', 'Método', 'Data Competência', 'Última Atualização'];
        const rows = filteredTransactions.map(t => [
            t.id,
            t.client_name,
            t.amount,
            t.status,
            t.payment_method,
            formatDate(t.competence_date),
            formatDate(t.updated_at)
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `transacoes_${new Date().toISOString()}.csv`;
        link.click();

        addToast('Exportação realizada com sucesso!', 'success');
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
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-8 h-8 text-purple-500" />
                            <h1 className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                Financeiro
                            </h1>
                        </div>
                        <p className={`text-lg ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            Gerencie suas transações e pagamentos
                        </p>
                    </div>

                    {/* Cards de Estatísticas */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'
                            }`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Total Recebido
                                </span>
                                <TrendingUp className="w-5 h-5 text-green-500" />
                            </div>
                            <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {formatCurrency(stats.totalReceived)}
                            </p>
                        </div>

                        <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'
                            }`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Taxas Reservas
                                </span>
                                <Receipt className="w-5 h-5 text-indigo-500" />
                            </div>
                            <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {formatCurrency(stats.totalReservationFees)}
                            </p>
                        </div>

                        <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'
                            }`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Pendente
                                </span>
                                <Clock className="w-5 h-5 text-yellow-500" />
                            </div>
                            <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {formatCurrency(stats.totalPending)}
                            </p>
                        </div>

                        <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'
                            }`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Não Pago
                                </span>
                                <TrendingDown className="w-5 h-5 text-red-500" />
                            </div>
                            <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {formatCurrency(stats.totalUnpaid)}
                            </p>
                        </div>
                    </div>

                    {/* Área Principal de Transações */}
                    <div className={`rounded-xl border ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'
                        }`}>
                        {/* Tabs e Filtros */}
                        <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                {/* Tabs */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setActiveTab('realized')}
                                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'realized'
                                            ? theme === 'dark'
                                                ? 'bg-purple-900/30 text-purple-400 border border-purple-800'
                                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                                            : theme === 'dark'
                                                ? 'text-slate-400 hover:bg-slate-800'
                                                : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        Realizados
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('pending')}
                                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'pending'
                                            ? theme === 'dark'
                                                ? 'bg-purple-900/30 text-purple-400 border border-purple-800'
                                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                                            : theme === 'dark'
                                                ? 'text-slate-400 hover:bg-slate-800'
                                                : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        Pendentes
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('unpaid')}
                                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'unpaid'
                                            ? theme === 'dark'
                                                ? 'bg-purple-900/30 text-purple-400 border border-purple-800'
                                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                                            : theme === 'dark'
                                                ? 'text-slate-400 hover:bg-slate-800'
                                                : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        Não pagos
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('fees')}
                                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'fees'
                                            ? theme === 'dark'
                                                ? 'bg-purple-900/30 text-purple-400 border border-purple-800'
                                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                                            : theme === 'dark'
                                                ? 'text-slate-400 hover:bg-slate-800'
                                                : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        Taxas de Reservas
                                    </button>
                                </div>

                                {/* Busca Expandida */}
                                <div className="flex-1 flex justify-end">
                                    <div className={`w-full md:w-[450px] flex items-center gap-2 px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                                        }`}>
                                        <Search className="w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar transações..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className={`flex-1 bg-transparent border-none outline-none text-sm ${theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                                                }`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Seletor de Meses e Filtros Extras */}
                            <div className={`px-4 pb-4 pt-4 flex flex-col xl:flex-row gap-4 xl:items-center ${theme === 'dark' ? 'border-t border-slate-800' : 'border-t border-slate-200'}`}>
                                <div className="flex-1 overflow-x-auto scrollbar-hide min-w-0">
                                    <div className="flex gap-2 min-w-max">
                                        <button
                                            onClick={() => setSelectedMonth(-1)}
                                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedMonth === -1
                                                ? theme === 'dark'
                                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20'
                                                    : 'bg-purple-600 text-white shadow-lg shadow-purple-200'
                                                : theme === 'dark'
                                                    ? 'text-slate-400 hover:bg-slate-800'
                                                    : 'text-slate-600 hover:bg-slate-100'
                                                }`}
                                        >
                                            Todo o ano
                                        </button>

                                        {months.map((month, index) => (
                                            <button
                                                key={month}
                                                onClick={() => setSelectedMonth(index)}
                                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedMonth === index
                                                    ? theme === 'dark'
                                                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20'
                                                        : 'bg-purple-600 text-white shadow-lg shadow-purple-200'
                                                    : theme === 'dark'
                                                        ? 'text-slate-400 hover:bg-slate-800'
                                                        : 'text-slate-600 hover:bg-slate-100'
                                                    }`}
                                            >
                                                {month}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Filtros de Ano e Exportar */}
                                <div className="flex items-center gap-3 flex-none pl-2 border-l border-slate-200 dark:border-slate-800">
                                    <div className="w-32">
                                        <CustomSelect
                                            value={selectedYear}
                                            onChange={(val) => setSelectedYear(Number(val))}
                                            options={yearOptions}
                                            placeholder="Ano"
                                        />
                                    </div>

                                    <button
                                        onClick={exportToCSV}
                                        className={`px-4 py-2 rounded-lg border flex items-center gap-2 text-sm font-medium transition-all ${theme === 'dark'
                                            ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                            }`}
                                    >
                                        <Download className="w-4 h-4" />
                                        Exportar
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Tabela de Transações */}
                        <div className="overflow-x-auto">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : filteredTransactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                                        <SearchX className={`w-10 h-10 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} />
                                    </div>
                                    <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>
                                        Nenhuma transação encontrada
                                    </h3>
                                    <p className={`text-sm max-w-xs mx-auto ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Não encontramos registros com os filtros atuais. Tente mudar o período ou status.
                                    </p>
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead className={`border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                                        <tr>
                                            <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                                                }`}>
                                                Transação
                                            </th>
                                            <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                                                }`}>
                                                Cliente
                                            </th>
                                            <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                                                }`}>
                                                Valor bruto
                                            </th>
                                            <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                                                }`}>
                                                Status
                                            </th>
                                            <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                                                }`}>
                                                Método
                                            </th>
                                            <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                                                }`}>
                                                Data de competência
                                            </th>
                                            <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                                                }`}>
                                                Última atualização
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-200'}`}>
                                        {paginatedTransactions.map((transaction) => (
                                            <tr
                                                key={transaction.id}
                                                className={`transition-colors cursor-pointer ${theme === 'dark' ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50'
                                                    }`}
                                                onClick={() => setSelectedTransaction(transaction)}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                        {transaction.service_name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                                        {transaction.client_name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                        {formatCurrency(transaction.amount)}
                                                        {transaction.status === 'pending' && (transaction.total_paid || 0) > 0 && (
                                                            <div className="text-[10px] text-emerald-500 font-normal mt-0.5 flex items-center gap-1">
                                                                <span>✓</span>
                                                                Pago: {formatCurrency(transaction.total_paid || 0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(transaction.status)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        {transaction.payment_method === 'pix' ? 'Pix' :
                                                            transaction.payment_method === 'money' ? 'Dinheiro' :
                                                                transaction.payment_method === 'credit_card' ? 'Cartão' :
                                                                    transaction.payment_method === 'debit_card' ? 'Débito' :
                                                                        transaction.payment_method || 'Pix'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        {formatDate(transaction.competence_date)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        {formatDate(transaction.updated_at)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Footer com paginação */}
                        {filteredTransactions.length > 0 && (
                            <div className={`px-6 py-4 border-t flex items-center justify-between ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
                                }`}>
                                <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {filteredTransactions.length} registros
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(curr => Math.max(1, curr - 1))}
                                        disabled={currentPage === 1}
                                        className={`p-2 rounded-lg border transition-colors ${theme === 'dark'
                                            ? 'border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed'
                                            : 'border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed'
                                            }`}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Página {currentPage} de {totalPages || 1}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(curr => Math.min(totalPages, curr + 1))}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        className={`p-2 rounded-lg border transition-colors ${theme === 'dark'
                                            ? 'border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed'
                                            : 'border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed'
                                            }`}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Slide-over de Detalhes */}
            {selectedTransaction && (
                <TransactionDetails
                    transaction={selectedTransaction}
                    companyId={profile?.company_id || ''}
                    onClose={() => setSelectedTransaction(null)}
                    onUpdate={() => {
                        fetchTransactions(); // Recarrega lista após edição
                    }}
                    theme={theme as 'light' | 'dark'}
                    viewMode={activeTab === 'fees' ? 'fee_details' : 'default'}
                />
            )}
        </div>
    );
}
