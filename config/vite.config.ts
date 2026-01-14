import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // Serve the app from the project root where index.html resides
  root: path.resolve(__dirname, '..'),
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    alias: {
      react: path.resolve(__dirname, '../Json/node_modules/react'),
      'react-dom': path.resolve(__dirname, '../Json/node_modules/react-dom'),
      '@supabase/supabase-js': path.resolve(
        __dirname,
        '../Json/node_modules/@supabase/supabase-js'
      ),
      'lucide-react': path.resolve(__dirname, '../Json/node_modules/lucide-react'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
