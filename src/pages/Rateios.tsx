// src/pages/Rateios.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Menu, X, LogOut, Bell, ArrowLeft, Plus, Pencil, Trash2, 
  Percent, FileText, Building2, DollarSign, Calendar, Filter, 
  Download, RefreshCw, Save, Users, UserPlus, Home, Search, 
  AlertCircle, CheckCircle, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- TIPOS ---
type FornecedorRateio = {
  id: string;
  nome_fornecedor: string;
  created_at: string;
};

type BMRateio = {
  id: string;
  fornecedor_id: string;
  numero_bm: string;
  valor_bm: number;
  periodo_bm_start: string;
  periodo_bm_end: string;
  periodo_referencia_start: string;
  periodo_referencia_end: string;
  created_at: string;
  fornecedor_nome?: string;
};

type Rateio = {
  id: string;
  bm_id: string;
  centro_resultado: string;
  valor_rateado: number;
  porcentagem_rateio: number;
  created_at: string;
  bm_numero?: string;
  fornecedor_nome?: string;
};

// --- CONSTANTES ---
const PERIODOS_REFERENCIA = [
  { label: '16/11/2025 a 15/12/2025', start: '2025-11-16', end: '2025-12-15' },
  { label: '16/12/2025 a 15/01/2026', start: '2025-12-16', end: '2026-01-15' },
  { label: '16/01/2026 a 15/02/2026', start: '2026-01-16', end: '2026-02-15' },
  { label: '16/02/2026 a 15/03/2026', start: '2026-02-16', end: '2026-03-15' },
  { label: '16/03/2026 a 15/04/2026', start: '2026-03-16', end: '2026-04-15' },
  { label: '16/04/2026 a 15/05/2026', start: '2026-04-16', end: '2026-05-15' },
  { label: '16/05/2026 a 15/06/2026', start: '2026-05-16', end: '2026-06-15' },
  { label: '16/06/2026 a 15/07/2026', start: '2026-06-16', end: '2026-07-15' },
  { label: '16/07/2026 a 15/08/2026', start: '2026-07-16', end: '2026-08-15' },
  { label: '16/08/2026 a 15/09/2026', start: '2026-08-16', end: '2026-09-15' },
  { label: '16/09/2026 a 15/10/2026', start: '2026-09-16', end: '2026-10-15' },
  { label: '16/10/2026 a 15/11/2026', start: '2026-10-16', end: '2026-11-15' },
  { label: '16/11/2026 a 15/12/2026', start: '2026-11-16', end: '2026-12-15' },
  { label: '16/12/2026 a 15/01/2027', start: '2026-12-16', end: '2027-01-15' },
  { label: '16/01/2027 a 15/02/2027', start: '2027-01-16', end: '2027-02-15' },
  { label: '16/02/2027 a 15/03/2027', start: '2027-02-16', end: '2027-03-15' },
  { label: '16/03/2027 a 15/04/2027', start: '2027-03-16', end: '2027-04-15' },
  { label: '16/04/2027 a 15/05/2027', start: '2027-04-16', end: '2027-05-15' },
  { label: '16/05/2027 a 15/06/2027', start: '2027-05-16', end: '2027-06-15' },
  { label: '16/06/2027 a 15/07/2027', start: '2027-06-16', end: '2027-07-15' },
  { label: '16/07/2027 a 15/08/2027', start: '2027-07-16', end: '2027-08-15' },
  { label: '16/08/2027 a 15/09/2027', start: '2027-08-16', end: '2027-09-15' },
  { label: '16/09/2027 a 15/10/2027', start: '2027-09-16', end: '2027-10-15' },
  { label: '16/10/2027 a 15/11/2027', start: '2027-10-16', end: '2027-11-15' },
  { label: '16/11/2027 a 15/12/2027', start: '2027-11-16', end: '2027-12-15' },
];

const centrosResultado = [
  'HYDRO - OPERACAO PORTUARIA CARVAO BAUXITA',
  'ALBRAS - COQUE, PICHE E FLUORETO',
  'ALBRAS - CINTAGEM E TRANSPORTE DE ALUMÍNIO',
  'SANTOS BRASIL - PRANCHA',
  'HYDRO - BACIA ÁREA 82',
  'FAZENDA',
  'MANUTENÇÃO',
  'CONTROLADORIA',
  'SESMT',
  'MS GRANEIS',
  'VALE - DRENAGEM SUPERFICIAL',
  'VALE PA - CAMINHÃO PLATAFORMA',
  'HYDRO - IFPA ABAETETUBA',
  'OPERACIONAL',
  'COMPRAS',
  'ADMINISTRAÇÃO CENTRAL',
  'ORÇAMENTOS',
  'DP/RH',
  'DIRETORIA',
  'HYDRO - PAVIMENTAÇÃO DO DIQUE DO DRS2',
  'HYDRO - AGUA MINERAL',
  'PRJ 014 - INFRAESTRUTURA OPERACIONAL',
  'TERMINAL I',
];

