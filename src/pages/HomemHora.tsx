import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Save,
  PlusCircle,
  Trash2,
  BarChart3,
  Target,
  Clock,
  TrendingUp,
  ChevronDown,
  Gauge,
  Zap,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Layers,
  Filter,
  Home,
  LayoutDashboard,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// ============================================
// CONSTANTES
// ============================================
const CATEGORIAS = [
  "TRUCK",
  "OPERADOR",
  "CARRETEIRO",
  "PIPA",
  "MINIPÁ",
  "MUNCK",
  "COMBOIO",
  "GUINDASTE",
];

const CORES_CATEGORIAS: Record<string, string> = {
  TRUCK: "#3b82f6",
  OPERADOR: "#10b981",
  CARRETEIRO: "#8b5cf6",
  PIPA: "#f59e0b",
  MINIPÁ: "#ef4444",
  MUNCK: "#06b6d4",
  COMBOIO: "#f97316",
  GUINDASTE: "#d946ef",
};

const PERIODOS_PADRAO = [
  { label: "DEZ/JAN", ordem: 1, mes_inicio: 12, mes_fim: 1 },
  { label: "JAN/FEV", ordem: 2, mes_inicio: 1, mes_fim: 2 },
  { label: "FEV/MAR", ordem: 3, mes_inicio: 2, mes_fim: 3 },
  { label: "MAR/ABR", ordem: 4, mes_inicio: 3, mes_fim: 4 },
  { label: "ABR/MAI", ordem: 5, mes_inicio: 4, mes_fim: 5 },
  { label: "MAI/JUN", ordem: 6, mes_inicio: 5, mes_fim: 6 },
  { label: "JUN/JUL", ordem: 7, mes_inicio: 6, mes_fim: 7 },
  { label: "JUL/AGO", ordem: 8, mes_inicio: 7, mes_fim: 8 },
  { label: "AGO/SET", ordem: 9, mes_inicio: 8, mes_fim: 9 },
  { label: "SET/OUT", ordem: 10, mes_inicio: 9, mes_fim: 10 },
  { label: "OUT/NOV", ordem: 11, mes_inicio: 10, mes_fim: 11 },
  { label: "NOV/DEZ", ordem: 12, mes_inicio: 11, mes_fim: 12 },
];

// ============================================
// INTERFACES
// ============================================
interface CategoriaData {
  disponivel: number;
  realizado: number;
  meta: number;
}

interface Periodo {
  id: string;
  ano: number;
  label: string;
  data_inicio: string;
  data_fim: string;
  categorias: { [key: string]: CategoriaData };
  ordem: number;
}

interface ChartDataPoint {
  label: string;
  disponivel: number;
  realizado: number;
  meta: number;
  eficiencia: number;
}

interface VariacaoPeriodo {
  periodo: string;
  disponivel: number;
  realizado: number;
  meta: number;
  pctMeta: number;
  varRealizado: number | null;
  varPct: number | null;
  status: "primeiro" | "aumento" | "reducao" | "estavel" | "queda_forte";
  tendencia: string;
}

