import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  TruckIcon,
  LayoutDashboardIcon,
  RouteIcon,
  QrCodeIcon,
  BellIcon,
  UsersIcon,
  BarChartIcon,
  SettingsIcon,
  LogOutIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type SidebarProps = {
  className?: string;
};

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  const navItems = [
    {
      icon: LayoutDashboardIcon,
      label: "Dashboard",
      href: "/",
      active: location === "/",
    },
    {
      icon: RouteIcon,
      label: "Route Optimization",
      href: "/route-optimization",
      active: location === "/route-optimization",
    },
    {
      icon: QrCodeIcon,
      label: "Parcel Tracking",
      href: "/parcel-tracking",
      active: location === "/parcel-tracking",
    },
    {
      icon: BellIcon,
      label: "Notifications",
      href: "/notifications",
      active: location === "/notifications",
    },
    // Only show user management for admin/staff
    ...(user?.role !== "sender" ? [
      {
        icon: UsersIcon,
        label: "User Management",
        href: "/user-management",
        active: location === "/user-management",
      },
    ] : []),
    {
      icon: BarChartIcon,
      label: "Analytics",
      href: "/analytics",
      active: location === "/analytics",
    },
    {
      icon: SettingsIcon,
      label: "Settings",
      href: "/settings",
      active: location === "/settings",
    },
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <aside className={cn("bg-sidebar text-sidebar-foreground w-64 flex-shrink-0 h-screen sticky top-0 overflow-y-auto", className)}>
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center space-x-2">
          <TruckIcon className="text-primary h-6 w-6" />
          <h1 className="text-xl font-bold">MailRoute Pro</h1>
        </div>
      </div>
      
      <nav className="mt-6 px-4">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <a className={cn(
                "flex items-center px-4 py-3 text-sm rounded-md",
                item.active
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}>
                <item.icon className="w-5 h-5 mr-3" />
                <span>{item.label}</span>
              </a>
            </Link>
          ))}
        </div>
        
        <div className="mt-10 pt-6 border-t border-sidebar-border">
          <div className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider mb-3 px-4">
            System Status
          </div>
          <div className="px-4 py-2">
            <div className="flex items-center mb-2">
              <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
              <span className="text-xs text-sidebar-foreground/60">API: Operational</span>
            </div>
            <div className="flex items-center mb-2">
              <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
              <span className="text-xs text-sidebar-foreground/60">Tracking: Online</span>
            </div>
            <div className="flex items-center">
              <span className="h-2 w-2 rounded-full bg-amber-500 mr-2"></span>
              <span className="text-xs text-sidebar-foreground/60">Predictions: Degraded</span>
            </div>
          </div>
          
          <Separator className="my-4 bg-sidebar-border" />
          
          <div className="px-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                <span className="text-xs font-semibold">
                  {user?.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-none">{user?.fullName}</span>
                <span className="text-xs text-sidebar-foreground/60 capitalize">{user?.role}</span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full justify-start bg-primary text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOutIcon className="mr-2 h-4 w-4" />
              {logoutMutation.isPending ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>
      </nav>
    </aside>
  );
}
