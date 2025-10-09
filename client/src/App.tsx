import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Employees from "@/pages/employees";
import TimeTracking from "@/pages/time-tracking";
import Schedules from "@/pages/schedules";
import Incidents from "@/pages/incidents";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

function Router() {
  const { user } = useAuth();
  
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      {user?.roleSystem === "admin" && <Route path="/employees" component={Employees} />}
      <Route path="/time-tracking" component={TimeTracking} />
      {user?.roleSystem === "admin" && <Route path="/schedules" component={Schedules} />}
      <Route path="/incidents" component={Incidents} />
      <Route path="/reports" component={Reports} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user, logout } = useAuth();
  
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 lg:p-6 bg-card border-b border-border">
            <div className="flex items-center space-x-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
            </div>
            <div className="flex items-center space-x-4">
              {/* User info and logout */}
              <div className="flex items-center space-x-2 text-sm">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{user?.firstName} {user?.lastName}</span>
                {user?.roleSystem === "admin" && (
                  <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs">
                    Admin
                  </span>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:ml-2 sm:inline">Salir</span>
              </Button>
              
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation - Only show relevant options */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="grid grid-cols-4 py-2">
          <a
            href="/"
            className="flex flex-col items-center space-y-1 py-2 text-primary"
            data-testid="nav-dashboard"
          >
            <i className="fas fa-chart-line text-lg"></i>
            <span className="text-xs">Panel</span>
          </a>
          <a
            href="/time-tracking"
            className="flex flex-col items-center space-y-1 py-2 text-muted-foreground"
            data-testid="nav-time-tracking"
          >
            <i className="fas fa-clock text-lg"></i>
            <span className="text-xs">Fichaje</span>
          </a>
          <a
            href="/incidents"
            className="flex flex-col items-center space-y-1 py-2 text-muted-foreground"
            data-testid="nav-incidents"
          >
            <i className="fas fa-exclamation-triangle text-lg"></i>
            <span className="text-xs">Incidencias</span>
          </a>
          <a
            href="/reports"
            className="flex flex-col items-center space-y-1 py-2 text-muted-foreground"
            data-testid="nav-reports"
          >
            <i className="fas fa-file-alt text-lg"></i>
            <span className="text-xs">Reportes</span>
          </a>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function AuthenticatedApp() {
  const { user, login, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={login} />;
  }

  return <AppContent />;
}
