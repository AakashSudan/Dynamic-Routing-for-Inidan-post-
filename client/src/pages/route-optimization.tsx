import Papa from "papaparse"; // ← NEW IMPORT
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
import axios from "axios";
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
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Define form schema for route creation
const routeFormSchema = z.object({
  parcelId: z.number().positive(),
  transportMode: z.enum(["road", "rail", "air", "multimodal"]),
  duration: z.string().min(1, "Duration is required"),
  distance: z.string().min(1, "Distance is required"),
});

export default function RouteOptimization() {
  // State variables for UI and data management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [optimizationMode, setOptimizationMode] = useState<"speed" | "cost" | "carbon">("speed");
  const [transportFilter, setTransportFilter] = useState<string>("all");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<{ path: L.LatLngExpression[] } | null>(null);
  const [intermediateStops, setIntermediateStops] = useState<string[]>([]);
  const [weatherData, setWeatherData] = useState<Record<string, any>>({});
  const [trafficIncidents, setTrafficIncidents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("map");
  const [weatherLocation, setWeatherLocation] = useState<string | null>(null);

  // NEW: State for head post offices from backend
  const [headPostOffices, setHeadPostOffices] = useState<
    { id: number; city: string; officeName: string; pincode: string; latitude: number; longitude: number }[]
  >([]);

  // Refs for Leaflet map integration
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);

  // React Query client and toast hook
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Geocode cache and client-side lookup using Nominatim
  const geocodeCache = useRef<Record<string, [number, number]>>({});
  const geocode = async (place: string): Promise<[number, number]> => {
    if (geocodeCache.current[place]) return geocodeCache.current[place];
    const resp = await axios.get("https://nominatim.openstreetmap.org/search",   {
      params: { q: place, format: "json", limit: 1 }
    });
    if (!resp.data || resp.data.length === 0) {
      throw new Error(`Geocode failed for ${place}`);
    }
    const { lat, lon } = resp.data[0];
    const coords: [number, number] = [parseFloat(lat), parseFloat(lon)];
    geocodeCache.current[place] = coords;
    return coords;
  };

  // Fetch parcels data using React Query
  const { data: parcels, isLoading: isParcelsLoading } = useQuery<Parcel[]>({
    queryKey: ["/api/parcels"],
  });

  // Fetch existing routes data using React Query
  const { data: routes, isLoading: isRoutesLoading } = useQuery<Route[]>({
    queryKey: ["/api/routes"],
  });

  // Initialize react-hook-form for route creation
  const form = useForm<z.infer<typeof routeFormSchema>>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: {
      parcelId: undefined,
      transportMode: "road",
      duration: "",
      distance: "",
    },
  });

  // Mutation hook for creating a new route via API
  const routeMutation = useMutation({
    mutationFn: (newRoute: Omit<Route, "id" | "active" | "weather" | "traffic">) =>
      apiRequest("POST", "/api/routes", newRoute),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      toast({
        title: "Route Created",
        description: "The new route has been successfully added.",
      });
      form.reset();
      setSelectedParcel(null);
      setOptimizedRoute(null);
      setIntermediateStops([]);
      setWeatherData({});
      setTrafficIncidents([]);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Route",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  /**
   * Handles the form submission for creating a new route.
   */
  const onSubmit = async (values: z.infer<typeof routeFormSchema>) => {
    if (!selectedParcel) {
      toast({
        title: "Error",
        description: "Please select a parcel before creating a route.",
        variant: "destructive",
      });
      return;
    }

    const routePath = optimizedRoute?.path.map(([lat, lng]) => ({ lat, lng })) || [];
    const weather = weatherData[selectedParcel.origin] ?
      { conditions: weatherData[selectedParcel.origin].weather, temperature: weatherData[selectedParcel.origin].temperature } : null;
    const traffic = trafficIncidents.length > 0 ? { congestion: "moderate" } : null;

    routeMutation.mutate({
      parcelId: values.parcelId,
      transportMode: values.transportMode,
      duration: values.duration,
      distance: values.distance,
      routePath: routePath,
      active: true,
      weather: weather,
      traffic: traffic,
    });
  };

  /**
   * Handles the selection of a parcel from the list.
   */
  const handleParcelSelect = (parcelId: number) => {
    const parcel = parcels?.find((p) => p.id === parcelId);
    if (parcel) {
      setSelectedParcel(parcel);
      form.setValue("parcelId", parcel.id);
      setOptimizedRoute(null);
      setIntermediateStops([]);
      setWeatherData({});
      setTrafficIncidents([]);
    }
  };

  /**
   * Generates a bounding box around a given path of LatLng points.
   */
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

  /**
   * Effect hook to fetch weather data for locations.
   */
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
          const res = await apiRequest(
            "GET",
            `/api/weather?location=${encodeURIComponent(location)}`
          );
          const response = await res.json();
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

  /**
   * Effect hook to fetch traffic incidents.
   */
  useEffect(() => {
    if (!selectedParcel) return;
    const fetchTraffic = async () => {
      try {
        const originRes = await apiRequest("GET", `/api/geocode?location=${encodeURIComponent(selectedParcel.origin)}`);
        const destRes = await apiRequest("GET", `/api/geocode?location=${encodeURIComponent(selectedParcel.destination)}`);
        const originResponse = await originRes.json();
        const destResponse = await destRes.json();
        if (!originResponse.lat || !originResponse.lon || !destResponse.lat || !destResponse.lon) {
          console.warn("Could not geocode origin or destination for traffic incidents.");
          return;
        }
        const bbox = generateBBoxAroundPath([
          [originResponse.lat, originResponse.lon],
          [destResponse.lat, destResponse.lon],
        ]).join(",");
        const incidentRes = await apiRequest(
          "GET",
          `/traffic/incidents?location=${encodeURIComponent(selectedParcel.origin)}`
        );
        const incidentResponse = await incidentRes.json();
        if (!incidentResponse.error && Array.isArray(incidentResponse)) {
          setTrafficIncidents(incidentResponse);
        } else {
          console.warn("No traffic incidents found or error fetching:", incidentResponse.error);
          setTrafficIncidents([]); 
        }
      } catch (error) {
        console.error("Error fetching traffic:", error);
        setTrafficIncidents([]);
      }
    };
    fetchTraffic();
  }, [selectedParcel]);

  /**
   * Initializes the Leaflet map.
   */
  useEffect(() => {
    if (mapRef.current && !leafletMapRef.current) {
      leafletMapRef.current = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",   {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>  contributors',
      }).addTo(leafletMapRef.current);
    }
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Recalculate map size when switching back to Map View
  useEffect(() => {
    if (activeTab === "map" && leafletMapRef.current) {
      setTimeout(() => {
        leafletMapRef.current?.invalidateSize();
      }, 100);
    }
  }, [activeTab]);

  /**
   * Draws optimized route and markers on the map.
   */
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;
    // Clear previous route and stop markers
    map.eachLayer((layer: any) => {
      const cls = (layer as any).options?.className;
      if (cls === "optimized-route" || cls === "intermediate-stop") {
        map.removeLayer(layer);
      }
    });
    const defaultIcon = L.icon({
      iconUrl: markerIcon,
      iconRetinaUrl: markerIcon2x,
      shadowUrl: markerShadow,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
    if (optimizedRoute?.path && optimizedRoute.path.length >= 2) {
      // Draw route line
      L.polyline(optimizedRoute.path, {
        color: "#ef4444",
        weight: 4,
        className: "optimized-route",
      }).addTo(map);
      // Start and End markers
      L.marker(optimizedRoute.path[0], { icon: defaultIcon, className: "intermediate-stop" })
        .addTo(map)
        .bindPopup("Start");
      L.marker(optimizedRoute.path[optimizedRoute.path.length - 1], { icon: defaultIcon, className: "intermediate-stop" })
        .addTo(map)
        .bindPopup("End");
      // Intermediate stop markers
      intermediateStops.forEach((name) => {
        // match property name from CSV or backend
        const office = headPostOffices.find(
          (po) => po.officeName === name || po.OfficeName === name
        );
        if (office) {
          const lat = office.latitude ?? office.Latitude;
          const lng = office.longitude ?? office.Longitude;
          // only add marker if valid coordinates
          if (typeof lat === "number" && typeof lng === "number") {
            L.marker([lat, lng], { icon: defaultIcon, className: "intermediate-stop" })
              .addTo(map)
              .bindPopup(`Stop: ${office.officeName || office.OfficeName}`);
          }
        }
      });
      // Fit map bounds to route
      map.fitBounds(L.latLngBounds(optimizedRoute.path as L.LatLng[]));
    }
  }, [optimizedRoute, intermediateStops, headPostOffices]);

  /**
   * Load all head post offices from backend
   */
    useEffect(() => {
      fetch("/api/postoffices")
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch post offices");
          return res.json();
        })
        .then(data => setHeadPostOffices(data))
        .catch(err => {
          setHeadPostOffices([]);
          toast({ title: "Error", description: "Could not load post offices.", variant: "destructive" });
        });
    }, []);

  /**
   * Handles the click event for the "Optimize Route" button.
   */
  const handleOptimize = async () => {
    if (!selectedParcel) {
      toast({
        title: "No Parcel Selected",
        description: "Please select a parcel to optimize a route.",
        variant: "destructive",
      });
      return;
    }

    const stops = headPostOffices.map((po) => po.OfficeName);
    setIntermediateStops(stops);

    setIsOptimizing(true);
    try {
      const origin = selectedParcel.origin;
      const destination = selectedParcel.destination;
      const payload = {
        start: origin,
        end: destination,
        intermediate_post_offices: stops,
        // Set route_type based on optimization selection
        route_type: optimizationMode === "speed"
          ? "shortest"
          : optimizationMode === "cost"
            ? "fastest"
            : "fastest",
        travel_mode: optimizationMode === "rail" ? "rail" : "car",
      };
      const raw = await apiRequest("POST", "/api/route/optimized", payload);
      const response = await raw.json();          
      if (response.error) throw new Error(response.error);
      if (response.route && Array.isArray(response.route)) {
        const latLngPath = response.route
          .filter(point => Array.isArray(point) && point.length >= 2)
          .map(point => [point[0], point[1]]);
        setOptimizedRoute({ path: latLngPath });
        setActiveTab("map");
        const etaValue = response.eta ?? "N/A";
        const distanceValue = response.distance;
        const distanceStr = typeof distanceValue === 'number'
          ? `${distanceValue.toFixed(2)} km`
          : "N/A";
        form.setValue("duration", etaValue);
        form.setValue("distance", distanceStr);
      } else {
        setOptimizedRoute(null);
      }
      form.setValue(
        "transportMode",
        optimizationMode === "speed"
          ? "rail"
          : optimizationMode === "cost"
            ? "road"
            : "rail"
      );
      toast({
        title: "Route Optimized",
        description: `Route optimized for ${optimizationMode} using real-time data.`,
      });
    } catch (error: any) {
      toast({
        title: "Optimization Failed",
        description: error.message || "An unexpected error occurred during optimization.",
        variant: "destructive",
      });
      setOptimizedRoute(null);
    } finally {
      setIsOptimizing(false);
    }
  };

  /**
   * Plot a map marker for each head post office
   */
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;
    // Remove previous office markers
    map.eachLayer((layer: any) => {
      if (layer.options?.className === "office-marker") {
        map.removeLayer(layer);
      }
    });
    // Red icon for post offices
    const redIcon = L.icon({
      iconUrl: markerIcon,
      iconRetinaUrl: markerIcon2x,
      shadowUrl: markerShadow,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
      className: "office-marker",
    });
    headPostOffices.forEach((office) => {
      if (typeof office.latitude === 'number' && typeof office.longitude === 'number') {
        L.marker([office.latitude, office.longitude], { icon: redIcon, className: "office-marker" })
          .addTo(map)
          .bindPopup(
            `<strong>${office.officeName}</strong><br/>${office.city} - ${office.pincode}`
          );
      }
    });
  }, [headPostOffices]);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  /**
   * Returns the appropriate Lucide React icon component based on the transport mode.
   * @param mode The transport mode string (e.g., "road", "rail", "air").
   * @returns A React icon component or null if no match.
   */
  const getTransportIcon = (mode: string) => {
    switch (mode) {
      case "road": return <TruckIcon className="h-4 w-4" />;
      case "rail": return <TrainIcon className="h-4 w-4" />;
      case "air": return <PlaneIcon className="h-4 w-4" />;
      case "multimodal": return <RouteIcon className="h-4 w-4" />; // Generic icon for multimodal
      default: return null;
    }
  };

  useEffect(() => {
    const handleTabChange = (tab: string) => {
      if (tab === "map" && leafletMapRef.current) {
        leafletMapRef.current.invalidateSize();
      }
    };
    // Add event listener for tab changes
    const tabsElement = document.querySelector("[data-tabs]");
    if (tabsElement) {
      tabsElement.addEventListener("tabChange", (event: any) => handleTabChange(event.detail));
    }
    // Cleanup event listener on unmount
    return () => {
      if (tabsElement) {
        tabsElement.removeEventListener("tabChange", (event: any) => handleTabChange(event.detail));
      }
    };
  }, []);

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
            {/* Parcels for routing Card */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Select Parcel for Routing</CardTitle>
                <CardDescription>Choose a parcel to optimize a route</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                {isParcelsLoading ? (
                  // Skeleton loader for parcels
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
                  // Table to display available parcels
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
                  // Message when no parcels are available
                  <div className="flex flex-col items-center justify-center h-[300px] px-6">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">No parcels available for routing</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Route Optimization Card */}
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
                <Tabs
                  defaultValue="map"
                  className="h-full"
                  onValueChange={(value) => setActiveTab(value)} // Track tab changes
                >
                  <TabsList className="grid grid-cols-2 mb-6">
                    <TabsTrigger value="map">Map View</TabsTrigger>
                    <TabsTrigger value="form">Route Details</TabsTrigger>
                  </TabsList>

                  {/* Map View Tab Content */}
                  <div className={activeTab === "map" ? "relative h-[400px] mb-6" : "hidden"}>
                    <div className="absolute inset-x-0 top-0 p-2 z-10 flex justify-between items-center">
                      <div className="flex space-x-2">
                        {/* Transport Mode Filters for Map */}
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

                      <Button variant="outline" size="sm" className="h-7" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/routes"] })}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Refresh
                      </Button>
                    </div>

                    {/* Map Container */}
                    <div ref={mapRef} className="h-full w-full z-0"></div>

                    {/* Loading overlay for map */}
                    {isRoutesLoading && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <LoaderIcon className="h-8 w-8 text-primary animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Route Details Form Tab Content */}
                  {activeTab === "form" && (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Optimization Options Section */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Optimization Preferences</h3>

                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Optimize For:</h4>
                          <div className="flex space-x-2">
                            {/* Optimization Mode Buttons */}
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
                          <div className="flex items-center mb-1">
                            <h4 className="text-sm font-medium mr-2">Current Conditions:</h4>
                            {/* Weather Location Selector */}
                            {selectedParcel && (
                              <Select
                                value={weatherLocation || selectedParcel.origin}
                                onValueChange={setWeatherLocation}
                              >
                                <SelectTrigger className="w-48 ml-2">
                                  <SelectValue placeholder="Select location" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={selectedParcel.origin}>Origin: {selectedParcel.origin}</SelectItem>
                                  {intermediateStops.map((stop, idx) => (
                                    <SelectItem key={stop} value={stop}>Stop {idx + 1}: {stop}</SelectItem>
                                  ))}
                                  <SelectItem value={selectedParcel.destination}>Destination: {selectedParcel.destination}</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          {/* Loading overlay for weather/traffic */}
                          {((isParcelsLoading || isRoutesLoading || !weatherData[(weatherLocation || selectedParcel?.origin) ?? ''])) && (
                            <div className="flex items-center space-x-2 text-slate-500 mb-2">
                              <LoaderIcon className="h-4 w-4 animate-spin" />
                              <span>Loading weather/traffic data...</span>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            {/* Weather Display */}
                            <div className="bg-slate-50 p-3 rounded flex items-center">
                              <CloudRain className="h-5 w-5 text-blue-500 mr-2" />
                              <div>
                                <p className="text-xs text-slate-500">Weather</p>
                                <p className="text-sm font-medium">
                                  {selectedParcel && weatherData[weatherLocation || selectedParcel.origin]?.weather || "N/A"}
                                </p>
                              </div>
                            </div>
                            {/* Temperature Display */}
                            <div className="bg-slate-50 p-3 rounded flex items-center">
                              <ThermometerIcon className="h-5 w-5 text-orange-500 mr-2" />
                              <div>
                                <p className="text-xs text-slate-500">Temperature</p>
                                <p className="text-sm font-medium">
                                  {selectedParcel && weatherData[weatherLocation || selectedParcel.origin]?.temperature !== undefined
                                    ? `${weatherData[weatherLocation || selectedParcel.origin].temperature}°C`
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                            {/* Wind Display */}
                            <div className="bg-slate-50 p-3 rounded flex items-center">
                              <Wind className="h-5 w-5 text-slate-500 mr-2" />
                              <div>
                                <p className="text-xs text-slate-500">Wind</p>
                                <p className="text-sm font-medium">
                                  {selectedParcel && weatherData[weatherLocation || selectedParcel.origin]?.windSpeed !== undefined
                                    ? `${weatherData[weatherLocation || selectedParcel.origin].windSpeed} km/h ${weatherData[weatherLocation || selectedParcel.origin]?.windDirection || ''}`
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                            {/* Risk Display */}
                            <div className="bg-slate-50 p-3 rounded flex items-center">
                              <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
                              <div>
                                <p className="text-xs text-slate-500">Weather Risk</p>
                                <p className="text-sm font-medium">
                                  {selectedParcel && weatherData[weatherLocation || selectedParcel.origin]?.risk
                                    ? weatherData[weatherLocation || selectedParcel.origin].risk.charAt(0).toUpperCase() + weatherData[weatherLocation || selectedParcel.origin].risk.slice(1)
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                            {/* Traffic Display */}
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



                      {}

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

                      {/* Route Details Form Section */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Route Details</h3>

                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            {/* Transport Mode Field */}
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

                            {/* Estimated Duration Field */}
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

                            {/* Estimated Distance Field */}
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

                            {/* Create Route Button */}
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
                  </div>)}
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
                // Skeleton loader for routes table
                <div className="space-y-2 px-6">
                  {Array(3).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : routes && routes.length > 0 ? (
                // Table to display active routes
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
                                {/* Conditional rendering for weather icon based on conditions */}
                                {(route.weather as any).conditions?.toLowerCase().includes("rain") ||
                                 (route.weather as any).conditions?.toLowerCase().includes("cloud") ?
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
                // Message when no active routes are found
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