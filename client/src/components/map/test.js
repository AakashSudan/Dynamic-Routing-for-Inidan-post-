subscriptionKey = ""


function GetMap() {
    map = new atlas.Map('myMap', {
        center: [78.9629, 20.5937],
        zoom: 4,
        authOptions: {
            authType: 'subscriptionKey',
            subscriptionKey: subscriptionKey
        }
    });

    map.events.add('ready', function () {
        datasource = new atlas.source.DataSource();
        map.sources.add(datasource);

        // Add real-time traffic flow layer (live congestion)
        map.layers.add(new atlas.layer.TrafficFlowLayer(datasource, null, {
            intensity: "relative-delay",
            color: [
                "interpolate", ["linear"], ["get", "congestionLevel"],
                0, "#00ff00",     // Green - Free Flow
                0.3, "#ccff00",    // Light Green
                0.6, "#ffcc00",    // Yellow
                0.8, "#ff6600",    // Orange
                1, "#ff0000"       // Red - Heavy Congestion
            ]
        }));

        // Symbol layer for points (start, end, incidents)
        map.layers.add(new atlas.layer.SymbolLayer(datasource, null, {
            iconOptions: {
                image: ['get', 'icon'],
                allowOverlap: true
            },
            textOptions: {
                textField: ['get', 'title'],
                offset: [0, 1.2]
            },
            filter: ['any', ['==', ['geometry-type'], 'Point'], ['==', ['geometry-type'], 'MultiPoint']]
        }));

        // New: Display weather info marker
        displayWeather();
    });
}

// New function to display weather info on the map
async function displayWeather() {
    // Get map center ([lon, lat])
    const center = map.getCamera().center;
    const lon = center[0];
    const lat = center[1];
    try {
        const response = await fetch(`http://localhost:8000/weather/coords?lat=${lat}&lon=${lon}`);
        const weatherData = await response.json();
        const weatherFeature = new atlas.data.Feature(new atlas.data.Point(center), {
            title: 'Current Weather',
            icon: getWeatherIcon(weatherData),
            subtitle: `Weather: ${weatherData.weather}, Risk: ${weatherData.risk}`
        });
        datasource.add(weatherFeature);
    } catch (error) {
        console.error("Error fetching weather data:", error);
    }
}

async function searchRoute() {
    const startInput = document.getElementById('startInput');
    const endInput = document.getElementById('endInput');
    const startLocation = startInput.value;
    const endLocation = endInput.value;

    if (!startLocation || !endLocation) {
        alert('Please enter both start and end locations.');
        return;
    }

    try {
        const response = await fetch(`http://localhost:8000/route/optimized?start=${encodeURIComponent(startLocation)}&end=${encodeURIComponent(endLocation)}`);
        const data = await response.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        if (!data.route || !Array.isArray(data.route) || data.route.length === 0) {
            throw new Error("Route data is missing or invalid.");
        }

        datasource.clear();

        // Convert route [lat, lon] to [lon, lat]
        const routeCoords = data.route.map(coord => [coord[1], coord[0]]);
        
        // Create route feature and add it to the datasource
        const routeLine = new atlas.data.Feature(new atlas.data.LineString(routeCoords));
        datasource.add(routeLine);

        // Create a route layer variable for the route line
        const routeLayer = new atlas.layer.LineLayer(datasource, null, {
            strokeColor: '#2272B9',
            strokeWidth: 5,
            lineJoin: 'round',
            lineCap: 'round'
        });
        map.layers.add(routeLayer);

        // Add mouseover/mouseout events to update legend opacity on hover
        map.events.add('mouseover', routeLayer, function () {
            document.getElementById('trafficLegend').style.opacity = '1';
            document.getElementById('weatherLegend').style.opacity = '1';
        });
        map.events.add('mouseout', routeLayer, function () {
            document.getElementById('trafficLegend').style.opacity = '0.5';
            document.getElementById('weatherLegend').style.opacity = '0.5';
        });

        // Start point with weather info
        const startPoint = new atlas.data.Feature(new atlas.data.Point(routeCoords[0]), {
            title: 'Start',
            icon: getWeatherIcon(data.weather_info),
            subtitle: `Weather: ${formatWeatherRisk(data.weather_info.risk)}`
        });

        // End point
        const endPoint = new atlas.data.Feature(new atlas.data.Point(routeCoords[routeCoords.length - 1]), {
            title: 'End',
            icon: 'pin-round-blue'
        });

        datasource.add([startPoint, endPoint]);

        // Add traffic incidents
        if (data.traffic_incidents && Array.isArray(data.traffic_incidents)) {
            data.traffic_incidents.forEach(incident => {
                const incidentFeature = new atlas.data.Feature(
                    new atlas.data.Point([incident.location[1], incident.location[0]]), {
                        title: `${incident.type}: ${incident.title}`,
                        icon: getIncidentIcon(incident.type)
                    }
                );
                datasource.add(incidentFeature);
            });
        }
        
       
      
        // Fit map to route
        map.setCamera({
            bounds: atlas.data.BoundingBox.fromPositions(routeCoords),
            padding: 80
        });

        // Update UI
        document.getElementById('etaDisplay').textContent = `ETA: ${data.eta}`;
        document.getElementById('distanceDisplay').textContent = `Distance: ${data.distance} km`;

        if (data.reroute_suggestion) {
            alert('High congestion detected. Consider rerouting.');
        }

        // New: Refresh weather info after route update
        displayWeather();

    } catch (error) {
        console.error(error);
        alert(`Error: ${error.message}`);
    }
}

// Helper: Return appropriate icon based on incident type
function getIncidentIcon(type) {
    switch (type.toLowerCase()) {
        case 'accident': return 'accident';
        case 'construction': return 'construction';
        default: return 'warning';
    }
}

// Helper: Return appropriate icon based on weather risk
function getWeatherIcon(weatherInfo) {
    const { weather, risk } = weatherInfo;
    if (risk === 'high') return 'pin-red';
    if (risk === 'moderate') return 'pin-yellow';
    return 'pin-green';
}

// Helper: Format weather risk into readable string
function formatWeatherRisk(risk) {
    return {
        low: "🟢 Low risk",
        moderate: "🟡 Moderate risk",
        high: "🔴 High risk"
    }[risk] || "Unknown";
}