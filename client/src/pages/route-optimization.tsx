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
import axios from "axios";  // For client-side geocoding via OpenStreetMap Nominatim
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
  const [intermediateStops, setIntermediateStops] = useState<string[]>([]); // For future intermediate stops
  const [weatherData, setWeatherData] = useState<Record<string, any>>({});
  const [trafficIncidents, setTrafficIncidents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("map"); // Track the active tab

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
    const resp = await axios.get("https://nominatim.openstreetmap.org/search",  {
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
      // Invalidate queries to refetch and update the routes table
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      toast({
        title: "Route Created",
        description: "The new route has been successfully added.",
      });
      // Reset form and clear selected states after successful creation
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
   * This function is called when the "Create Route" button is clicked.
   * @param values The form values validated by Zod.
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
    // Convert optimized route path to the format expected by the backend schema
    const routePath = optimizedRoute?.path.map(([lat, lng]) => ({ lat, lng })) || [];
    // Construct weather and traffic objects based on fetched data for the origin
    // Note: You might want more sophisticated logic for aggregating weather/traffic
    // across the entire route or for specific intermediate points.
    const weather = weatherData[selectedParcel.origin] ?
      { conditions: weatherData[selectedParcel.origin].weather, temperature: weatherData[selectedParcel.origin].temperature } : null;
    const traffic = trafficIncidents.length > 0 ? { congestion: "moderate" } : null; // Simplified traffic status

    // Trigger the route creation mutation
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

  /**
   * Handles the selection of a parcel from the list.
   * Sets the selected parcel state and clears previous optimization results.
   * @param parcelId The ID of the selected parcel.
   */
  const handleParcelSelect = (parcelId: number) => {
    const parcel = parcels?.find((p) => p.id === parcelId);
    if (parcel) {
      setSelectedParcel(parcel);
      form.setValue("parcelId", parcel.id); // Set parcelId in the form
      setOptimizedRoute(null); // Clear any previously optimized route
      setIntermediateStops([]); // Clear intermediate stops
      setWeatherData({}); // Clear weather data
      setTrafficIncidents([]); // Clear traffic incidents
    }
  };

  /**
   * Generates a bounding box around a given path of LatLng points.
   * This is used to fetch traffic incidents or weather data relevant to the route area.
   * @param path An array of Leaflet LatLngExpression points.
   * @returns An array representing the bounding box: [minLon, minLat, maxLon, maxLat].
   */
  function generateBBoxAroundPath(path: L.LatLngExpression[]) {
    const coords = path.map((p: any) => ({ lat: p[0], lon: p[1] }));
    const lats = coords.map(c => c.lat);
    const lons = coords.map(c => c.lon);
    const delta = 0.5; // A small buffer for the bounding box
    return [
      Math.min(...lons) - delta,
      Math.min(...lats) - delta,
      Math.max(...lons) + delta,
      Math.max(...lats) + delta,
    ];
  }

  /**
   * Effect hook to fetch weather data for the selected parcel's origin, destination,
   * and any intermediate stops.
   * Runs whenever `selectedParcel` or `intermediateStops` change.
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
          // Fetch weather via GET without a request body (append query param)
          const response = await apiRequest(
            "GET",
            `/api/weather?location=${encodeURIComponent(location)}`
          );
          // Store weather data if successful and coordinates are available
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
   * Effect hook to fetch traffic incidents along the route of the selected parcel.
   * Runs whenever `selectedParcel` changes.
   */
  useEffect(() => {
    if (!selectedParcel) return;
    const fetchTraffic = async () => {
      try {
        // Geocode origin and destination to get coordinates for bounding box
        const originResponse = await apiRequest("GET", `/api/geocode?location=${encodeURIComponent(selectedParcel.origin)}`);
        const destResponse = await apiRequest("GET",
          `/api/geocode?location=${encodeURIComponent(selectedParcel.destination)}`
        );
        // Log responses for debugging
        console.log("Origin geocode response:", originResponse);
        console.log("Destination geocode response:", destResponse);
        if (!originResponse.lat || !originResponse.lon || !destResponse.lat || !destResponse.lon) {
          console.warn("Could not geocode origin or destination for traffic incidents.");
          return;
        }
        // Generate a bounding box around the origin and destination
        const bbox = generateBBoxAroundPath([
          [originResponse.lat, originResponse.lon],
          [destResponse.lat, destResponse.lon],
        ]).join(",");
        // Fetch traffic incidents within the bounding box (using origin as a proxy for location param)
        const incidentResponse = await apiRequest(
          "GET",
          `/traffic/incidents?location=${encodeURIComponent(selectedParcel.origin)}`
        );
        if (!incidentResponse.error && Array.isArray(incidentResponse)) {
          setTrafficIncidents(incidentResponse);
        } else {
          console.warn("No traffic incidents found or error fetching:", incidentResponse.error);
          setTrafficIncidents([]); // Clear incidents if there's an error or no data
        }
      } catch (error) {
        console.error("Error fetching traffic:", error);
        setTrafficIncidents([]);
      }
    };
    fetchTraffic();
  }, [selectedParcel]);

  /**
   * Effect hook to initialize the Leaflet map when the component mounts.
   * Cleans up the map instance when the component unmounts.
   */
  useEffect(() => {
    if (mapRef.current && !leafletMapRef.current) {
      // Initialize map centered on India with a zoom level
      leafletMapRef.current = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
      // Add OpenStreetMap tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",  {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright  ">OpenStreetMap</a> contributors',
      }).addTo(leafletMapRef.current);
    }
    // Cleanup function: remove map when component unmounts
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
      // Delay to allow tab content to render
      setTimeout(() => {
        leafletMapRef.current?.invalidateSize();
      }, 100);
    }
  }, [activeTab]);

  /**
   * Effect hook to draw/update routes, markers, weather, and traffic incidents on the map.
   * Runs whenever routes, transportFilter, optimizedRoute, weatherData, or trafficIncidents change.
   */


  /* I COMMENED THIS BUT WE CAN CHANGE THIS LATER IF I NEED MULTIPLE INFO ON ROUTES
  useEffect(() => {
    if (leafletMapRef.current) {
      // Clear all existing polylines, markers, and custom layers
      leafletMapRef.current.eachLayer(layer => {
        if (
          layer instanceof L.Polyline ||
          layer instanceof L.Marker ||
          (layer.options as any)?.className === "optimized-route" ||
          (layer.options as any)?.className === "weather-marker" ||
          (layer.options as any)?.className === "traffic-incident-marker"
        ) {
          leafletMapRef.current?.removeLayer(layer);
        }
      });
      // Filter existing routes based on the selected transport mode
      const filteredRoutes =
        transportFilter === "all"
          ? routes
          : routes?.filter(route => route.transportMode === transportFilter);
      // Draw existing routes on the map
      filteredRoutes?.forEach(route => {
        if (route.routePath && Array.isArray(route.routePath)) {
          const points = route.routePath.map(point => [point.lat, point.lng]);
          if (points.length >= 2) {
            // Determine color based on transport mode
            const color =
              route.transportMode === "road"
                ? "#22c55e" // Green for road
                : route.transportMode === "rail"
                  ? "#3b82f6" // Blue for rail
                  : "#8b5cf6"; // Purple for air/multimodal
            L.polyline(points as L.LatLngExpression[], {
              color,
              weight: 3,
              opacity: 0.7,
            }).addTo(leafletMapRef.current!);
            // Add origin and destination markers for existing routes
            L.marker(points[0]).addTo(leafletMapRef.current!).bindPopup(`Origin: ${route.parcelId}`);
            L.marker(points[points.length - 1])
              .addTo(leafletMapRef.current!)
              .bindPopup(`Destination: ${route.parcelId}`);
          }
        }
      });
      // Draw the newly optimized route (if available)
      if (optimizedRoute?.path && optimizedRoute.path.length >= 2) {
        L.polyline(optimizedRoute.path, {
          color: "#ef4444", // Red for optimized route
          weight: 4,
          className: "optimized-route",
        }).addTo(leafletMapRef.current);
        // Add start and end markers for the optimized route
        L.marker(optimizedRoute.path[0]).addTo(leafletMapRef.current).bindPopup("Optimized Route Start");
        L.marker(optimizedRoute.path[optimizedRoute.path.length - 1])
          .addTo(leafletMapRef.current)
          .bindPopup("Optimized Route End");
        // Fit map bounds to the optimized route
        leafletMapRef.current.fitBounds(L.latLngBounds(optimizedRoute.path as L.LatLng[]));
      }
      // Draw weather markers based on fetched weather data
      Object.entries(weatherData).forEach(([location, data]) => {
        const lat = data.lat;
        const lon = data.lon;
        // Choose icon based on weather conditions
        const iconUrl = data.weather?.toLowerCase().includes("rain") || data.weather?.toLowerCase().includes("cloud")
          ? "https://cdn-icons-png.flaticon.com/512/1163/1163661.png"  // Cloud/Rain icon
          : "https://cdn-icons-png.flaticon.com/512/2698/2698194.png";  // Sun icon for clear weather
        const icon = L.icon({
          iconUrl,
          iconSize: [25, 25], // Slightly larger for better visibility
          iconAnchor: [12, 25], // Anchor at the bottom center of the icon
          className: "weather-marker"
        });
        L.marker([lat, lon], { icon })
          .addTo(leafletMapRef.current!)
          .bindPopup(`<strong>${location}</strong><br>Weather: ${data.weather || 'N/A'}<br>Temp: ${data.temperature || 'N/A'}°F`);
      });
      // Draw traffic incidents on the map
      trafficIncidents.forEach((incident) => {
        const [lon, lat] = incident.location; // Assuming location is [lon, lat] from backend
        // Use a generic alert icon for traffic incidents
        const iconUrl = "https://cdn-icons-png.flaticon.com/512/1163/1163661.png";  // Generic traffic incident icon
        const icon = L.icon({
          iconUrl,
          iconSize: [25, 25],
          iconAnchor: [12, 25],
          className: "traffic-incident-marker"
        });
        L.marker([lat, lon], { icon })
          .addTo(leafletMapRef.current!)
          .bindPopup(`<strong>Traffic Incident</strong><br>${incident.title || 'N/A'}<br>Type: ${incident.type || 'N/A'}`);
      });
    }
  }, [routes, transportFilter, optimizedRoute, weatherData, trafficIncidents]);   */
