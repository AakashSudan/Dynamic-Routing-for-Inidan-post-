import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Stats } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

export function DelayPrediction() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data: stats, isLoading, refetch } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    staleTime: 60000, // 1 minute
  });
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    refetch().finally(() => {
      setTimeout(() => setIsRefreshing(false), 1000);
    });
  };

  // Format data for the chart
  const chartData = [
    {
      name: "Weather",
      value: stats ? parseInt(stats.weatherImpactPercentage) : 0,
    },
    {
      name: "Traffic",
      value: stats ? parseInt(stats.trafficCongestionPercentage) : 0,
    },
    {
      name: "Mechanical",
      value: stats ? parseInt(stats.mechanicalIssuesPercentage) : 0,
    },
    {
      name: "Other",
      value: stats ? (100 - parseInt(stats.weatherImpactPercentage) - parseInt(stats.trafficCongestionPercentage) - parseInt(stats.mechanicalIssuesPercentage)) : 0,
    }
  ];

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="p-4 border-b border-slate-200 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="font-semibold text-slate-800">Delay Prediction Model</CardTitle>
          <p className="text-sm text-slate-500 mt-1">Predictive analytics for anticipated route disruptions</p>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="h-64 w-full rounded">
          {isLoading ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="flex flex-col items-center">
                <RefreshCw className="h-8 w-8 text-primary animate-spin mb-2" />
                <p className="text-slate-500">Loading data...</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="Impact %" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-3 rounded">
            <h3 className="text-sm font-medium text-slate-700">Weather Impact</h3>
            <p className="mt-1 text-2xl font-bold text-primary">{stats?.weatherImpactPercentage}%</p>
            <p className="text-xs text-slate-500">Primary cause of delays</p>
          </div>
          
          <div className="bg-slate-50 p-3 rounded">
            <h3 className="text-sm font-medium text-slate-700">Traffic Congestion</h3>
            <p className="mt-1 text-2xl font-bold text-primary">{stats?.trafficCongestionPercentage}%</p>
            <p className="text-xs text-slate-500">Secondary cause of delays</p>
          </div>
          
          <div className="bg-slate-50 p-3 rounded">
            <h3 className="text-sm font-medium text-slate-700">Mechanical Issues</h3>
            <p className="mt-1 text-2xl font-bold text-primary">{stats?.mechanicalIssuesPercentage}%</p>
            <p className="text-xs text-slate-500">Tertiary cause of delays</p>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <Button 
            className="flex items-center" 
            onClick={handleRefresh}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Update Prediction Model
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
