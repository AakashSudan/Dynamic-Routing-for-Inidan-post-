const subkey = "";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { FilterIcon, RefreshCw, MapPinIcon } from "lucide-react";
// import { useEffect, useState, useRef } from "react";
// import { Badge } from "@/components/ui/badge";
// import { Separator } from "@/components/ui/separator";
// import { useQuery } from "@tanstack/react-query";

// // Using leaflet for map visualization
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";

// // Import marker icon since Leaflet has issues with webpack
// import markerIcon from "leaflet/dist/images/marker-icon.png";
// import markerShadow from "leaflet/dist/images/marker-shadow.png";

// // Fix the Leaflet default icon issue
// delete (L.Icon.Default.prototype as any)._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconUrl: markerIcon,
//   shadowUrl: markerShadow,
//   iconSize: [25, 41],
//   iconAnchor: [12, 41],
// });

// type Region = "India" | "Europe" | "Asia Pacific" | "Global";

// export function RouteMap() {
//   const mapRef = useRef<HTMLDivElement>(null);
//   const leafletMapRef = useRef<L.Map | null>(null);
//   const [selectedRegion, setSelectedRegion] = useState<Region>("India");
//   const [isRefreshing, setIsRefreshing] = useState(false);

//   // Fetch routes data from API
//   const { data: routes, isLoading, refetch } = useQuery({
//     queryKey: ["/api/routes/active"],
//     staleTime: 60000, // 1 minute
//   });

//   // Initialize map when component mounts
//   useEffect(() => {
//     if (mapRef.current && !leafletMapRef.current) {
//       leafletMapRef.current = L.map(mapRef.current).setView([25.0479, 77.6197], 5);
      
//       // Add tile layer (map background)
//       L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
//         attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//       }).addTo(leafletMapRef.current);
//     }
    
//     // Cleanup on unmount
//     return () => {
//       if (leafletMapRef.current) {
//         leafletMapRef.current.remove();
//         leafletMapRef.current = null;
//       }
//     };
//   }, []);

//   // Function to handle region change
//   const handleRegionChange = (value: string) => {
//     setSelectedRegion(value as Region);
    
//     // Update map view based on selected region
//     if (leafletMapRef.current) {
//       switch (value) {
//         case "India":
//           leafletMapRef.current.setView([25.0479, 77.6197], 5);
//           break;
//         case "Europe":
//           leafletMapRef.current.setView([48.8566, 2.3522], 5);
//           break;
//         case "Asia Pacific":
//           leafletMapRef.current.setView([34.0479, 100.6197], 3);
//           break;
//         case "Global":
//           leafletMapRef.current.setView([20, 0], 2);
//           break;
//       }
//     }
//   };

//   // Function to handle refresh button click
//   const handleRefresh = () => {
//     setIsRefreshing(true);
//     refetch().finally(() => {
//       setTimeout(() => setIsRefreshing(false), 1000);
//     });
//   };

//   return (
//     <Card className="col-span-1 lg:col-span-2 h-[500px] relative overflow-hidden">
//       <CardHeader className="p-4 border-b border-slate-200 flex flex-row items-center justify-between space-y-0">
//         <CardTitle className="font-semibold text-slate-800">Live Route Visualization</CardTitle>
//         <div className="flex space-x-2">
//           <Button variant="outline" size="sm" className="h-8 text-xs">
//             <FilterIcon className="h-3.5 w-3.5 mr-1" />
//             Filter
//           </Button>
//           <Button 
//             variant="default" 
//             size="sm" 
//             className="h-8 text-xs"
//             onClick={handleRefresh}
//           >
//             <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
//             Refresh
//           </Button>
//         </div>
//       </CardHeader>
      
//       <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-2 items-center overflow-visible z-50">
//         <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
//           <span className="h-2 w-2 rounded-full bg-green-500 mr-1"></span> Road
//         </Badge>
//         <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
//           <span className="h-2 w-2 rounded-full bg-blue-500 mr-1"></span> Rail
//         </Badge>
//         <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-100">
//           <span className="h-2 w-2 rounded-full bg-purple-500 mr-1"></span> Air
//         </Badge>
//         <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
//           <span className="h-2 w-2 rounded-full bg-amber-500 mr-1"></span> Delayed
//         </Badge>
        
//         <div className="ml-auto">
//           <Select value={selectedRegion} onValueChange={handleRegionChange}>
//             <SelectTrigger className="h-8 text-xs w-[140px]">
//               <SelectValue placeholder="Select region" />
//             </SelectTrigger>
//             <SelectContent position="popper" className="w-[140px]">
//               <SelectItem value="India">India</SelectItem>
//               <SelectItem value="Europe">Europe</SelectItem>
//               <SelectItem value="Asia Pacific">Asia Pacific</SelectItem>
//               <SelectItem value="Global">Global</SelectItem>
//             </SelectContent>
//           </Select>
//         </div>
//       </div>
      
