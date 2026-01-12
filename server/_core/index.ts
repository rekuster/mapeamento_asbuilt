import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import path from 'path';
import { appRouter } from '../routers';
import type { Context } from './trpc';
import { ENV } from './env';

const app = express();

// Middleware
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// tRPC endpoint
app.use(
    '/api/trpc',
    createExpressMiddleware({
        router: appRouter,
        createContext: ({ req, res }): Context => ({
            req,
            res,
            user: undefined, // Add auth logic here if needed
        }),
    })
);

// Serve static files in production
if (ENV.nodeEnv === 'production') {
    app.use(express.static(path.join(process.cwd(), 'dist/public')));

    app.get('*', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'dist/public/index.html'));
    });
}

// Start server
const PORT = ENV.port;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔌 tRPC API: http://localhost:${PORT}/api/trpc`);
});
