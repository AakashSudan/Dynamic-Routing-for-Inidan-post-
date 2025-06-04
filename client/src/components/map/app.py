from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from data_ingestion import (
    geocode_location,
    generate_bounding_box,
    fetch_traffic_incidents,
    fetch_real_time_traffic_flow,
    fetch_weather_data,
    fetch_transport_schedules
)
from routing_engine import get_optimized_route, calculate_dynamic_route

app = FastAPI(title="Smart Traffic & Route API")

# Enable CORS for frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DynamicRouteRequest(BaseModel):
    origin: str
    destination: str
    intermediate_post_offices: List[str]

@app.get("/geocode")
def geocode(location: str):
    lat, lon = geocode_location(location)
    if lat is None or lon is None:
        return {"error": f"Could not geocode location: {location}"}
    return {"location": location, "lat": lat, "lon": lon}

@app.get("/traffic/incidents")
def traffic_incidents(location: str, incident_type: Optional[str] = Query(None)):
    lat, lon = geocode_location(location)
    if lat is None or lon is None:
        return {"error": f"Could not geocode location: {location}"}
    bbox = generate_bounding_box(lat, lon)
    return fetch_traffic_incidents(bbox, incident_type=incident_type)

@app.get("/traffic/flow")
def traffic_flow(location: str):
    lat, lon = geocode_location(location)
    if lat is None or lon is None:
        return {"error": f"Could not geocode location: {location}"}
    return fetch_real_time_traffic_flow(lat, lon)

@app.get("/weather")
def weather(location: str):
    lat, lon = geocode_location(location)
    if lat is None or lon is None:
        return {"error": f"Could not geocode location: {location}"}
    return fetch_weather_data(lat, lon)

@app.get("/transport/schedules")
def transport_schedules():
    return fetch_transport_schedules()

@app.get("/route/optimized")
def optimized_route(start: str, end: str):
    result = get_optimized_route(start, end)
    if "error" in result:
        return {"error": result["error"]}
    return result

@app.get("/all-data")
def all_data(location: str):
    lat, lon = geocode_location(location)
    if lat is None or lon is None:
        return {"error": f"Could not geocode location: {location}"}

    bbox = generate_bounding_box(lat, lon)
    return {
        "location": {"name": location, "lat": lat, "lon": lon},
        "weather": fetch_weather_data(lat, lon),
        "traffic_incidents": fetch_traffic_incidents(bbox),
        "traffic_flow": fetch_real_time_traffic_flow(lat, lon),
        "schedules": fetch_transport_schedules()
    }

@app.get("/weather/coords")
def weather_coords(lat: float, lon: float):
    return fetch_weather_data(lat, lon)

# ✅ NEW: Dynamic Recalibrated Route with Real-Time Data
@app.post("/route/optimized")
def dynamic_route(request: DynamicRouteRequest):
    try:
        full_route = [request.origin] + request.intermediate_post_offices + [request.destination]

        # Collect traffic and weather data for all points
        traffic_data = {}
        weather_data = {}
        for location in full_route:
            lat, lon = geocode_location(location)
            if lat is None or lon is None:
                return {"error": f"Could not geocode location: {location}"}
            traffic_data[location] = fetch_real_time_traffic_flow(lat, lon)
            weather_data[location] = fetch_weather_data(lat, lon)

        # Calculate optimized dynamic route
        optimized_route = calculate_dynamic_route(
            full_route, traffic_data, weather_data
        )

        return {
            "optimized_route": optimized_route,
            "message": "Dynamically recalibrated route based on real-time traffic and weather"
        }

    except Exception as e:
        return {"error": str(e)}
