import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { getKPIs, getStatsStatus, getTopSalasImpactadas, getDb, apontamentos } from './db';
import { eq } from 'drizzle-orm';

export async function generatePDFReport(edificacao?: string): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    // Headers & Title
    doc.fontSize(24).text('Relatório Executivo As Built', { align: 'center' });
    doc.fontSize(14).text(`Neodent - ${edificacao || 'Todas as Edificações'}`, { align: 'center' });
    doc.moveDown(2);

    // KPI Section
    const kpis = await getKPIs(edificacao);
    if (kpis) {
        doc.fontSize(18).text('Indicadores Chave (KPIs)', { underline: true });
        doc.moveDown();
        doc.fontSize(12)
            .text(`Total de Salas Mapeadas: ${kpis.totalSalas}`)
            .text(`Taxa de Verificação: ${kpis.taxaVerificacao.toFixed(1)}% (${kpis.salasVerificadas} salas)`)
            .text(`Liberado para Obra: ${kpis.taxaLiberacao.toFixed(1)}% (${kpis.salasLiberadas} salas)`)
            .text(`Total de Apontamentos: ${kpis.totalApontamentos}`)
            .text(`Salas Críticas (>10 apontamentos): ${kpis.salasCriticas}`)
            .text(`Média de Apontamentos por Sala: ${kpis.mediaApontamentos.toFixed(1)}`);
        doc.moveDown(2);
    }

    // Top Impacted Rooms
    const topRooms = await getTopSalasImpactadas(edificacao);
    if (topRooms.length > 0) {
        doc.fontSize(18).text('Top 5 Salas com Maior Impacto', { underline: true });
        doc.moveDown();
        topRooms.forEach((room: { sala: string; edificacao: string | null; count: number }, i: number) => {
            doc.fontSize(12).text(`${i + 1}. ${room.sala} (${room.edificacao || 'N/A'}): ${room.count} apontamentos`);
        });
        doc.moveDown(2);
    }

    // Status Distribution
    const stats = await getStatsStatus(edificacao);
    doc.fontSize(18).text('Distribuição de Status', { underline: true });
    doc.moveDown();
    stats.forEach(s => {
        doc.fontSize(12).text(`${s.status}: ${s.count} salas`);
    });

    doc.moveDown(4);
    doc.fontSize(10).text(`Gerado automaticamente em ${new Date().toLocaleString('pt-BR')}`, { align: 'right' });

    doc.end();

    return new Promise((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

export async function generateExcelReport(edificacao?: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Relatório de Apontamentos');

    // Header stylings
    sheet.columns = [
        { header: 'Edificação', key: 'edificacao', width: 20 },
        { header: 'Pavimento', key: 'pavimento', width: 15 },
        { header: 'Setor', key: 'setor', width: 10 },
        { header: 'Sala', key: 'sala', width: 25 },
        { header: 'Disciplina', key: 'disciplina', width: 20 },
        { header: 'Divergência', key: 'divergencia', width: 50 },
        { header: 'Data', key: 'data', width: 15 }
    ];

    // Fetch data
    const database = await getDb();
    if (!database) throw new Error('DB initialization failed');

    let query = database.select().from(apontamentos);
    if (edificacao) {
        query = query.where(eq(apontamentos.edificacao, edificacao)) as any;
    }
    const data = await query;

    // Add rows
    data.forEach((item: any) => {
        sheet.addRow({
            edificacao: item.edificacao,
            pavimento: item.pavimento,
            setor: item.setor,
            sala: item.sala,
            disciplina: item.disciplina,
            divergencia: item.divergencia,
            data: item.data ? new Date(item.data).toLocaleDateString('pt-BR') : ''
        });
    });

    // Formatting
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}
