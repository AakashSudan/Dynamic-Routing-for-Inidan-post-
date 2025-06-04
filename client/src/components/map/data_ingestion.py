import requests
import os
from dotenv import load_dotenv

load_dotenv() 

AZURE_MAPS_KEY = os.getenv("AZURE_MAPS_KEY")
WEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")


def geocode_location(location_name):
    # base_url = "https://atlas.microsoft.com/search/address/json"
    # params = {
    #     "api-version": "1.0",
    #     "query": location_name,
    #     "subscription-key": AZURE_MAPS_KEY
    # }
    # try:
    #     response = requests.get(base_url, params=params)
    #     response.raise_for_status()
    #     data = response.json()
    #     if data["results"]:
    #         position = data["results"][0]["position"]
    #         return position["lat"], position["lon"]
    #     else:
    #         raise ValueError(f"No results found for {location_name}")
    # except Exception as e:
    #     print(f"Geocoding error: {e}")
    #     return None, None
    base_url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": location_name,
        "format": "json",
        "limit": 1
    }
    try:
        response = requests.get(base_url, params=params, headers={"User-Agent": "YourAppName/1.0"})
        response.raise_for_status()
        data = response.json()
        if data and len(data) > 0:
            lat = float(data[0]["lat"])
            lon = float(data[0]["lon"])
            return lat, lon
        else:
            raise ValueError(f"No results found for {location_name}")
    except Exception as e:
        print(f"Geocoding error: {e}")
        return None, None

def generate_bounding_box(lat, lon, delta=0.5):
    return [lon - delta, lat - delta, lon + delta, lat + delta]

def fetch_traffic_incidents(bbox, incident_type=None):
    base_url = "https://atlas.microsoft.com/traffic/incident"
    params = {
        "api-version": "2025-01-01",
        "bbox": ",".join(map(str, bbox)),
        "subscription-key": AZURE_MAPS_KEY
    }
    if incident_type:
        params["incidentType"] = incident_type

    try:
        response = requests.get(base_url, params=params)
        response.raise_for_status()
        data = response.json()
        features = data.get("features", [])
        results = []

        for feature in features:
            geometry = feature.get("geometry", {})
            properties = feature.get("properties", {})
            result = {
                "location": geometry.get("coordinates", []),
                "type": properties.get("incidentType"),
                "title": properties.get("title"),
                "description": properties.get("description"),
                "start_time": properties.get("startTime"),
                "end_time": properties.get("endTime"),
                "severity": properties.get("severity"),
                "isRoadClosed": properties.get("isRoadClosed"),
                "isTrafficJam": properties.get("isTrafficJam"),
                "delay": properties.get("delay"),
                "end_point": properties.get("endPoint", {}).get("coordinates", [])
            }
            results.append(result)

        return results

    except requests.exceptions.RequestException as e:
        print(f"Traffic Incident API request failed: {str(e)}")
        return {"error": "request_failed", "status_code": response.status_code}
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {"error": str(e)}

def fetch_real_time_traffic_flow(lat, lon):
    base_url = "https://atlas.microsoft.com/traffic/flow/segment/json"
    params = {
        "api-version": "1.0",
        "subscription-key": AZURE_MAPS_KEY,
        "query": f"{lat},{lon}",
        "zoom": 10,
        "style": "relative",
        "format": "json"
    }
    try:
        response = requests.get(base_url, params=params)
        response.raise_for_status()
        data = response.json()
        segment = data.get("flowSegmentData", {})
        if not segment:
            return {"message": "No traffic flow data available for this location."}

        return {
            "location": {"lat": lat, "lon": lon},
            "current_speed_kmh": segment.get("currentSpeed", 0),
            "free_flow_speed_kmh": segment.get("freeFlowSpeed", 0),
            "congestion_level": calculate_congestion_level(segment),
            "confidence": segment.get("confidence", "unknown"),
            "road_closure": segment.get("roadClosure", False)
        }

    except requests.exceptions.RequestException as e:
        print(f"Traffic flow API request failed: {str(e)}")
        return {"error": "request_failed", "message": str(e)}
    except Exception as e:
        print(f"Unexpected error fetching traffic flow: {str(e)}")
        return {"error": str(e)}

def calculate_congestion_level(segment):
    try:
        current = segment.get("currentSpeed", 0)
        freeflow = segment.get("freeFlowSpeed", 1)
        ratio = current / freeflow
        if ratio >= 0.9:
            return "low"
        elif ratio >= 0.6:
            return "moderate"
        else:
            return "high"
    except:
        return "unknown"

def deg_to_compass(deg):
    directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    ix = int((deg / 22.5) + 0.5) % 16
    return directions[ix]

def fetch_weather_data(lat, lon):
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={WEATHER_API_KEY}&units=metric"
    try:
        response = requests.get(url)
        data = response.json()
        weather = data.get('weather', [{}])[0].get('main', 'Clear')
        temperature = data.get('main', {}).get('temp')  # °C
        wind_speed_ms = data.get('wind', {}).get('speed')  # m/s
        wind_speed_kmh = round(wind_speed_ms * 3.6, 1) if wind_speed_ms is not None else None
        wind_deg = data.get('wind', {}).get('deg')
        wind_direction = deg_to_compass(wind_deg) if wind_deg is not None else None
        risk = "high" if weather and weather.lower() in ["thunderstorm", "rain", "snow"] else "low"
        return {
            "lat": lat,
            "lon": lon,
            "weather": weather,
            "temperature": temperature,  # °C
            "windSpeed": wind_speed_kmh,  # km/h
            "windDirection": wind_direction,
            "risk": risk
        }
    except Exception as e:
        print("Weather API error:", e)
        return {"lat": lat, "lon": lon, "weather": "Unknown", "risk": "unknown"}

def fetch_transport_schedules():
    try:
        railway_schedules = {
            "status": "on time",
            "next_departure": "2023-10-10T10:00:00Z"
        }
        return {"rail": railway_schedules}
    except Exception as e:
        print(f"Error fetching transport schedules: {e}")
        return {"rail": {"status": "unknown"}}

if __name__ == "__main__":
    import sys
    location = input("Enter a location name: ") if len(sys.argv) < 2 else sys.argv[1]
    lat, lon = geocode_location(location)

    if lat is None or lon is None:
        print("Geocoding failed.")
    else:
        bbox = generate_bounding_box(lat, lon)
        traffic_incidents = fetch_traffic_incidents(bbox, incident_type="Accident,Construction")
        weather_data = fetch_weather_data(lat, lon)
        traffic_info = fetch_real_time_traffic_flow(lat, lon)

        print("Weather Data:", weather_data)
        print("Traffic Incidents:", traffic_incidents)
        print("Traffic Info:", traffic_info)
