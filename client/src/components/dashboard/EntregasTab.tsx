import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Plus,
    Search,
    FileText,
    CheckCircle2,
    Clock,
    XCircle,
    Edit2,
    Trash2,
} from "lucide-react";
import dayjs from "dayjs";
import KPICard from "./KPICard";

const STATUS_LABELS: Record<string, { label: string, color: string, icon: any }> = {
    'AGUARDANDO': { label: 'Aguardando', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
    'RECEBIDO': { label: 'Recebido', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: FileText },
    'EM_REVISAO': { label: 'Em Revisão', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Search },
    'VALIDADO': { label: 'Validado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    'REJEITADO': { label: 'Rejeitado', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle },
};

const DOC_TYPES: Record<string, string> = {
    'relatorio': 'Relatório',
    'dwg': 'DWG',
    'rvt': 'Revit (RVT)'
};

export default function EntregasTab({ selectedEdificacao }: { selectedEdificacao?: string }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEntrega, setEditingEntrega] = useState<any>(null);

    const utils = trpc.useContext();
    const { data: entregas = [], isLoading } = trpc.dashboard.getEntregas.useQuery();
    const { data: stats } = trpc.dashboard.getEntregasStats.useQuery({ edificacao: selectedEdificacao });

    const deleteMutation = trpc.dashboard.deleteEntrega.useMutation({
        onSuccess: () => utils.dashboard.getEntregas.invalidate()
    });

    const filteredEntregas = entregas.filter((e: any) => {
        const matchesSearch = e.nomeDocumento.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.empresaResponsavel.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.disciplina.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesEdif = !selectedEdificacao || e.edificacao === selectedEdificacao;
        return matchesSearch && matchesEdif;
    });

    const handleEdit = (entrega: any) => {
        setEditingEntrega(entrega);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm("Deseja realmente excluir esta entrega?")) {
            await deleteMutation.mutateAsync({ id });
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                <KPICard title="Total Previsto" value={stats?.total || 0} subtitle="Documentos mapeados" />
                <KPICard
                    title="Aguardando"
                    value={stats?.aguardando || 0}
                    subtitle="Ainda não recebidos"
                    className="border-amber-200 bg-amber-50/50"
                />
                <KPICard
                    title="Recebidos"
                    value={stats?.recebidos || 0}
                    subtitle="Aguardando revisão"
                    className="border-blue-200 bg-blue-50/50"
                />
                <KPICard
                    title="Validados"
                    value={stats?.validados || 0}
                    subtitle="Aprovados final"
                    className="border-emerald-200 bg-emerald-50/50"
                />
                <KPICard
                    title="Rejeitados"
                    value={stats?.rejeitados || 0}
                    subtitle="Necessitam correção"
                    className="border-rose-200 bg-rose-50/50"
                />
                <KPICard
                    title="Atrasados"
                    value={stats?.atrasados || 0}
                    subtitle="Prazo expirado"
                    className="border-rose-100 bg-rose-50/30 text-rose-600"
                />
            </div>

            {/* List and Actions */}
            <Card className="border-none shadow-xl bg-white/70 backdrop-blur-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Lista de Entregas As-Built
                    </CardTitle>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Buscar documento, empresa..."
                                className="pl-9 w-[300px] bg-white/50 border-slate-200 focus:bg-white transition-all rounded-full"
                                value={searchTerm}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button
                            className="rounded-full gap-2 shadow-lg shadow-primary/20"
                            onClick={() => {
                                setEditingEntrega(null);
                                setIsFormOpen(true);
                            }}
                        >
                            <Plus className="w-4 h-4" />
                            Nova Entrega
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-slate-100">
                                <TableHead className="w-[300px] text-slate-500 font-bold uppercase text-[10px] tracking-wider">Documento</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Empresa</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Disciplina</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Prazo</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Status</TableHead>
                                <TableHead className="text-right text-slate-500 font-bold uppercase text-[10px] tracking-wider">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-slate-400 italic">Carregando entregas...</TableCell>
                                </TableRow>
                            ) : filteredEntregas.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-slate-400 italic">Nenhuma entrega encontrada.</TableCell>
                                </TableRow>
                            ) : (
                                filteredEntregas.map((entrega: any) => {
                                    const statusInfo = STATUS_LABELS[entrega.status] || STATUS_LABELS['AGUARDANDO'];
                                    const StatusIcon = statusInfo.icon;
                                    const isAtrasado = entrega.status === 'AGUARDANDO' && dayjs(entrega.dataPrevista).isBefore(dayjs());

                                    return (
                                        <TableRow key={entrega.id} className="hover:bg-slate-50/50 transition-colors border-slate-100 group">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-700">{entrega.nomeDocumento}</span>
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-tighter">{DOC_TYPES[entrega.tipoDocumento] || entrega.tipoDocumento}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600 font-medium">{entrega.empresaResponsavel}</TableCell>
                                            <TableCell className="text-sm text-slate-600 font-medium">{entrega.disciplina}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-semibold ${isAtrasado ? 'text-rose-500' : 'text-slate-700'}`}>
                                                        {dayjs(entrega.dataPrevista).format('DD/MM/YYYY')}
                                                    </span>
                                                    {isAtrasado && <span className="text-[9px] text-rose-400 font-bold uppercase">Atrasado</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase flex items-center gap-1.5 w-fit ${statusInfo.color}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {statusInfo.label}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full" onClick={() => handleEdit(entrega)}>
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full" onClick={() => handleDelete(entrega.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Modal Form placeholder */}
            {isFormOpen && (
                <EntregaForm
                    onClose={() => setIsFormOpen(false)}
                    entrega={editingEntrega}
                    selectedEdificacao={selectedEdificacao}
                />
            )}
        </div>
    );
}

// Internal Form Component for simplicity
function EntregaForm({ onClose, entrega, selectedEdificacao }: any) {
    const utils = trpc.useContext();
    const mutation = trpc.dashboard.upsertEntrega.useMutation({
        onSuccess: () => {
            utils.dashboard.getEntregas.invalidate();
            utils.dashboard.getEntregasStats.invalidate();
            onClose();
        }
    });

    const [formData, setFormData] = useState({
        id: entrega?.id,
        nomeDocumento: entrega?.nomeDocumento || "",
        tipoDocumento: entrega?.tipoDocumento || "relatorio",
        edificacao: entrega?.edificacao || selectedEdificacao || "",
        disciplina: entrega?.disciplina || "",
        empresaResponsavel: entrega?.empresaResponsavel || "",
        dataPrevista: entrega?.dataPrevista ? dayjs(entrega.dataPrevista).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        dataRecebimento: entrega?.dataRecebimento ? dayjs(entrega.dataRecebimento).format('YYYY-MM-DD') : "",
        status: entrega?.status || "AGUARDANDO",
        descricao: entrega?.descricao || "",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({
            ...formData,
            dataRecebimento: formData.dataRecebimento || null
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="bg-primary p-6 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">{entrega ? 'Editar Entrega' : 'Nova Entrega as-built'}</h2>
                        <p className="text-primary-foreground/70 text-sm">Preencha as informações do documento a acompanhar</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Nome do Documento *</label>
                            <Input
                                required
                                value={formData.nomeDocumento}
                                onChange={e => setFormData({ ...formData, nomeDocumento: e.target.value })}
                                placeholder="Ex: Planta de execução Nível 1"
                                className="rounded-xl border-slate-200"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Tipo de Documento *</label>
                            <select
                                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-slate-200"
                                value={formData.tipoDocumento}
                                onChange={e => setFormData({ ...formData, tipoDocumento: e.target.value })}
                            >
                                <option value="relatorio">Relatório</option>
                                <option value="dwg">DWG</option>
                                <option value="rvt">Revit (RVT)</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Status *</label>
                            <select
                                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-slate-200"
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                {Object.entries(STATUS_LABELS).map(([val, { label }]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Edificação *</label>
                            <Input
                                required
                                value={formData.edificacao}
                                onChange={e => setFormData({ ...formData, edificacao: e.target.value })}
                                placeholder="Ex: Bloco A"
                                className="rounded-xl border-slate-200"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Disciplina *</label>
                            <Input
                                required
                                value={formData.disciplina}
                                onChange={e => setFormData({ ...formData, disciplina: e.target.value })}
                                placeholder="Ex: Arquitetura, Hidrossanitário"
                                className="rounded-xl border-slate-200"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Empreiteiro Responsável *</label>
                            <Input
                                required
                                value={formData.empresaResponsavel}
                                onChange={e => setFormData({ ...formData, empresaResponsavel: e.target.value })}
                                placeholder="Ex: Empresa ABC Construção"
                                className="rounded-xl border-slate-200"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Data Prevista *</label>
                            <Input
                                type="date"
                                required
                                value={formData.dataPrevista}
                                onChange={e => setFormData({ ...formData, dataPrevista: e.target.value })}
                                className="rounded-xl border-slate-200"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Data de Recebimento</label>
                            <Input
                                type="date"
                                value={formData.dataRecebimento}
                                onChange={e => setFormData({ ...formData, dataRecebimento: e.target.value })}
                                className="rounded-xl border-slate-200"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={onClose} className="rounded-full">Cancelar</Button>
                        <Button
                            type="submit"
                            disabled={mutation.isPending}
                            className="rounded-full px-8 shadow-lg shadow-primary/20"
                        >
                            {mutation.isPending ? 'Salvando...' : (entrega ? 'Salvar Alterações' : 'Criar Entrega')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