useEffect(() => {
  if (leafletMapRef.current) {
    // Clear previous layers
    leafletMapRef.current.eachLayer(layer => {
      if ((layer as L.Polyline).options?.className === "optimized-route") {
        leafletMapRef.current!.removeLayer(layer);
      }
    });

    // Draw optimized route
    if (optimizedRoute?.path && optimizedRoute.path.length >= 2) {
      L.polyline(optimizedRoute.path, {
        color: "#ef4444",
        weight: 4,
        className: "optimized-route",
      }).addTo(leafletMapRef.current);

      // Add markers
      L.marker(optimizedRoute.path[0])
        .addTo(leafletMapRef.current)
        .bindPopup("Start");

      L.marker(optimizedRoute.path[optimizedRoute.path.length - 1])
        .addTo(leafletMapRef.current)
        .bindPopup("End");

      // Auto-zoom to route
      leafletMapRef.current.fitBounds(L.latLngBounds(optimizedRoute.path as L.LatLng[]));
    }
  }
}, [optimizedRoute]);
  /**
   * Handles the click event for the "Optimize Route" button.
   * Triggers the backend optimization API call and updates UI states.
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
    setIsOptimizing(true);
    try {
      const origin = selectedParcel.origin;
      const destination = selectedParcel.destination;
      const payload = {
        start: origin,
        end: destination,
        intermediate_post_offices: intermediateStops,
      };
      // console.log("Optimizing route with payload:", payload);
      const response = await apiRequest("POST", "/api/route/optimized", payload);
      if (response.error) throw new Error(response.error);

      // ✅ CORRECTED PARSING LOGIC HERE
      if (response.optimized_route && Array.isArray(response.optimized_route)) {
        const latLngPath = response.optimized_route
          .filter(point => Array.isArray(point) && point.length >= 2)
          .map(point => [point[0], point[1]]); // Convert [lat, lon] to Leaflet-friendly format

        setOptimizedRoute({ path: latLngPath });
        setActiveTab("map");
        // Update form fields with route details
        const eta = "N/A"; // Backend doesn't provide eta in current response
        const distance_km = response.optimized_route.length * 100; // Placeholder calculation
        form.setValue("duration", eta);
        form.setValue("distance", `${distance_km.toFixed(2)} km`);
      } else {
        console.warn("No route path found in optimization response:", response);
        setOptimizedRoute(null);
      }

      // Set transport mode based on optimization mode
      form.setValue(
        "transportMode",
        optimizationMode === "speed"
          ? "air"
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

  // Toggles the sidebar open/close state
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
                          <h4 className="text-sm font-medium">Current Conditions:</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {/* Weather Display */}
                            <div className="bg-slate-50 p-3 rounded flex items-center">
                              <CloudRain className="h-5 w-5 text-blue-500 mr-2" />
                              <div>
                                <p className="text-xs text-slate-500">Weather</p>
                                <p className="text-sm font-medium">
                                  {selectedParcel && weatherData[selectedParcel.origin]?.weather || "N/A"}
                                </p>
                              </div>
                            </div>
                            {/* Temperature Display */}
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
                            {/* Wind Display */}
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

                        {/* Optimize Route Button */}
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