import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    build: {
        outDir: '../../public/build-crm',
        emptyOutDir: true,
        manifest: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'resources/assets/crm-frontend/src'),
        },
    },
    plugins: [
        laravel({
            publicDirectory: '../../public',
            buildDirectory: 'build-crm',
            input: [
                'resources/assets/crm-frontend/src/main.tsx'
            ],
            refresh: true,
        }),
        react(),
    ],
});
