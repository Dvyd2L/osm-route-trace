const MALAGA_COORDINATES = [36.7213, -4.4214];
const OSRM_BASE_URL = 'http://172.24.151.145:5000'; // docker OSRM
// const OSRM_BASE_URL = 'http://router.project-osrm.org';
const MAX_ZOOM = 19;
const ATTRIBUTIONS = Object.freeze({
  OSM: '© OpenStreetMap',
  CARTO:
    '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noreferrer" target="_blank">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" rel="noreferrer" target="_blank">CARTO</a>',
  STAMEN:
    'Map tiles by <a href="https://stamen.com" rel="noreferrer" target="_blank">Stamen Design</a>, under <a href="https://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="https://openstreetmap.org" rel="noreferrer" target="_blank">OpenStreetMap</a>, under <a href="https://www.openstreetmap.org/copyright">ODbL</a>.',
  STADIAMAPS:
    '&copy; <a href="https://stadiamaps.com/" rel="noreferrer" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" rel="noreferrer" target="_blank">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org/copyright" rel="noreferrer" target="_blank">OpenStreetMap</a> contributors',
  ESRI: 'Powered by <a href="https://www.esri.com/" rel="noreferrer" target="_blank">Esri</a> &copy;',
});
let markers = []; // Marcadores de inicio y fin

// Inicializar el mapa de Leaflet centrado en una ubicación y con un nivel de zoom.
const map = L.map('map').setView(MALAGA_COORDINATES, 12);

// Inicializar capas de marcadores y rutas
const markersLayer = L.layerGroup().addTo(map);
const routeLayer = L.layerGroup().addTo(map);

// Añadir al mapa capas base de OpenStreetMap
const osmLayer = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    maxZoom: MAX_ZOOM,
    attribution: ATTRIBUTIONS.OSM,
  }
).addTo(map);
const stadiaLayers = {
  alidadeSmoothLight: L.tileLayer(
    'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
    {
      maxZoom: MAX_ZOOM,
      attribution: ATTRIBUTIONS.STADIAMAPS,
    }
  ),
  alidadeSmoothDark: L.tileLayer(
    'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
    {
      maxZoom: MAX_ZOOM,
      attribution: ATTRIBUTIONS.STADIAMAPS,
    }
  ),
};
const cartoLayers = {
  positron: L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    {
      maxZoom: MAX_ZOOM,
      attribution: ATTRIBUTIONS.CARTO,
    }
  ),
  darkMatter: L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    {
      maxZoom: MAX_ZOOM,
      attribution: ATTRIBUTIONS.CARTO,
    }
  ),
};
const esriWorldLayers = {
  imagery: L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom: MAX_ZOOM,
      attribution: ATTRIBUTIONS.ESRI,
    }
  ),
  streets: L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom: MAX_ZOOM,
      attribution: ATTRIBUTIONS.ESRI,
    }
  ),
};

// Añadir control de capas
L.control
  .layers({
    'Open Street Map': osmLayer,
    'StadiaMaps Alidade Smooth Light': stadiaLayers.alidadeSmoothLight,
    'StadiaMaps Alidade Smooth Dark': stadiaLayers.alidadeSmoothDark,
    'CartoDB Positron': cartoLayers.positron,
    'CartoDB Dark Matter': cartoLayers.darkMatter,
    'EsriWorld Imagery': esriWorldLayers.imagery,
    'EsriWorld Streets': esriWorldLayers.streets,
  })
  .addTo(map);

// Añadir un evento de clic para colocar los marcadores
map.on('click', (ev) => {
  // Limpiar la capa de marcadores y rutas anterior
  if (markers.length >= 2) {
    markersLayer.clearLayers();
    routeLayer.clearLayers();
    markers = [];
    return;
  }

  const marker = L.marker(ev.latlng)
    .addTo(map)
    .addTo(markersLayer)
    .bindPopup(markers.length === 0 ? 'Inicio' : 'Fin')
    .openPopup();

  markers.push(marker);

  if (markers.length === 2) {
    // Llamamos a la función para trazar la ruta
    getRoute(markers[0].getLatLng(), markers[1].getLatLng());
  }
});

// Función para hacer la petición de ruta a OSRM y mostrarla en el mapa
async function getRoute(start, end, errorHandler = console.error) {
  const osrmUrl = new URL(
    `route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}`,
    OSRM_BASE_URL
  );
  osrmUrl.searchParams.set('overview', 'full');
  osrmUrl.searchParams.set('geometries', 'geojson');
  try {
    const response = await fetch(osrmUrl);
    if (!response.ok) {
      throw new Error(
        `[${new Date().toISOString()}] [HTTP ERROR ${response.status}]\n${
          response.statusText
        }`
      );
    }
    const data = await response.json();
    const route = data.routes[0].geometry;

    // Crear una capa de polyline y agregar la ruta al mapa
    const routeLine = L.geoJSON(route, {
      style: { color: 'red', weight: 4 },
    }).addTo(routeLayer);

    // Zoom para ajustar la vista a la ruta
    map.fitBounds(routeLine.getBounds());
  } catch (error) {
    errorHandler(error);
  }
}
