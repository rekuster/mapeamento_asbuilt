import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
    Loader2,
    LayoutDashboard,
    Database,
    FileText,
    Box,
    FileBox,
    Trash2,
    FileSpreadsheet,
    Info
} from "lucide-react";
import { toast } from "sonner";

// Components
import KPICard from "@/components/dashboard/KPICard";
import EdificacaoSelector from "@/components/dashboard/EdificacaoSelector";
import ApontamentosPorSalaChart from "@/components/charts/ApontamentosPorSalaChart";
import ApontamentosPorSemanaChart from "@/components/charts/ApontamentosPorSemanaChart";
import ApontamentosPorDisciplinaChart from "@/components/charts/ApontamentosPorDisciplinaChart";
import StatusPieChart from "@/components/charts/StatusPieChart";
import TopImpactedRooms from "@/components/dashboard/TopImpactedRooms";
import ApontamentosTable from "@/components/dashboard/ApontamentosTable";
import ExcelUploadSection from "@/components/dashboard/ExcelUploadSection";
import DataIntegrityAlert from "@/components/dashboard/DataIntegrityAlert";
import IfcViewer from "@/components/ifc/IfcViewer";
import IfcUploader from "@/components/ifc/IfcUploader";
import PresentationTab from "@/components/dashboard/PresentationTab";
import EntregasTab from "@/components/dashboard/EntregasTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Dashboard() {
    const [selectedEdificacao, setSelectedEdificacao] = useState<string | null>(null);
    const [activeModelUrl, setActiveModelUrl] = useState<string | undefined>();

    const downloadBase64 = (base64: string, fileName: string, contentType: string) => {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: contentType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Data fetching
    const { data: globalKpis, isLoading: kpisLoading } = trpc.dashboard.getKPIs.useQuery();
    const { data: filteredKpis } = trpc.dashboard.getKPIsPorEdificacao.useQuery(
        { edificacao: selectedEdificacao || "" },
        { enabled: !!selectedEdificacao }
    );

    const { data: apontamentos = [], isLoading: tableLoading } = trpc.dashboard.getApontamentos.useQuery();
    const { data: chartSala = [] } = trpc.dashboard.getApontamentosPorSala.useQuery();
    const { data: chartSemana = [] } = trpc.dashboard.getApontamentosPorSemana.useQuery();
    const { data: chartDisciplina = [] } = trpc.dashboard.getApontamentosPorDisciplina.useQuery(
        { edificacao: selectedEdificacao || undefined }
    );
    const { data: chartStatus = [] } = trpc.dashboard.getStatsStatus.useQuery(
        { edificacao: selectedEdificacao || undefined }
    );
    const { data: topSalas = [] } = trpc.dashboard.getTopSalasImpactadas.useQuery(
        { edificacao: selectedEdificacao || undefined }
    );

    const { data: ifcFiles = [] } = trpc.ifc.getAllFiles.useQuery();
    const utils = trpc.useUtils();

    const deleteIfcMutation = trpc.ifc.deleteFile.useMutation({
        onSuccess: () => {
            utils.ifc.getAllFiles.invalidate();
            if (activeModelUrl) {
                // If we deleted the active model, clear it
                const remaining = ifcFiles.filter((f: any) => f.filePath !== activeModelUrl);
                if (!remaining.find((f: any) => f.filePath === activeModelUrl)) {
                    setActiveModelUrl(undefined);
                }
            }
        }
    });

    const kpis: any = selectedEdificacao && filteredKpis ? filteredKpis : globalKpis;
    const isLoading = kpisLoading || tableLoading;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <Loader2 className="animate-spin w-10 h-10 text-primary" />
                <p className="text-muted-foreground animate-pulse">Carregando dados do dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50">
            <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-primary rounded-lg">
                                <LayoutDashboard className="w-6 h-6 text-primary-foreground" />
                            </div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                                Dashboard As Built
                            </h1>
                        </div>
                        <p className="text-slate-500 max-w-2xl">
                            Monitoramento em tempo real de verificações em campo e apontamentos de obra para a Neodent.
                        </p>
                    </div>

                    <div className="flex flex-col md:items-end gap-2">
                        <EdificacaoSelector
                            selectedEdificacao={selectedEdificacao}
                            onSelect={setSelectedEdificacao}
                        />
                    </div>
                </div>

                {/* Alerts Section */}
                <DataIntegrityAlert />

                {/* Dashboard Tabs */}
                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="bg-white border p-1 h-12 shadow-sm">
                        <TabsTrigger value="overview" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            Visão Geral
                        </TabsTrigger>
                        <TabsTrigger value="3d" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <Box className="w-4 h-4 mr-2" />
                            Visualização 3D
                        </TabsTrigger>
                        <TabsTrigger value="data" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <Database className="w-4 h-4 mr-2" />
                            Tabelas e Dados
                        </TabsTrigger>
                        <TabsTrigger value="entregas" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <FileText className="w-4 h-4 mr-2" />
                            Entregas As-Built
                        </TabsTrigger>
                        <TabsTrigger value="management" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <FileText className="w-4 h-4 mr-2" />
                            Gestão e Upload
                        </TabsTrigger>
                        <TabsTrigger value="presentation" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            Apresentação
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-8 animate-in fade-in duration-500">
                        {/* KPIs Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <KPICard
                                title="Salas Mapeadas"
                                value={kpis?.totalSalas || 0}
                                subtitle="Total de salas registradas"
                            />
                            <KPICard
                                title="Liberado para Obra"
                                value={`${kpis?.taxaLiberacao?.toFixed(1) || 0}%`}
                                subtitle={`${kpis?.salasLiberadas || 0} salas liberadas`}
                            />
                            <KPICard
                                title="Taxa de Verificação"
                                value={`${kpis?.taxaVerificacao?.toFixed(1) || 0}%`}
                                subtitle={`${kpis?.salasVerificadas || 0} salas verificadas`}
                            />
                            <KPICard
                                title="Total Apontamentos"
                                value={kpis?.totalApontamentos || 0}
                                subtitle={`${kpis?.mediaApontamentos?.toFixed(1) || 0} média por sala`}
                            />
                        </div>

                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            <div className="xl:col-span-2">
                                <ApontamentosPorSemanaChart data={chartSemana} />
                            </div>
                            <div className="xl:col-span-1">
                                <StatusPieChart data={chartStatus} />
                            </div>
                            <div className="xl:col-span-2">
                                <TopImpactedRooms data={topSalas} />
                            </div>
                            <div className="xl:col-span-1">
                                <ApontamentosPorDisciplinaChart data={chartDisciplina} />
                            </div>
                            <div className="lg:col-span-2 xl:col-span-3">
                                <ApontamentosPorSalaChart data={chartSala} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="3d" className="space-y-6 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                            {/* Sidebar: Model Selection */}
                            <div className="xl:col-span-1 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
                                            Modelos Disponíveis
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-2">
                                        <div className="space-y-1">
                                            {ifcFiles.length > 0 ? (
                                                ifcFiles.map((file: any) => (
                                                    <div key={file.id} className="group relative">
                                                        <Button
                                                            variant={activeModelUrl === file.filePath ? "default" : "ghost"}
                                                            className="w-full justify-start text-left h-auto py-3 px-4 pr-10"
                                                            onClick={() => setActiveModelUrl(file.filePath)}
                                                        >
                                                            <FileBox className="w-4 h-4 mr-3 shrink-0" />
                                                            <div className="flex flex-col overflow-hidden">
                                                                <span className="truncate text-sm font-medium">{file.fileName}</span>
                                                                <span className="text-[10px] opacity-70 italic">{file.edificacao || 'Sem edificação'}</span>
                                                            </div>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm(`Deseja realmente excluir o arquivo ${file.fileName}?`)) {
                                                                    deleteIfcMutation.mutate({ fileId: file.id });
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-8 text-center text-slate-400 text-sm italic">
                                                    Nenhum arquivo IFC carregado.
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                                    <h4 className="text-xs font-bold text-primary uppercase mb-2">Dica de Navegação</h4>
                                    <ul className="text-[11px] text-slate-600 space-y-1">
                                        <li>• Botão Esquerdo: Rotacionar</li>
                                        <li>• Botão Direito: Pan (Mover)</li>
                                        <li>• Scroll: Zoom</li>
                                        <li>• Clique Duplo: Focar elemento</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Main Viewer Area */}
                            <div className="xl:col-span-3">
                                <IfcViewer modelUrl={activeModelUrl} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="data" className="animate-in fade-in duration-500">
                        <ApontamentosTable data={apontamentos} />
                    </TabsContent>

                    <TabsContent value="entregas" className="animate-in fade-in duration-500">
                        <EntregasTab selectedEdificacao={selectedEdificacao || undefined} />
                    </TabsContent>

                    <TabsContent value="management" className="space-y-6 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ExcelUploadSection />
                            <IfcUploader />
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <CardTitle>Geração de Relatórios</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Exporte os dados do dashboard em formatos profissionais para apresentações e análises técnicas.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Button
                                            variant="outline"
                                            className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all border-dashed"
                                            onClick={async () => {
                                                const fileName = `Relatorio_AsBuilt_${selectedEdificacao || 'Geral'}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
                                                try {
                                                    const base64 = await utils.dashboard.getPDFReport.fetch({ edificacao: selectedEdificacao || undefined });
                                                    downloadBase64(base64, fileName, 'application/pdf');
                                                    toast.success('PDF gerado com sucesso!');
                                                } catch (e) {
                                                    console.error('PDF Error:', e);
                                                    toast.error('Erro ao gerar PDF');
                                                }
                                            }}
                                        >
                                            <FileText className="w-8 h-8 text-primary" />
                                            <div className="text-center">
                                                <div className="font-bold">Baixar PDF</div>
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Resumo Executivo</div>
                                            </div>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-emerald-50 hover:border-emerald-500/50 transition-all border-dashed"
                                            onClick={async () => {
                                                const fileName = `Apontamentos_AsBuilt_${selectedEdificacao || 'Geral'}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`;
                                                try {
                                                    const base64 = await utils.dashboard.getExcelReport.fetch({ edificacao: selectedEdificacao || undefined });
                                                    downloadBase64(base64, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                                                    toast.success('Excel exportado com sucesso!');
                                                } catch (e) {
                                                    console.error('Excel Error:', e);
                                                    toast.error('Erro ao gerar Excel');
                                                }
                                            }}
                                        >
                                            <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                                            <div className="text-center">
                                                <div className="font-bold">Exportar Excel</div>
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Lista Detalhada</div>
                                            </div>
                                        </Button>
                                    </div>

                                    <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500 flex items-start gap-2">
                                        <Info className="w-4 h-4 mt-0.5 shrink-0" />
                                        <p>
                                            O conteúdo dos relatórios será filtrado por <strong>{selectedEdificacao || 'Todas as Edificações'}</strong> conforme selecionado no topo do dashboard.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="presentation" className="animate-in fade-in duration-500">
                        <PresentationTab
                            edificacao={selectedEdificacao}
                            activeModelUrl={activeModelUrl}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
