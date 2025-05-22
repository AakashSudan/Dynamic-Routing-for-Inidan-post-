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


export function RouteMap() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <p className="text-slate-500">Route Map Component</p>
    </div>
  );
}