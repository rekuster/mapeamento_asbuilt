import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Info } from "lucide-react";

interface ApontamentosPorDisciplinaChartProps {
    data: { disciplina: string; count: number }[];
    hideTitle?: boolean;
}

const COLORS = [
    "#FF5A5F", // Ar Condicionado / Ar Comprimido (Rose)
    "#FF9F1C", // Esgoto / Hidráulica (Orange)
    "#FFD166", // Elétrica (Yellow)
    "#118AB2", // Arquitetura / Civil (Blue)
    "#06D6A0", // Incêndio (Green)
    "#7209B7", // Vácuo (Purple)
    "#4CC9F0", // Gases Médicos (Cyan)
    "#073B4C", // Outros (Dark Blue)
];

export default function ApontamentosPorDisciplinaChart({ data, hideTitle }: ApontamentosPorDisciplinaChartProps) {
    if (!data || data.length === 0) {
        const emptyState = (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                <Users className="w-8 h-8 opacity-20" />
                <p className="text-sm italic font-medium">Nenhum apontamento por disciplina</p>
            </div>
        );
        if (hideTitle) return <div className="h-full border border-dashed border-slate-200 rounded-xl bg-slate-50/50">{emptyState}</div>;
        return (
            <Card className="h-[400px]">
                <CardHeader><CardTitle className="text-lg">Distribuição por Disciplina</CardTitle></CardHeader>
                <CardContent className="h-[300px]">{emptyState}</CardContent>
            </Card>
        );
    }

    const chartContent = (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="40%"
                    outerRadius={80}
                    innerRadius={35}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="disciplina"
                    minAngle={15} // Ensure tiny slices are visible
                    label={({ name, percent }) => percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ""}
                    labelLine={false}
                    style={{ fontSize: '10px', fontWeight: 'bold' }}
                >
                    {data.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.5)" />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.96)",
                        borderColor: "#E2E8F0",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                />
                <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                />
            </PieChart>
        </ResponsiveContainer>
    );

    if (hideTitle) return chartContent;

    return (
        <Card className="h-[400px]">
            <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Info className="w-5 h-5 text-primary" />
                    Impacto por Disciplina
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                {chartContent}
            </CardContent>
        </Card>
    );
}