const Rateios = () => {
  const { userProfile, signOut } = useAuth();
  const { hasUnread } = useNotifications();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Dados
  const [fornecedores, setFornecedores] = useState<FornecedorRateio[]>([]);
  const [bms, setBms] = useState<BMRateio[]>([]);
  const [rateios, setRateios] = useState<Rateio[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de UI e Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos');
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>('todos');
  const [expandedBMs, setExpandedBMs] = useState<Set<string>>(new Set());
  
  // Estados de Formulários
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'fornecedor' | 'bm'>('bm');
  const [showRateioDialog, setShowRateioDialog] = useState(false);
  
  const [editingBM, setEditingBM] = useState<BMRateio | null>(null);
  const [selectedBMForRateio, setSelectedBMForRateio] = useState<BMRateio | null>(null);
  
  const [novoFornecedor, setNovoFornecedor] = useState({ nome_fornecedor: '' });
  const [novoBM, setNovoBM] = useState({
    fornecedor_id: '', numero_bm: '', valor_bm: '',
    periodo_bm_start: '', periodo_bm_end: '', periodo_referencia: ''
  });
  const [novoRateio, setNovoRateio] = useState({
    bm_id: '', centro_resultado: '', valor_rateado: '', porcentagem_rateio: ''
  });

  const menuItems = [
    { icon: FileText, label: 'Lista de BMs', path: '/rateios', color: 'text-blue-400', bgHover: 'hover:bg-blue-500/10' },
  ];

  // --- EFFECTS ---
  useEffect(() => {
    carregarDados();
  }, []);

  // --- LÓGICA DE DADOS ---
  const carregarDados = async () => {
    setLoading(true);
    try {
      const { data: fornecedoresData } = await supabase
        .from('fornecedores_rateio')
        .select('*')
        .order('nome_fornecedor', { ascending: true });
      setFornecedores(fornecedoresData || []);
      
      const { data: bmsData } = await supabase
        .from('bms_rateio')
        .select('*, fornecedores_rateio ( nome_fornecedor )')
        .order('created_at', { ascending: false });
      
      if (bmsData) {
        const bmsProcessados = bmsData.map(bm => ({
          ...bm,
          fornecedor_nome: Array.isArray(bm.fornecedores_rateio) 
            ? bm.fornecedores_rateio[0]?.nome_fornecedor
            : (bm.fornecedores_rateio as any)?.nome_fornecedor || 'N/A'
        }));
        setBms(bmsProcessados);
      }
      
      const { data: rateiosData } = await supabase
        .from('rateios')
        .select('*, bms_rateio ( numero_bm, fornecedores_rateio ( nome_fornecedor ) )')
        .order('created_at', { ascending: false });
      
      if (rateiosData) {
        const rateiosProcessados = rateiosData.map(rateio => {
          const bmInfo = Array.isArray(rateio.bms_rateio) ? rateio.bms_rateio[0] : rateio.bms_rateio;
          const fornecedorInfo = Array.isArray(bmInfo?.fornecedores_rateio) 
            ? bmInfo?.fornecedores_rateio[0] 
            : bmInfo?.fornecedores_rateio;
          return {
            ...rateio,
            bm_numero: bmInfo?.numero_bm || 'N/A',
            fornecedor_nome: fornecedorInfo?.nome_fornecedor || 'N/A'
          };
        });
        setRateios(rateiosProcessados);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- UTILITÁRIOS ---
  const formatarData = (dataString: string) => {
    try { return format(parseISO(dataString), 'dd/MM/yyyy', { locale: ptBR }); } catch { return dataString; }
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
  };

  const calcularSaldoBM = (bm: BMRateio) => {
    const rateiosBM = rateios.filter(r => r.bm_id === bm.id);
    const totalRateado = rateiosBM.reduce((sum, r) => sum + r.valor_rateado, 0);
    return bm.valor_bm - totalRateado;
  };

  const calcularPorcentagemRateada = (bm: BMRateio) => {
    const rateiosBM = rateios.filter(r => r.bm_id === bm.id);
    const totalRateado = rateiosBM.reduce((sum, r) => sum + r.valor_rateado, 0);
    return bm.valor_bm > 0 ? (totalRateado / bm.valor_bm) * 100 : 0;
  };

  const getRateiosPorBM = (bmId: string) => {
    return rateios.filter(r => r.bm_id === bmId);
  };

  const toggleBMExpansion = (bmId: string) => {
    setExpandedBMs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bmId)) {
        newSet.delete(bmId);
      } else {
        newSet.add(bmId);
      }
      return newSet;
    });
  };

  const handleSignOut = async () => { await signOut(); };

  // --- AÇÕES DE FORMULÁRIO ---
  const handleCadastrarFornecedor = async () => {
    if (!novoFornecedor.nome_fornecedor.trim()) return alert('Informe o nome');
    try {
      const { error } = await supabase.from('fornecedores_rateio').insert([novoFornecedor]);
      if (error) throw error;
      setNovoFornecedor({ nome_fornecedor: '' });
      setShowForm(false);
      carregarDados();
    } catch (error) { alert('Erro ao cadastrar'); }
  };

  const handleCadastrarBM = async () => {
    if (!novoBM.fornecedor_id || !novoBM.numero_bm || !novoBM.valor_bm || !novoBM.periodo_referencia) return alert('Preencha os campos');
    try {
      const valorBM = parseFloat(novoBM.valor_bm);
      if (isNaN(valorBM) || valorBM <= 0) return alert('Valor inválido');
      
      const { data: bmExistente } = await supabase.from('bms_rateio').select('numero_bm').eq('numero_bm', novoBM.numero_bm).single();
      if (bmExistente) return alert('BM já existe');

      const periodoSelecionado = PERIODOS_REFERENCIA.find(p => p.label === novoBM.periodo_referencia);
      if (!periodoSelecionado) return alert('Período inválido');

      const bmData = {
        fornecedor_id: novoBM.fornecedor_id,
        numero_bm: novoBM.numero_bm,
        valor_bm: valorBM,
        periodo_bm_start: novoBM.periodo_bm_start || new Date().toISOString().split('T')[0],
        periodo_bm_end: novoBM.periodo_bm_end || new Date().toISOString().split('T')[0],
        periodo_referencia_start: periodoSelecionado.start,
        periodo_referencia_end: periodoSelecionado.end
      };
      
      const { error } = await supabase.from('bms_rateio').insert([bmData]);
      if (error) throw error;
      
      setNovoBM({ fornecedor_id: '', numero_bm: '', valor_bm: '', periodo_bm_start: '', periodo_bm_end: '', periodo_referencia: '' });
      setShowForm(false);
      carregarDados();
    } catch (error) { alert('Erro ao cadastrar BM'); }
  };

  const iniciarEdicaoBM = (bm: BMRateio) => {
    setEditingBM(bm);
    setNovoBM({
      fornecedor_id: bm.fornecedor_id,
      numero_bm: bm.numero_bm,
      valor_bm: bm.valor_bm.toString(),
      periodo_bm_start: bm.periodo_bm_start,
      periodo_bm_end: bm.periodo_bm_end,
      periodo_referencia: PERIODOS_REFERENCIA.find(p => p.start === bm.periodo_referencia_start && p.end === bm.periodo_referencia_end)?.label || ''
    });
    setFormType('bm');
    setShowForm(true);
  };

  const handleAtualizarBM = async () => {
    if (!editingBM) return;
    if (!novoBM.fornecedor_id || !novoBM.numero_bm || !novoBM.valor_bm || !novoBM.periodo_referencia) return alert('Preencha tudo');
    
    try {
      const periodoSelecionado = PERIODOS_REFERENCIA.find(p => p.label === novoBM.periodo_referencia);
      if (!periodoSelecionado) return;
      
      const { error } = await supabase.from('bms_rateio').update({
        fornecedor_id: novoBM.fornecedor_id,
        numero_bm: novoBM.numero_bm,
        valor_bm: parseFloat(novoBM.valor_bm),
        periodo_referencia_start: periodoSelecionado.start,
        periodo_referencia_end: periodoSelecionado.end,
        periodo_bm_start: novoBM.periodo_bm_start,
        periodo_bm_end: novoBM.periodo_bm_end,
        updated_at: new Date().toISOString()
      }).eq('id', editingBM.id);
      
      if (error) throw error;
      setEditingBM(null);
      setNovoBM({ fornecedor_id: '', numero_bm: '', valor_bm: '', periodo_bm_start: '', periodo_bm_end: '', periodo_referencia: '' });
      setShowForm(false);
      carregarDados();
    } catch (error) { alert('Erro ao atualizar'); }
  };

  const abrirModalRateio = (bm: BMRateio) => {
    setSelectedBMForRateio(bm);
    setNovoRateio({ bm_id: bm.id, centro_resultado: '', valor_rateado: '', porcentagem_rateio: '' });
    setShowRateioDialog(true);
  };

  const aplicarRateio = async () => {
    if (!selectedBMForRateio || !novoRateio.centro_resultado || (!novoRateio.valor_rateado && !novoRateio.porcentagem_rateio)) {
      return alert('Preencha os campos');
    }
    
    try {
      const valorRateado = novoRateio.valor_rateado 
        ? parseFloat(novoRateio.valor_rateado)
        : (selectedBMForRateio.valor_bm * parseFloat(novoRateio.porcentagem_rateio)) / 100;
      
      if (isNaN(valorRateado) || valorRateado <= 0) return alert('Valor inválido');
      if (valorRateado > calcularSaldoBM(selectedBMForRateio)) return alert('Saldo insuficiente');
      
      const porcentagem = (valorRateado / selectedBMForRateio.valor_bm) * 100;
      
      const { error } = await supabase.from('rateios').insert([{
        bm_id: selectedBMForRateio.id,
        centro_resultado: novoRateio.centro_resultado,
        valor_rateado: valorRateado,
        porcentagem_rateio: parseFloat(porcentagem.toFixed(2))
      }]);
      
      if (error) throw error;
      setShowRateioDialog(false);
      carregarDados();
    } catch (error) { alert('Erro ao aplicar rateio'); }
  };

  const handleExcluirBM = async (id: string) => {
    if (!confirm('Tem certeza? Isso também excluirá todos os rateios relacionados.')) return;
    const { error } = await supabase.from('bms_rateio').delete().eq('id', id);
    if (!error) carregarDados();
  };

  const handleExcluirRateio = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    const { error } = await supabase.from('rateios').delete().eq('id', id);
    if (!error) carregarDados();
  };

  const gerarPDFRateioBM = (bm: BMRateio) => {
    const doc = new jsPDF();
    const rateiosBM = rateios.filter(r => r.bm_id === bm.id);
    const saldo = calcularSaldoBM(bm);
    
    doc.setFontSize(18);
    doc.text('Relatório de Rateio - Boletim de Medição', 20, 20);
    doc.setFontSize(12);
    doc.text(`BM: ${bm.numero_bm} | Fornecedor: ${bm.fornecedor_nome}`, 20, 30);
    doc.text(`Valor Total: ${formatarMoeda(bm.valor_bm)}`, 20, 38);
    
    const tableData = rateiosBM.map((r, i) => [
      (i+1).toString(), r.centro_resultado, formatarMoeda(r.valor_rateado), `${r.porcentagem_rateio}%`, formatarData(r.created_at)
    ]);
    
    autoTable(doc, {
      startY: 50, head: [['#', 'Centro', 'Valor', '%', 'Data']], body: tableData,
      theme: 'striped', headStyles: { fillColor: [41, 128, 185] }
    });
    
    doc.save(`rateio-bm-${bm.numero_bm}.pdf`);
  };

  // --- FILTROS ---
  const bmsFiltrados = bms.filter(bm => {
    if (filtroPeriodo !== 'todos') {
      const p = PERIODOS_REFERENCIA.find(per => per.label === filtroPeriodo);
      if (p && (bm.periodo_referencia_start !== p.start || bm.periodo_referencia_end !== p.end)) return false;
    }
    if (filtroFornecedor !== 'todos' && bm.fornecedor_id !== filtroFornecedor) return false;
    if (searchTerm && !bm.numero_bm.toLowerCase().includes(searchTerm.toLowerCase()) && !(bm.fornecedor_nome?.toLowerCase().includes(searchTerm.toLowerCase()))) return false;
    return true;
  });

  return (
    <>
      <style>{`body { margin: 0; background-color: #020617; }`}</style>
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
        <div className="hidden lg:flex min-h-screen">
          {/* Sidebar Desktop */}
          <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
            <div className="p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/20 p-2 rounded-lg">
                  <Percent className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white tracking-tight leading-none">Módulo Rateios</h1>
                  <p className="text-xs text-slate-500 mt-1">Gestão Financeira</p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-1 overflow-y-auto flex-1">
              <div className="px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Navegação</div>
              <Button onClick={() => navigate('/dashboard')} variant="ghost" className="w-full justify-start h-10 px-3 text-slate-400 hover:text-white hover:bg-slate-800">
                <ArrowLeft className="mr-3 h-4 w-4" />
                <span className="text-sm font-medium">Voltar ao Dashboard</span>
              </Button>
              {menuItems.map((item) => (
                <Button key={item.path} onClick={() => navigate(item.path)} variant="ghost" className={`w-full justify-start h-10 px-3 text-slate-400 hover:text-white hover:bg-slate-800 ${item.bgHover}`}>
                  <item.icon className={`mr-3 h-4 w-4 ${item.color}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Button>
              ))}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-3 px-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-orange-500/20">
                  {userProfile?.full_name?.substring(0,2).toUpperCase() || 'US'}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium text-white truncate leading-tight">{userProfile?.full_name || 'Usuário'}</span>
                  <span className="text-xs text-slate-500 truncate">Operador</span>
                </div>
              </div>
              <Button variant="outline" onClick={handleSignOut} className="w-full border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white justify-start h-9 text-sm">
                <LogOut className="mr-2 h-4 w-4" /> Sair do Sistema
              </Button>
            </div>
          </div>

          {/* Main Content Desktop */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-950/50">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50 px-8 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Gestão de Rateios</h2>
                <p className="text-xs text-slate-400">Controle de Boletins de Medição e Rateios</p>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={carregarDados} variant="outline" disabled={loading} className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-9 px-3">
                  <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
                </Button>
                <Button onClick={() => { setFormType('fornecedor'); setShowForm(true); }} variant="outline" className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10 h-9 px-3">
                  <UserPlus className="h-3.5 w-3.5 mr-2" /> Fornecedor
                </Button>
                <Button onClick={() => { setFormType('bm'); setShowForm(true); setEditingBM(null); }} className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-900/20 h-9 px-4">
                  <Plus className="h-3.5 w-3.5 mr-2" /> Novo BM
                </Button>
              </div>
            </div>

            <main className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-slate-900/40 border-slate-800 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Fornecedores</p>
                    <p className="text-2xl font-bold text-white">{fornecedores.length}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400"><Users className="w-5 h-5" /></div>
                </Card>
                <Card className="bg-slate-900/40 border-slate-800 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Total BMs</p>
                    <p className="text-2xl font-bold text-white">{bms.length}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400"><FileText className="w-5 h-5" /></div>
                </Card>
                <Card className="bg-slate-900/40 border-slate-800 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Rateios</p>
                    <p className="text-2xl font-bold text-white">{rateios.length}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400"><Percent className="w-5 h-5" /></div>
                </Card>
                <Card className="bg-slate-900/40 border-slate-800 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Saldo Global</p>
                    <p className="text-lg font-bold text-emerald-400 mt-1">
                      {formatarMoeda(bms.reduce((acc, bm) => acc + calcularSaldoBM(bm), 0))}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400"><DollarSign className="w-5 h-5" /></div>
                </Card>
              </div>

              {/* Filtros */}
              <Card className="bg-slate-900/40 border-slate-800 p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-400 uppercase">Período Referência</Label>
                    <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                      <SelectTrigger className="h-8 bg-slate-950 border-slate-700 text-slate-300 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent><SelectItem value="todos">Todos</SelectItem>{PERIODOS_REFERENCIA.map(p => <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-400 uppercase">Fornecedor</Label>
                    <Select value={filtroFornecedor} onValueChange={setFiltroFornecedor}>
                      <SelectTrigger className="h-8 bg-slate-950 border-slate-700 text-slate-300 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent><SelectItem value="todos">Todos</SelectItem>{fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome_fornecedor}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 relative">
                    <Label className="text-[10px] font-semibold text-slate-400 uppercase">Buscar BM</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2 h-3 w-3 text-slate-500" />
                      <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Número BM ou Fornecedor..." className="h-8 pl-8 bg-slate-950 border-slate-700 text-slate-300 text-xs" />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Lista de BMs com Rateios Expansíveis */}
              <Card className="bg-slate-900/40 border-slate-800 flex flex-col">
                <CardHeader className="bg-slate-800/30 border-b border-slate-800/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-400" />
                      <CardTitle className="text-sm font-medium text-slate-100">Boletins de Medição</CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-slate-950 border-slate-700 text-slate-400 text-[10px] h-5 px-2">{bmsFiltrados.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-800">
                    {bmsFiltrados.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-sm">Nenhum BM encontrado</div>
                    ) : (
                      bmsFiltrados.map(bm => {
                        const saldo = calcularSaldoBM(bm);
                        const porc = calcularPorcentagemRateada(bm);
                        const rateiosBM = getRateiosPorBM(bm.id);
                        const isExpanded = expandedBMs.has(bm.id);
                        
                        return (
                          <div key={bm.id} className="hover:bg-slate-800/20 transition-colors">
                            {/* Linha do BM - Clicável para expandir */}
                            <div 
                              className="p-4 cursor-pointer hover:bg-slate-800/30 transition-colors"
                              onClick={() => toggleBMExpansion(bm.id)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400">
                                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </Button>
                                    <div>
                                      <div className="flex items-center gap-3">
                                        <span className="font-bold text-white text-sm">{bm.numero_bm}</span>
                                        <Badge variant="outline" className="text-[9px] h-5 bg-slate-950 border-slate-600">
                                          {formatarData(bm.periodo_referencia_start)} a {formatarData(bm.periodo_referencia_end)}
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-slate-400 mt-1">{bm.fornecedor_nome}</div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-white">{formatarMoeda(bm.valor_bm)}</div>
                                    <div className="text-[10px] text-slate-500">Saldo: {formatarMoeda(saldo)}</div>
                                  </div>
                                  <div className="w-20 text-right">
                                    {saldo === 0 ? (
                                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] h-5 px-1.5">
                                        <CheckCircle className="h-2.5 w-2.5 mr-1" /> Fechado
                                      </Badge>
                                    ) : porc > 0 ? (
                                      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] h-5 px-1.5">
                                        {porc.toFixed(0)}% Rateado
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-slate-950 text-slate-400 border-slate-700 text-[9px] h-5 px-1.5">
                                        Aberto
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Botões de ação fora do clique de expansão */}
                              <div className="flex justify-end gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                                {saldo > 0 && (
                                  <Button onClick={() => abrirModalRateio(bm)} variant="ghost" size="icon" className="h-7 w-7 text-amber-400 hover:bg-amber-500/10">
                                    <Percent className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button onClick={() => iniciarEdicaoBM(bm)} variant="ghost" size="icon" className="h-7 w-7 text-blue-400 hover:bg-blue-500/10">
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button onClick={() => gerarPDFRateioBM(bm)} variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:bg-slate-800">
                                  <Download className="h-3 w-3" />
                                </Button>
                                <Button onClick={() => handleExcluirBM(bm.id)} variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-500/10">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Rateios Expansíveis */}
                            {isExpanded && (
                              <div className="bg-slate-800/20 border-t border-slate-800/50 pl-12 pr-4 py-3">
                                <div className="flex items-center gap-2 mb-3">
                                  <Percent className="h-3 w-3 text-amber-400" />
                                  <span className="text-xs font-semibold text-slate-300 uppercase">Rateios Aplicados</span>
                                  <Badge variant="outline" className="text-[9px] h-4 bg-slate-950 border-slate-700">
                                    {rateiosBM.length}
                                  </Badge>
                                </div>
                                
                                {rateiosBM.length === 0 ? (
                                  <div className="text-center py-6 text-slate-500 text-xs">
                                    Nenhum rateio aplicado a este BM
                                  </div>
                                ) : (
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="hover:bg-transparent border-slate-700/50">
                                        <TableHead className="text-[9px] font-semibold text-slate-400 uppercase py-2 pl-0">Centro de Resultado</TableHead>
                                        <TableHead className="text-[9px] font-semibold text-slate-400 uppercase py-2 text-right">Valor</TableHead>
                                        <TableHead className="text-[9px] font-semibold text-slate-400 uppercase py-2 text-right">%</TableHead>
                                        <TableHead className="text-[9px] font-semibold text-slate-400 uppercase py-2 text-right">Data</TableHead>
                                        <TableHead className="text-[9px] font-semibold text-slate-400 uppercase py-2 text-right">Ações</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {rateiosBM.map(rateio => (
                                        <TableRow key={rateio.id} className="hover:bg-slate-800/30 border-slate-700/30">
                                          <TableCell className="py-2 pl-0 text-xs text-slate-300">{rateio.centro_resultado}</TableCell>
                                          <TableCell className="py-2 text-right text-xs font-mono text-white">{formatarMoeda(rateio.valor_rateado)}</TableCell>
                                          <TableCell className="py-2 text-right">
                                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px] h-5 px-1.5">
                                              {rateio.porcentagem_rateio}%
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="py-2 text-right text-[10px] text-slate-500">{formatarData(rateio.created_at)}</TableCell>
                                          <TableCell className="py-2 text-right">
                                            <Button 
                                              onClick={() => handleExcluirRateio(rateio.id)} 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-6 w-6 text-red-400 hover:bg-red-500/10"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </main>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden flex flex-col min-h-screen bg-slate-950">
          <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button onClick={() => setSidebarOpen(true)} variant="ghost" size="icon" className="text-white hover:bg-slate-800"><Menu className="w-5 h-5" /></Button>
              <div className="flex items-center gap-2">
                 <Percent className="text-amber-400 w-5 h-5" />
                 <h1 className="text-lg font-bold text-white leading-tight">Rateios</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <Button onClick={carregarDados} variant="ghost" size="icon" className="text-slate-400 hover:text-white"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button>
               <Button onClick={() => { setFormType('bm'); setShowForm(true); }} className="bg-orange-500 hover:bg-orange-600 text-white h-9 px-3 text-xs"><Plus className="h-3.5 w-3.5 mr-1" /> BM</Button>
            </div>
          </div>

          {sidebarOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="flex justify-between items-center p-4 border-b border-slate-800">
                <h2 className="text-white font-bold text-lg">Menu</h2>
                <Button onClick={() => setSidebarOpen(false)} variant="ghost" size="icon" className="text-white hover:bg-slate-800"><X className="w-6 h-6" /></Button>
              </div>
              <div className="p-4 space-y-2">
                 <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full justify-start border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-12 px-4"><ArrowLeft className="mr-3 h-4 w-4" /> Voltar</Button>
                 <Button onClick={() => { setFormType('fornecedor'); setShowForm(true); setSidebarOpen(false); }} variant="outline" className="w-full justify-start border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:text-purple-300 h-12 px-4"><UserPlus className="mr-3 h-4 w-4" /> Novo Fornecedor</Button>
              </div>
            </div>
          )}

          <div className="p-4 space-y-4 pb-20">
             {/* Mobile Filters */}
             <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                  <SelectTrigger className="w-[140px] h-8 bg-slate-900 border-slate-700 text-xs"><SelectValue placeholder="Período" /></SelectTrigger>
                  <SelectContent><SelectItem value="todos">Todos</SelectItem>{PERIODOS_REFERENCIA.map(p => <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
                <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar BM..." className="w-[120px] h-8 bg-slate-900 border-slate-700 text-xs" />
             </div>

             {/* Mobile Stats */}
             <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Total BMs</p>
                  <p className="text-xl font-bold text-white">{bms.length}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Saldo</p>
                  <p className="text-lg font-bold text-emerald-400">{bms.reduce((a,b)=>a+calcularSaldoBM(b),0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</p>
                </div>
             </div>

             {/* Mobile BMs List */}
             <Card className="bg-slate-900 border border-slate-800 overflow-hidden">
                <div className="p-3 border-b border-slate-800 bg-slate-800/30">
                   <span className="text-sm font-semibold text-white">Boletins de Medição</span>
                </div>
                <div className="divide-y divide-slate-800">
                   {bmsFiltrados.slice(0, 10).map(bm => {
                     const saldo = calcularSaldoBM(bm);
                     const isExpanded = expandedBMs.has(bm.id);
                     
                     return (
                       <div key={bm.id}>
                         <div 
                           className="p-3 cursor-pointer hover:bg-slate-800/30"
                           onClick={() => toggleBMExpansion(bm.id)}
                         >
                           <div className="flex justify-between items-center">
                             <div>
                               <div className="flex items-center gap-2">
                                 <span className="font-bold text-white text-sm">{bm.numero_bm}</span>
                                 {saldo === 0 ? <CheckCircle className="h-3 w-3 text-emerald-400"/> : <Percent className="h-3 w-3 text-amber-400"/>}
                               </div>
                               <div className="text-xs text-slate-400 mt-0.5">{bm.fornecedor_nome}</div>
                               <div className="text-[10px] text-slate-500 mt-1">{formatarMoeda(saldo)} disponível</div>
                             </div>
                             <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); abrirModalRateio(bm); }}>
                               <Percent className="h-3 w-3 text-amber-400" />
                             </Button>
                           </div>
                         </div>
                         
                         {isExpanded && getRateiosPorBM(bm.id).length > 0 && (
                           <div className="bg-slate-800/20 pl-6 pr-3 py-2">
                             <div className="text-[10px] text-slate-400 mb-2">Rateios:</div>
                             {getRateiosPorBM(bm.id).map(rateio => (
                               <div key={rateio.id} className="text-[10px] text-slate-300 py-1 border-t border-slate-700/30">
                                 <div>{rateio.centro_resultado}</div>
                                 <div className="flex justify-between mt-0.5">
                                   <span className="text-emerald-400">{formatarMoeda(rateio.valor_rateado)}</span>
                                   <span className="text-blue-400">{rateio.porcentagem_rateio}%</span>
                                 </div>
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                     )
                   })}
                </div>
             </Card>
          </div>
        </div>

        {/* Modals */}
        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <Card className="bg-slate-900 border-slate-700 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b border-slate-800 flex justify-between items-center py-4 px-6">
                <CardTitle className="text-white text-lg">{formType === 'fornecedor' ? 'Novo Fornecedor' : (editingBM ? 'Editar BM' : 'Novo BM')}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setEditingBM(null); }} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {formType === 'fornecedor' ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-400 text-sm">Nome do Fornecedor</Label>
                      <Input value={novoFornecedor.nome_fornecedor} onChange={e => setNovoFornecedor({ nome_fornecedor: e.target.value })} className="bg-slate-950 border-slate-700 text-white mt-1.5" />
                    </div>
                    <Button onClick={handleCadastrarFornecedor} className="w-full bg-purple-600 hover:bg-purple-700 text-white h-9">Salvar</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-400 text-sm">Fornecedor</Label>
                      <Select value={novoBM.fornecedor_id} onValueChange={v => setNovoBM({...novoBM, fornecedor_id: v})}>
                        <SelectTrigger className="bg-slate-950 border-slate-700 text-white mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>{fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome_fornecedor}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-400 text-sm">Número BM</Label>
                        <Input value={novoBM.numero_bm} onChange={e => setNovoBM({...novoBM, numero_bm: e.target.value})} className="bg-slate-950 border-slate-700 text-white mt-1.5" />
                      </div>
                      <div>
                        <Label className="text-slate-400 text-sm">Valor</Label>
                        <Input type="number" value={novoBM.valor_bm} onChange={e => setNovoBM({...novoBM, valor_bm: e.target.value})} className="bg-slate-950 border-slate-700 text-white mt-1.5" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-slate-400 text-sm">Período Referência</Label>
                      <Select value={novoBM.periodo_referencia} onValueChange={v => setNovoBM({...novoBM, periodo_referencia: v})}>
                        <SelectTrigger className="bg-slate-950 border-slate-700 text-white mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>{PERIODOS_REFERENCIA.map(p => <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button onClick={editingBM ? handleAtualizarBM : handleCadastrarBM} className="w-full bg-orange-500 hover:bg-orange-600 text-white h-9">
                      {editingBM ? 'Atualizar' : 'Cadastrar'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Dialog open={showRateioDialog} onOpenChange={setShowRateioDialog}>
          <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-md">
            <DialogHeader><DialogTitle className="text-white">Aplicar Rateio</DialogTitle></DialogHeader>
            {selectedBMForRateio && (
              <div className="space-y-4 py-4">
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                  <p className="text-xs text-slate-400">BM: <span className="text-white font-bold">{selectedBMForRateio.numero_bm}</span></p>
                  <p className="text-xs text-slate-400">Total: <span className="text-white">{formatarMoeda(selectedBMForRateio.valor_bm)}</span></p>
                  <p className="text-xs text-slate-400">Saldo: <span className="text-emerald-400 font-bold">{formatarMoeda(calcularSaldoBM(selectedBMForRateio))}</span></p>
                </div>
                <div>
                  <Label className="text-slate-400 text-sm">Centro Resultado</Label>
                  <Select value={novoRateio.centro_resultado} onValueChange={v => setNovoRateio({...novoRateio, centro_resultado: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700 text-white mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>{centrosResultado.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-400 text-sm">%</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={novoRateio.porcentagem_rateio} 
                      onChange={e => {
                        setNovoRateio({...novoRateio, porcentagem_rateio: e.target.value});
                        if (e.target.value && selectedBMForRateio) {
                          const valor = (selectedBMForRateio.valor_bm * parseFloat(e.target.value)) / 100;
                          setNovoRateio(prev => ({...prev, valor_rateado: valor.toFixed(2)}));
                        }
                      }}
                      className="bg-slate-950 border-slate-700 text-white mt-1.5" 
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-sm">Valor</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={novoRateio.valor_rateado} 
                      onChange={e => {
                        setNovoRateio({...novoRateio, valor_rateado: e.target.value});
                        if (e.target.value && selectedBMForRateio) {
                          const porcentagem = (parseFloat(e.target.value) / selectedBMForRateio.valor_bm) * 100;
                          setNovoRateio(prev => ({...prev, porcentagem_rateio: porcentagem.toFixed(2)}));
                        }
                      }}
                      className="bg-slate-950 border-slate-700 text-white mt-1.5" 
                    />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button onClick={() => setShowRateioDialog(false)} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 h-9">Cancelar</Button>
                  <Button onClick={aplicarRateio} className="bg-green-600 hover:bg-green-700 text-white h-9">Salvar</Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </>
  );
};

export default Rateios;
