import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// --- importing core ---
import { AuthProvider, useAuth } from '@core/AuthProvider';

// --- importing i18n ---
import '@core/i18n/i18n';
import { useTranslation } from "react-i18next";

import { Toaster } from 'react-hot-toast';

// --- importing pages ---
import Login from '@pages/Login';
import SuperAdminDashboard from '@pages/SuperAdminDashboard';
import Dashboard from '@pages/city/Dashboard';
import Reports from '@pages/city/reports/Reports';
import ReportDetail from '@pages/city/reports/ReportDetail';




function DashboardRouter() {
    const { profile } = useAuth();
    const { t } = useTranslation();

    if (profile?.role === 'super_admin') {
        return <SuperAdminDashboard />;
    }

    if (profile?.role === 'org_admin' || profile?.role === 'org_officer' || profile?.role === 'org_viewer') {
        return <Dashboard />;
    }

    return <div className="min-h-screen flex items-center justify-center font-inter-medium">{t('general.profileLoading')}</div>;
}


function ProtectedRoute({children}: {children: React.ReactNode}) {
  const { user, loading, profile, logout } = useAuth();
  const { t } = useTranslation();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-inter-medium">{t('general.loading')}</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role === 'citizen') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F7FA] font-inter p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md text-center border-t-4 border-red-500">
          <h1 className="text-2xl font-inter-bold text-red-600 mb-4">{t('general.accesDeniedTitle')}</h1>
          <p className="text-gray-600 mb-8 font-inter-regular">
           {t('general.accesDeniedMessage')}
          </p>
          <button 
            onClick={logout} 
            className="px-6 py-3 bg-gray-200 text-gray-800 font-inter-semibold rounded-xl hover:bg-gray-300 transition-colors"
          >
            {t('general.buttonLogoutForNotPermitted')}
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <DashboardRouter />
        </ProtectedRoute>
      }
      />
      <Route path="/reports" element={
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      }
      />
      <Route path="/reports/:id" element={
     <ProtectedRoute>
          <ReportDetail />
     </ProtectedRoute>
   }
   />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
    </AuthProvider>
  );
}
