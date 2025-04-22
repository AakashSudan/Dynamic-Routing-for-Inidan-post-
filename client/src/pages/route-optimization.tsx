import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Route, Parcel, InsertRoute } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowRightCircle,
  CloudRain,
  MapIcon,
  RefreshCw,
  Route as RouteIcon,
  TruckIcon,
  TrainIcon,
  PlaneIcon,
  LoaderIcon,
  SunIcon,
  Wind,
  ThermometerIcon,
} from "lucide-react";
import { useRef, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

// Define route creation form schema
const routeFormSchema = z.object({
  parcelId: z.number().positive(),
  transportMode: z.enum(["road", "rail", "air", "multimodal"]),
  duration: z.string().min(1, "Duration is required"),
  distance: z.string().min(1, "Distance is required"),
  // Note: routePath, weather, and traffic will be added separately
});

export default function RouteOptimization() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [optimizationMode, setOptimizationMode] = useState<"speed" | "cost" | "carbon">("speed");
  const [transportFilter, setTransportFilter] = useState<string>("all");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  
  const { toast } = useToast();

  // Fetch parcels and routes
  const { data: parcels, isLoading: isParcelsLoading } = useQuery<Parcel[]>({
    queryKey: ["/api/parcels"],
  });

  const { data: routes, isLoading: isRoutesLoading } = useQuery<Route[]>({
    queryKey: ["/api/routes"],
  });

  // Route creation mutation
  const routeMutation = useMutation({
    mutationFn: async (newRoute: InsertRoute) => {
      const res = await apiRequest("POST", "/api/routes", newRoute);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      toast({
        title: "Route Created",
        description: "The new route has been created successfully.",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to Create Route",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form for creating a new route
  const form = useForm<z.infer<typeof routeFormSchema>>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: {
      parcelId: undefined,
      transportMode: "road",
      duration: "",
      distance: "",
    },
  });

  // Handle route creation form submission
  function onSubmit(values: z.infer<typeof routeFormSchema>) {
    // Create mock route path
    const routePath = [
      { lat: 37.7749, lng: -122.4194, name: "San Francisco" },
      { lat: 36.1699, lng: -115.1398, name: "Las Vegas" },
      { lat: 34.0522, lng: -118.2437, name: "Los Angeles" },
    ];

    // Create mock weather and traffic
    const weather = {
      conditions: "partly_cloudy",
      temperature: 72,
      precipitation: 10,
      windSpeed: 5,
    };

    const traffic = {
      congestion: "moderate",
      incidents: [],
      averageSpeed: 55,
    };

    // Create the new route
    const newRoute: InsertRoute = {
      ...values,
      routePath,
      weather,
      traffic,
      active: true,
    };

    // Submit the route
    routeMutation.mutate(newRoute);
  }

  // Initialize map when component mounts
  useEffect(() => {
    if (mapRef.current && !leafletMapRef.current) {
      leafletMapRef.current = L.map(mapRef.current).setView([37.0902, -95.7129], 4);
      
      // Add tile layer (map background)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(leafletMapRef.current);
    }
    
    // Clean up on unmount
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Draw routes on map when routes data changes
  useEffect(() => {
    if (leafletMapRef.current && routes && routes.length > 0) {
      // Clear existing routes
      leafletMapRef.current.eachLayer((layer) => {
        if (layer instanceof L.Polyline || layer instanceof L.Marker) {
          leafletMapRef.current?.removeLayer(layer);
        }
      });
      
      // Filter routes based on transport filter
      const filteredRoutes = transportFilter === "all" 
        ? routes 
        : routes.filter(route => route.transportMode === transportFilter);
      
      // Draw each route
      filteredRoutes.forEach((route) => {
        if (route.routePath && Array.isArray(route.routePath)) {
          // Convert route path to LatLng[]
          const points = route.routePath.map((point: any) => [point.lat, point.lng]);
          
          if (points.length >= 2) {
            // Create line color based on transport mode
            const color = route.transportMode === "road" ? "#22c55e" : 
                          route.transportMode === "rail" ? "#3b82f6" : 
                          route.transportMode === "air" ? "#8b5cf6" : "#f59e0b";
            
            // Create polyline for route
            L.polyline(points as L.LatLngExpression[], { 
              color, 
              weight: 3, 
              opacity: 0.7 
            }).addTo(leafletMapRef.current!);
            
            // Add markers for start and end points
            L.marker(points[0] as L.LatLngExpression)
              .addTo(leafletMapRef.current!)
              .bindPopup("Origin");
              
            L.marker(points[points.length - 1] as L.LatLngExpression)
              .addTo(leafletMapRef.current!)
              .bindPopup("Destination");
          }
        }
      });
    }
  }, [routes, transportFilter]);

  // Handle parcel selection
  const handleParcelSelect = (parcelId: number) => {
    const parcel = parcels?.find(p => p.id === parcelId);
    if (parcel) {
      setSelectedParcel(parcel);
      form.setValue("parcelId", parcel.id);
    }
  };

  // Handle optimize button click
  const handleOptimize = () => {
    if (!selectedParcel) {
      toast({
        title: "No Parcel Selected",
        description: "Please select a parcel to optimize a route for.",
        variant: "destructive",
      });
      return;
    }
    
    setIsOptimizing(true);
    
    // Simulate optimization process
    setTimeout(() => {
      // Simulate new optimized route values
      form.setValue("transportMode", optimizationMode === "speed" ? "air" : 
                                    optimizationMode === "cost" ? "road" : "rail");
      form.setValue("duration", optimizationMode === "speed" ? "2h 15m" : 
                               optimizationMode === "cost" ? "18h 30m" : "12h 45m");
      form.setValue("distance", optimizationMode === "speed" ? "1,200 miles" : 
                               optimizationMode === "cost" ? "980 miles" : "1,050 miles");
      
      toast({
        title: "Route Optimized",
        description: `Route optimized for ${optimizationMode} with ${form.getValues("transportMode")} transport.`,
      });
      
      setIsOptimizing(false);
    }, 2000);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const getTransportIcon = (mode: string) => {
    switch (mode) {
      case "road":
        return <TruckIcon className="h-4 w-4" />;
      case "rail":
        return <TrainIcon className="h-4 w-4" />;
      case "air":
        return <PlaneIcon className="h-4 w-4" />;
      case "multimodal":
        return (
          <div className="flex">
            <TruckIcon className="h-4 w-4 mr-1" />
            <PlaneIcon className="h-4 w-4" />
          </div>
        );
      default:
        return <TruckIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen flex">
      {sidebarOpen && <Sidebar className="hidden md:block" />}
      
      <div className="flex-1 flex flex-col">
        <Header onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-100">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Route Optimization</h1>
            <p className="text-slate-500 mt-1">Optimize parcel routes based on weather, traffic, and schedules</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Parcels for routing */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Select Parcel for Routing</CardTitle>
                <CardDescription>Choose a parcel to optimize a route</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                {isParcelsLoading ? (
                  <div className="space-y-2 px-6">
                    {Array(5).fill(0).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[200px]" />
                          <Skeleton className="h-4 w-[160px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : parcels && parcels.length > 0 ? (
                  <div className="overflow-y-auto max-h-[400px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white">
                        <TableRow>
                          <TableHead>Tracking #</TableHead>
                          <TableHead>Origin / Destination</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parcels.map((parcel) => (
                          <TableRow 
                            key={parcel.id}
                            className={selectedParcel?.id === parcel.id ? "bg-primary/10" : ""}
                          >
                            <TableCell className="font-medium font-mono">{parcel.trackingNumber}</TableCell>
                            <TableCell>
                              <div>{parcel.origin}</div>
                              <div className="text-muted-foreground text-sm">→ {parcel.destination}</div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleParcelSelect(parcel.id)}
                              >
                                Select
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] px-6">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">No parcels available for routing</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Route Optimization */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Route Optimization</CardTitle>
                <CardDescription>
                  {selectedParcel 
                    ? `Optimizing route for ${selectedParcel.trackingNumber}: ${selectedParcel.origin} → ${selectedParcel.destination}`
                    : "Select a parcel to begin route optimization"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="map" className="h-full">
                  <TabsList className="grid grid-cols-2 mb-6">
                    <TabsTrigger value="map">Map View</TabsTrigger>
                    <TabsTrigger value="form">Route Details</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="map" className="h-[400px] relative">
                    <div className="absolute inset-x-0 top-0 p-2 z-10 flex justify-between items-center">
                      <div className="flex space-x-2">
                        <Badge 
                          variant={transportFilter === "all" ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => setTransportFilter("all")}
                        >
                          All Routes
                        </Badge>
                        <Badge 
                          variant={transportFilter === "road" ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => setTransportFilter("road")}
                        >
                          <TruckIcon className="h-3 w-3 mr-1" /> Road
                        </Badge>
                        <Badge 
                          variant={transportFilter === "rail" ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => setTransportFilter("rail")}
                        >
                          <TrainIcon className="h-3 w-3 mr-1" /> Rail
                        </Badge>
                        <Badge 
                          variant={transportFilter === "air" ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => setTransportFilter("air")}
                        >
                          <PlaneIcon className="h-3 w-3 mr-1" /> Air
                        </Badge>
                      </div>
                      
                      <Button variant="outline" size="sm" className="h-7">
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Refresh
                      </Button>
                    </div>
                    
                    <div ref={mapRef} className="h-full w-full z-0"></div>
                    
                    {isRoutesLoading && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <LoaderIcon className="h-8 w-8 text-primary animate-spin" />
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="form">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Optimization Options */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Optimization Preferences</h3>
                        
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Optimize For:</h4>
                          <div className="flex space-x-2">
                            <Button 
                              variant={optimizationMode === "speed" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setOptimizationMode("speed")}
                            >
                              Speed
                            </Button>
                            <Button 
                              variant={optimizationMode === "cost" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setOptimizationMode("cost")}
                            >
                              Cost
                            </Button>
                            <Button 
                              variant={optimizationMode === "carbon" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setOptimizationMode("carbon")}
                            >
                              Carbon Footprint
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Current Conditions:</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-50 p-3 rounded flex items-center">
                              <CloudRain className="h-5 w-5 text-blue-500 mr-2" />
                              <div>
                                <p className="text-xs text-slate-500">Weather</p>
                                <p className="text-sm font-medium">Partly Cloudy</p>
                              </div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded flex items-center">
                              <ThermometerIcon className="h-5 w-5 text-orange-500 mr-2" />
                              <div>
                                <p className="text-xs text-slate-500">Temperature</p>
                                <p className="text-sm font-medium">72°F</p>
                              </div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded flex items-center">
                              <Wind className="h-5 w-5 text-slate-500 mr-2" />
                              <div>
                                <p className="text-xs text-slate-500">Wind</p>
                                <p className="text-sm font-medium">5 mph NE</p>
                              </div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded flex items-center">
                              <RouteIcon className="h-5 w-5 text-red-500 mr-2" />
                              <div>
                                <p className="text-xs text-slate-500">Traffic</p>
                                <p className="text-sm font-medium">Moderate</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          onClick={handleOptimize}
                          disabled={!selectedParcel || isOptimizing}
                          className="w-full"
                        >
                          {isOptimizing ? (
                            <>
                              <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                              Optimizing Route...
                            </>
                          ) : (
                            <>
                              <MapIcon className="mr-2 h-4 w-4" />
                              Optimize Route
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {/* Route Form */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Route Details</h3>
                        
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                              control={form.control}
                              name="transportMode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Transport Mode</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select transport mode" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="road">Road</SelectItem>
                                      <SelectItem value="rail">Rail</SelectItem>
                                      <SelectItem value="air">Air</SelectItem>
                                      <SelectItem value="multimodal">Multimodal</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="duration"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Estimated Duration</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., 12h 30m" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="distance"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Estimated Distance</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., 500 miles" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <Button 
                              type="submit" 
                              className="w-full"
                              disabled={!selectedParcel || routeMutation.isPending}
                            >
                              {routeMutation.isPending ? (
                                <>
                                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                                  Creating Route...
                                </>
                              ) : (
                                <>
                                  <ArrowRightCircle className="mr-2 h-4 w-4" />
                                  Create Route
                                </>
                              )}
                            </Button>
                          </form>
                        </Form>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
          
          {/* Existing Routes Table */}
          <Card>
            <CardHeader>
              <CardTitle>Active Routes</CardTitle>
              <CardDescription>Current planned routes for parcels in the system</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {isRoutesLoading ? (
                <div className="space-y-2 px-6">
                  {Array(3).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : routes && routes.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Parcel ID</TableHead>
                        <TableHead>Transport Mode</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Distance</TableHead>
                        <TableHead>Weather</TableHead>
                        <TableHead>Traffic</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {routes.map((route) => (
                        <TableRow key={route.id}>
                          <TableCell className="font-medium">{route.parcelId}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {getTransportIcon(route.transportMode)}
                              <span className="ml-2 capitalize">{route.transportMode}</span>
                            </div>
                          </TableCell>
                          <TableCell>{route.duration}</TableCell>
                          <TableCell>{route.distance}</TableCell>
                          <TableCell>
                            {typeof route.weather === 'object' && route.weather !== null ? (
                              <div className="flex items-center">
                                <SunIcon className="h-4 w-4 text-amber-500 mr-1" />
                                <span>
                                  {(route.weather as any).conditions === "partly_cloudy" 
                                    ? "Partly Cloudy" 
                                    : (route.weather as any).conditions}
                                </span>
                              </div>
                            ) : (
                              "N/A"
                            )}
                          </TableCell>
                          <TableCell>
                            {typeof route.traffic === 'object' && route.traffic !== null ? (
                              <span className="capitalize">{(route.traffic as any).congestion}</span>
                            ) : (
                              "N/A"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={route.active ? "success" : "secondary"}>
                              {route.active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] px-6">
                  <RouteIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">No active routes found</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Export Routes</Button>
              <Button>Create New Route</Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    </div>
  );
}
