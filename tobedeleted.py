# used to get pincodes of General post offices and their latitude and longitude

import requests
import time
import csv

# List of state capitals (Head Post Offices usually exist here)
state_capitals = [
    'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Ahmedabad',
    'Chennai', 'Kolkata', 'Lucknow', 'Jaipur', 'Bhopal',
    'Chandigarh', 'Bhubaneswar', 'Patna', 'Ranchi', 'Raipur',
    'Guwahati', 'Dehradun', 'Imphal', 'Shillong', 'Aizawl',
    'Kohima', 'Agartala', 'Itanagar', 'Gangtok', 'Panaji',
    'Thiruvananthapuram', 'Puducherry', 'Port Blair', 'Kavaratti',
    'Leh', 'Daman', 'Silvassa','Jammu','Kashmir'
]

# Geocode using Nominatim (OpenStreetMap)
def get_lat_lon(query):
    time.sleep(1)  # Respect rate limit
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        'q': query,
        'format': 'json',
        'limit': 1
    }
    headers = {'User-Agent': 'IndiaPostRouteOptimizer/1.0'}
    res = requests.get(url, params=params, headers=headers)
    data = res.json()
    if data:
        return data[0]['lat'], data[0]['lon']
    return None, None

# Fetch H.O. info from India Post API
def fetch_head_post_office(city):
    url = f"https://api.postalpincode.in/postoffice/{city}"
    response = requests.get(url)
    data = response.json()
    if data[0]['Status'] == 'Success':
        for office in data[0]['PostOffice']:
            if office['BranchType'] == 'Head Post Office':
                lat, lon = get_lat_lon(f"{office['Name']}, {office['District']}, {office['State']}")
                return {
                    'City': city,
                    'OfficeName': office['Name'],
                    'Pincode': office['Pincode'],
                    'Circle': office['Circle'],
                    'District': office['District'],
                    'Division': office['Division'],
                    'Region': office['Region'],
                    'State': office['State'],
                    'Latitude': lat,
                    'Longitude': lon
}
    return None

# Compile data
results = []
for city in state_capitals:
    print(f"Processing: {city}")
    data = fetch_head_post_office(city)
    if data:
        results.append(data)

# Save to CSV
csv_file = "india_head_post_offices_with_coords.csv"
with open(csv_file, "w", newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=[
        'City', 'OfficeName', 'Pincode', 'Circle', 'District',
        'Division', 'Region', 'State', 'Latitude', 'Longitude'
    ])
    writer.writeheader()
    for row in results:
        writer.writerow(row)

print(f"\n✅ CSV saved as: {csv_file}")
