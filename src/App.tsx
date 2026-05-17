import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";
import Overview from "./pages/dashboard/Overview.tsx";
import MapPage from "./pages/dashboard/MapPage.tsx";
import Farms from "./pages/dashboard/Farms.tsx";
import Weather from "./pages/dashboard/Weather.tsx";
import Advisor from "./pages/dashboard/Advisor.tsx";
import Alerts from "./pages/dashboard/Alerts.tsx";
import Report from "./pages/dashboard/Report.tsx";
import Billing from "./pages/dashboard/Billing.tsx";
import Settings from "./pages/dashboard/Settings.tsx";
import Notifications from "./pages/dashboard/Notifications.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard/map" replace />} />
              <Route path="map" element={<MapPage />} />
              <Route path="farms" element={<Farms />} />
              <Route path="weather" element={<Weather />} />
              <Route path="advisor" element={<Advisor />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="report" element={<Report />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="billing" element={<Billing />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
