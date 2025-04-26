// let map;

// function InitMap() {
//   map = new atlas.Map('myMap', {
//     center: [78.9629, 20.5937],
//     zoom: 6,
//     view: 'Auto',
//     style: 'road',
//     authOptions: {
//       authType: 'subscriptionKey',
//       subscriptionKey: 'FZI2j3E0Mp19Nwznj6pvIWKBdEAdyxWQ1Y9C66fdoB0hRSmiXLpaJQQJ99BDACYeBjF4DyP0AAAgAZMP4MjU'
//     }
//   });
// }
// map.controls.add(new atlas.control.StyleControl({
//     mapStyles: ['road', 'grayscale_dark', 'night', 'road_shaded_relief', 'satellite', 'satellite_road_labels'],
//     layout: 'list'
// }), {
//     position: 'top-right'
// });
// function animateMap() {
//   map.setCamera({
//     zoom: Math.random() * 2 + 12,
//     duration: 1000,
//     type: 'fly'
//   });
// }

var map, defaultOptions, removeDefaults;

function getMap() {
    //Initialize a map instance.
    map = new atlas.Map('myMap', {
        view: 'Auto',

        //Add authentication details for connecting to Azure Maps.
        authOptions: {
            //Use Microsoft Entra ID authentication.
            // authType: 'anonymous',
            // clientId: 'e6b6ab59-eb5d-4d25-aa57-581135b927f0', //Your Azure Maps client id for accessing your Azure Maps account.
            // getToken: function (resolve, reject, map) {
            //     //URL to your authentication service that retrieves an Microsoft Entra ID Token.
            //     var tokenServiceUrl = 'https://samples.azuremaps.com/api/GetAzureMapsToken';

            //     fetch(tokenServiceUrl).then(r => r.text()).then(token => resolve(token));
            // }

            // Alternatively, use an Azure Maps key. Get an Azure Maps key at https://azure.com/maps. NOTE: The primary key should be used as the key.
            authType: 'subscriptionKey',
            subscriptionKey: 'FZI2j3E0Mp19Nwznj6pvIWKBdEAdyxWQ1Y9C66fdoB0hRSmiXLpaJQQJ99BDACYeBjF4DyP0AAAgAZMP4MjU'
        }
    });
    
    //Add events to update the map-info panel.
    map.events.add("dragend", () => updateState());
    map.events.add("zoomend", () => updateState());

    //Wait until the map resources are ready.
    map.events.add('ready', function () {
        defaultOptions = map.getStyle();

        //Update the map with the options in the input fields.
        updateStyles();
        updateState();
    });

    new ClipboardJS('.copyBtn');
}

function updateStyles() {
    var options = getInputOptions();

    //Update the maps style options.
    map.setStyle(options);

    document.getElementById('CodeOutput').value = JSON.stringify(options, null, '\t').replace(/\"([^(\")"]+)\":/g, "$1:");
}

function getInputOptions() {
    removeDefaults = document.getElementById('RemoveDefaults').checked;

    var light = {};

    var a = getSelectValue('anchor');

    if (!removeDefaults || a !== 'map') {
        light.anchor = a;
    }

    var c = document.getElementById('color').value.toUpperCase();

    if (!removeDefaults || c!== '#FFFFFF') {
        light.color = c;
    }

    var int = parseFloat(document.getElementById('intensity').value);

    if (!removeDefaults || int !== 0.5) {
        light.intensity = int;
    }

    var r = parseFloat(document.getElementById('RadialCoordinate').value);
    var az = parseFloat(document.getElementById('AzimuthalAngle').value);
    var pa = parseFloat(document.getElementById('PolarAngle').value);

    if (!removeDefaults || r !== defaultOptions.light.position[0] || az !== defaultOptions.light.position[1] || pa !== defaultOptions.light.position[2]) {
        light.position = [r, az, pa];
    }

    return {
        autoResize: getPropertyValue('autoResize', document.getElementById('autoResize').checked),
        renderWorldCopies: getPropertyValue('renderWorldCopies', document.getElementById('renderWorldCopies').checked),
        showFeedbackLink: getPropertyValue('showFeedbackLink', document.getElementById('showFeedbackLink').checked),
        showLogo: getPropertyValue('showLogo', document.getElementById('showLogo').checked),
        showLabels: getPropertyValue('showLabels', document.getElementById('showLabels').checked),
        showTileBoundaries: getPropertyValue('showTileBoundaries', document.getElementById('showTileBoundaries').checked),
        style: getPropertyValue('style', getSelectValue('style')),
        light: (Object.keys(light).length > 0)? light: undefined,
        styleOverrides: (obj => Object.keys(obj).length > 0 ? obj : undefined)(Object.fromEntries([
            ['countryRegion', { borderVisible: document.getElementById('showCountryBorders').checked }],
            ['adminDistrict', { borderVisible: document.getElementById('showAdminDistrictBorders').checked }],
            ['adminDistrict2', { borderVisible: document.getElementById('showSecondAdminDistrictBorders').checked }],
            ['buildingFootprint', { visible: document.getElementById('showBuildingFootprints').checked }],
            ['roadDetails', { visible: document.getElementById('showRoadDetails').checked }]
        ].filter(([_, v]) => !removeDefaults || !v.visible))),
    };
}

function getPropertyValue(propertyName, value) {

    if (removeDefaults) {
        if (propertyName.indexOf('.') > -1) {
            var p = propertyName.split('.');
            var val = defaultOptions;
            for (var i = 0; i < p.length; i++) {
                val = val[p[i]];
            }

            if (val === value) {
                return undefined;
            }
        } else if (defaultOptions[propertyName] === value) {
            return undefined;
        }
    }
    return value;
}

function getSelectValue(id) {
    var elm = document.getElementById(id);
    return elm.options[elm.selectedIndex].value;
}

function openTab(elm, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    elm.className += " active";
}

function updateState() {
    var camera = map.getCamera();
    document.getElementById("map-info").innerText = 
    `Zoom: ${camera.zoom.toFixed(1)} / ` +
    `Lat: ${camera.center[1].toFixed(5)} / ` +
    `Lng: ${camera.center[0].toFixed(5)}`;
}