// src/pages/Navios.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Menu, X, LogOut, Bell, Ship, Calendar, Package, Anchor,
  BarChart3, Plus, Pencil, ArrowLeft, Loader2, Home, Activity,
  Search, Filter, XCircle, Save, Trash2, ChevronDown
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Viagem {
  id: string;
  nome_navio: string;
  carga: string | null;
  berco: string | null;
  quantidade_prevista: number | null;
  cbs_total: number | null;
  inicio_operacao: string | null;
  final_operacao: string | null;
  media_cb: number | null;
  concluido: boolean;
  created_at: string;
}

interface ProducaoDia {
  data: string;
  total_tons: number;
}

const tiposCarga = [
  "HIDRATO", "CARVAO", "BAUXITA", "COQUE", "PICHE", "FLUORETO", "LINGOTE"
];

const Navios = () => {
  const { userProfile, signOut } = useAuth();
  const { isAdmin, error: adminError } = useIsAdmin();
  const { hasUnread } = useNotifications();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Estados gerais
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [filteredViagens, setFilteredViagens] = useState<Viagem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroCarga, setFiltroCarga] = useState('');
  const [cargasUnicas, setCargasUnicas] = useState<string[]>([]);

  // Navio selecionado
  const [selectedNavioId, setSelectedNavioId] = useState<string | null>(null);
  const [navioData, setNavioData] = useState<Viagem | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Formulário de edição do navio
  const [editForm, setEditForm] = useState({
    nome_navio: '',
    carga: '',
    berco: '',
    quantidade_prevista: '',
    cbs_total: '',
    media_cb: '',
    inicio_operacao: '',
    final_operacao: '',
    concluido: false
  });
  const [cargaDropdownOpen, setCargaDropdownOpen] = useState(false);
  const [isSavingNavio, setIsSavingNavio] = useState(false);
  const [deleteNavioDialogOpen, setDeleteNavioDialogOpen] = useState(false);
  const [isDeletingNavio, setIsDeletingNavio] = useState(false);

  // Produção diária do navio selecionado
  const [producaoPorDia, setProducaoPorDia] = useState<ProducaoDia[]>([]);
  const [loadingProd, setLoadingProd] = useState(false);
  const [dataGlobal, setDataGlobal] = useState(new Date().toISOString().split('T')[0]);
  const [isSavingProd, setIsSavingProd] = useState(false);

  // Efeito inicial: carregar lista de navios
  useEffect(() => {
    const fetchViagens = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('navios')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setViagens(data);
        setFilteredViagens(data);
        const cargas = data
          .map(v => v.carga)
          .filter((c): c is string => c !== null && c !== '')
          .filter((v, i, s) => s.indexOf(v) === i)
          .sort();
        setCargasUnicas(cargas);
      }
      setLoading(false);
    };
    fetchViagens();
  }, []);

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...viagens];
    if (filtroNome) {
      filtered = filtered.filter(v =>
        v.nome_navio.toLowerCase().includes(filtroNome.toLowerCase())
      );
    }
    if (filtroCarga) {
      filtered = filtered.filter(v => v.carga === filtroCarga);
    }
    setFilteredViagens(filtered);
  }, [filtroNome, filtroCarga, viagens]);

  const limparFiltros = () => {
    setFiltroNome('');
    setFiltroCarga('');
  };

  // Carregar detalhes do navio selecionado
  const carregarDetalhesNavio = useCallback(async (id: string) => {
    setLoadingDetails(true);
    setLoadingProd(true);
    try {
      const { data, error } = await supabase
        .from('navios')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setNavioData(data);
      setEditForm({
        nome_navio: data.nome_navio || '',
        carga: data.carga || '',
        berco: data.berco || '',
        quantidade_prevista: data.quantidade_prevista?.toString() || '',
        cbs_total: data.cbs_total?.toString() || '',
        media_cb: data.media_cb?.toString() || '',
        inicio_operacao: data.inicio_operacao || '',
        final_operacao: data.final_operacao || '',
        concluido: data.concluido || false
      });

      // Carregar produção
      const { data: prodData, error: prodError } = await supabase
        .from('registros_producao')
        .select('data, tons_total')
        .eq('navio_id', id)
        .order('data', { ascending: true });

      if (prodError) throw prodError;

      if (prodData && prodData.length > 0) {
        const agrupado = prodData.reduce((acc: ProducaoDia[], curr) => {
          const idx = acc.findIndex(item => item.data === curr.data);
          if (idx !== -1) {
            acc[idx].total_tons += curr.tons_total || 0;
          } else {
            acc.push({ data: curr.data, total_tons: curr.tons_total || 0 });
          }
          return acc;
        }, []);
        setProducaoPorDia(agrupado.reverse());
        setDataGlobal(agrupado[0]?.data || new Date().toISOString().split('T')[0]);
      } else {
        setProducaoPorDia([]);
        setDataGlobal(new Date().toISOString().split('T')[0]);
      }
    } catch (err) {
      console.error('Erro ao carregar detalhes:', err);
      toast({ title: 'Erro', description: 'Falha ao carregar dados do navio.', variant: 'destructive' });
    } finally {
      setLoadingDetails(false);
      setLoadingProd(false);
    }
  }, [toast]);

  // Selecionar navio
  const handleSelectNavio = (id: string) => {
    setSelectedNavioId(id);
    carregarDetalhesNavio(id);
  };

  // Salvar alterações do navio
  const handleSaveNavio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNavioId || !userProfile) return;
    setIsSavingNavio(true);
    try {
      const updateData = {
        nome_navio: editForm.nome_navio,
        carga: editForm.carga,
        berco: editForm.berco,
        quantidade_prevista: editForm.quantidade_prevista ? Number(editForm.quantidade_prevista) : 0,
        cbs_total: editForm.cbs_total ? Number(editForm.cbs_total) : 0,
        media_cb: editForm.media_cb ? Number(editForm.media_cb) : 0,
        inicio_operacao: editForm.inicio_operacao || null,
        final_operacao: editForm.final_operacao || null,
        concluido: editForm.concluido
      };

      const { error } = await supabase
        .from('navios')
        .update(updateData)
        .eq('id', selectedNavioId);

      if (error) throw error;

      // Atualiza a lista principal
      setViagens(prev => prev.map(v => v.id === selectedNavioId ? { ...v, ...updateData, id: selectedNavioId, created_at: v.created_at } : v));
      setNavioData(prev => prev ? { ...prev, ...updateData } : null);
      toast({ title: 'Sucesso!', description: 'Dados do navio atualizados.' });
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setIsSavingNavio(false);
    }
  };

  useEffect(() => {
    if (adminError) {
      toast({
        title: 'Erro ao verificar permissões',
        description: 'Não foi possível confirmar o acesso de administrador.',
        variant: 'destructive'
      });
    }
  }, [adminError, toast]);

  const handleDeleteNavio = async () => {
    if (!selectedNavioId) return;

    setIsDeletingNavio(true);
    try {
      const { data, error } = await supabase
        .from('navios')
        .delete()
        .eq('id', selectedNavioId)
        .select('id');

      if (error) {
        if (error.code === '23503') {
          throw new Error(
            'Há registros vinculados em base_equipamentos_operacoes que impedem a exclusão. Nenhum dado foi apagado.'
          );
        }
        throw error;
      }

      if (!data?.length) {
        toast({
          title: 'Navio não excluído',
          description: 'O navio não existe mais ou a permissão de exclusão não foi liberada.',
          variant: 'destructive'
        });
        return;
      }

      setViagens(prev => prev.filter(viagem => viagem.id !== selectedNavioId));
      setSelectedNavioId(null);
      setNavioData(null);
      setProducaoPorDia([]);
      setDeleteNavioDialogOpen(false);
      toast({ title: 'Navio excluído', description: 'O navio foi removido do banco de dados.' });
    } catch (error) {
      toast({
        title: 'Erro ao excluir navio',
        description: error instanceof Error ? error.message : 'Não foi possível excluir o navio.',
        variant: 'destructive'
      });
    } finally {
      setIsDeletingNavio(false);
    }
  };

  // Funções de produção diária
  const handleProdChange = (index: number, field: 'data' | 'total_tons', value: string) => {
    setProducaoPorDia(prev => {
      const newList = [...prev];
      if (field === 'data') {
        newList[index] = { ...newList[index], data: value };
      } else {
        const numValue = value === '' ? 0 : Number(value);
        newList[index] = { ...newList[index], total_tons: numValue };
      }
      return newList;
    });
  };

  const addProdLinha = () => {
    const ultimaData = producaoPorDia.length > 0
      ? producaoPorDia[producaoPorDia.length - 1].data
      : dataGlobal;
    const novaData = new Date(new Date(ultimaData).getTime() + 86400000).toISOString().split('T')[0];
    setProducaoPorDia(prev => [...prev, { data: novaData, total_tons: 0 }]);
  };

  const removeProdLinha = (index: number) => {
    if (producaoPorDia.length > 1) {
      setProducaoPorDia(prev => prev.filter((_, i) => i !== index));
    } else {
      toast({ title: 'Aviso', description: 'É necessário manter pelo menos um registro.' });
    }
  };

  const handleAplicarDataGlobal = () => {
    setProducaoPorDia(prev => prev.map(r => ({ ...r, data: dataGlobal })));
    try {
      const dataFormatada = format(new Date(dataGlobal), 'dd/MM/yyyy', { locale: ptBR });
      toast({ title: 'Datas Atualizadas', description: `Todos os registros definidos para ${dataFormatada}` });
    } catch { }
  };

  const handleSaveProd = async () => {
    if (!selectedNavioId || !userProfile) return;
    setIsSavingProd(true);
    try {
      // Primeiro remove todos os registros existentes e insere os novos (ou faz upsert)
      // Para simplificar, deletamos todos e reinserimos
      await supabase.from('registros_producao').delete().eq('navio_id', selectedNavioId);

      if (producaoPorDia.length > 0) {
        const inserts = producaoPorDia.map(reg => ({
          navio_id: selectedNavioId,
          user_id: userProfile.id,
          data: reg.data,
          tons_total: reg.total_tons
        }));
        const { error: insertError } = await supabase.from('registros_producao').insert(inserts);
        if (insertError) throw insertError;
      }

      toast({ title: 'Sucesso!', description: 'Produção diária salva.' });
      // Recarrega para garantir
      await carregarDetalhesNavio(selectedNavioId);
    } catch (error: any) {
      toast({ title: 'Erro ao salvar produção', description: error.message, variant: 'destructive' });
    } finally {
      setIsSavingProd(false);
    }
  };

  const totalGeralTons = producaoPorDia.reduce((sum, dia) => sum + (dia.total_tons || 0), 0);

  // Formatações
  const formatDate = (dateString: string | null) =>
    dateString ? new Date(dateString).toLocaleDateString('pt-BR') : 'N/A';

  const getStatusColor = (concluido: boolean) =>
    concluido
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      : 'bg-blue-500/10 text-blue-400 border-blue-500/20';

  const calcularDiasOperacao = (inicio: string | null, final: string | null) => {
    if (!inicio) return 0;
    const inicioDate = new Date(inicio);
    const finalDate = final ? new Date(final) : new Date();
    return Math.ceil(Math.abs(finalDate.getTime() - inicioDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Stats com base nos filtrados
  const statsData = [
    { label: 'Total Viagens', value: filteredViagens.length, icon: Ship, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Em Andamento', value: filteredViagens.filter(v => !v.concluido).length, icon: Activity, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Concluídas', value: filteredViagens.filter(v => v.concluido).length, icon: Package, color: 'text-slate-400', bg: 'bg-slate-700/20' },
    { label: 'Média CBs', value: filteredViagens.length > 0
      ? Math.round(filteredViagens.reduce((acc, v) => acc + (v.media_cb || 0), 0) / filteredViagens.length)
      : 0,
      icon: BarChart3, color: 'text-amber-400', bg: 'bg-amber-500/10' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Layout Desktop */}
      <div className="hidden lg:flex min-h-screen">
        {/* Sidebar (menu lateral) */}
        <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="bg-purple-500/20 p-2 rounded-lg">
                <Ship className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight leading-none">Gestão Navios</h1>
                <p className="text-xs text-slate-500 mt-1">Operações Portuárias</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-1 overflow-y-auto flex-1">
            <div className="px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Navegação
            </div>
            <Button
              onClick={() => navigate('/dashboard')}
              variant="ghost"
              className="w-full justify-start h-10 px-3 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <ArrowLeft className="mr-3 h-4 w-4" />
              <span className="text-sm font-medium">Voltar ao Dashboard</span>
            </Button>
            <Button
              onClick={() => navigate('/novo-navio')}
              variant="ghost"
              className="w-full justify-start h-10 px-3 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Plus className="mr-3 h-4 w-4" />
              <span className="text-sm font-medium">Novo Navio</span>
            </Button>
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-3 px-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-500/20">
                {userProfile?.full_name?.substring(0, 2).toUpperCase() || 'US'}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium text-white truncate leading-tight">{userProfile?.full_name || 'Usuário'}</span>
                <span className="text-xs text-slate-500 truncate">Operador</span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white justify-start h-9 text-sm"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair do Sistema
            </Button>
          </div>
        </div>

        {/* Conteúdo principal: lista + detalhes */}
        <div className="flex-1 flex min-w-0">
          {/* Coluna da lista (centro) */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-950/50 border-r border-slate-800/50">
            <div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50 px-6 py-4">
              <h2 className="text-lg font-bold text-white">Navios</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Filtros */}
              <Card className="bg-slate-900/40 border-slate-800">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <div className="flex-1 min-w-[150px] relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        placeholder="Filtrar nome..."
                        value={filtroNome}
                        onChange={(e) => setFiltroNome(e.target.value)}
                        className="pl-9 bg-slate-950 border-slate-700 text-slate-200 h-9 text-sm"
                      />
                    </div>
                    <select
                      value={filtroCarga}
                      onChange={(e) => setFiltroCarga(e.target.value)}
                      className="h-9 px-3 rounded-md bg-slate-950 border border-slate-700 text-slate-200 text-sm"
                    >
                      <option value="">Todas cargas</option>
                      {cargasUnicas.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {(filtroNome || filtroCarga) && (
                      <Button variant="ghost" size="sm" onClick={limparFiltros} className="text-slate-400 h-8">
                        <XCircle className="h-4 w-4 mr-1" /> Limpar
                      </Button>
                    )}
                    <span className="text-xs text-slate-400 ml-auto">{filteredViagens.length} resultados</span>
                  </div>
                </CardContent>
              </Card>

              {/* Tabela de navios */}
              <Card className="bg-slate-900/40 border-slate-800 shadow-sm">
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-950">
                      <TableRow className="hover:bg-slate-950 border-slate-800">
                        <TableHead className="text-[11px] font-semibold text-slate-400 uppercase py-2 pl-3">Navio</TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-400 uppercase py-2">Carga</TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-400 uppercase py-2">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto text-blue-500 mb-2" />
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : filteredViagens.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                            Nenhum navio encontrado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredViagens.map((viagem) => (
                          <TableRow
                            key={viagem.id}
                            className={`cursor-pointer transition-colors border-slate-800 ${
                              selectedNavioId === viagem.id
                                ? 'bg-blue-500/10 hover:bg-blue-500/20'
                                : 'hover:bg-slate-800/40'
                            }`}
                            onClick={() => handleSelectNavio(viagem.id)}
                          >
                            <TableCell className="py-2 pl-3">
                              <div className="flex items-center gap-2">
                                <Ship className="h-4 w-4 text-blue-400" />
                                <div>
                                  <div className="text-sm font-medium text-white">{viagem.nome_navio}</div>
                                  <div className="text-[10px] text-slate-500">{viagem.berco || '-'}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-700 text-[10px] px-1.5 py-0 h-5">
                                {viagem.carga || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge className={getStatusColor(viagem.concluido) + " text-[10px] h-5 px-2 font-medium"}>
                                {viagem.concluido ? 'Concluído' : 'Em andamento'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Painel de detalhes (direita) */}
          <div className="w-[480px] flex flex-col bg-slate-900/30 overflow-y-auto">
            {selectedNavioId ? (
              <div className="flex-1 p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-blue-400" /> Detalhes do Navio
                  </h3>
                  {isAdmin && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={isDeletingNavio}
                      onClick={() => setDeleteNavioDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir Navio
                    </Button>
                  )}
                </div>

                {/* Formulário de edição */}
                <form onSubmit={handleSaveNavio} className="space-y-4">
                  <Card className="bg-slate-900/40 border-slate-800">
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <Label className="text-xs text-slate-400">Nome do Navio</Label>
                        <Input
                          value={editForm.nome_navio}
                          onChange={(e) => setEditForm(prev => ({ ...prev, nome_navio: e.target.value }))}
                          className="bg-slate-950 border-slate-700 text-white h-9 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-slate-400">Carga</Label>
                          <div className="relative">
                            <Input
                              value={editForm.carga}
                              onChange={(e) => setEditForm(prev => ({ ...prev, carga: e.target.value }))}
                              className="bg-slate-950 border-slate-700 text-white h-9 text-sm pr-10"
                              placeholder="Selecione"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-9 px-2"
                              onClick={() => setCargaDropdownOpen(!cargaDropdownOpen)}
                            >
                              <ChevronDown className={`h-4 w-4 transition-transform ${cargaDropdownOpen ? 'rotate-180' : ''}`} />
                            </Button>
                          </div>
                          {cargaDropdownOpen && (
                            <div className="absolute z-50 w-48 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
                              <div className="p-1">
                                {tiposCarga.map((tipo) => (
                                  <button
                                    key={tipo}
                                    type="button"
                                    onClick={() => {
                                      setEditForm(prev => ({ ...prev, carga: tipo }));
                                      setCargaDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${
                                      editForm.carga === tipo ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400 hover:bg-slate-700'
                                    }`}
                                  >
                                    {tipo}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs text-slate-400">Berço</Label>
                          <select
                            value={editForm.berco}
                            onChange={(e) => setEditForm(prev => ({ ...prev, berco: e.target.value }))}
                            className="w-full bg-slate-950 border border-slate-700 text-white h-9 rounded-md text-sm"
                          >
                            <option value="">Selecione...</option>
                            {['101','102','103','104','201','202','203','204'].map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-slate-400">Quantidade (T)</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={editForm.quantidade_prevista}
                            onChange={(e) => setEditForm(prev => ({ ...prev, quantidade_prevista: e.target.value }))}
                            className="bg-slate-950 border-slate-700 text-white h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-400">Total CBs</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={editForm.cbs_total}
                            onChange={(e) => setEditForm(prev => ({ ...prev, cbs_total: e.target.value }))}
                            className="bg-slate-950 border-slate-700 text-white h-9 text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-slate-400">Média CB</Label>
                          <Input
                            type="number"
                            step="0.0001"
                            value={editForm.media_cb}
                            onChange={(e) => setEditForm(prev => ({ ...prev, media_cb: e.target.value }))}
                            className="bg-slate-950 border-slate-700 text-white h-9 text-sm"
                          />
                        </div>
                        <div className="flex items-end">
                          <div className="flex items-center gap-2 h-9">
                            <Switch
                              checked={editForm.concluido}
                              onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, concluido: checked }))}
                            />
                            <Label className="text-xs text-slate-400">
                              {editForm.concluido ? 'Concluído' : 'Em andamento'}
                            </Label>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-slate-400">Início Operação</Label>
                          <Input
                            type="datetime-local"
                            value={editForm.inicio_operacao || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, inicio_operacao: e.target.value }))}
                            className="bg-slate-950 border-slate-700 text-white h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-400">Fim Operação</Label>
                          <Input
                            type="datetime-local"
                            value={editForm.final_operacao || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, final_operacao: e.target.value }))}
                            className="bg-slate-950 border-slate-700 text-white h-9 text-sm"
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        disabled={isSavingNavio}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm"
                      >
                        {isSavingNavio ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Salvar Navio
                      </Button>
                    </CardContent>
                  </Card>
                </form>

                {/* Produção Diária */}
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 pt-2">
                  <BarChart3 className="h-4 w-4 text-emerald-400" /> Produção Diária
                  <span className="text-xs text-slate-400 font-normal">Total: {totalGeralTons.toFixed(3)} T</span>
                </h3>

                <Card className="bg-slate-900/40 border-slate-800">
                  <CardContent className="p-4 space-y-3">
                    {/* Data Global */}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <Label className="text-xs text-slate-400">Data Global</Label>
                      <Input
                        type="date"
                        value={dataGlobal}
                        onChange={(e) => setDataGlobal(e.target.value)}
                        className="h-8 w-36 bg-slate-950 border-slate-700 text-white text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAplicarDataGlobal}
                        className="h-8 border-slate-700 text-slate-300 text-xs"
                      >
                        Aplicar
                      </Button>
                    </div>

                    {/* Lista de registros */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {producaoPorDia.map((registro, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-950/50 rounded p-2 border border-slate-800/50">
                          <Input
                            type="date"
                            value={registro.data}
                            onChange={(e) => handleProdChange(idx, 'data', e.target.value)}
                            className="h-8 bg-slate-950 border-slate-700 text-white text-xs w-32"
                          />
                          <div className="relative flex-1">
                            <Input
                              type="number"
                              step="0.001"
                              value={registro.total_tons === 0 ? '' : registro.total_tons}
                              onChange={(e) => handleProdChange(idx, 'total_tons', e.target.value)}
                              className="h-8 bg-slate-950 border-slate-700 text-white text-sm pr-10"
                              placeholder="0.000"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">T</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-red-400"
                            onClick={() => removeProdLinha(idx)}
                            disabled={producaoPorDia.length <= 1}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addProdLinha}
                        className="border-slate-700 text-slate-300 hover:bg-slate-800 h-8 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Nova Linha
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveProd}
                        disabled={isSavingProd}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                      >
                        {isSavingProd ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                        Salvar Produção
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 p-8">
                <div className="text-center">
                  <Ship className="h-12 w-12 mx-auto mb-3 text-slate-700" />
                  <p className="text-sm">Selecione um navio para ver detalhes</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Layout (simplificado, empilhado) */}
      <div className="lg:hidden flex flex-col min-h-screen bg-slate-950">
        <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button onClick={() => setSidebarOpen(true)} variant="ghost" size="icon" className="text-white">
              <Menu className="w-5 h-5" />
            </Button>
            <Ship className="text-purple-400 w-5 h-5" />
            <h1 className="text-lg font-bold text-white">Navios</h1>
          </div>
          <Button onClick={handleSignOut} variant="ghost" size="icon" className="text-slate-400">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm">
            <div className="flex justify-between items-center p-4 border-b border-slate-800">
              <h2 className="text-white font-bold">Menu</h2>
              <Button onClick={() => setSidebarOpen(false)} variant="ghost" size="icon" className="text-white">
                <X className="w-6 h-6" />
              </Button>
            </div>
            <div className="p-4 space-y-2">
              <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full justify-start border-slate-700 text-slate-300 h-12">
                <ArrowLeft className="mr-3 h-4 w-4" /> Dashboard
              </Button>
              <Button onClick={() => navigate('/novo-navio')} variant="outline" className="w-full justify-start border-slate-700 text-slate-300 h-12">
                <Plus className="mr-3 h-4 w-4" /> Novo Navio
              </Button>
            </div>
          </div>
        )}

        <div className="p-4 space-y-4">
          {/* Filtros mobile */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Buscar navio..."
              value={filtroNome}
              onChange={(e) => setFiltroNome(e.target.value)}
              className="pl-9 bg-slate-900 border-slate-700 text-slate-200"
            />
          </div>

          {/* Lista mobile */}
          <div className="space-y-2">
            {filteredViagens.map((viagem) => (
              <Card
                key={viagem.id}
                className={`bg-slate-900 border-slate-800 cursor-pointer ${
                  selectedNavioId === viagem.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleSelectNavio(viagem.id)}
              >
                <CardContent className="p-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-white">{viagem.nome_navio}</p>
                    <p className="text-xs text-slate-400">{viagem.carga || 'N/A'} • {viagem.berco || '-'}</p>
                  </div>
                  <Badge className={getStatusColor(viagem.concluido)}>
                    {viagem.concluido ? 'Concluído' : 'Em andamento'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detalhes mobile (abaixo da lista) */}
          {selectedNavioId && (
            <div className="space-y-4 mt-6 border-t border-slate-800 pt-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-white font-bold">Detalhes</h3>
                {isAdmin && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isDeletingNavio}
                    onClick={() => setDeleteNavioDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir Navio
                  </Button>
                )}
              </div>
              {/* Versão simplificada mobile: apenas campos essenciais e produção */}
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-4 space-y-3">
                  <div>
                    <Label className="text-xs text-slate-400">Nome</Label>
                    <Input
                      value={editForm.nome_navio}
                      onChange={(e) => setEditForm(prev => ({ ...prev, nome_navio: e.target.value }))}
                      className="bg-slate-950 border-slate-700 text-white h-9"
                    />
                  </div>
                  <Button
                    onClick={handleSaveNavio}
                    disabled={isSavingNavio}
                    className="w-full bg-blue-600 hover:bg-blue-700 h-9"
                  >
                    {isSavingNavio ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Navio'}
                  </Button>
                </CardContent>
              </Card>

              {/* Produção mobile */}
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <Input
                      type="date"
                      value={dataGlobal}
                      onChange={(e) => setDataGlobal(e.target.value)}
                      className="h-8 w-36 bg-slate-950 border-slate-700 text-white text-xs"
                    />
                    <Button variant="outline" size="sm" onClick={handleAplicarDataGlobal} className="h-8 text-xs">
                      Aplicar
                    </Button>
                  </div>
                  {producaoPorDia.map((reg, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        type="date"
                        value={reg.data}
                        onChange={(e) => handleProdChange(idx, 'data', e.target.value)}
                        className="h-8 bg-slate-950 border-slate-700 text-xs w-32"
                      />
                      <Input
                        type="number"
                        step="0.001"
                        value={reg.total_tons === 0 ? '' : reg.total_tons}
                        onChange={(e) => handleProdChange(idx, 'total_tons', e.target.value)}
                        className="h-8 bg-slate-950 border-slate-700 text-xs flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeProdLinha(idx)}
                        disabled={producaoPorDia.length <= 1}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={addProdLinha} className="h-8 text-xs">
                      <Plus className="h-3 w-3 mr-1" /> Linha
                    </Button>
                    <Button size="sm" onClick={handleSaveProd} disabled={isSavingProd} className="h-8 text-xs bg-emerald-600">
                      Salvar Prod
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        <AlertDialog open={deleteNavioDialogOpen} onOpenChange={setDeleteNavioDialogOpen}>
          <AlertDialogContent className="bg-slate-900 border-slate-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Confirmar exclusão do navio</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                A produção diária vinculada será removida pelo banco. Os relatórios de transporte permanecerão,
                mas deixarão de apontar para este navio. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={isDeletingNavio}
                className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
              >
                Cancelar
              </AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                disabled={isDeletingNavio}
                onClick={handleDeleteNavio}
              >
                {isDeletingNavio ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir Navio'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Navios;