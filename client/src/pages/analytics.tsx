import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useQuery } from "@tanstack/react-query";
import { Stats } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BarChart2Icon,
  CalendarIcon,
  CloudIcon,
  DownloadIcon,
  LineChartIcon,
  LoaderIcon,
  RefreshCw,
  RouterIcon,
  Truck,
  TruckIcon,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock delivery data for charts - in a real implementation this would come from an API
const deliveryData = [
  { month: "Jan", onTime: 95, delayed: 5 },
  { month: "Feb", onTime: 93, delayed: 7 },
  { month: "Mar", onTime: 96, delayed: 4 },
  { month: "Apr", onTime: 94, delayed: 6 },
  { month: "May", onTime: 92, delayed: 8 },
  { month: "Jun", onTime: 95, delayed: 5 },
  { month: "Jul", onTime: 97, delayed: 3 },
  { month: "Aug", onTime: 96, delayed: 4 },
  { month: "Sep", onTime: 94, delayed: 6 },
  { month: "Oct", onTime: 95, delayed: 5 },
  { month: "Nov", onTime: 93, delayed: 7 },
  { month: "Dec", onTime: 91, delayed: 9 },
];

// Transport mode distribution data
const transportModeData = [
  { name: "Road", value: 64, color: "#22c55e" },
  { name: "Rail", value: 23, color: "#3b82f6" },
  { name: "Air", value: 13, color: "#8b5cf6" },
];

// Delay causes data
const delayCausesData = [
  { name: "Weather", value: 42, color: "hsl(var(--chart-1))" },
  { name: "Traffic", value: 35, color: "hsl(var(--chart-2))" },
  { name: "Mechanical", value: 18, color: "hsl(var(--chart-3))" },
  { name: "Other", value: 5, color: "hsl(var(--chart-4))" },
];

// Daily activity data
const dailyActivityData = [
  { day: "Mon", parcels: 220, routes: 40 },
  { day: "Tue", parcels: 240, routes: 45 },
  { day: "Wed", parcels: 275, routes: 50 },
  { day: "Thu", parcels: 290, routes: 55 },
  { day: "Fri", parcels: 310, routes: 60 },
  { day: "Sat", parcels: 205, routes: 35 },
  { day: "Sun", parcels: 150, routes: 25 },
];

