import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { apiRequest } from "@/lib/queryClient";
import { Route, Parcel } from "@shared/schema";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Define form schema
const routeFormSchema = z.object({
  parcelId: z.number().positive(),
  transportMode: z.enum(["road", "rail", "air", "multimodal"]),
  duration: z.string().min(1, "Duration is required"),
  distance: z.string().min(1, "Distance is required"),
});

export default function RouteOptimization() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [optimizationMode, setOptimizationMode] = useState<"speed" | "cost" | "carbon">("speed");
  const [transportFilter, setTransportFilter] = useState<string>("all");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<{ path: L.LatLngExpression[] } | null>(null);
  const [intermediateStops, setIntermediateStops] = useState<string[]>([]);
  const [weatherData, setWeatherData] = useState<Record<string, any>>({});
  const [trafficIncidents, setTrafficIncidents] = useState<any[]>([]);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch parcels and routes
  const { data: parcels, isLoading: isParcelsLoading } = useQuery<Parcel[]>({
    queryKey: ["/api/parcels"],
  });

  const { data: routes, isLoading: isRoutesLoading } = useQuery<Route[]>({
    queryKey: ["/api/routes"],
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

  // Mutation for creating a new route
  const routeMutation = useMutation({
    mutationFn: (newRoute: Omit<Route, "id" | "routePath" | "active" | "weather" | "traffic">) =>
      apiRequest("POST", "/api/routes", newRoute),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      toast({
        title: "Route Created",
        description: "The new route has been successfully added.",
      });
      form.reset(); // Reset form fields after successful submission
      setSelectedParcel(null); // Deselect the parcel after creating the route
      setOptimizedRoute(null); // Clear optimized route
      setIntermediateStops([]); // Clear intermediate stops
      setWeatherData({}); // Clear weather data
      setTrafficIncidents([]); // Clear traffic incidents
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Route",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  // Define the onSubmit function
  const onSubmit = async (values: z.infer<typeof routeFormSchema>) => {
    if (!selectedParcel) {
      toast({
        title: "Error",
        description: "Please select a parcel before creating a route.",
        variant: "destructive",
      });
      return;
    }

    // Assuming routePath is derived from the optimized route or an empty array if not optimized
    const routePath = optimizedRoute?.path.map(([lat, lng]) => ({ lat, lng })) || [];

    // You might want to get actual weather and traffic data relevant to the *new* route here
    // For now, we'll use placeholder or previously fetched data if available
    const weather = weatherData[selectedParcel.origin] ? { conditions: weatherData[selectedParcel.origin].weather } : null;
    const traffic = trafficIncidents.length > 0 ? { congestion: "moderate" } : null; // Simplified for example

    routeMutation.mutate({
      parcelId: values.parcelId,
      transportMode: values.transportMode,
      duration: values.duration,
      distance: values.distance,
      routePath: routePath,
      active: true, // New routes are typically active
      weather: weather,
      traffic: traffic,
    });
  };

  // Handle parcel selection
  const handleParcelSelect = (parcelId: number) => {
    const parcel = parcels?.find((p) => p.id === parcelId);
    if (parcel) {
      setSelectedParcel(parcel);
      form.setValue("parcelId", parcel.id);
      setOptimizedRoute(null); // Clear previous optimization
      setIntermediateStops([]);
    }
  };

  // Generate Bounding Box Around Path
  function generateBBoxAroundPath(path: L.LatLngExpression[]) {
    const coords = path.map((p: any) => ({ lat: p[0], lon: p[1] }));
    const lats = coords.map(c => c.lat);
    const lons = coords.map(c => c.lon);

    const delta = 0.5;
    return [
      Math.min(...lons) - delta,
      Math.min(...lats) - delta,
      Math.max(...lons) + delta,
      Math.max(...lats) + delta,
    ];
  }

  // Fetch weather for stops
  useEffect(() => {
    if (!selectedParcel) return;

    const fetchWeatherForLocations = async () => {
      try {
        const locations = [
          selectedParcel.origin,
          ...intermediateStops,
          selectedParcel.destination,
        ];

        const weatherResults: Record<string, any> = {};

        for (const location of locations) {
          const response = await apiRequest("GET", "/api/weather", {
            params: { location },
          });

          if (!response.error && response.lat && response.lon) {
            weatherResults[location] = response;
          }
        }

        setWeatherData(weatherResults);
      } catch (error) {
        console.error("Error fetching weather:", error);
      }
    };

    fetchWeatherForLocations();
  }, [selectedParcel, intermediateStops]);

  // Fetch traffic incidents along the route
  useEffect(() => {
    if (!selectedParcel) return;

    const fetchTraffic = async () => {
      try {
        const originResponse = await apiRequest("GET", "/api/geocode", {
          params: { location: selectedParcel.origin },
        });
        const destResponse = await apiRequest("GET", "/api/geocode", {
          params: { location: selectedParcel.destination },
        });

        if (!originResponse.lat || !originResponse.lon || !destResponse.lat || !destResponse.lon) return;

        const bbox = generateBBoxAroundPath([
          [originResponse.lat, originResponse.lon],
          [destResponse.lat, destResponse.lon],
        ]).join(",");

        const incidentResponse = await apiRequest("GET", "/api/traffic/incidents", {
          params: { location: selectedParcel.origin },
        });

        if (!incidentResponse.error && Array.isArray(incidentResponse)) {
          setTrafficIncidents(incidentResponse);
        }
      } catch (error) {
        console.error("Error fetching traffic:", error);
      }
    };

    fetchTraffic();
  }, [selectedParcel]);

  // Initialize map when component mounts
  useEffect(() => {
    if (mapRef.current && !leafletMapRef.current) {
      leafletMapRef.current = L.map(mapRef.current).setView([20.5937, 78.9629], 5); // India center
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright ">OpenStreetMap</a> contributors',
      }).addTo(leafletMapRef.current);
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Draw route and markers
  useEffect(() => {
    if (leafletMapRef.current && routes && routes.length > 0) {
      leafletMapRef.current.eachLayer(layer => {
        if (
          layer instanceof L.Polyline ||
          layer instanceof L.Marker ||
          (layer.options as any)?.className === "optimized-route"
        ) {
          leafletMapRef.current?.removeLayer(layer);
        }
      });

      const filteredRoutes =
        transportFilter === "all"
          ? routes
          : routes.filter(route => route.transportMode === transportFilter);

      filteredRoutes.forEach(route => {
        if (route.routePath && Array.isArray(route.routePath)) {
          const points = route.routePath.map(point => [point.lat, point.lng]);
          if (points.length >= 2) {
            const color =
              route.transportMode === "road"
                ? "#22c55e"
                : route.transportMode === "rail"
                  ? "#3b82f6"
                  : "#8b5cf6";

            L.polyline(points as L.LatLngExpression[], {
              color,
              weight: 3,
              opacity: 0.7,
            }).addTo(leafletMapRef.current!);

            L.marker(points[0]).addTo(leafletMapRef.current!).bindPopup("Origin");
            L.marker(points[points.length - 1])
              .addTo(leafletMapRef.current!)
              .bindPopup("Destination");
          }
        }
      });

      // Draw optimized route
      if (optimizedRoute?.path) {
        L.polyline(optimizedRoute.path, {
          color: "#ef4444",
          weight: 4,
          className: "optimized-route",
        }).addTo(leafletMapRef.current);

        L.marker(optimizedRoute.path[0]).addTo(leafletMapRef.current).bindPopup("Start");
        L.marker(optimizedRoute.path[optimizedRoute.path.length - 1])
          .addTo(leafletMapRef.current)
          .bindPopup("End");
      }

      // Draw weather markers
      Object.entries(weatherData).forEach(([location, data]) => {
        const lat = data.lat;
        const lon = data.lon;
        const iconUrl = data.weather === "Rain"
          ? "https://cdn-icons-png.flaticon.com/512/1163/1163661.png "
          : "https://cdn-icons-png.flaticon.com/512/1163/1163661.png "; // Consider a sun icon for non-rainy weather

        const icon = L.icon({
          iconUrl,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        L.marker([lat, lon], { icon })
          .addTo(leafletMapRef.current!)
          .bindPopup(`<strong>${location}</strong><br>${data.weather}`);
      });

      // Draw traffic incidents
      trafficIncidents.forEach((incident) => {
        const [lon, lat] = incident.location;
        const iconUrl = incident.isRoadClosed
          ? "https://cdn-icons-png.flaticon.com/512/1163/1163661.png " // Consider a specific incident icon
          : "https://cdn-icons-png.flaticon.com/512/1163/1163661.png ";

        const icon = L.icon({
          iconUrl,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        L.marker([lat, lon], { icon })
          .addTo(leafletMapRef.current!)
          .bindPopup(`<strong>Traffic Incident</strong><br>${incident.title}`);
      });
    }
  }, [routes, transportFilter, optimizedRoute, weatherData, trafficIncidents]);

  // Handle optimize button click
  const handleOptimize = async () => {
    if (!selectedParcel) {
      toast({
        title: "No Parcel Selected",
        description: "Please select a parcel to optimize a route.",
        variant: "destructive",
      });
      return;
    }

    setIsOptimizing(true);

    try {
      const origin = selectedParcel.origin;
      const destination = selectedParcel.destination;

      const payload = {
        start: origin,
        end: destination,
        intermediate_post_offices: intermediateStops,
      };

      const response = await apiRequest("POST", "/api/route/dynamic", payload);

      if (response.error) throw new Error(response.error);

      if (response.routePath && Array.isArray(response.routePath)) {
        const latLngPath = response.routePath.map((point: any) => [point.lat, point.lng]);
        setOptimizedRoute({ path: latLngPath });
      }

      form.setValue(
        "transportMode",
        optimizationMode === "speed" ? "air" :
          optimizationMode === "cost" ? "road" : "rail"
      );
      form.setValue("duration", response.duration || "N/A");
      form.setValue("distance", response.distance || "N/A");

      toast({
        title: "Route Optimized",
        description: `Route optimized for ${optimizationMode} using real-time data.`,
      });
    } catch (error: any) {
      toast({
        title: "Optimization Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const getTransportIcon = (mode: string) => {
    switch (mode) {
      case "road": return <TruckIcon className="h-4 w-4" />;
      case "rail": return <TrainIcon className="h-4 w-4" />;
      case "air": return <PlaneIcon className="h-4 w-4" />;
      case "multimodal": return <RouteIcon className="h-4 w-4" />; // Using a generic route icon for multimodal
      default: return null;
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
                                {/* Display specific weather data from state if available */}
                                <p className="text-sm font-medium">
                                  {selectedParcel && weatherData[selectedParcel.origin]?.weather || "N/A"}
                                </p>
                              </div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded flex items-center">
                              <ThermometerIcon className="h-5 w-5 text-orange-500 mr-2" />
                              <div>
                                <p className="text-xs text-slate-500">Temperature</p>
                                <p className="text-sm font-medium">
                                  {selectedParcel && weatherData[selectedParcel.origin]?.temperature ?
                                    `${weatherData[selectedParcel.origin].temperature}°F` : "N/A"}
                                </p>
                              </div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded flex items-center">
                              <Wind className="h-5 w-5 text-slate-500 mr-2" />
                              <div>
                                <p className="text-xs text-slate-500">Wind</p>
                                <p className="text-sm font-medium">
                                  {selectedParcel && weatherData[selectedParcel.origin]?.windSpeed ?
                                    `${weatherData[selectedParcel.origin].windSpeed} mph ${weatherData[selectedParcel.origin]?.windDirection || ''}` : "N/A"}
                                </p>
                              </div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded flex items-center">
                              <RouteIcon className="h-5 w-5 text-red-500 mr-2" />
                              <div>
                                <p className="text-xs text-slate-500">Traffic</p>
                                <p className="text-sm font-medium">
                                  {trafficIncidents.length > 0 ? "Incidents Reported" : "Clear"}
                                </p>
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
                                {/* Conditional rendering for weather icon */}
                                {(route.weather as any).conditions?.toLowerCase().includes("rain") ?
                                  <CloudRain className="h-4 w-4 text-blue-500 mr-1" /> :
                                  <SunIcon className="h-4 w-4 text-amber-500 mr-1" />
                                }
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