// ============================================
// COMPONENTE: KPI CARD
// ============================================
const KPICard = ({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  color: "green" | "blue" | "amber" | "red" | "purple" | "teal";
  icon: React.ElementType;
}) => {
  const colorMap = {
    green: { line: "from-[#22e8aa] to-transparent", text: "text-[#22e8aa]" },
    blue: { line: "from-[#5fa4ff] to-transparent", text: "text-[#5fa4ff]" },
    amber: { line: "from-[#fdb944] to-transparent", text: "text-[#fdb944]" },
    red: { line: "from-[#ff6b84] to-transparent", text: "text-[#ff6b84]" },
    purple: { line: "from-[#b09cff] to-transparent", text: "text-[#b09cff]" },
    teal: { line: "from-[#22d4c8] to-transparent", text: "text-[#22d4c8]" },
  };

  const c = colorMap[color];

  return (
    <div className="relative bg-[#0d1017] border border-white/5 rounded-xl p-5 overflow-hidden group hover:border-white/10 transition-all duration-300">
      <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${c.line}`} />
      <div className="absolute -bottom-2 -right-2 opacity-[0.04] group-hover:opacity-[0.06] transition-opacity">
        <Icon className="h-20 w-20" />
      </div>
      <p className="text-[11px] font-medium text-[#9ba8c4] mb-3 tracking-wide uppercase">{label}</p>
      <p className={`text-[1.8rem] font-extrabold tracking-tight leading-none mb-2 ${c.text}`}>{value}</p>
      <p className="text-[11px] text-[#9ba8c4] font-medium">{sub}</p>
    </div>
  );
};

// ============================================
// COMPONENTE: BADGE
// ============================================
const Badge = ({
  variant = "default",
  children,
}: {
  variant?: "success" | "warning" | "danger" | "default" | "info";
  children: React.ReactNode;
}) => {
  const variantMap = {
    success: "bg-[#22e8aa]/15 text-[#22e8aa] border-[#22e8aa]/30",
    warning: "bg-[#fdb944]/15 text-[#fdb944] border-[#fdb944]/30",
    danger: "bg-[#ff6b84]/15 text-[#ff6b84] border-[#ff6b84]/30",
    info: "bg-[#5fa4ff]/15 text-[#5fa4ff] border-[#5fa4ff]/30",
    default: "bg-white/5 text-[#9ba8c4] border-white/10",
  };

  return (
    <span className={cn("inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold border whitespace-nowrap", variantMap[variant])}>
      {children}
    </span>
  );
};

// ============================================
// COMPONENTE: INSIGHT CARD
// ============================================
const InsightCard = ({
  variant = "success",
  title,
  body,
}: {
  variant?: "success" | "warning" | "danger";
  title: string;
  body: string;
}) => {
  const variantMap = {
    success: "border-l-[#22e8aa]",
    warning: "border-l-[#fdb944]",
    danger: "border-l-[#ff6b84]",
  };

  return (
    <div className={cn("bg-[#0d1017] border border-white/5 rounded-xl p-5 border-l-[3px]", variantMap[variant])}>
      <h4 className="text-sm font-bold text-[#edf2ff] mb-2">{title}</h4>
      <p className="text-xs text-[#9ba8c4] leading-relaxed">{body}</p>
    </div>
  );
};

// ============================================
// COMPONENTE: GRÁFICO DE LINHAS
// ============================================
const LineChartSVG = ({ data, height = 320 }: { data: ChartDataPoint[]; height?: number }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverData, setHoverData] = useState<ChartDataPoint | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 text-sm bg-[#0f131a] rounded-xl border border-dashed border-white/10">
        <BarChart3 className="h-8 w-8 mb-2 opacity-50" /> Sem dados para exibir no gráfico
      </div>
    );
  }

  const allValues = data.flatMap((d) => [d.realizado, d.meta, d.disponivel]);
  const maxVal = Math.max(...allValues, 1);
  const minVal = 0;
  const range = maxVal - minVal || 1;
  const padding = { top: 50, right: 20, bottom: 65, left: 60 };
  const availableWidth = 800;
  const chartWidth = availableWidth;
  const chartHeight = height - padding.top - padding.bottom;

  const getY = (val: number) => padding.top + chartHeight - ((val - minVal) / range) * chartHeight;
  const getX = (index: number) => padding.left + (index / (data.length - 1 || 1)) * (chartWidth - padding.left);
  const formatLabel = (val: number) => (val >= 1000 ? (val / 1000).toFixed(0) + "k" : val.toFixed(0));

  const createSmoothPath = (values: number[]) => {
    if (values.length === 0) return "";
    if (values.length === 1) {
      const x = getX(0);
      const y = getY(values[0]);
      return `M${x},${y}`;
    }
    let path = `M${getX(0)},${getY(values[0])}`;
    for (let i = 0; i < values.length - 1; i++) {
      const x1 = getX(i);
      const y1 = getY(values[i]);
      const x2 = getX(i + 1);
      const y2 = getY(values[i + 1]);
      const cp1x = x1 + (x2 - x1) * 0.4;
      const cp1y = y1;
      const cp2x = x1 + (x2 - x1) * 0.6;
      const cp2y = y2;
      path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`;
    }
    return path;
  };

  const createAreaPath = (values: number[]) => {
    const linePath = createSmoothPath(values);
    if (!linePath) return "";
    return `${linePath} L${getX(values.length - 1)},${padding.top + chartHeight} L${getX(0)},${padding.top + chartHeight} Z`;
  };

  const realizadoValues = data.map((d) => d.realizado);
  const metaValues = data.map((d) => d.meta);
  const disponivelValues = data.map((d) => d.disponivel);

  const gridLines = 5;
  const gridValues = Array.from({ length: gridLines + 1 }, (_, i) => minVal + (range * i) / gridLines);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const chartLeft = padding.left;
    const chartRight = chartWidth;

    if (mouseX < chartLeft || mouseX > chartRight) {
      setHoverIndex(null);
      setHoverData(null);
      return;
    }

    const percent = (mouseX - chartLeft) / (chartRight - chartLeft);
    const index = Math.round(percent * (data.length - 1));
    if (index >= 0 && index < data.length) {
      setHoverIndex(index);
      setHoverData(data[index]);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setHoverData(null);
  };

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${chartWidth + padding.right} ${height}`}
        className="overflow-visible font-sans"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: "crosshair" }}
      >
        <defs>
          <linearGradient id="areaRealizado" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="areaDisponivel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Grid */}
        {gridValues.map((val, i) => {
          const y = getY(val);
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={chartWidth} y2={y} stroke="#ffffff" strokeWidth="1" strokeDasharray="4 4" opacity="0.05" />
              <text x={padding.left - 12} y={y + 4} fill="#64748b" fontSize="10" textAnchor="end" fontWeight="500" className="font-mono">
                {formatLabel(val)}
              </text>
            </g>
          );
        })}

        {/* Linha e Área Disponível */}
        <path d={createAreaPath(disponivelValues)} fill="url(#areaDisponivel)" />
        <path d={createSmoothPath(disponivelValues)} fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />

        {/* Linha Meta */}
        <path d={createSmoothPath(metaValues)} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 3" opacity="0.7" />

        {/* Linha e Área Realizado */}
        <path d={createAreaPath(realizadoValues)} fill="url(#areaRealizado)" />
        <path d={createSmoothPath(realizadoValues)} fill="none" stroke="#10b981" strokeWidth="3" filter="url(#glow)" strokeLinecap="round" />

        {/* Hover */}
        {hoverIndex !== null && (
          <g>
            <line x1={getX(hoverIndex)} y1={padding.top} x2={getX(hoverIndex)} y2={padding.top + chartHeight} stroke="#ffffff" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            <circle cx={getX(hoverIndex)} cy={getY(data[hoverIndex].realizado)} r="6" fill="#10b981" stroke="#0f131a" strokeWidth="2.5" />
            <circle cx={getX(hoverIndex)} cy={getY(data[hoverIndex].meta)} r="5" fill="#f59e0b" stroke="#0f131a" strokeWidth="2" opacity="0.8" />
            <circle cx={getX(hoverIndex)} cy={getY(data[hoverIndex].disponivel)} r="5" fill="#3b82f6" stroke="#0f131a" strokeWidth="2" opacity="0.7" />
          </g>
        )}

        {/* Labels para Realizado */}
        {data.map((d, i) => (
          <text key={`rlabel-${i}`} x={getX(i)} y={getY(d.realizado) - 16} fill="#10b981" fontSize="10" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
            {d.realizado > 0 ? formatLabel(d.realizado) : ""}
          </text>
        ))}

        {/* Labels Eixo X */}
        {data.map((d, i) => (
          <text key={`xlabel-${i}`} x={getX(i)} y={height - padding.bottom + 22} fill="#94a3b8" fontSize="11" fontWeight="600" textAnchor="middle">
            {d.label}
          </text>
        ))}

        {/* Eficiência */}
        {data.map((d, i) => (
          <text key={`ef-${i}`} x={getX(i)} y={height - padding.bottom + 40} fill={d.eficiencia >= 100 ? "#10b981" : d.eficiencia >= 80 ? "#f59e0b" : "#ef4444"} fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
            {d.eficiencia.toFixed(0)}%
          </text>
        ))}
      </svg>

      {/* Tooltip */}
      {hoverData && (
        <div
          className="absolute z-10 bg-[#1e293b]/95 backdrop-blur-sm border border-white/10 rounded-lg p-3 shadow-2xl text-xs"
          style={{
            top: 20,
            left: `${Math.max(10, Math.min(90, (hoverIndex! / (data.length - 1)) * 100))}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-bold text-white mb-2 border-b border-white/10 pb-1 text-center">{hoverData.label}</div>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-emerald-400">Realizado:</span>
              <span className="font-mono font-semibold text-white">{hoverData.realizado.toLocaleString("pt-BR")}h</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-amber-400">Meta:</span>
              <span className="font-mono font-semibold text-white">{hoverData.meta.toLocaleString("pt-BR")}h</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-blue-400">Disponível:</span>
              <span className="font-mono font-semibold text-white">{hoverData.disponivel.toLocaleString("pt-BR")}h</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
