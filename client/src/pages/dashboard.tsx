import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { StatsCard } from "@/components/dashboard/stats-card";
import { RouteMap } from "@/components/dashboard/route-map";
import { ActiveIssues } from "@/components/dashboard/active-issues";
import { ParcelTable } from "@/components/dashboard/parcel-table";
import { DelayPrediction } from "@/components/dashboard/delay-prediction";
import { NotificationSetup } from "@/components/dashboard/notification-setup";
import { useQuery } from "@tanstack/react-query";
import { Stats } from "@shared/schema";
import { 
  Package, 
  Route, 
  AlertTriangle, 
  CheckCircle 
} from "lucide-react";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen flex">
      {sidebarOpen && <Sidebar className="hidden md:block" />}
      
      <div className="flex-1 flex flex-col">
        <Header onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-100">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Mail Routing Dashboard</h1>
            <p className="text-slate-500 mt-1">Overview of active routes and system performance</p>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsCard
              title="Active Parcels"
              value={isLoading ? "..." : stats?.activeParcels.toString() || "0"}
              icon={Package}
              iconColor="text-primary-600"
              iconBgColor="bg-primary-100"
              change={{ value: "12% from yesterday", isIncrease: true }}
            />
            
            <StatsCard
              title="Active Routes"
              value={isLoading ? "..." : stats?.activeRoutes.toString() || "0"}
              icon={Route}
              iconColor="text-secondary-600"
              iconBgColor="bg-secondary-100"
              change={{ value: "3% from yesterday", isIncrease: true }}
            />
            
            <StatsCard
              title="Delayed Parcels"
              value={isLoading ? "..." : stats?.delayedParcels.toString() || "0"}
              icon={AlertTriangle}
              iconColor="text-amber-600"
              iconBgColor="bg-amber-100"
              change={{ value: "8% from yesterday", isIncrease: true }}
            />
            
            <StatsCard
              title="On-Time Delivery Rate"
              value={isLoading ? "..." : stats?.onTimeRate || "0%"}
              icon={CheckCircle}
              iconColor="text-green-600"
              iconBgColor="bg-green-100"
              change={{ value: "1.2% from last week", isIncrease: true }}
            />
          </div>
          
          {/* Map and Issues */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <RouteMap />
            <ActiveIssues />
          </div>
          
          {/* Parcels Table */}
          <ParcelTable />
          
          {/* Delay Prediction and Notification Setup */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <DelayPrediction />
            <NotificationSetup />
          </div>
        </main>
      </div>
    </div>
  );
}
