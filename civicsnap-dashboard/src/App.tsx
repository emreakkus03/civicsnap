import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './core/AuthProvider';
import Login from './pages/Login';


function Dashboard() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-[#F5F7FA] p-10 font-inter">
            <div className="bg-white p-8 rounded-2xl shadow-sm max-w-4xl mx-auto">
                <h1 className="text-3xl font-inter-bold mb-4">Super Admin Dashboard</h1>
                <p className="text-gray-600 mb-8 font-inter-regular">
                    Welkom terug, {user?.name || user?.email}! Je bent ingelogd.
                </p>
                <button 
                    onClick={logout} 
                    className="px-6 py-3 bg-red-500 text-white font-inter-semibold rounded-xl hover:bg-red-600 transition-colors"
                >
                    Uitloggen
                </button>
            </div>
        </div>
  );
}


function ProtectedRoute({children}: {children: React.ReactNode}) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-inter-medium">Laden...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard />
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
    </AuthProvider>
  );
}
