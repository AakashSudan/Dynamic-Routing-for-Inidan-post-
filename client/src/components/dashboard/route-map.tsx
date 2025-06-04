import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterIcon, RefreshCw } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type Region = "India" | "Europe" | "Asia Pacific" | "Global";
type TransitType = "road" | "rail" | "air";

export function RouteMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  const [selectedRegion, setSelectedRegion] = useState<Region>("India");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [transitType, setTransitType] = useState<TransitType>("road");

  const geocodeCache = useRef<Record<string, [number, number]>>({});

  useEffect(() => {
    if (mapRef.current && !leafletMapRef.current) {
      leafletMapRef.current = L.map(mapRef.current, { zoomControl: true }).setView([25.0479, 77.6197], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",  {
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

  const handleRegionChange = (value: string) => {
    setSelectedRegion(value as Region);
    if (leafletMapRef.current) {
      const positions: Record<Region, L.LatLngExpression> = {
        India: [25.0479, 77.6197],
        Europe: [48.8566, 2.3522],
        "Asia Pacific": [34.0479, 100.6197],
        Global: [20, 0],
      };
      leafletMapRef.current.setView(positions[value as Region], 5);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const geocode = async (place: string): Promise<[number, number]> => {
    if (geocodeCache.current[place]) return geocodeCache.current[place];

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}&limit=1`);
      const data = await response.json();
      if (!data.length) throw new Error(`No results for "${place}"`);

      const { lat, lon } = data[0];
      const coords: [number, number] = [parseFloat(lat), parseFloat(lon)];
      geocodeCache.current[place] = coords;
      return coords;
    } catch (error) {
      console.error("Geocode error:", error);
      throw new Error(`Failed to geocode "${place}"`);
    }
  };

  const showRoute = async () => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;
    setIsRouteLoading(true);

    try {
      const [startCoords, endCoords] = await Promise.all([
        geocode(startLocation),
        geocode(endLocation),
      ]);

      if (routeLayerRef.current) {
        routeLayerRef.current.clearLayers();
      } else {
        routeLayerRef.current = L.layerGroup().addTo(map);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const profile = transitType === "road" ? "driving" : "driving"; // Fallback to driving for Rail
      const routeUrl = `https://router.project-osrm.org/route/v1/${profile}/${startCoords[1]},${startCoords[0]};${endCoords[1]},${endCoords[0]}?overview=full&geometries=geojson&alternatives=true`;

      const response = await fetch(routeUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) throw new Error("Route request failed");

      const data = await response.json();
      if (!data.routes?.length) {
        alert("No routes found. Try different locations.");
        return;
      }

      const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"]; 
      const boundsCollection: L.LatLngExpression[] = [];

      data.routes.forEach((route: any, idx: number) => {
        const coords = route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
        const color = colors[idx % colors.length];

        L.polyline(coords, { color, weight: 4 }).addTo(routeLayerRef.current);
        boundsCollection.push(...coords);
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
      // Add markers
      L.marker(startCoords, { icon: defaultIcon }).addTo(routeLayerRef.current).bindPopup("Start");
      L.marker(endCoords, { icon: defaultIcon }).addTo(routeLayerRef.current).bindPopup("End");

      // Fit map to routes
      const bounds = L.latLngBounds(boundsCollection);
      map.fitBounds(bounds, { padding: [50, 50] });

    } catch (error: any) {
      if (error.name === "AbortError") {
        alert("Route request timed out");
      } else {
        console.error("Route error:", error);
        alert(`Failed to fetch route: ${error.message}`);
      }
    } finally {
      setIsRouteLoading(false);
    }
  };

  return (
    <Card className="col-span-1 lg:col-span-2 h-[500px] relative overflow-hidden">
      <CardHeader className="p-4 border-b border-slate-200 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-semibold text-slate-800">Live Route Visualization</CardTitle>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <FilterIcon className="h-3.5 w-3.5 mr-1" />
            Filter
          </Button>
          <Button variant="default" size="sm" className="h-8 text-xs" onClick={handleRefresh}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-2 items-center z-50">
        <input
          type="text"
          value={startLocation}
          onChange={(e) => setStartLocation(e.target.value)}
          placeholder="Start location"
          className="border rounded px-2 py-1 text-xs"
        />
        <input
          type="text"
          value={endLocation}
          onChange={(e) => setEndLocation(e.target.value)}
          placeholder="End location"
          className="border rounded px-2 py-1 text-xs"
        />
        <Select value={transitType} onValueChange={(val) => setTransitType(val as TransitType)}>
          <SelectTrigger className="h-8 text-xs w-[100px]">
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="road">Road</SelectItem>
            <SelectItem value="rail">Rail (Fallback: Road)</SelectItem>
            <SelectItem value="air">Air</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="text-xs"
          onClick={showRoute}
          disabled={isRouteLoading || !startLocation || !endLocation}
        >
          {isRouteLoading ? "Loading..." : "Show Route"}
        </Button>

        <div className="ml-auto">
          <Select value={selectedRegion} onValueChange={handleRegionChange}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent position="popper" className="w-[140px]">
              <SelectItem value="India">India</SelectItem>
              <SelectItem value="Europe">Europe</SelectItem>
              <SelectItem value="Asia Pacific">Asia Pacific</SelectItem>
              <SelectItem value="Global">Global</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="relative h-[378px] z-0">
        <div id="route-map" ref={mapRef} className="h-full w-full z-0"></div>
        {(isRouteLoading) && (
          <div className="absolute inset-0 bg-slate-100/80 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <RefreshCw className="h-8 w-8 text-primary animate-spin mb-2" />
              <p className="text-slate-600">Loading map data...</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}