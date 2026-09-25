// src/components/Dashboard.tsx
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Bell, FileText, Ship, LogOut, BarChart3, Menu, X, 
  Calendar, ClipboardCheck, Car, AlertTriangle, Building2, 
  Percent, Activity, Clock, ArrowUpRight, Users, 
  ScrollText, Loader2, Factory, Warehouse, Filter, Download,
  Database, Heart, Shield, Wrench, TrafficCone, Flag, 
  AlertCircle, Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// --- IMPORTAÇÕES DO RECHARTS ---
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip 
} from 'recharts';

// --- TIPOS ---
interface Navio {
  id: string;
  nome_navio: string;
  carga: string;
}

interface Equipamento {
  id: string;
  horas_trabalhadas: number;
}

interface OperacaoDashboard {
  id: string;
  op: string;
  data: string;
  hora_inicial: string;
  hora_final: string;
  carga: string | null;
  navios: Navio | null;
  equipamentos: Equipamento[];
}

// --- UTILITÁRIOS ---
const formatarDataBR = (dataString: string): string => {
  if (!dataString) return '';
  const [ano, mes, dia] = dataString.split('-');
  return `${dia}/${mes}/${ano}`;
};

const getOperacaoIcon = (op: string) => {
  switch (op) {
    case 'NAVIO': return Ship;
    case 'ALBRAS': return Factory;
    case 'SANTOS BRASIL': return Warehouse;
    case 'HYDRO': return Building2;
    default: return BarChart3;
  }
};

// Cores para os gráficos
const COLORS = {
  HYDRO: '#3b82f6',
  NAVIO: '#a855f7',
  ALBRAS: '#f97316',
  'SANTOS BRASIL': '#06b6d4',
  OTHERS: '#64748b'
};