export default function Analytics() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [timeRange, setTimeRange] = useState("month");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Fetch system stats
  const { data: stats, isLoading, refetch } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    refetch().finally(() => {
      setTimeout(() => setIsRefreshing(false), 1000);
    });
  };
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen flex">
      {sidebarOpen && <Sidebar className="hidden md:block" />}
      
      <div className="flex-1 flex flex-col">
        <Header onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-100">
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
              <p className="text-slate-500 mt-1">Performance metrics and delivery insights</p>
            </div>
            
            <div className="mt-4 md:mt-0 flex space-x-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[180px]">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              
              <Button variant="outline">
                <DownloadIcon className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 rounded-lg bg-primary-100">
                    <TruckIcon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge isPositive={true} value="12%" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Active Parcels</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {isLoading ? "..." : stats?.activeParcels.toLocaleString() || "0"}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <RouterIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <Badge isPositive={true} value="3%" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">On-Time Rate</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {isLoading ? "..." : stats?.onTimeRate || "0%"}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 rounded-lg bg-red-100">
                    <LineChartIcon className="h-5 w-5 text-red-600" />
                  </div>
                  <Badge isPositive={false} value="8%" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Delayed Parcels</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {isLoading ? "..." : stats?.delayedParcels.toLocaleString() || "0"}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <CloudIcon className="h-5 w-5 text-amber-600" />
                  </div>
                  <Badge isPositive={true} value="5%" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Weather Impact</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {isLoading ? "..." : stats?.weatherImpactPercentage || "0%"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Delivery Performance Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Delivery Performance</CardTitle>
                <CardDescription>On-time vs. delayed deliveries over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={deliveryData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorOnTime" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorDelayed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <CartesianGrid strokeDasharray="3 3" />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="onTime"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#colorOnTime)"
                        name="On-Time (%)"
                      />
                      <Area
                        type="monotone"
                        dataKey="delayed"
                        stroke="#ef4444"
                        fillOpacity={1}
                        fill="url(#colorDelayed)"
                        name="Delayed (%)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Transport Mode Distribution</CardTitle>
                <CardDescription>Breakdown by transport method</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={transportModeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {transportModeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {transportModeData.map((item) => (
                    <div key={item.name} className="flex flex-col items-center text-center">
                      <div className="w-3 h-3 rounded-full mb-1" style={{ backgroundColor: item.color }}></div>
                      <p className="text-xs font-medium">{item.name}</p>
                      <p className="text-sm font-bold">{item.value}%</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Detailed Analytics and Daily Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <Tabs defaultValue="delays" className="w-full">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Detailed Analytics</CardTitle>
                    <TabsList>
                      <TabsTrigger value="delays">Delay Analysis</TabsTrigger>
                      <TabsTrigger value="trends">Delivery Trends</TabsTrigger>
                      <TabsTrigger value="regions">Regional Data</TabsTrigger>
                    </TabsList>
                  </div>
                
              </CardHeader>
              <CardContent>
                <TabsContent value="delays" className="mt-0 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium text-sm mb-3">Delay Causes</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={delayCausesData}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {delayCausesData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value}%`} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-sm mb-3">Delay Impact by Transport Mode</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              { mode: "Road", impact: 12 },
                              { mode: "Rail", impact: 8 },
                              { mode: "Air", impact: 23 },
                            ]}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="mode" />
                            <YAxis label={{ value: 'Delay %', angle: -90, position: 'insideLeft' }} />
                            <Tooltip formatter={(value) => `${value}%`} />
                            <Bar dataKey="impact" fill="hsl(var(--primary))" barSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h3 className="font-medium text-sm mb-2">Delay Risk Prediction</h3>
                    <p className="text-sm text-slate-600 mb-4">Based on current weather and traffic patterns, the following routes have high delay risk:</p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between bg-white p-2 rounded border text-sm">
                        <span>Chicago to Denver (Air)</span>
                        <span className="font-medium text-red-600">High Risk (65%)</span>
                      </div>
                      <div className="flex justify-between bg-white p-2 rounded border text-sm">
                        <span>New York to Boston (Road)</span>
                        <span className="font-medium text-amber-600">Medium Risk (45%)</span>
                      </div>
                      <div className="flex justify-between bg-white p-2 rounded border text-sm">
                        <span>Los Angeles to San Francisco (Rail)</span>
                        <span className="font-medium text-amber-600">Medium Risk (38%)</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="trends" className="mt-0">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[
                          { week: "W1", parcels: 450, efficiency: 92 },
                          { week: "W2", parcels: 480, efficiency: 93 },
                          { week: "W3", parcels: 520, efficiency: 95 },
                          { week: "W4", parcels: 540, efficiency: 96 },
                          { week: "W5", parcels: 580, efficiency: 94 },
                          { week: "W6", parcels: 600, efficiency: 95 },
                          { week: "W7", parcels: 650, efficiency: 93 },
                          { week: "W8", parcels: 700, efficiency: 94 },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" />
                        <YAxis yAxisId="right" orientation="right" stroke="#8884d8" />
                        <Tooltip />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="parcels"
                          stroke="hsl(var(--primary))"
                          activeDot={{ r: 8 }}
                          name="Parcels Delivered"
                        />
                        <Line yAxisId="right" type="monotone" dataKey="efficiency" stroke="#8884d8" name="Efficiency %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
                
                <TabsContent value="regions" className="mt-0">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { region: "Northeast", volume: 1200, growth: 8 },
                          { region: "Southeast", volume: 900, growth: 12 },
                          { region: "Midwest", volume: 1100, growth: 5 },
                          { region: "Southwest", volume: 850, growth: 15 },
                          { region: "West", volume: 1400, growth: 10 },
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="region" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="volume" name="Delivery Volume" fill="hsl(var(--primary))" />
                        <Bar dataKey="growth" name="Growth %" fill="hsl(var(--secondary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Daily Activity</CardTitle>
                <CardDescription>Parcels and routes by day of week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dailyActivityData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="parcels" name="Parcels" fill="hsl(var(--primary))" />
                      <Bar dataKey="routes" name="Routes" fill="hsl(var(--secondary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-6 space-y-4">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <h3 className="text-sm font-medium mb-2">Peak Performance</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Busiest Day</p>
                        <p className="font-medium">Friday</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Quietest Day</p>
                        <p className="font-medium">Sunday</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Avg. Parcels/Day</p>
                        <p className="font-medium">241</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Avg. Routes/Day</p>
                        <p className="font-medium">44</p>
                      </div>
                    </div>
                  </div>
                  
                  <Button variant="outline" className="w-full">
                    <BarChart2Icon className="h-4 w-4 mr-2" />
                    View Detailed Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

// Badge component for showing statistics change indicators
function Badge({ isPositive, value }: { isPositive: boolean; value: string }) {
  return (
    <div
      className={`flex items-center rounded-full px-2 py-1 text-xs font-medium ${
        isPositive
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800"
      }`}
    >
      {isPositive ? (
        <ArrowUpIcon className="h-3 w-3 mr-1" />
      ) : (
        <ArrowDownIcon className="h-3 w-3 mr-1" />
      )}
      {value}
    </div>
  );
}
