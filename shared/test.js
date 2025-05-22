var map, datasource, client;

function GetMap() {
    //Instantiate a map object
    var map = new atlas.Map('myMap', {
        // Replace <Your Azure Maps Key> with your Azure Maps subscription key. https://aka.ms/am-primaryKey
        authOptions: {
        authType: 'subscriptionKey',
        subscriptionKey: 'FZI2j3E0Mp19Nwznj6pvIWKBdEAdyxWQ1Y9C66fdoB0hRSmiXLpaJQQJ99BDACYeBjF4DyP0AAAgAZMP4MjU'
        },
    
    });
    //Wait until the map resources are ready.
    map.events.add('ready', function() {

    //Create a data source and add it to the map.
    datasource = new atlas.source.DataSource();
    map.sources.add(datasource);

    //Add a layer for rendering the route lines and have it render under the map labels.
    map.layers.add(new atlas.layer.LineLayer(datasource, null, {
        strokeColor: '#2272B9',
        strokeWidth: 5,
        lineJoin: 'round',
        lineCap: 'round'
    }), 'labels');

    //Add a layer for rendering point data.
    map.layers.add(new atlas.layer.SymbolLayer(datasource, null, {
        iconOptions: {
            image: ['get', 'icon'],
            allowOverlap: true
    },
        textOptions: {
            textField: ['get', 'title'],
            offset: [0, 1.2]
        },
        filter: ['any', ['==', ['geometry-type'], 'Point'], ['==', ['geometry-type'], 'MultiPoint']] //Only render Point or MultiPoints in this layer.
    }));
    //Create the GeoJSON objects which represent the start and end points of the route.
    var startPoint = new atlas.data.Feature(new atlas.data.Point([-122.130137, 47.644702]), {
        title: "Redmond",
        icon: "pin-blue"
    });

    var endPoint = new atlas.data.Feature(new atlas.data.Point([-122.3352, 47.61397]), {
        title: "Seattle",
        icon: "pin-round-blue"
    });

    //Add the data to the data source.
    datasource.add([startPoint, endPoint]);

    map.setCamera({
        bounds: atlas.data.BoundingBox.fromData([startPoint, endPoint]),
        padding: 80
    });
    var query = startPoint.geometry.coordinates[1] + "," +
    startPoint.geometry.coordinates[0] + ":" +
    endPoint.geometry.coordinates[1] + "," +
    endPoint.geometry.coordinates[0];
    var url = `https://atlas.microsoft.com/route/directions/json?api-version=1.0&query=${query}`;

    //Make a search route request
    fetch(url, {
        headers: {
            "Subscription-Key": map.authentication.getToken()
        }
    })
    .then((response) => response.json())
    .then((response) => {
        var route = response.routes[0];
        //Create an array to store the coordinates of each turn
        var routeCoordinates = [];
        route.legs.forEach((leg) => {
            var legCoordinates = leg.points.map((point) => {
                return [point.longitude, point.latitude];
            });
            //Add each turn to the array
            routeCoordinates = routeCoordinates.concat(legCoordinates);
        });
        //Add route line to the datasource
        datasource.add(new atlas.data.Feature(new atlas.data.LineString(routeCoordinates)));
    });
});
            }

function searchRoute() {
    // Get the values from the input fields
    const startLocation = document.getElementById('startInput').value;
    const endLocation = document.getElementById('endInput').value;

    // Log the values to the console (for testing)
    console.log('Start Location:', startLocation);
    console.log('End Location:', endLocation);

    // Use the values in your logic (e.g., send them to an API or process them)
    if (startLocation && endLocation) {
        alert(`Searching route from ${startLocation} to ${endLocation}`);
        // Add your route search logic here
    } else {
        alert('Please enter both start and end locations.');
    }
}


// var map, datasource, searchClient; // Declare searchClient globally

// function GetMap() {
//     map = new atlas.Map('myMap', { // Remove 'var' to use global map variable
//         authOptions: {
//             authType: 'subscriptionKey',
//             subscriptionKey: 'FZI2j3E0Mp19Nwznj6pvIWKBdEAdyxWQ1Y9C66fdoB0hRSmiXLpaJQQJ99BDACYeBjF4DyP0AAAgAZMP4MjU' // Replace with your key
//         }
//     });

