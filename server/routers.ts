import { publicProcedure, router } from './_core/trpc';
import {
    getKPIs,
    getAllApontamentos,
    getApontamentosPorSala,
    getApontamentosPorDisciplina,
    getTopDivergencias,
    getApontamentosPorSemana,
    getEdificacoes,
    getKPIsPorEdificacao,
    getSalasPorEdificacao,
    getApontamentosPorEdificacao,
    getValidacaoIntegridade,
    getStatsStatus,
    getTopSalasImpactadas,
    getAllSalas,
    getAllRoomsWithColors,
    getAllIfcFiles,
    getIfcFilesByEdificacao,
    getSalaByNome,
    getApontamentosBySala,
    linkIfcToRoom,
    getEntregas,
    upsertEntrega,
    deleteEntrega,
    getEntregasStats,
} from './db';
import { handleExcelUpload } from './uploadHandler';
import { handleIfcUpload, deleteIfcFile } from './ifcHandler';
import { generatePDFReport, generateExcelReport } from "./reportGenerator";
import { z } from 'zod';

export const appRouter = router({
    auth: router({
        me: publicProcedure.query(opts => opts.ctx.user),
    }),

    dashboard: router({
        // KPIs
        getKPIs: publicProcedure.query(async () => {
            return await getKPIs();
        }),

        // Salas
        getSalas: publicProcedure.query(async () => {
            return await getAllSalas();
        }),

        getSalaByNome: publicProcedure
            .input(z.object({ nome: z.string() }))
            .query(async ({ input }) => {
                return await getSalaByNome(input.nome);
            }),

        // Apontamentos
        getApontamentos: publicProcedure.query(async () => {
            return await getAllApontamentos();
        }),

        getApontamentosBySala: publicProcedure
            .input(z.object({ sala: z.string() }))
            .query(async ({ input }) => {
                return await getApontamentosBySala(input.sala);
            }),

        getApontamentosPorSala: publicProcedure.query(async () => {
            return await getApontamentosPorSala();
        }),

        getApontamentosPorDisciplina: publicProcedure
            .input(z.object({ edificacao: z.string().optional() }).optional())
            .query(async ({ input }) => {
                return await getApontamentosPorDisciplina(input?.edificacao);
            }),

        getTopDivergencias: publicProcedure.query(async () => {
            return await getTopDivergencias();
        }),

        getApontamentosPorSemana: publicProcedure
            .input(z.object({ edificacao: z.string().optional() }).optional())
            .query(async ({ input }) => {
                return await getApontamentosPorSemana(input?.edificacao);
            }),

        // Edificação
        getEdificacoes: publicProcedure.query(async () => {
            return await getEdificacoes();
        }),

        getKPIsPorEdificacao: publicProcedure
            .input(z.object({ edificacao: z.string() }))
            .query(async ({ input }) => {
                return await getKPIsPorEdificacao(input.edificacao);
            }),

        getSalasPorEdificacao: publicProcedure.query(async () => {
            return await getSalasPorEdificacao();
        }),

        getApontamentosPorEdificacao: publicProcedure.query(async () => {
            return await getApontamentosPorEdificacao();
        }),

        // Data Integrity
        getValidacaoIntegridade: publicProcedure.query(async () => {
            return await getValidacaoIntegridade();
        }),

        // Statistics
        getStatsStatus: publicProcedure
            .input(z.object({ edificacao: z.string().optional() }).optional())
            .query(async ({ input }) => {
                return await getStatsStatus(input?.edificacao);
            }),

        getTopSalasImpactadas: publicProcedure
            .input(z.object({ edificacao: z.string().optional() }).optional())
            .query(async ({ input }) => {
                return await getTopSalasImpactadas(input?.edificacao);
            }),

        // Excel Upload
        uploadExcel: publicProcedure
            .input(z.object({
                fileBuffer: z.string(),
                fileName: z.string().optional(),
            }))
            .mutation(async ({ input }) => {
                const buffer = Buffer.from(input.fileBuffer, 'base64');
                const result = await handleExcelUpload(buffer, input.fileName);
                return result;
            }),

        // Reports
        getPDFReport: publicProcedure
            .input(z.object({ edificacao: z.string().optional() }).optional())
            .query(async ({ input }) => {
                const buffer = await generatePDFReport(input?.edificacao);
                return buffer.toString('base64');
            }),

        getExcelReport: publicProcedure
            .input(z.object({ edificacao: z.string().optional() }).optional())
            .query(async ({ input }) => {
                const buffer = await generateExcelReport(input?.edificacao);
                return buffer.toString('base64');
            }),

        // Entregas As-Built
        getEntregas: publicProcedure.query(async () => {
            return await getEntregas();
        }),

        upsertEntrega: publicProcedure
            .input(z.object({
                id: z.number().optional(),
                nomeDocumento: z.string(),
                tipoDocumento: z.string(),
                edificacao: z.string(),
                disciplina: z.string(),
                empresaResponsavel: z.string(),
                dataPrevista: z.string().or(z.date()),
                dataRecebimento: z.string().or(z.date()).nullable().optional(),
                status: z.string(),
                descricao: z.string().nullable().optional(),
            }))
            .mutation(async ({ input }) => {
                return await upsertEntrega(input);
            }),

        deleteEntrega: publicProcedure
            .input(z.object({ id: z.number() }))
            .mutation(async ({ input }) => {
                return await deleteEntrega(input.id);
            }),

        getEntregasStats: publicProcedure
            .input(z.object({ edificacao: z.string().optional() }).optional())
            .query(async ({ input }) => {
                return await getEntregasStats(input?.edificacao);
            }),
    }),

    ifc: router({
        // Get all IFC files
        getAllFiles: publicProcedure.query(async () => {
            return await getAllIfcFiles();
        }),

        // Get IFC files by edificação
        getFilesByEdificacao: publicProcedure
            .input(z.object({ edificacao: z.string() }))
            .query(async ({ input }) => {
                return await getIfcFilesByEdificacao(input.edificacao);
            }),

        // Get rooms with colors for IFC visualization
        getRoomsWithColors: publicProcedure.query(async () => {
            return await getAllRoomsWithColors();
        }),

        // Upload IFC file
        uploadFile: publicProcedure
            .input(z.object({
                fileBuffer: z.string(),
                fileName: z.string(),
                edificacao: z.string().nullable(),
            }))
            .mutation(async ({ input }) => {
                const buffer = Buffer.from(input.fileBuffer, 'base64');
                const result = await handleIfcUpload(buffer, input.fileName, input.edificacao);
                return result;
            }),

        // Delete IFC file
        deleteFile: publicProcedure
            .input(z.object({ fileId: z.number() }))
            .mutation(async ({ input }) => {
                const result = await deleteIfcFile(input.fileId);
                return { success: result };
            }),

        // Link IFC element to room record
        linkIfcToRoom: publicProcedure
            .input(z.object({
                salaId: z.number(),
                ifcExpressId: z.number()
            }))
            .mutation(async ({ input }) => {
                const result = await linkIfcToRoom(input.salaId, input.ifcExpressId);
                return { success: result };
            }),
    }),
});

export type AppRouter = typeof appRouter;
