import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import {
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Users,
    Building2,
    Calendar,
    Box as BoxIcon
} from "lucide-react";
import ApontamentosPorSemanaChart from "@/components/charts/ApontamentosPorSemanaChart";
import ApontamentosPorDisciplinaChart from "@/components/charts/ApontamentosPorDisciplinaChart";
import TopImpactedRooms from "@/components/dashboard/TopImpactedRooms";
import IfcViewer from "@/components/ifc/IfcViewer";

interface PresentationTabProps {
    edificacao: string | null;
    activeModelUrl?: string;
}

export default function PresentationTab({ edificacao, activeModelUrl }: PresentationTabProps) {
    const { data: globalKpis } = trpc.dashboard.getKPIs.useQuery();
    const { data: filteredKpis } = trpc.dashboard.getKPIsPorEdificacao.useQuery(
        { edificacao: edificacao || "" },
        { enabled: !!edificacao }
    );

    const { data: chartSemana = [] } = trpc.dashboard.getApontamentosPorSemana.useQuery(
        { edificacao: edificacao || undefined }
    );
    const { data: chartDisciplina = [] } = trpc.dashboard.getApontamentosPorDisciplina.useQuery(
        { edificacao: edificacao || undefined }
    );
    const { data: topSalas = [] } = trpc.dashboard.getTopSalasImpactadas.useQuery(
        { edificacao: edificacao || undefined }
    );

    const kpis: any = edificacao && filteredKpis ? filteredKpis : globalKpis;

    return (
        <div className="bg-white p-12 rounded-none shadow-none min-h-[900px] flex flex-col gap-8 border border-slate-100 overflow-hidden" id="presentation-slide">
            {/* Header / Branding */}
            <div className="flex justify-between items-start border-b-4 border-primary/20 pb-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                        BIM – Realidade Aumentada
                    </h1>
                    <div className="flex items-center gap-2 mt-2 text-slate-500 font-medium">
                        <Building2 className="w-5 h-5 text-primary" />
                        <span className="text-lg uppercase tracking-widest">{edificacao || 'GERAL - TODAS AS EDIFICAÇÕES'}</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="flex gap-1 items-end justify-end mb-1">
                        <div className="w-3 h-3 bg-red-600"></div>
                        <div className="w-3 h-6 bg-red-700"></div>
                        <div className="w-3 h-9 bg-red-900"></div>
                    </div>
                    <div className="font-black text-2xl tracking-tighter text-slate-900">STECLA</div>
                    <div className="text-[10px] font-bold text-slate-500 tracking-[0.2em] -mt-1 uppercase">Engenharia</div>
                </div>
            </div>

            {/* Top Row: Main KPIs */}
            <div className="grid grid-cols-3 gap-6">
                <Card className="bg-slate-50 border-none shadow-sm rounded-2xl p-6 border-l-4 border-slate-300">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total de Salas</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black text-slate-900">{kpis?.totalSalas || 0}</span>
                        <span className="text-slate-400 font-medium">{edificacao || 'Geral'}</span>
                    </div>
                </Card>

                <Card className="bg-emerald-50/50 border-none shadow-sm rounded-2xl p-6 border-l-4 border-emerald-500">
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1 font-black">Salas Verificadas</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black text-slate-900">{kpis?.salasVerificadas || 0}</span>
                        <span className="text-emerald-600 font-bold bg-emerald-100 px-2 py-0.5 rounded text-sm">
                            {kpis?.taxaVerificacao?.toFixed(1) || 0}%
                        </span>
                    </div>
                </Card>

                <Card className="bg-rose-50/50 border-none shadow-sm rounded-2xl p-6 border-l-4 border-rose-500">
                    <p className="text-xs font-bold text-rose-700 uppercase tracking-widest mb-1 font-black">Total de Apontamentos</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black text-slate-900">{kpis?.totalApontamentos || 0}</span>
                        <span className="text-rose-600 font-medium">{kpis?.mediaApontamentos?.toFixed(1) || 0} p/ sala</span>
                    </div>
                </Card>
            </div>

            {/* Middle Section: 3D View and Trends */}
            <div className="grid grid-cols-12 gap-6 flex-1">
                {/* 3D Visualization - Main Attraction */}
                <div className="col-span-8 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <BoxIcon className="w-5 h-5 text-primary" />
                            Status Visual As Built (3D)
                        </h2>
                    </div>
                    <div className="flex-1 min-h-[450px] rounded-2xl border-2 border-slate-100 overflow-hidden shadow-inner bg-slate-50">
                        <IfcViewer modelUrl={activeModelUrl} />
                    </div>
                </div>

                {/* Right Column: Trend and Disclipine */}
                <div className="col-span-4 flex flex-col gap-6">
                    <Card className="flex-1 bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden p-6">
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            Apontamentos por Semana
                        </h2>
                        <div className="h-[250px]">
                            <ApontamentosPorSemanaChart data={chartSemana} hideTitle />
                        </div>
                    </Card>

                    <Card className="flex-1 bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden p-6">
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            Apontamentos por Disciplina
                        </h2>
                        <div className="h-[250px]">
                            <ApontamentosPorDisciplinaChart data={chartDisciplina} hideTitle />
                        </div>
                    </Card>
                </div>
            </div>

            {/* Bottom Row: Top Impacted Rooms */}
            <div className="grid grid-cols-1 gap-6">
                <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6">
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-primary" />
                        Salas com mais Apontamentos
                    </h2>
                    <TopImpactedRooms data={topSalas} hideTitle />
                </Card>
            </div>

            {/* Footer / Meta info */}
            <div className="mt-auto pt-6 border-t border-slate-100 flex justify-between items-center text-slate-400">
                <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-widest">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Verificada</span>
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-amber-500" /> Em Revisão</span>
                    <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-500" /> Crítico</span>
                </div>
                <div className="text-xs font-medium">
                    Relatório gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </div>
    );
}