const HomemHora = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [anoReferencia] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("todos");
  const [expandedPeriodos, setExpandedPeriodos] = useState<Set<string>>(new Set());

  const inicializarCategoriasVazias = (): { [key: string]: CategoriaData } => {
    const cats: Record<string, CategoriaData> = {};
    CATEGORIAS.forEach((cat) => (cats[cat] = { disponivel: 0, realizado: 0, meta: 0 }));
    return cats;
  };

  const carregarDados = async (userId: string, ano: number) => {
    setLoading(true);
    try {
      const { data: periodosData, error: periodosError } = await supabase
        .from("hh_periodos")
        .select("*")
        .eq("user_id", userId)
        .eq("ano", ano)
        .order("data_inicio", { ascending: true });

      if (periodosError) throw periodosError;

      const periodoIds = periodosData?.map((p) => p.id) || [];
      let categoriasMap: { [key: string]: any } = {};

      if (periodoIds.length > 0) {
        const { data: categoriasData } = await supabase
          .from("hh_categorias")
          .select("*")
          .in("periodo_id", periodoIds);

        categoriasData?.forEach((cat) => {
          if (!categoriasMap[cat.periodo_id]) categoriasMap[cat.periodo_id] = {};
          categoriasMap[cat.periodo_id][cat.nome] = {
            disponivel: cat.disponivel || 0,
            realizado: cat.realizado || 0,
            meta: cat.meta || 0,
          };
        });
      }

      const periodosFormatados: Periodo[] =
        periodosData?.map((p) => {
          const periodoPadrao = PERIODOS_PADRAO.find((pp) => pp.label === p.label);
          return {
            id: p.id,
            ano: p.ano,
            label: p.label,
            data_inicio: p.data_inicio,
            data_fim: p.data_fim,
            categorias: categoriasMap[p.id] || inicializarCategoriasVazias(),
            ordem: periodoPadrao?.ordem || 99,
          };
        }) || [];

      periodosFormatados.sort((a, b) => a.ordem - b.ordem);
      setPeriodos(periodosFormatados);
    } catch (error) {
      console.error("Erro ao carregar dados HH:", error);
      toast({ title: "Erro", description: "Falha ao carregar dados.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUserId = async (): Promise<string | null> => {
    if (user?.id) return user.id;
    if (userProfile?.user_id) return userProfile.user_id;

    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  };

  // Efeito Ajustado: usa o user_id real da sessão/auth, não o id do perfil
  useEffect(() => {
    let isMounted = true;

    const initFetch = async () => {
      const authUserId = user?.id ?? userProfile?.user_id ?? (await supabase.auth.getSession()).data.session?.user?.id;

      if (authUserId && isMounted) {
        await carregarDados(authUserId, anoReferencia);
        return;
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    initFetch();

    return () => {
      isMounted = false;
    };
  }, [user?.id, userProfile?.user_id, anoReferencia]);

  const criarPeriodosPadrao = async () => {
    const targetUserId = await getCurrentUserId();
    if (!targetUserId) return;

    try {
      const periodosExistentes = periodos.map((p) => p.label);
      const periodosFaltantes = PERIODOS_PADRAO.filter((p) => !periodosExistentes.includes(p.label));

      if (periodosFaltantes.length === 0) {
        toast({ title: "Info", description: "Todos os períodos já foram criados." });
        return;
      }

      for (const periodo of periodosFaltantes) {
        const ano = anoReferencia;
        let dataInicio = new Date(ano, periodo.mes_inicio - 1, 1);
        let dataFim = new Date(ano, periodo.mes_fim, 0);

        if (periodo.label === "DEZ/JAN") {
          dataInicio = new Date(ano - 1, 11, 1);
          dataFim = new Date(ano, 0, 31);
        }

        const { data, error } = await supabase
          .from("hh_periodos")
          .insert({
            user_id: targetUserId,
            ano: anoReferencia,
            label: periodo.label,
            data_inicio: dataInicio.toISOString().split("T")[0],
            data_fim: dataFim.toISOString().split("T")[0],
          })
          .select()
          .single();

        if (error) throw error;

        const categoriasInsert = CATEGORIAS.map((nome) => ({
          periodo_id: data.id,
          nome,
          disponivel: 0,
          realizado: 0,
          meta: 0,
        }));

        await supabase.from("hh_categorias").insert(categoriasInsert);
      }

      toast({ title: "Sucesso", description: `${periodosFaltantes.length} períodos criados.` });
      await carregarDados(targetUserId, anoReferencia);
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Falha ao criar períodos.", variant: "destructive" });
    }
  };

  const handleDeletePeriodo = async (id: string) => {
    if (!confirm("Excluir este período e todos os dados associados?")) return;
    try {
      await supabase.from("hh_categorias").delete().eq("periodo_id", id);
      await supabase.from("hh_periodos").delete().eq("id", id);
      setPeriodos((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Sucesso", description: "Período removido." });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir.", variant: "destructive" });
    }
  };

  const updateCategoria = (periodoId: string, catName: string, field: keyof CategoriaData, valor: number) => {
    setPeriodos((prev) =>
      prev.map((p) => {
        if (p.id !== periodoId) return p;
        return {
          ...p,
          categorias: {
            ...p.categorias,
            [catName]: { ...p.categorias[catName], [field]: valor },
          },
        };
      })
    );
  };

  const togglePeriodoExpand = (id: string) => {
    setExpandedPeriodos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveAll = async () => {
    const targetUserId = await getCurrentUserId();
    if (!targetUserId) return;

    try {
      for (const periodo of periodos) {
        for (const catName of CATEGORIAS) {
          const catData = periodo.categorias[catName];
          if (!catData) continue;

          const { data: existing } = await supabase
            .from("hh_categorias")
            .select("id")
            .eq("periodo_id", periodo.id)
            .eq("nome", catName)
            .single();

          if (existing?.id) {
            await supabase
              .from("hh_categorias")
              .update({
                disponivel: catData.disponivel,
                realizado: catData.realizado,
                meta: catData.meta,
              })
              .eq("id", existing.id);
          }
        }
      }
      toast({ title: "Salvo!", description: "Todos os dados foram salvos com sucesso." });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Falha ao salvar.", variant: "destructive" });
    }
  };

  // CÁLCULOS
  const periodosOrdenados = [...periodos].sort((a, b) => a.ordem - b.ordem);
  const periodosFiltrados = filtroPeriodo === "todos" ? periodos : periodos.filter((p) => p.id === filtroPeriodo);

  const totais = periodosFiltrados.reduce(
    (acc, p) => {
      CATEGORIAS.forEach((cat) => {
        acc.disponivel += p.categorias[cat]?.disponivel || 0;
        acc.realizado += p.categorias[cat]?.realizado || 0;
        acc.meta += p.categorias[cat]?.meta || 0;
      });
      return acc;
    },
    { disponivel: 0, realizado: 0, meta: 0 }
  );

  const eficienciaGeral = totais.meta > 0 ? (totais.realizado / totais.meta) * 100 : 0;
  const eficienciaDisponivel = totais.disponivel > 0 ? (totais.realizado / totais.disponivel) * 100 : 0;
  const projecaoAnual = periodosFiltrados.length > 0 ? (totais.realizado / periodosFiltrados.length) * 12 : 0;

  const dadosPorCategoria: ChartDataPoint[] = CATEGORIAS.map((cat) => {
    const total = periodosFiltrados.reduce(
      (acc, p) => ({
        disponivel: acc.disponivel + (p.categorias[cat]?.disponivel || 0),
        realizado: acc.realizado + (p.categorias[cat]?.realizado || 0),
        meta: acc.meta + (p.categorias[cat]?.meta || 0),
      }),
      { disponivel: 0, realizado: 0, meta: 0 }
    );
    const eficiencia = total.meta > 0 ? (total.realizado / total.meta) * 100 : 0;
    return { label: cat, ...total, eficiencia };
  }).sort((a, b) => b.realizado - a.realizado);

  const dadosGraficoPeriodos: ChartDataPoint[] = periodosOrdenados.map((p) => {
    const total = CATEGORIAS.reduce(
      (acc, cat) => ({
        disponivel: acc.disponivel + (p.categorias[cat]?.disponivel || 0),
        realizado: acc.realizado + (p.categorias[cat]?.realizado || 0),
        meta: acc.meta + (p.categorias[cat]?.meta || 0),
      }),
      { disponivel: 0, realizado: 0, meta: 0 }
    );
    const eficiencia = total.meta > 0 ? (total.realizado / total.meta) * 100 : 0;
    return { label: p.label, ...total, eficiencia };
  });

  const totalRealizado = dadosPorCategoria.reduce((s, d) => s + d.realizado, 0);

  const calcularVariacao = (): VariacaoPeriodo[] => {
    if (periodosOrdenados.length === 0) return [];
    return periodosOrdenados.map((periodo, i) => {
      const total = CATEGORIAS.reduce(
        (acc, cat) => ({
          disponivel: acc.disponivel + (periodo.categorias[cat]?.disponivel || 0),
          realizado: acc.realizado + (periodo.categorias[cat]?.realizado || 0),
          meta: acc.meta + (periodo.categorias[cat]?.meta || 0),
        }),
        { disponivel: 0, realizado: 0, meta: 0 }
      );
      const pctMeta = total.meta > 0 ? (total.realizado / total.meta) * 100 : 0;

      if (i === 0) {
        return {
          periodo: periodo.label,
          disponivel: total.disponivel,
          realizado: total.realizado,
          meta: total.meta,
          pctMeta,
          varRealizado: null,
          varPct: null,
          status: "primeiro",
          tendencia: "—",
        };
      }

      const periodoAnterior = periodosOrdenados[i - 1];
      const totalAnterior = CATEGORIAS.reduce(
        (acc, cat) => ({
          disponivel: acc.disponivel + (periodoAnterior.categorias[cat]?.disponivel || 0),
          realizado: acc.realizado + (periodoAnterior.categorias[cat]?.realizado || 0),
          meta: acc.meta + (periodoAnterior.categorias[cat]?.meta || 0),
        }),
        { disponivel: 0, realizado: 0, meta: 0 }
      );

      const varRealizado = total.realizado - totalAnterior.realizado;
      const varPct = totalAnterior.realizado > 0 ? (varRealizado / totalAnterior.realizado) * 100 : 0;

      let status: VariacaoPeriodo["status"] = "estavel";
      let tendencia = "→ Estável";

      if (varPct > 5) {
        status = "aumento";
        tendencia = "↑ Aumento";
      } else if (varPct > 0 && varPct <= 5) {
        status = "estavel";
        tendencia = "→ Estável";
      } else if (varPct < -15) {
        status = "queda_forte";
        tendencia = "↓↓ Forte Redução";
      } else if (varPct < 0 && varPct >= -15) {
        status = "reducao";
        tendencia = "↓ Redução";
      }

      return {
        periodo: periodo.label,
        disponivel: total.disponivel,
        realizado: total.realizado,
        meta: total.meta,
        pctMeta,
        varRealizado,
        varPct,
        status,
        tendencia,
      };
    });
  };

  const dadosVariacao = calcularVariacao();

  return (
    <div className="min-h-screen bg-[#07090f] text-[#edf2ff] font-sans selection:bg-[#5fa4ff]/20">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@300;400;500;600;700&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-mono { font-family: 'IBM Plex Mono', monospace; }
      `}</style>

      {/* Header */}
      <header className="bg-[#0d1017] border-b border-white/5 py-10 px-8 flex justify-between items-end relative overflow-hidden">
        <div className="absolute right-[-20px] top-[-30px] text-[15rem] font-extrabold text-[#5fa4ff]/[0.04] leading-none pointer-events-none select-none">
          HH
        </div>
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <Button onClick={() => navigate("/")} variant="ghost" size="sm" className="text-[#9ba8c4] hover:text-white hover:bg-white/5 gap-2 text-xs">
            <Home className="h-4 w-4" /><span className="hidden sm:inline">Início</span>
          </Button>
          <div className="w-px h-4 bg-white/10" />
          <Button onClick={() => navigate("/")} variant="ghost" size="sm" className="text-[#9ba8c4] hover:text-white hover:bg-white/5 gap-2 text-xs">
            <LayoutDashboard className="h-4 w-4" /><span className="hidden sm:inline">Dashboard</span>
          </Button>
        </div>
        <div className="relative z-10">
          <div className="inline-block text-[10px] tracking-[0.2em] text-[#5fa4ff] border border-[#5fa4ff]/35 px-3 py-1 rounded mb-3 font-mono uppercase">
            MÓDULO 01 / HH
          </div>
          <h1 className="text-[2.8rem] font-extrabold leading-none tracking-tight text-[#edf2ff]">
            Horas de <span className="text-[#5fa4ff]">Operação</span>
          </h1>
          <p className="mt-2 text-sm text-[#9ba8c4]">
            Disponível · Realizado · Meta &nbsp;|&nbsp; {anoReferencia} &nbsp;|&nbsp; Power BI Desktop
          </p>
        </div>
        <div className="text-right text-xs text-[#9ba8c4] font-mono relative z-10">
          <span className="font-sans text-lg font-bold text-[#edf2ff] block mb-1">
            {new Date().toLocaleString("pt-BR", { month: "short", year: "numeric" }).replace(".", " / ")}
          </span>
          Gerado em {new Date().toLocaleDateString("pt-BR")}<br />
          Fonte: HH CATEGORIAS / HH PERIODOS
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <RefreshCw className="h-8 w-8 animate-spin text-[#5fa4ff]" />
            <p className="text-[#9ba8c4] text-sm mt-4">Carregando dados...</p>
          </div>
        ) : (
          <>
            {/* Filtro de Período */}
            <div className="flex items-center gap-2 mb-6">
              <span className="text-[9px] tracking-[0.22em] uppercase text-[#6b7fa0] font-mono">Filtro de período</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="flex items-center gap-2 bg-[#0d1017] border border-white/10 rounded-xl px-5 py-3 mb-8 flex-wrap">
              <span className="text-[10px] tracking-[0.12em] text-[#9ba8c4] uppercase font-mono mr-2">
                <Filter className="h-3 w-3 inline mr-1" />Período:
              </span>
              <button
                onClick={() => setFiltroPeriodo("todos")}
                className={cn(
                  "text-xs font-semibold px-4 py-1.5 rounded-lg border transition-all",
                  filtroPeriodo === "todos" ? "bg-[#5fa4ff]/15 border-[#5fa4ff] text-[#5fa4ff]" : "border-white/10 text-[#9ba8c4] hover:border-[#5fa4ff] hover:text-[#5fa4ff]"
                )}
              >
                Todos os períodos
              </button>
              <div className="w-px h-4 bg-white/10" />
              {periodosOrdenados.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setFiltroPeriodo(p.id)}
                  className={cn(
                    "text-xs font-semibold px-4 py-1.5 rounded-lg border transition-all",
                    filtroPeriodo === p.id ? "bg-[#5fa4ff]/15 border-[#5fa4ff] text-[#5fa4ff]" : "border-white/10 text-[#9ba8c4] hover:border-[#5fa4ff] hover:text-[#5fa4ff]"
                  )}
                >
                  {p.label}
                </button>
              ))}
              <span className="ml-auto text-[10px] text-[#5fa4ff] font-mono">
                Exibindo: {filtroPeriodo === "todos" ? `${periodos.length} períodos` : periodos.find((p) => p.id === filtroPeriodo)?.label}
              </span>
            </div>

            {/* KPIs */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[9px] tracking-[0.22em] uppercase text-[#6b7fa0] font-mono">
                Indicadores{filtroPeriodo !== "todos" ? " · Período selecionado" : ""}
              </span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="grid grid-cols-6 gap-[1px] bg-white/5 border border-white/5 rounded-xl overflow-hidden mb-10">
              <KPICard label="Disponível" value={totais.disponivel.toLocaleString("pt-BR")} sub={filtroPeriodo === "todos" ? `acumulado ${periodos.length} períodos` : "período selecionado"} color="blue" icon={Clock} />
              <KPICard label="Realizado" value={totais.realizado.toLocaleString("pt-BR")} sub="horas realizadas" color="green" icon={TrendingUp} />
              <KPICard label="Meta" value={totais.meta.toLocaleString("pt-BR")} sub="horas planejadas" color="amber" icon={Target} />
              <KPICard label="% Realiz. vs Meta" value={`${eficienciaGeral.toFixed(1)}%`} sub={eficienciaGeral >= 100 ? "acima da meta" : "abaixo da meta"} color={eficienciaGeral >= 100 ? "green" : "red"} icon={Gauge} />
              <KPICard label="Efic. Operacional" value={`${eficienciaDisponivel.toFixed(1)}%`} sub="realizado / disponível" color="teal" icon={Zap} />
              <KPICard label="Projeção anual" value={filtroPeriodo === "todos" ? projecaoAnual.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) : "—"} sub={filtroPeriodo === "todos" ? "estimado 2026" : "período único"} color="purple" icon={BarChart3} />
            </div>

            {/* GRÁFICO DE LINHAS */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[9px] tracking-[0.22em] uppercase text-[#6b7fa0] font-mono">Acompanhamento por período</span>
              <Badge variant="info">Todos os períodos</Badge>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="bg-[#0f131a] border border-white/5 rounded-xl p-6 mb-8">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-sm font-bold text-white">Evolução Temporal</h3>
                  <p className="text-xs text-slate-400 mt-1">Análise comparativa de Realizado vs Meta vs Capacidade</p>
                </div>
                <div className="flex gap-4 text-[11px] text-[#9ba8c4]">
                  <span><span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: "#10b981" }} />Realizado</span>
                  <span><span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: "#f59e0b" }} />Meta</span>
                  <span><span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: "#3b82f6" }} />Disponível</span>
                </div>
              </div>
              <LineChartSVG data={dadosGraficoPeriodos} height={340} />
            </div>

            {/* Performance por Categoria */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[9px] tracking-[0.22em] uppercase text-[#6b7fa0] font-mono">
                Performance por categoria{filtroPeriodo !== "todos" ? " · Período selecionado" : " · Acumulado"}
              </span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-[#0d1017] border border-white/5 rounded-xl p-6">
                <h3 className="text-sm font-bold text-[#edf2ff] mb-5">
                  Realizado por categoria — {filtroPeriodo === "todos" ? `acumulado ${periodos.length} períodos` : periodos.find((p) => p.id === filtroPeriodo)?.label}
                </h3>
                {dadosPorCategoria.length > 0 ? (
                  <div className="space-y-4">
                    {dadosPorCategoria.map((cat, i) => (
                      <div key={cat.label} className="flex items-center gap-3">
                        <span className="text-[10px] text-[#9ba8c4] font-mono w-4">{i + 1}</span>
                        <span className="text-xs font-bold text-[#edf2ff] w-24 font-mono" style={{ color: CORES_CATEGORIAS[cat.label] }}>
                          {cat.label}
                        </span>
                        <div className="flex-1 bg-white/5 rounded h-6 relative overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 rounded opacity-80 transition-all duration-500"
                            style={{
                              width: `${Math.min(100, (cat.realizado / (dadosPorCategoria[0]?.realizado || 1)) * 100)}%`,
                              background: CORES_CATEGORIAS[cat.label],
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono font-semibold text-[#edf2ff] w-16 text-right">
                          {cat.realizado >= 1000 ? `${(cat.realizado / 1000).toFixed(0)}k` : cat.realizado.toFixed(0)}
                        </span>
                        <span
                          className="text-[10px] font-bold w-12 text-right"
                          style={{ color: cat.eficiencia >= 100 ? "#22e8aa" : cat.eficiencia >= 80 ? "#fdb944" : "#ff6b84" }}
                        >
                          {cat.eficiencia.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#9ba8c4] text-sm">Sem dados para o período selecionado</div>
                )}
              </div>

              <div className="bg-[#0d1017] border border-white/5 rounded-xl p-6">
                <h3 className="text-sm font-bold text-[#edf2ff] mb-5 flex justify-between items-center">
                  % Realizado vs Meta por categoria
                  <div className="flex gap-3 text-[11px] text-[#9ba8c4]">
                    <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: "#22e8aa" }} />≥100%</span>
                    <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: "#5fa4ff" }} />≥80%</span>
                    <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: "#ff6b84" }} />&lt;80%</span>
                  </div>
                </h3>
                {dadosPorCategoria.length > 0 ? (
                  <div className="space-y-4">
                    {dadosPorCategoria.map((cat, i) => {
                      const barColor = cat.eficiencia >= 100 ? "#22e8aa" : cat.eficiencia >= 80 ? "#5fa4ff" : "#ff6b84";
                      return (
                        <div key={cat.label} className="flex items-center gap-3">
                          <span className="text-[10px] text-[#9ba8c4] font-mono w-4">{i + 1}</span>
                          <span className="text-xs font-bold text-[#edf2ff] w-24 font-mono">{cat.label}</span>
                          <div className="flex-1 bg-white/5 rounded h-6 relative overflow-hidden">
                            <div
                              className="absolute inset-y-0 left-0 rounded transition-all duration-500"
                              style={{ width: `${Math.min(100, cat.eficiencia / 2)}%`, background: barColor, opacity: 0.8 }}
                            />
                          </div>
                          <span className="text-xs font-mono font-bold w-14 text-right" style={{ color: barColor }}>
                            {cat.eficiencia.toFixed(0)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#9ba8c4] text-sm">Sem dados para o período selecionado</div>
                )}
              </div>
            </div>

            {/* TABELA DE VARIAÇÃO */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[9px] tracking-[0.22em] uppercase text-[#6b7fa0] font-mono">Variação período a período</span>
              <Badge variant="info">Todos os períodos</Badge>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="bg-[#0d1017] border border-white/5 rounded-xl overflow-hidden mb-8">
              {dadosVariacao.length > 1 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#9ba8c4] px-4 py-3">Período</th>
                        <th className="text-center text-[10px] font-semibold uppercase tracking-wider text-[#9ba8c4] px-4 py-3">Disponível</th>
                        <th className="text-center text-[10px] font-semibold uppercase tracking-wider text-[#9ba8c4] px-4 py-3">Realizado</th>
                        <th className="text-center text-[10px] font-semibold uppercase tracking-wider text-[#9ba8c4] px-4 py-3">Meta</th>
                        <th className="text-center text-[10px] font-semibold uppercase tracking-wider text-[#9ba8c4] px-4 py-3">% vs Meta</th>
                        <th className="text-center text-[10px] font-semibold uppercase tracking-wider text-[#9ba8c4] px-4 py-3">Var. Realizado</th>
                        <th className="text-center text-[10px] font-semibold uppercase tracking-wider text-[#9ba8c4] px-4 py-3">% Var.</th>
                        <th className="text-center text-[10px] font-semibold uppercase tracking-wider text-[#9ba8c4] px-4 py-3">Tendência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dadosVariacao.map((variacao, i) => {
                        const pctMetaColor = variacao.pctMeta >= 100 ? "#22e8aa" : "#ff6b84";
                        return (
                          <tr key={i} className="border-b border-white/5 hover:bg-[#5fa4ff]/[0.02] transition-colors">
                            <td className="px-4 py-3 text-sm font-semibold text-[#edf2ff] whitespace-nowrap">{variacao.periodo}</td>
                            <td className="px-4 py-3 font-mono text-xs text-[#edf2ff] text-center">{variacao.disponivel.toLocaleString("pt-BR")}</td>
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-center whitespace-nowrap text-[#edf2ff]">
                              {variacao.realizado.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-[#edf2ff] text-center">{variacao.meta.toLocaleString("pt-BR")}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-mono text-xs font-bold" style={{ color: pctMetaColor }}>
                                {variacao.pctMeta.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {variacao.varRealizado === null ? (
                                <span className="text-[#9ba8c4] text-xs">—</span>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  {variacao.varRealizado > 0 ? (
                                    <ArrowUpRight className="h-3 w-3 text-[#22e8aa]" />
                                  ) : variacao.varRealizado < 0 ? (
                                    <ArrowDownRight className="h-3 w-3 text-[#ff6b84]" />
                                  ) : (
                                    <Minus className="h-3 w-3 text-[#9ba8c4]" />
                                  )}
                                  <span
                                    className="font-mono text-xs font-semibold"
                                    style={{ color: variacao.varRealizado > 0 ? "#22e8aa" : variacao.varRealizado < 0 ? "#ff6b84" : "#9ba8c4" }}
                                  >
                                    {variacao.varRealizado >= 0 ? "+" : ""}
                                    {variacao.varRealizado.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} h
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {variacao.varPct === null ? (
                                <Badge variant="default">1º período</Badge>
                              ) : variacao.varPct > 0 ? (
                                <Badge variant="success">+{variacao.varPct.toFixed(1)}%</Badge>
                              ) : variacao.varPct < 0 ? (
                                <Badge variant="danger">{variacao.varPct.toFixed(1)}%</Badge>
                              ) : (
                                <Badge variant="default">0,0%</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className="text-xs font-semibold whitespace-nowrap"
                                style={{
                                  color:
                                    variacao.status === "primeiro"
                                      ? "#9ba8c4"
                                      : variacao.status === "aumento"
                                      ? "#22e8aa"
                                      : variacao.status === "estavel"
                                      ? "#fdb944"
                                      : "#ff6b84",
                                }}
                              >
                                {variacao.tendencia}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-[#9ba8c4] text-sm">
                  <Layers className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  São necessários pelo menos 2 períodos com dados para calcular a variação.
                </div>
              )}
            </div>

            {/* Ranking */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[9px] tracking-[0.22em] uppercase text-[#6b7fa0] font-mono">
                Ranking completo por categoria{filtroPeriodo !== "todos" ? " · Período selecionado" : ""}
              </span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="bg-[#0d1017] border border-white/5 rounded-xl overflow-hidden mb-8">
              {dadosPorCategoria.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#9ba8c4] px-4 py-3">#</th>
                        <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#9ba8c4] px-4 py-3">Categoria</th>
                        <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#9ba8c4] px-4 py-3">Disponível</th>
                        <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#9ba8c4] px-4 py-3">Realizado</th>
                        <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#9ba8c4] px-4 py-3">Meta</th>
                        <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#9ba8c4] px-4 py-3">% vs Meta</th>
                        <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#9ba8c4] px-4 py-3">% vs Disp.</th>
                        <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#9ba8c4] px-4 py-3">Participação</th>
                        <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#9ba8c4] px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dadosPorCategoria.map((cat, i) => {
                        const pctDisp = cat.disponivel > 0 ? (cat.realizado / cat.disponivel) * 100 : 0;
                        const pctTotal = totalRealizado > 0 ? (cat.realizado / totalRealizado) * 100 : 0;
                        const barWidth = dadosPorCategoria[0]?.realizado > 0 ? (cat.realizado / dadosPorCategoria[0].realizado) * 80 : 0;
                        const pctMetaColor = cat.eficiencia >= 100 ? "#22e8aa" : cat.eficiencia >= 80 ? "#5fa4ff" : "#ff6b84";

                        return (
                          <tr key={cat.label} className="border-b border-white/5 hover:bg-[#5fa4ff]/[0.02] transition-colors">
                            <td className="px-4 py-3 font-mono text-xs text-[#9ba8c4]">{i + 1}</td>
                            <td className="px-4 py-3 font-mono text-sm font-semibold whitespace-nowrap" style={{ color: CORES_CATEGORIAS[cat.label] }}>
                              {cat.label}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-[#edf2ff]">{cat.disponivel.toLocaleString("pt-BR")}</td>
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-[#edf2ff]">{cat.realizado.toLocaleString("pt-BR")}</td>
                            <td className="px-4 py-3 font-mono text-xs text-[#edf2ff]">{cat.meta.toLocaleString("pt-BR")}</td>
                            <td className="px-4 py-3 font-mono text-xs font-bold" style={{ color: pctMetaColor }}>
                              {cat.eficiencia.toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-[#edf2ff]">{pctDisp.toFixed(1)}%</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${barWidth}px`, background: CORES_CATEGORIAS[cat.label] }} />
                                </div>
                                <span className="font-mono text-[11px] text-[#9ba8c4]">{pctTotal.toFixed(1)}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {cat.eficiencia >= 100 ? (
                                <Badge variant="success">Acima</Badge>
                              ) : cat.eficiencia >= 80 ? (
                                <Badge variant="warning">Próximo</Badge>
                              ) : (
                                <Badge variant="danger">Abaixo</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-[#9ba8c4] text-sm">Sem dados para exibir no ranking</div>
              )}
            </div>

            {/* Insights */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[9px] tracking-[0.22em] uppercase text-[#6b7fa0] font-mono">Insights estratégicos</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <InsightCard
                variant="success"
                title="TRUCK e OPERADOR sustentam a operação"
                body={`TRUCK: ${dadosPorCategoria.find((d) => d.label === "TRUCK")?.realizado.toLocaleString("pt-BR") || 0} h realizadas (${
                  totalRealizado > 0 ? (((dadosPorCategoria.find((d) => d.label === "TRUCK")?.realizado || 0) / totalRealizado) * 100).toFixed(0) : 0
                }% do total). OPERADOR: ${dadosPorCategoria.find((d) => d.label === "OPERADOR")?.realizado.toLocaleString("pt-BR") || 0} h. Juntos representam ${
                  totalRealizado > 0
                    ? (
                        (((dadosPorCategoria.find((d) => d.label === "TRUCK")?.realizado || 0) +
                          (dadosPorCategoria.find((d) => d.label === "OPERADOR")?.realizado || 0)) /
                          totalRealizado) *
                        100
                      ).toFixed(0)
                    : 0
                }% do volume total.`}
              />
              <InsightCard
                variant="warning"
                title={periodosOrdenados.length >= 3 ? `${periodosOrdenados[2]?.label}: requer atenção` : "Monitore a tendência"}
                body={
                  periodosOrdenados.length >= 3
                    ? `${periodosOrdenados[2].label}: ${dadosGraficoPeriodos[2]?.realizado.toLocaleString("pt-BR")} h realizadas vs ${dadosGraficoPeriodos[2]?.meta.toLocaleString(
                        "pt-BR"
                      )} h de meta (${dadosGraficoPeriodos[2]?.eficiencia.toFixed(1)}%). Variação de ${
                        dadosVariacao[2]?.varRealizado?.toLocaleString("pt-BR") || 0
                      } h em relação ao período anterior.`
                    : "Acumule pelo menos 3 períodos para análise de tendência."
                }
              />
              <InsightCard
                variant="danger"
                title="MINIPÁ e MUNCK muito abaixo da meta"
                body={`MINIPÁ: ${dadosPorCategoria.find((d) => d.label === "MINIPÁ")?.realizado.toLocaleString("pt-BR") || 0} h vs ${
                  dadosPorCategoria.find((d) => d.label === "MINIPÁ")?.meta.toLocaleString("pt-BR") || 0
                } h meta (${dadosPorCategoria.find((d) => d.label === "MINIPÁ")?.eficiencia.toFixed(1) || 0}%). MUNCK: ${
                  dadosPorCategoria.find((d) => d.label === "MUNCK")?.realizado.toLocaleString("pt-BR") || 0
                } h vs ${dadosPorCategoria.find((d) => d.label === "MUNCK")?.meta.toLocaleString("pt-BR") || 0} h (${
                  dadosPorCategoria.find((d) => d.label === "MUNCK")?.eficiencia.toFixed(1) || 0
                }%). Revisar metas ou plano de utilização.`}
              />
            </div>

            {/* GESTÃO DE DADOS */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[9px] tracking-[0.22em] uppercase text-[#6b7fa0] font-mono">Gestão de dados</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-[#edf2ff] uppercase tracking-wider">Períodos e Categorias</h3>
                <div className="flex gap-2">
                  <Button onClick={criarPeriodosPadrao} variant="outline" size="sm" className="border-white/10 text-[#9ba8c4] hover:bg-white/5 h-8 text-xs">
                    <PlusCircle className="h-3 w-3 mr-2" /> Criar Períodos
                  </Button>
                  <Button onClick={handleSaveAll} size="sm" className="bg-[#3b82f6] hover:bg-blue-500 text-white h-8 text-xs font-semibold shadow-lg shadow-blue-900/20">
                    <Save className="h-3 w-3 mr-2" /> Salvar Tudo
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {periodosOrdenados.map((periodo) => {
                  const totalPeriodo = CATEGORIAS.reduce(
                    (acc, cat) => ({
                      disponivel: acc.disponivel + (periodo.categorias[cat]?.disponivel || 0),
                      realizado: acc.realizado + (periodo.categorias[cat]?.realizado || 0),
                      meta: acc.meta + (periodo.categorias[cat]?.meta || 0),
                    }),
                    { disponivel: 0, realizado: 0, meta: 0 }
                  );
                  const eficiencia = totalPeriodo.meta > 0 ? (totalPeriodo.realizado / totalPeriodo.meta) * 100 : 0;
                  const isExpanded = expandedPeriodos.has(periodo.id);

                  return (
                    <div key={periodo.id} className="bg-[#0f131a] border border-white/5 rounded-lg overflow-hidden transition-all">
                      <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => togglePeriodoExpand(periodo.id)}>
                        <div className="flex items-center gap-4">
                          <ChevronDown className={cn("h-4 w-4 text-slate-500 transition-transform duration-200", isExpanded && "rotate-180")} />
                          <div>
                            <span className="font-bold text-[#edf2ff] text-sm">{periodo.label}</span>
                            <span className="text-xs text-slate-500 ml-2 hidden sm:inline">{periodo.data_inicio}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="hidden md:block text-right w-20">
                            <div className="text-[10px] text-slate-500 uppercase font-bold">Realizado</div>
                            <div className="text-sm font-mono font-semibold text-emerald-400">{totalPeriodo.realizado.toFixed(0)}h</div>
                          </div>
                          <div
                            className={cn(
                              "px-2.5 py-1 rounded text-xs font-bold font-mono min-w-[60px] text-center border",
                              eficiencia >= 100
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : eficiencia >= 80
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            )}
                          >
                            {eficiencia.toFixed(0)}%
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePeriodo(periodo.id);
                            }}
                            className="text-slate-500 hover:text-red-400 hover:bg-red-500/5 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-white/5 p-6 bg-[#0B1120]/50">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {CATEGORIAS.map((cat) => {
                              const catData = periodo.categorias[cat] || { disponivel: 0, realizado: 0, meta: 0 };
                              return (
                                <div key={cat} className="space-y-3">
                                  <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                                    <div className="w-2 h-2 rounded-full" style={{ background: CORES_CATEGORIAS[cat] }} />
                                    <span className="text-xs font-bold text-[#edf2ff]">{cat}</span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <Label className="text-[9px] text-slate-500 uppercase">Disp</Label>
                                      <Input
                                        type="number"
                                        value={catData.disponivel || ""}
                                        onChange={(e) => updateCategoria(periodo.id, cat, "disponivel", Number(e.target.value))}
                                        className="h-7 text-xs mt-1 bg-[#0f131a] border-white/10 focus:border-blue-500 text-[#edf2ff]"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-[9px] text-slate-500 uppercase">Real</Label>
                                      <Input
                                        type="number"
                                        value={catData.realizado || ""}
                                        onChange={(e) => updateCategoria(periodo.id, cat, "realizado", Number(e.target.value))}
                                        className="h-7 text-xs mt-1 bg-[#0f131a] border-white/10 focus:border-emerald-500 text-[#10b981]"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-[9px] text-slate-500 uppercase">Meta</Label>
                                      <Input
                                        type="number"
                                        value={catData.meta || ""}
                                        onChange={(e) => updateCategoria(periodo.id, cat, "meta", Number(e.target.value))}
                                        className="h-7 text-xs mt-1 bg-[#0f131a] border-white/10 focus:border-amber-500 text-[#f59e0b]"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-8 py-6 flex justify-between text-[10px] text-[#6b7fa0] font-mono">
        <span>Relatório · Módulo HH · Horas de Operação {anoReferencia}</span>
        <span>Gerado em {new Date().toLocaleDateString("pt-BR")} · Power BI Desktop · Fonte: HH CATEGORIAS / HH PERIODOS</span>
      </footer>
    </div>
  );
};

export default HomemHora;