//       <div className="relative h-[378px] z-0">
//         {/* Map Container */}
//         <div id="route-map" ref={mapRef} className="h-full w-full z-0"></div>
        
//         {/* Route Legend */}
//         <div className="absolute bottom-4 left-4 bg-white bg-opacity-20 rounded p-2 shadow-lg text-xs w-48 z-2">
//           <div className="font-medium mb-1 text-slate-800">Route Statistics</div>
//           <Separator className="my-1" />
//           <div className="space-y-1">
//             <div className="flex justify-between">
//               <span>Active Routes:</span>
//               <span className="font-medium">87</span>
//             </div>
//             <div className="flex justify-between">
//               <span>Road Transit:</span>
//               <span className="font-medium">64%</span>
//             </div>
//             <div className="flex justify-between">
//               <span>Rail Transit:</span>
//               <span className="font-medium">23%</span>
//             </div>
//             <div className="flex justify-between">
//               <span>Air Transit:</span>
//               <span className="font-medium">13%</span>
//             </div>
//           </div>
//         </div>
        
//         {/* Loading overlay */}
//         {isLoading && (
//           <div className="absolute inset-0 bg-slate-100/80 flex items-center justify-center">
//             <div className="flex flex-col items-center">
//               <RefreshCw className="h-8 w-8 text-primary animate-spin mb-2" />
//               <p className="text-slate-600">Loading map data...</p>
//             </div>
//           </div>
//         )}
        
//         {/* Empty state */}
//         {!isLoading && (!routes || routes.length === 0) && (
//           <div className="absolute inset-0 flex items-center justify-center flex-col">
//             <MapPinIcon className="h-16 w-16 text-slate-300 mb-4" />
//             <p className="text-slate-500">No active routes available</p>
//             <p className="text-slate-400 text-sm mt-2">
//               Try changing the region or adding a new route
//             </p>
//           </div>
//         )}
//       </div>
//     </Card>
//   );
// }
import { useEffect, useRef, useState } from "react";

