import { Clock, Users, Calendar, AlertTriangle, FileText, Settings, ChartLine } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useLocation } from "wouter";

const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: ChartLine,
  },
  {
    title: "Empleados",
    url: "/employees",
    icon: Users,
  },
  {
    title: "Control Horario",
    url: "/time-tracking",
    icon: Clock,
  },
  {
    title: "Horarios y Turnos",
    url: "/schedules",
    icon: Calendar,
  },
  {
    title: "Incidencias",
    url: "/incidents",
    icon: AlertTriangle,
  },
  {
    title: "Reportes",
    url: "/reports",
    icon: FileText,
  },
  {
    title: "Configuración",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="sidebar-gradient">
      <SidebarContent>
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <i className="fas fa-clock text-2xl text-sidebar-foreground"></i>
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground">TimeTracker</h1>
              <p className="text-sm opacity-80 text-sidebar-foreground">Pro</p>
            </div>
          </div>
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/80">Aplicación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className={location === item.url ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <a href={item.url}>
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-sidebar-foreground/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-sidebar-foreground/20 rounded-full flex items-center justify-center">
              <i className="fas fa-user text-sidebar-foreground"></i>
            </div>
            <div>
              <p className="font-medium text-sidebar-foreground">Admin Usuario</p>
              <p className="text-sm opacity-80 text-sidebar-foreground">Administrador</p>
            </div>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