//     map.events.add('ready', function() {
//         datasource = new atlas.source.DataSource();
//         map.sources.add(datasource);

//         // Add route line layer
//         map.layers.add(new atlas.layer.LineLayer(datasource, null, {
//             strokeColor: '#2272B9',
//             strokeWidth: 5,
//             lineJoin: 'round',
//             lineCap: 'round'
//         }), 'labels');

//         // Add symbol layer for points
//         map.layers.add(new atlas.layer.SymbolLayer(datasource, null, {
//             iconOptions: { image: ['get', 'icon'], allowOverlap: true },
//             textOptions: { textField: ['get', 'title'], offset: [0, 1.2] },
//             filter: ['any', ['==', ['geometry-type'], 'Point'], ['==', ['geometry-type'], 'MultiPoint']]
//         }));

//         // Initialize search client AFTER map authentication is ready
//         searchClient = new atlas.service.SearchURL(map.authentication);

//         // Original hardcoded points (optional)
//         const startPoint = new atlas.data.Feature(
//             new atlas.data.Point([-122.130137, 47.644702]),
//             { title: "Redmond", icon: "pin-blue" }
//         );

//         const endPoint = new atlas.data.Feature(
//             new atlas.data.Point([-122.3352, 47.61397]),
//             { title: "Seattle", icon: "pin-round-blue" }
//         );

//         datasource.add([startPoint, endPoint]);
//         map.setCamera({ bounds: atlas.data.BoundingBox.fromData([startPoint, endPoint]), padding: 80 });

//         // Original route request (optional)
//         const initialQuery = "47.644702,-122.130137:47.61397,-122.3352";
//         fetchRoute(initialQuery);
//     });
// }

// async function searchRoute() {
//     const startQuery = document.getElementById('startInput').value;
//     const endQuery = document.getElementById('endInput').value;

//     if (!startQuery || !endQuery) {
//         alert('Please enter both start and destination locations.');
//         return;
//     }

//     try {
//         // Geocode locations
//         const [start, end] = await Promise.all([
//             searchClient.searchFuzzy(startQuery),
//             searchClient.searchFuzzy(endQuery)
//         ]);

//         const startCoord = start.geojson().features[0].geometry.coordinates;
//         const endCoord = end.geojson().features[0].geometry.coordinates;

//         // Create new GeoJSON points
//         const newStart = new atlas.data.Feature(
//             new atlas.data.Point(startCoord),
//             { title: startQuery, icon: "pin-blue" }
//         );

//         const newEnd = new atlas.data.Feature(
//             new atlas.data.Point(endCoord),
//             { title: endQuery, icon: "pin-round-blue" }
//         );

//         // Update map data
//         datasource.clear();
//         datasource.add([newStart, newEnd]);

//         map.setCamera({
//             bounds: atlas.data.BoundingBox.fromData([newStart, newEnd]),
//             padding: 80
//         });

//         // Calculate new route
//         const routeQuery = `${startCoord[1]},${startCoord[0]}:${endCoord[1]},${endCoord[0]}`;
//         fetchRoute(routeQuery);

//     } catch (error) {
//         console.error(error);
//         alert('Error processing locations. Please try again.');
//     }
// }

// function fetchRoute(query) {
//     const url = `https://atlas.microsoft.com/route/directions/json?api-version=1.0&query=${query}`;
    
//     fetch(url, {
//         headers: { 'Subscription-Key': map.authentication.subscriptionKey }
//     })
//     .then(response => response.json())
//     .then(data => {
//         const coordinates = data.routes[0].legs.flatMap(leg => 
//             leg.points.map(p => [p.longitude, p.latitude])
//         );
//         datasource.add(new atlas.data.LineString(coordinates));
//     })
//     .catch(error => {
//         console.error('Route request failed:', error);
//         alert('Failed to retrieve route information.');
//     });
// }