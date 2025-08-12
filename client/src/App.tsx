import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Login from "@/pages/login";
import Register from "@/pages/register";
import EnhancedPatientDashboard from "@/pages/enhanced-patient";
import AmbulanceDashboard from "@/pages/ambulance";
import AmbulanceNavigation from "@/pages/ambulance-navigation";
import HospitalDashboard from "@/pages/hospital";
import AdminDashboard from "@/pages/admin";
import NotFound from "@/pages/not-found";
import { WebSocketProvider } from "@/hooks/use-websocket";
import { RoleHeader } from "@/components/role-header";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/register" component={Register} />
        <Route component={Login} />
      </Switch>
    );
  }

  return (
    <WebSocketProvider>
      <div className="min-h-screen bg-neutral-50">
        <RoleHeader user={user} />
        <Switch>
          {/* New branded URL routes */}
          <Route path="/PatientDashboard" component={EnhancedPatientDashboard} />
          <Route path="/AmbulanceDashboard" component={AmbulanceDashboard} />
          <Route path="/HospitalDashboard" component={HospitalDashboard} />
          <Route path="/AdminDashboard" component={AdminDashboard} />
          <Route path="/PatientTracking/:requestId" component={AmbulanceNavigation} />
          
          {/* Legacy routes for backward compatibility */}
          <Route path="/ambulance/navigate/:requestId" component={AmbulanceNavigation} />
          <Route path="/admin" component={AdminDashboard} />
          
          {/* Default route based on user role */}
          <Route path="/" component={() => {
            switch (user.role) {
              case 'patient':
                return <EnhancedPatientDashboard />;
              case 'ambulance':
                return <AmbulanceDashboard />;
              case 'hospital':
                return <HospitalDashboard />;
              case 'admin':
                return <AdminDashboard />;
              default:
                return <NotFound />;
            }
          }} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </WebSocketProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
