import requests
import os
import csv
from dotenv import load_dotenv

# Assuming data_ingestion.py is in the same directory
import data_ingestion

load_dotenv()

AZURE_MAPS_KEY = os.getenv("AZURE_MAPS_KEY")
POST_OFFICE_FILE = "post_office_data.csv"

# --- 1. Post Office Network Management ---
_post_office_data = {} # Internal cache for PO data

def load_post_office_data(file_path=POST_OFFICE_FILE):
    """Loads post office data from a CSV file."""
    global _post_office_data
    _post_office_data = {} # Clear cache
    try:
        with open(file_path, mode='r', newline='', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                # Convert lat/lon to float, handle potential errors
                try:
                    row['Latitude'] = float(row['Latitude'])
                    row['Longitude'] = float(row['Longitude'])
                except ValueError:
                    print(f"Warning: Could not parse lat/lon for {row['PO_ID']}. Skipping.")
                    continue
                _post_office_data[row['PO_ID']] = row
        print(f"Successfully loaded {_post_office_data.__len__()} post offices from {file_path}")
    except FileNotFoundError:
        print(f"Error: Post office data file '{file_path}' not found.")
    except Exception as e:
        print(f"Error loading post office data: {e}")
    return _post_office_data

def get_post_office_details(po_id):
    """Retrieves details for a specific post office by ID."""
    if not _post_office_data: # Ensure data is loaded
        load_post_office_data()
    return _post_office_data.get(po_id)

def get_post_office_coordinates(po_id):
    """Retrieves latitude and longitude for a specific post office by ID."""
    details = get_post_office_details(po_id)
    if details:
        return details.get("Latitude"), details.get("Longitude")
    return None, None

# --- 2. Data Processing & Impact Assessment ---

def assess_weather_impact(weather_data):
    """
    Assesses the impact of weather on travel.
    Returns a simple impact score (e.g., 1.0 for no impact, higher for more impact).
    This is a simplified example; you'll want to make this more sophisticated.
    """
    if not weather_data or "error" in weather_data:
        return 1.0 # Neutral impact if data is missing or errored

    weather_condition = weather_data.get("weather", "Clear").lower()
    risk = weather_data.get("risk", "low").lower()

    impact_score = 1.0
    if "thunderstorm" in weather_condition or risk == "high":
        impact_score = 1.5 # Severe impact
    elif "rain" in weather_condition or "snow" in weather_condition or "drizzle" in weather_condition:
        impact_score = 1.2 # Moderate impact
    elif "fog" in weather_condition or "mist" in weather_condition:
        impact_score = 1.1 # Slight impact

    return impact_score

def assess_traffic_flow_impact(traffic_flow_data):
    """
    Assesses the impact of traffic flow.
    Returns a simple impact score.
    """
    if not traffic_flow_data or "error" in traffic_flow_data:
        return 1.0

    congestion = traffic_flow_data.get("congestion_level", "low")
    current_speed = traffic_flow_data.get("current_speed_kmh", 0)
    free_flow_speed = traffic_flow_data.get("free_flow_speed_kmh", 1) # Avoid division by zero

    impact_score = 1.0
    if congestion == "high" or (free_flow_speed > 0 and (current_speed / free_flow_speed) < 0.5):
        impact_score = 1.4 # High congestion impact
    elif congestion == "moderate" or (free_flow_speed > 0 and (current_speed / free_flow_speed) < 0.75):
        impact_score = 1.2 # Moderate congestion

    return impact_score

def assess_traffic_incidents_impact(traffic_incidents_data, route_bounding_box=None):
    """
    Assesses the impact of traffic incidents.
    Returns an impact score. For now, this is basic.
    A more advanced version would check if incidents are ON the proposed route.
    """
    if not traffic_incidents_data or "error" in traffic_incidents_data or not isinstance(traffic_incidents_data, list):
        return 1.0

    severe_incident_count = 0
    for incident in traffic_incidents_data:
        if incident.get("isRoadClosed"):
            return 2.0 # Road closure is a major impact
        if incident.get("severity", "").lower() in ["major", "critical"] or incident.get("isTrafficJam"):
            severe_incident_count += 1

    if severe_incident_count > 2:
        return 1.5
    elif severe_incident_count > 0:
        return 1.2
    return 1.0

# --- 3. Route Calculation using Azure Maps ---

def get_route_details(start_lat, start_lon, end_lat, end_lon, travel_mode="truck"):
    """
    Calculates a route between two points using Azure Maps Route Directions API.
    Considers real-time traffic by default.
    """
    if not AZURE_MAPS_KEY:
        print("Error: AZURE_MAPS_KEY is not set.")
        return None

    route_url = "https://atlas.microsoft.com/route/directions/json"
    params = {
        "api-version": "1.0",
        "subscription-key": AZURE_MAPS_KEY,
        "query": f"{start_lat},{start_lon}:{end_lat},{end_lon}",
        "travelMode": travel_mode,
        "routeType": "fastest",
        "computeTravelTimeFor": "all",
        "traffic": "true"
    }

    try:
        response = requests.get(route_url, params=params)
        response.raise_for_status()
        route_data = response.json()

        if "routes" in route_data and route_data["routes"]:
            summary = route_data["routes"][0]["summary"]
            return {
                "travel_time_seconds": summary.get("travelTimeInSeconds"),
                "traffic_delay_seconds": summary.get("trafficDelayInSeconds", 0),
                "length_meters": summary.get("lengthInMeters")
            }
    except Exception as e:
        print(f"Error fetching route details: {e}")
        return None
