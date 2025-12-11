
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import CompanySettings from './pages/CompanySettings';
import TimezoneSettings from './pages/TimezoneSettings';
import BusinessHoursSettings from './pages/BusinessHoursSettings';
import SchedulingRules from './pages/SchedulingRules';
import Team from './pages/Team';
import Appointments from './pages/Appointments';
import PaymentSettings from './pages/PaymentSettings';
import SiteCustomization from './pages/SiteCustomization';
import PublicCompanyPage from './pages/PublicCompanyPage';
import Services from './pages/Services';
import NewService from './pages/NewService';
import ServiceCategories from './pages/ServiceCategories';
import ClientLogin from './pages/ClientLogin';
import ClientDashboard from './pages/ClientDashboard';
import { UserProfileProvider } from './contexts/UserProfileContext';


function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <UserProfileProvider>
        <Routes>
          {/* Client Portal Routes */}
          <Route path="/client" element={<ClientLogin />} />
          <Route path="/client/dashboard" element={<ClientDashboard />} />

          {/* Rota Pública - Página da Empresa */}
          <Route path="/:slug" element={<PublicCompanyPage />} />

          <Route
            path="/login"
            element={session ? <Navigate to="/dashboard" /> : <Login />}
          />
          <Route
            path="/dashboard"
            element={session ? <Dashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/clients"
            element={session ? <Clients /> : <Navigate to="/login" />}
          />
          <Route
            path="/settings/company"
            element={session ? <CompanySettings /> : <Navigate to="/login" />}
          />
          <Route
            path="/settings/timezone"
            element={session ? <TimezoneSettings /> : <Navigate to="/login" />}
          />
          <Route
            path="/settings/schedule"
            element={session ? <BusinessHoursSettings /> : <Navigate to="/login" />}
          />
          <Route
            path="/settings/rules"
            element={session ? <SchedulingRules /> : <Navigate to="/login" />}
          />
          <Route
            path="/settings/team"
            element={session ? <Team /> : <Navigate to="/login" />}
          />
          <Route
            path="/appointments"
            element={session ? <Appointments /> : <Navigate to="/login" />}
          />
          <Route
            path="/settings/payments"
            element={session ? <PaymentSettings /> : <Navigate to="/login" />}
          />
          <Route
            path="/site/customization"
            element={session ? <SiteCustomization /> : <Navigate to="/login" />}
          />
          <Route
            path="/catalog/services"
            element={session ? <Services /> : <Navigate to="/login" />}
          />
          <Route
            path="/catalog/combos"
            element={session ? <ServiceCategories /> : <Navigate to="/login" />}
          />
          <Route
            path="/catalog/services/new"
            element={session ? <NewService /> : <Navigate to="/login" />}
          />
          <Route
            path="/catalog/services/:id"
            element={session ? <NewService /> : <Navigate to="/login" />}
          />
          <Route
            path="/"
            element={<Navigate to={session ? "/dashboard" : "/login"} />}
          />
        </Routes>
      </UserProfileProvider>
    </BrowserRouter>
  );
}

export default App;
