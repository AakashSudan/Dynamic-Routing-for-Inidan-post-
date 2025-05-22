// src/lib/mapController.js

let mapInitialized = false;
let map, datasource;

export function initializeAzureMap(subscriptionKey, onReady) {
    if (mapInitialized || !window.atlas) return;
    mapInitialized = true;

    map = new atlas.Map('myMap', {
        center: [78.9629, 20.5937],
        zoom: 4,
        authOptions: {
            authType: 'subscriptionKey',
            subscriptionKey: subscriptionKey
        }
    });

    map.events.add('ready', () => {
        datasource = new atlas.source.DataSource();
        map.sources.add(datasource);

        // Traffic flow layer
        map.layers.add(new atlas.layer.TrafficFlowLayer(datasource, null, {
            intensity: "relative-delay",
            color: [
                "interpolate", ["linear"], ["get", "congestionLevel"],
                0, "#00ff00",     // Free Flow
                0.3, "#ccff00",
                0.6, "#ffcc00",
                0.8, "#ff6600",
                1, "#ff0000"       // Severe
            ]
        }));

        // Symbol layer for points
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

        if (onReady) onReady(map);
    });
}

export async function displayWeather(map) {
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

export async function searchRoute(startLocation, endLocation, map) {
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

        datasource.clear();

        const routeCoords = data.route.map(coord => [coord[1], coord[0]]); // Convert lat/lon → lon/lat
        const routeLine = new atlas.data.Feature(new atlas.data.LineString(routeCoords));
        datasource.add(routeLine);

        const routeLayer = new atlas.layer.LineLayer(datasource, null, {
            strokeColor: '#2272B9',
            strokeWidth: 5,
            lineJoin: 'round',
            lineCap: 'round'
        });

        map.layers.add(routeLayer);

        document.getElementById('trafficLegend').style.opacity = '0.5';
        document.getElementById('weatherLegend').style.opacity = '0.5';

        map.events.add('mouseover', routeLayer, () => {
            document.getElementById('trafficLegend').style.opacity = '1';
            document.getElementById('weatherLegend').style.opacity = '1';
        });

        map.events.add('mouseout', routeLayer, () => {
            document.getElementById('trafficLegend').style.opacity = '0.5';
            document.getElementById('weatherLegend').style.opacity = '0.5';
        });

        const startPoint = new atlas.data.Feature(new atlas.data.Point(routeCoords[0]), {
            title: 'Start',
            icon: getWeatherIcon(data.weather_info),
            subtitle: `Weather: ${formatWeatherRisk(data.weather_info.risk)}`
        });

        const endPoint = new atlas.data.Feature(new atlas.data.Point(routeCoords[routeCoords.length - 1]), {
            title: 'End',
            icon: 'pin-round-blue'
        });

        datasource.add([startPoint, endPoint]);

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

        map.setCamera({
            bounds: atlas.data.BoundingBox.fromPositions(routeCoords),
            padding: 80
        });

        document.getElementById('etaDisplay').textContent = `ETA: ${data.eta}`;
        document.getElementById('distanceDisplay').textContent = `Distance: ${data.distance} km`;

        if (data.reroute_suggestion?.needed) {
            alert(`Reroute Suggested:\n${data.reroute_suggestion.reason}`);
        }

        await displayWeather(map);

    } catch (error) {
        console.error(error);
        alert(`Error: ${error.message}`);
    }
}

// Helper functions
function getIncidentIcon(type) {
    switch (type.toLowerCase()) {
        case 'accident': return 'accident';
        case 'construction': return 'construction';
        default: return 'warning';
    }
}

function getWeatherIcon(weatherInfo) {
    const { risk } = weatherInfo;
    if (risk === 'high') return 'pin-red';
    if (risk === 'moderate') return 'pin-yellow';
    return 'pin-green';
}

function formatWeatherRisk(risk) {
    return {
        low: "🟢 Low risk",
        moderate: "🟡 Moderate risk",
        high: "🔴 High risk"
    }[risk] || "Unknown";
}