const Dashboard = () => {
  const { userProfile, signOut } = useAuth();
  const { hasUnread } = useNotifications();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bannerFechado, setBannerFechado] = useState(false);
  
  // Filtros de Data
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [operacoes, setOperacoes] = useState<OperacaoDashboard[]>([]);

  // Inicializar datas com o mês atual
  useEffect(() => {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const formatoISO = (d: Date) => d.toISOString().split('T')[0];
    
    setDataInicial(formatoISO(primeiroDia));
    setDataFinal(formatoISO(hoje));
  }, []);

  // Busca de dados
  const fetchData = async () => {
    if (!dataInicial || !dataFinal) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('registro_operacoes')
        .select(`
          *,
          navios ( id, nome_navio, carga ),
          equipamentos ( id, horas_trabalhadas )
        `)
        .gte('data', dataInicial)
        .lte('data', dataFinal)
        .order('data', { ascending: true });

      if (error) throw error;
      setOperacoes(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dados do dashboard.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados ao mudar o filtro
  useEffect(() => {
    fetchData();
  }, [dataInicial, dataFinal]);

  // --- PROCESSAMENTO DE DADOS ---

  // 1. Soma de Horas por Tipo
  const horasPorTipo = useMemo(() => {
    const inicial = { HYDRO: 0, NAVIO: 0, ALBRAS: 0, 'SANTOS BRASIL': 0 };
    
    return operacoes.reduce((acc, op) => {
      const totalHorasOp = op.equipamentos.reduce((sum, eq) => sum + (Number(eq.horas_trabalhadas) || 0), 0);
      
      if (acc.hasOwnProperty(op.op)) {
        acc[op.op as keyof typeof acc] += totalHorasOp;
      }
      return acc;
    }, inicial);
  }, [operacoes]);

  // 2. Dados para Gráfico de Pizza
  const dadosGraficoPizza = useMemo(() => {
    const totalGeral = Object.values(horasPorTipo).reduce((a, b) => a + b, 0);
    
    return Object.entries(horasPorTipo).map(([key, value]) => ({
      name: key,
      value: value,
      percent: totalGeral > 0 ? ((value / totalGeral) * 100).toFixed(1) : 0,
      color: COLORS[key as keyof typeof COLORS] || COLORS.OTHERS
    })).filter(item => item.value > 0);
  }, [horasPorTipo]);

  // 3. Dados para Gráfico de Colunas (Navios)
  const dadosGraficoNavios = useMemo(() => {
    const mapaNavios = new Map<string, { horas: number; qtd: number }>();

    operacoes.forEach(op => {
      if (op.op === 'NAVIO' && op.navios) {
        const label = `${op.navios.nome_navio} - ${op.navios.carga || op.carga || 'Sem Carga'}`;
        const horasOp = op.equipamentos.reduce((sum, eq) => sum + (Number(eq.horas_trabalhadas) || 0), 0);
        
        const atual = mapaNavios.get(label) || { horas: 0, qtd: 0 };
        mapaNavios.set(label, { 
          horas: atual.horas + horasOp, 
          qtd: atual.qtd + 1 
        });
      }
    });

    return Array.from(mapaNavios.entries()).map(([name, data]) => ({
      name,
      horas: Number(data.horas.toFixed(1)),
      qtd: data.qtd
    })).sort((a, b) => b.horas - a.horas);
  }, [operacoes]);

  // 4. Quantidade de Navios Operados
  const qtdNaviosDistintos = useMemo(() => {
    const ids = new Set(operacoes.filter(op => op.op === 'NAVIO' && op.navio_id).map(op => op.navio_id));
    return ids.size;
  }, [operacoes]);

  // 5. Dados para Gráfico de Barras (Tipo de Carga)
  const dadosGraficoCargas = useMemo(() => {
    const mapaCargas = new Map<string, number>();

    operacoes.forEach(op => {
      let cargaNome = 'Não Definida';
      if (op.op === 'NAVIO' && op.navios?.carga) {
        cargaNome = op.navios.carga;
      } else if (op.carga) {
        cargaNome = op.carga;
      }

      const atual = mapaCargas.get(cargaNome) || 0;
      mapaCargas.set(cargaNome, atual + 1);
    });

    return Array.from(mapaCargas.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [operacoes]);

  const handleSignOut = async () => {
    await signOut();
  };

  const menuItems = [
    { icon: FileText, label: 'Relatório Transporte', path: '/relatorio-transporte', color: 'text-blue-400', bgHover: 'hover:bg-blue-500/10' },
    { icon: Database, label: 'Relatórios Avançados', path: '/relatorio-dinamico', color: 'text-teal-400', bgHover: 'hover:bg-teal-500/10' },
    { icon: Ship, label: 'Navios', path: '/navios', color: 'text-purple-400', bgHover: 'hover:bg-purple-500/10' },
    { icon: Calendar, label: 'Escalas', path: '/escalas', color: 'text-cyan-400', bgHover: 'hover:bg-cyan-500/10' },
    { icon: ClipboardCheck, label: 'Vistorias', path: '/vistorias', color: 'text-teal-400', bgHover: 'hover:bg-teal-500/10' },
    { icon: Car, label: 'Master Drive', path: '/master-drive', color: 'text-indigo-400', bgHover: 'hover:bg-indigo-500/10' },
    { icon: AlertTriangle, label: 'Ocorrências', path: '/ocorrencias', color: 'text-orange-400', bgHover: 'hover:bg-orange-500/10' },
    { icon: Wrench, label: 'Dano Material', path: '/dano-material', color: 'text-red-400', bgHover: 'hover:bg-red-500/10' },
    { icon: Percent, label: 'Rateios', path: '/rateios', color: 'text-amber-400', bgHover: 'hover:bg-amber-500/10' },
    { icon: Bell, label: 'Notificações', path: '/notificacao', color: 'text-violet-400', bgHover: 'hover:bg-violet-500/10', hasNotification: hasUnread },
    { icon: Building2, label: 'RDO Santos Brasil', path: '/santos-brasil', color: 'text-red-400', bgHover: 'hover:bg-red-500/10' },
    { icon: BarChart3, label: 'Visuais e Dashboard', path: '/visuais', color: 'text-emerald-400', bgHover: 'hover:bg-emerald-500/10' },
    { icon: Users, label: 'Homem Hora', path: '/homem-hora', color: 'text-pink-400', bgHover: 'hover:bg-pink-500/10' },
    { icon: ScrollText, label: 'Contratos - BM', path: '/contratos', color: 'text-rose-400', bgHover: 'hover:bg-rose-500/10' }
  ];

  // Tooltip Customizado para Gráficos
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-slate-200">
          <p className="font-bold text-sm mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-slate-200">
          <p className="font-bold text-sm mb-1">{payload[0].name}</p>
          <p className="text-xs text-slate-400">Horas: {payload[0].value}h</p>
          <p className="text-xs text-slate-400">Percentual: {payload[0].payload.percent}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-yellow-500/30">
      <style>{`body { margin: 0; background-color: #020617; }`}</style>
      
      {/* Layout Desktop */}
      <div className="hidden lg:flex min-h-screen">
        {/* Sidebar Desktop */}
        <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500/20 p-2 rounded-lg">
                <BarChart3 className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight leading-none">Gestão Ops</h1>
                <p className="text-xs text-slate-500 mt-1">VERSÃO: 32.1.1</p>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-1">
            <div className="px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Módulos</div>
            {menuItems.map((item) => (
              <Button key={item.path} onClick={() => navigate(item.path)} variant="ghost" className={`w-full justify-start h-10 px-3 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors relative group ${item.bgHover}`}>
                <item.icon className={`mr-3 h-4 w-4 ${item.color}`} />
                <span className="text-sm font-medium">{item.label}</span>
                {item.hasNotification && (
                  <span className="ml-auto flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </Button>
            ))}
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-3 px-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-yellow-500/20">
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
        <div className="flex-1 flex flex-col min-w-0 bg-slate-950/50 overflow-y-auto">
          <div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50 px-8 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Dashboard Analítico</h2>
                <p className="text-xs text-slate-400">Visão gerencial de operações e produtividade</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-white">{new Date().toLocaleDateString('pt-BR')}</div>
                </div>
                <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-white hover:bg-slate-800">
                  <Bell className="h-5 w-5" />
                  {hasUnread && <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-slate-950"></span>}
                </Button>
              </div>
            </div>
          </div>

          <main className="flex-1 p-6 space-y-6">
            {/* BANNER MAIO AMARELO */}
          
            {/* Filtros */}
            <Card className="bg-slate-900/40 border-slate-800">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-400 font-semibold uppercase">Data Inicial</Label>
                    <Input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} className="bg-slate-950 border-slate-700 text-white w-40" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-400 font-semibold uppercase">Data Final</Label>
                    <Input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} className="bg-slate-950 border-slate-700 text-white w-40" />
                  </div>
                  <Button onClick={fetchData} disabled={loading} className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold h-10">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Filter className="h-4 w-4 mr-2" />}
                    Filtrar Dados
                  </Button>
                  <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                    <span>Período:</span>
                    <Badge variant="outline" className="border-slate-700 text-slate-300">
                      {formatarDataBR(dataInicial)} a {formatarDataBR(dataFinal)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cards de Soma de Horas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-slate-900 border border-slate-800 p-4 flex flex-col justify-between hover:border-blue-500/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Hydro</p>
                    <h3 className="text-2xl font-bold text-blue-500 mt-1">{horasPorTipo.HYDRO.toFixed(1)}h</h3>
                  </div>
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>
              </Card>

              <Card className="bg-slate-900 border border-slate-800 p-4 flex flex-col justify-between hover:border-purple-500/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Navios</p>
                    <h3 className="text-2xl font-bold text-purple-500 mt-1">{horasPorTipo.NAVIO.toFixed(1)}h</h3>
                  </div>
                  <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                    <Ship className="w-5 h-5" />
                  </div>
                </div>
              </Card>

              <Card className="bg-slate-900 border border-slate-800 p-4 flex flex-col justify-between hover:border-orange-500/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Albras</p>
                    <h3 className="text-2xl font-bold text-orange-500 mt-1">{horasPorTipo.ALBRAS.toFixed(1)}h</h3>
                  </div>
                  <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                    <Factory className="w-5 h-5" />
                  </div>
                </div>
              </Card>

              <Card className="bg-slate-900 border border-slate-800 p-4 flex flex-col justify-between hover:border-cyan-500/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Santos Brasil</p>
                    <h3 className="text-2xl font-bold text-cyan-500 mt-1">{horasPorTipo['SANTOS BRASIL'].toFixed(1)}h</h3>
                  </div>
                  <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-500">
                    <Warehouse className="w-5 h-5" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Gráficos Row 1: Pizza + KPI Navios */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="bg-slate-900/40 border-slate-800 h-full">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-200">Distribuição de Horas por Local (%)</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dadosGraficoPizza}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => `${entry.percent}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {dadosGraficoPizza.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                          <Legend formatter={(value) => <span className="text-slate-300 text-xs">{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="flex flex-col gap-6">
                <Card className="bg-gradient-to-br from-yellow-600/20 to-amber-900/30 border-2 border-yellow-500/40 p-6 flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4 text-yellow-400">
                    <TrafficCone className="w-8 h-8" />
                  </div>
                  <h4 className="text-slate-300 text-xs uppercase font-bold tracking-wider mb-1">MAIO AMARELO</h4>
                  <p className="text-yellow-400 text-sm font-bold mb-2">#PELASVIDASNOTRÂNSITO</p>
                  <p className="text-xs text-slate-400 mt-2">Sua atitude salva vidas!</p>
                  <Badge className="mt-3 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    🌟 Respeito e Responsabilidade
                  </Badge>
                </Card>

                <Card className="bg-slate-900/40 border-slate-800 p-4">
                   <h4 className="text-xs font-semibold text-slate-300 uppercase mb-3">Acesso Rápido</h4>
                   <div className="space-y-2">
                      <Button onClick={() => navigate('/novo-lancamento')} variant="ghost" className="w-full justify-start h-8 px-2 text-slate-400 hover:text-white hover:bg-slate-800 text-xs">
                         <FileText className="mr-2 h-3.5 w-3.5 text-yellow-400" /> Novo Relatório
                      </Button>
                      <Button onClick={() => navigate('/relatorio-transporte')} variant="ghost" className="w-full justify-start h-8 px-2 text-slate-400 hover:text-white hover:bg-slate-800 text-xs">
                         <Download className="mr-2 h-3.5 w-3.5 text-emerald-400" /> Baixar CSV
                      </Button>
                   </div>
                </Card>
              </div>
            </div>

            {/* Gráfico de Colunas: Navios */}
            <Card className="bg-slate-900/40 border-slate-800">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-200">Performance por Navio (Horas vs Operações)</CardTitle>
                <CardDescription className="text-xs text-slate-500">Soma de horas trabalhadas por navio e carga no período selecionado.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosGraficoNavios} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={12} tickFormatter={(value) => `${value}h`} />
                      <YAxis dataKey="name" type="category" width={250} stroke="#94a3b8" fontSize={11} tick={{fill: '#cbd5e1'}} />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                      <Bar dataKey="horas" fill="#fbbf24" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de Barras: Tipo de Carga */}
            <Card className="bg-slate-900/40 border-slate-800">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-200">Quantidade de Operações por Tipo de Carga</CardTitle>
                <CardDescription className="text-xs text-slate-500">Volume de operações agrupado pelo tipo de carga manuseada.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosGraficoCargas}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tick={{fill: '#cbd5e1'}} angle={-45} textAnchor="end" height={60} />
                      <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                      <Bar dataKey="count" fill="#facc15" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

          </main>
        </div>
      </div>

      {/* Layout Mobile */}
      <div className="lg:hidden flex flex-col min-h-screen bg-slate-950 pb-20">
        <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-30 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <Button onClick={() => setSidebarOpen(true)} variant="ghost" size="icon" className="text-white hover:bg-slate-800">
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
               <BarChart3 className="text-yellow-500 w-5 h-5" />
               <h1 className="text-lg font-bold text-white leading-tight">Dashboard</h1>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Banner Mobile - Maio Amarelo */}
          {!bannerFechado && (
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-yellow-600/30 via-amber-900/40 to-yellow-600/30 border-2 border-yellow-500/50 p-4">
              <button 
                onClick={() => setBannerFechado(true)}
                className="absolute top-2 right-2 text-slate-400 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrafficCone className="w-5 h-5 text-yellow-400" />
                  <span className="text-xs font-black text-yellow-400 tracking-wide">MAIO AMARELO 2025</span>
                </div>
                <p className="text-[11px] text-slate-200 font-semibold">🌍 Juntos Salvamos Vidas</p>
                <p className="text-[10px] text-slate-300">Prevenção de Acidentes no Trânsito • Sua atitude faz a diferença</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[9px]">🛑 Pare e Pense</Badge>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[9px]">🚦 Respeito</Badge>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[9px]">🚗 Responsabilidade</Badge>
                </div>
              </div>
            </div>
          )}

          <Card className="bg-slate-900 border border-slate-800">
            <CardContent className="pt-4 space-y-3">
               <div>
                  <Label className="text-xs text-slate-400">Início</Label>
                  <Input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} className="bg-slate-950 border-slate-700 text-white mt-1" />
               </div>
               <div>
                  <Label className="text-xs text-slate-400">Fim</Label>
                  <Input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} className="bg-slate-950 border-slate-700 text-white mt-1" />
               </div>
               <Button onClick={fetchData} className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold">Filtrar</Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-slate-900 p-3 border border-blue-900/50">
               <p className="text-[10px] text-blue-400 uppercase font-bold">Hydro</p>
               <p className="text-xl font-bold text-white">{horasPorTipo.HYDRO.toFixed(1)}h</p>
            </Card>
            <Card className="bg-slate-900 p-3 border border-purple-900/50">
               <p className="text-[10px] text-purple-400 uppercase font-bold">Navios</p>
               <p className="text-xl font-bold text-white">{horasPorTipo.NAVIO.toFixed(1)}h</p>
            </Card>
            <Card className="bg-slate-900 p-3 border border-orange-900/50">
               <p className="text-[10px] text-orange-400 uppercase font-bold">Albras</p>
               <p className="text-xl font-bold text-white">{horasPorTipo.ALBRAS.toFixed(1)}h</p>
            </Card>
            <Card className="bg-slate-900 p-3 border border-cyan-900/50">
               <p className="text-[10px] text-cyan-400 uppercase font-bold">Santos BR</p>
               <p className="text-xl font-bold text-white">{horasPorTipo['SANTOS BRASIL'].toFixed(1)}h</p>
            </Card>
          </div>

          <Card className="bg-slate-900 border border-slate-800 p-4">
             <h3 className="text-sm font-bold text-white mb-4">Navios Operados: {qtdNaviosDistintos}</h3>
             <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie data={dadosGraficoPizza} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                        {dadosGraficoPizza.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                     </Pie>
                     <Tooltip />
                   </PieChart>
                </ResponsiveContainer>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;