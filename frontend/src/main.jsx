import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import './index.css';
import { AuthProvider } from './auth/AuthContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { router } from './routes/router';
import { I18nProvider } from './i18n/I18nProvider';

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <AuthProvider>
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        <RouterProvider router={router} />
      </AuthProvider>
    </I18nProvider>
  </QueryClientProvider>
);

