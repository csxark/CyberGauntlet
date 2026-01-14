import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Root Vite config so the React JSX transform runs when starting from project root
export default defineConfig({
  plugins: [react()],
});
