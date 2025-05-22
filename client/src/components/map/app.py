from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from data_ingestion import (
    geocode_location,
    generate_bounding_box,
    fetch_traffic_incidents,
    fetch_real_time_traffic_flow,
    fetch_weather_data,
    fetch_transport_schedules
)
from routing_engine import get_optimized_route

app = FastAPI(title="Smart Traffic & Route API")

# Enable CORS for frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    print(result)
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