export function RouteMap() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const startInputRef = useRef<HTMLInputElement | null>(null);
  const endInputRef = useRef<HTMLInputElement | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ eta: string; distance: string } | null>(null);
  const [rerouteSuggestion, setRerouteSuggestion] = useState<string | null>(null);
  const geocodeCache = useRef<Record<string, [number, number]>>({});
  const [map, setMap] = useState<any>(null);
  const [datasource, setDatasource] = useState<any>(null);
  const animationFrameId = useRef<number | null>(null);

  const subscriptionKey = subkey;
  // Load Azure Maps SDK dynamically
  useEffect(() => {
    const loadAzureMaps = () => {
      const script = document.createElement("script");
      script.src = "https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.js ";
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);

      const cssLink = document.createElement("link");
      cssLink.rel = "stylesheet";
      cssLink.href = "https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.css ";
      document.head.appendChild(cssLink);
    };

    loadAzureMaps();

    return () => {
      if (map) map.dispose();
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  function initMap() {
    if (!window.atlas || !mapRef.current) return;

    const atlasMap = new window.atlas.Map(mapRef.current, {
      center: [78.9629, 20.5937],
      zoom: 4,
      authOptions: {
        authType: "subscriptionKey",
        subscriptionKey
      }
    });

    atlasMap.events.add("ready", () => {
    const ds = new atlas.source.DataSource();
    atlasMap.sources.add(ds);

    atlasMap.layers.add(new atlas.layer.TrafficFlowLayer(ds));

    atlasMap.layers.add(
      new atlas.layer.SymbolLayer(ds, null, {
          iconOptions: {
            image: ["get", "icon"],
            allowOverlap: true
          },
          textOptions: {
            textField: ["get", "title"],
            offset: [0, 1.2]
          },
          filter: ["any", ["==", ["geometry-type"], "Point"], ["==", ["geometry-type"], "MultiPoint"]]
        })
      );

    setMap(atlasMap);
    setDatasource(ds);
    // Add a line layer for route visualization
    const routeLayer = new atlas.layer.LineLayer(ds, null, {
      strokeColor: '#2272B9',
      strokeWidth: 5,
      lineJoin: 'round',
      lineCap: 'round'
    });
    atlasMap.layers.add(routeLayer);
      displayWeather(atlasMap, ds);
    });
  }

  async function displayWeather(atlasMap: any, ds: any) {
    if (!atlasMap || !ds) return;
    const center = atlasMap.getCamera().center;
    const [lon, lat] = center;
    try {
      const response = await fetch(`http://localhost:8000/weather/coords?lat=${lat}&lon=${lon}`);
      const weatherData = await response.json();
      const weatherFeature = new atlas.data.Feature(new atlas.data.Point(center), {
        title: "Current Weather",
        icon: getWeatherIcon(weatherData),
        subtitle: `Weather: ${weatherData.weather}, Risk: ${weatherData.risk}`
      });
      ds.add(weatherFeature);
    } catch (error) {
      console.error("Error fetching weather data:", error);
    }
  }

  async function searchRoute() {
    const startLocation = startInputRef.current?.value.trim();
    const endLocation = endInputRef.current?.value.trim();

    if (!startLocation || !endLocation) {
      alert("Please enter both start and end locations.");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/route/optimized?start=${encodeURIComponent(startLocation)}&end=${encodeURIComponent(endLocation)}`
      );
      const data = await response.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      if (!data.route || !Array.isArray(data.route) || data.route.length === 0) {
        throw new Error("Route data is missing or invalid.");
      }

      if (!map || !datasource) {
        alert("Map not ready yet. Please wait a moment.");
        return;
      }

      datasource.clear();

      const routeCoords = data.route.map((coord: number[]) => [coord[1], coord[0]]); // [lat, lon] -> [lon, lat]

      let i = 0;
      function animateRoute() {
        if (i >= routeCoords.length) return;
        const partial = routeCoords.slice(0, i + 1);
        const line = new atlas.data.Feature(new atlas.data.LineString(partial));
        datasource.clear();
        datasource.add(line);
        i++;
        animationFrameId.current = requestAnimationFrame(animateRoute);
      }

      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
      animateRoute();

      const startPoint = new atlas.data.Feature(new atlas.data.Point(routeCoords[0]), {
        title: "Start",
        icon: getWeatherIcon(data.weather_info),
        subtitle: `Weather: ${formatWeatherRisk(data.weather_info.risk)}`
      });

      const endPoint = new atlas.data.Feature(new atlas.data.Point(routeCoords[routeCoords.length - 1]), {
        title: "End",
        icon: "pin-round-blue"
      });

      datasource.add([startPoint, endPoint]);

      if (data.traffic_incidents && Array.isArray(data.traffic_incidents)) {
        data.traffic_incidents.forEach((incident: any) => {
          const incidentFeature = new atlas.data.Feature(
            new atlas.data.Point([incident.location[1], incident.location[0]]),
            {
              title: `${incident.type}: ${incident.title}`,
              icon: getIncidentIcon(incident.type)
            }
          );
          datasource.add(incidentFeature);
        });
      }

      if (data.reroute_path && Array.isArray(data.reroute_path)) {
        const rerouteCoords = data.reroute_path.map((coord: number[]) => [coord[1], coord[0]]);
        const rerouteLine = new atlas.data.Feature(new atlas.data.LineString(rerouteCoords), {
          color: "red"
        });
        datasource.add(rerouteLine);
      }

      map.setCamera({
        bounds: atlas.data.BoundingBox.fromPositions(routeCoords),
        padding: 80
      });

      setRerouteSuggestion(data.reroute_suggestion ? "High congestion detected. Consider rerouting." : null);
      setRouteInfo({
        eta: data.eta || "Unknown",
        distance: data.distance ? `${data.distance} km` : "Unknown"
      });

      displayWeather(map, datasource);
    } catch (error: any) {
      console.error(error);
      alert(`Error: ${error.message}`);
    }
  }

  function getIncidentIcon(type: string): string {
    switch (type.toLowerCase()) {
      case "accident":
        return "accident";
      case "construction":
        return "construction";
      default:
        return "warning";
    }
  }

  function getWeatherIcon(weatherInfo: any): string {
    const { risk } = weatherInfo;
    if (risk === "high") return "pin-red";
    if (risk === "moderate") return "pin-yellow";
    return "pin-green";
  }

  function formatWeatherRisk(risk: string): string {
    return {
      low: "🟢 Low risk",
      moderate: "🟡 Moderate risk",
      high: "🔴 High risk"
    }[risk] || "Unknown";
  }

  return (
    <div className="h-full w-full">
      <div className="p-2">
        <input ref={startInputRef} type="text" placeholder="Start Location" className="m-1 p-1 border" />
        <input ref={endInputRef} type="text" placeholder="Destination" className="m-1 p-1 border" />
        <button onClick={searchRoute} className="m-1 p-1 bg-blue-500 text-white">Get Route</button>
        {routeInfo && (
          <div className="m-1 p-1 bg-gray-100 border">
            <p>
              <strong>ETA:</strong> {routeInfo.eta}
            </p>
            <p>
              <strong>Distance:</strong> {routeInfo.distance}
            </p>
          </div>
        )}
        {rerouteSuggestion && (
          <div className="m-1 p-1 bg-yellow-200 border border-yellow-400 text-yellow-800">
            ⚠️ {rerouteSuggestion}
          </div>
        )}
      </div>
      <div ref={mapRef} className="h-[600px] w-full" id="myMap"></div>
    </div>
  );
}