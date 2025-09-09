import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import Dashboard from "@/pages/dashboard";
import Employees from "@/pages/employees";
import TimeTracking from "@/pages/time-tracking";
import Schedules from "@/pages/schedules";
import Incidents from "@/pages/incidents";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/employees" component={Employees} />
      <Route path="/time-tracking" component={TimeTracking} />
      <Route path="/schedules" component={Schedules} />
      <Route path="/incidents" component={Incidents} />
      <Route path="/reports" component={Reports} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1">
              <header className="flex items-center justify-between p-4 lg:p-6 bg-card border-b border-border">
                <div className="flex items-center space-x-4">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                </div>
                <div className="flex items-center space-x-4">
                  <div className="relative hidden sm:block">
                    <input
                      type="search"
                      placeholder="Buscar empleado..."
                      className="pl-10 pr-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring w-64"
                      data-testid="input-employee-search"
                    />
                    <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
                  </div>
                  <button
                    className="relative p-2 text-muted-foreground hover:text-foreground"
                    data-testid="button-notifications"
                  >
                    <i className="fas fa-bell text-xl"></i>
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      3
                    </span>
                  </button>
                  <ThemeToggle />
                </div>
              </header>
              <main className="flex-1 overflow-auto">
                <Router />
              </main>
            </div>
          </div>

          {/* Mobile Bottom Navigation */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
            <div className="grid grid-cols-5 py-2">
              <a
                href="/"
                className="flex flex-col items-center space-y-1 py-2 text-primary"
                data-testid="nav-dashboard"
              >
                <i className="fas fa-chart-line text-lg"></i>
                <span className="text-xs">Dashboard</span>
              </a>
              <a
                href="/employees"
                className="flex flex-col items-center space-y-1 py-2 text-muted-foreground"
                data-testid="nav-employees"
              >
                <i className="fas fa-users text-lg"></i>
                <span className="text-xs">Empleados</span>
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
                href="/reports"
                className="flex flex-col items-center space-y-1 py-2 text-muted-foreground"
                data-testid="nav-reports"
              >
                <i className="fas fa-file-alt text-lg"></i>
                <span className="text-xs">Reportes</span>
              </a>
              <a
                href="/settings"
                className="flex flex-col items-center space-y-1 py-2 text-muted-foreground"
                data-testid="nav-settings"
              >
                <i className="fas fa-cog text-lg"></i>
                <span className="text-xs">Config</span>
              </a>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
