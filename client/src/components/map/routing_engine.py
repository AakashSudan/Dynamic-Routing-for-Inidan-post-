import os
import requests
from dotenv import load_dotenv
from data_ingestion import geocode_location, fetch_real_time_traffic_flow, fetch_weather_data, generate_bounding_box, fetch_traffic_incidents
from datetime import timedelta

load_dotenv()
AZURE_MAPS_KEY = os.getenv("AZURE_MAPS_KEY")
def calculate_dynamic_route(locations, traffic_data, weather_data):
    """
    Calculates an optimized route from origin -> intermediate post offices -> destination.
    Dynamically checks traffic and weather at each hop and adjusts path accordingly.
    
    Args:
        locations (List[str]): Full list of post office locations from origin to destination.
        traffic_data (dict): Real-time traffic flow data keyed by location.
        weather_data (dict): Real-time weather data keyed by location.

    Returns:
        List[dict]: Optimized route steps with traffic/weather/rerouting info per leg.
    """
    optimized_route = []
    
    for i in range(len(locations) - 1):
        start = locations[i]
        end = locations[i + 1]

        start_lat, start_lon = geocode_location(start)
        end_lat, end_lon = geocode_location(end)
        if None in [start_lat, start_lon, end_lat, end_lon]:
            optimized_route.append({
                "from": start,
                "to": end,
                "error": "Geocoding failed"
            })
            continue

        # Base route data
        url, params = build_route_url(start_lat, start_lon, end_lat, end_lon)
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            routes = data.get("routes", [])
            if not routes:
                raise Exception("No route found.")

            summary = routes[0]["summary"]
            leg_points = routes[0]["legs"][0]["points"]
            route_coords = [[pt["latitude"], pt["longitude"]] for pt in leg_points]
            total_seconds = summary.get("travelTimeInSeconds", 0) + summary.get("trafficDelayInSeconds", 0)

            eta = str(timedelta(seconds=total_seconds))
            distance_km = round(summary.get("lengthInMeters", 0) / 1000, 2)

            # Fetch traffic & weather for current leg start
            traffic_info = traffic_data[start]
            weather_info = weather_data[start]
            should_reroute, reason = suggest_rerouting(traffic_info, weather_info)

            optimized_route.append({
                "from": start,
                "to": end,
                "eta": eta,
                "distance_km": distance_km,
                "route": route_coords,
                "traffic_info": traffic_info,
                "weather_info": weather_info,
                "reroute_suggestion": {
                    "reroute": should_reroute,
                    "reason": reason
                }
            })

        except Exception as e:
            optimized_route.append({
                "from": start,
                "to": end,
                "error": f"Routing failed: {str(e)}"
            })

    return optimized_route

def build_route_url(start_lat, start_lon, end_lat, end_lon):
    base_url = "https://atlas.microsoft.com/route/directions/json"
    params = {
        "api-version": "1.0",
        "query": f"{start_lat},{start_lon}:{end_lat},{end_lon}",
        "travelMode": "car",
        "traffic": "true",
        "routeType": "fastest",
        "subscription-key": AZURE_MAPS_KEY
    }
    return base_url, params

def suggest_rerouting(traffic_info, weather_info):
    if traffic_info.get("congestion_level") in ["heavy", "severe"]:
        return True, "Heavy traffic detected. Consider rerouting."
    if weather_info.get("risk") in ["high", "extreme"]:
        return True, "Severe weather conditions detected. Consider rerouting."
    return False, "No rerouting needed."

def get_optimized_route(start_location, end_location):
    start_lat, start_lon = geocode_location(start_location)
    end_lat, end_lon = geocode_location(end_location)

    if None in [start_lat, start_lon, end_lat, end_lon]:
        return {"error": "Unable to geocode one or both locations."}

    url, params = build_route_url(start_lat, start_lon, end_lat, end_lon)

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        routes = data.get("routes", [])
        if not routes:
            return {"error": "No route found."}

        route = routes[0]
        summary = route.get("summary", {})
        leg = route.get("legs", [])[0]
        points = leg.get("points", [])

        # Convert points from [{"latitude": x, "longitude": y}, ...] to [[x, y], ...]
        route_coords = [[point["latitude"], point["longitude"]] for point in points]

        traffic_info = fetch_real_time_traffic_flow(start_lat, start_lon)
        weather_info = fetch_weather_data(start_lat, start_lon)

        # New: Fetch nearby traffic incidents using a bounding box
        bbox = generate_bounding_box(start_lat, start_lon)
        traffic_incidents = fetch_traffic_incidents(bbox)

        total_seconds = summary.get("travelTimeInSeconds", 0) + summary.get("trafficDelayInSeconds", 0)
        total_time = timedelta(seconds=total_seconds)

        hours, remainder = divmod(total_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)

        if hours > 0:
            eta = f"{hours} hour{'s' if hours != 1 else ''}, {minutes} min"
        else:
            eta = f"{minutes} min"

        return {
            "route": route_coords,
            "eta": eta,
            "distance": round(summary.get("lengthInMeters", 0) / 1000, 2),
            "traffic_info": traffic_info,
            "weather_info": weather_info,
            "traffic_incidents": traffic_incidents
        }

    except requests.exceptions.RequestException as e:
        return {"error": f"Azure Maps API request failed: {str(e)}"}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}"}


if __name__ == "__main__":
    start = input("Enter start location: ")
    end = input("Enter end location: ")
    result = get_optimized_route(start, end)

    if "error" in result:
        print("Error:", result["error"])
    else:
        print("\nRoute Summary:")
        for key, val in result["route_summary"].items():
            print(f"{key}: {val}")

        for i, point in enumerate(result["steps"][:5]):
            print(f"{i+1}. Latitude: {point.get('latitude')}, Longitude: {point.get('longitude')}")
