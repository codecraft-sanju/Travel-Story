import React, { useEffect } from "react";
import Map, { Source, Layer } from "react-map-gl";

// High-res PNG paths
const vehicleImages = {
  plane: "/aeroplane.png",
  bike: "/motorcycle.png",
  car: "/car.png",
  train: "/train.png",
};

const MapView = ({
  mapRef,
  recordRef,
  MAPBOX_TOKEN,
  handleMapLoad,
  fromCoord,
  toCoord,
  routeCoords,
  tailCoords,
  vehiclePos,
  vehicleRotation,
  vehicle
}) => {

  // Mapbox icon size by vehicle
  const getIconSize = () => {
    switch (vehicle) {
      case "bike": return 0.22;
      case "car": return 0.18;
      case "train": return 0.25;
      default: return 0.14; // plane
    }
  };

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const iconKey = `${vehicle}-icon`;

    // Update vehicle position
    if (map.hasImage(iconKey)) {
      const vehicleSource = map.getSource("vehicle-point");
      if (vehicleSource && vehiclePos) {
        vehicleSource.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: vehiclePos },
              properties: { rotation: vehicleRotation },
            },
          ],
        });
      }
    }

    // Update tail line
    if (tailCoords.length > 0) {
      const tailSource = map.getSource("tail");
      if (tailSource) {
        tailSource.setData({
          type: "Feature",
          geometry: { type: "LineString", coordinates: tailCoords.map(t => t.coord || t) },
        });
      }
    }
  }, [vehicle, vehiclePos, vehicleRotation, tailCoords]);

  // Preload all vehicle images
  const preloadVehicleImages = (map) => {
    Object.entries(vehicleImages).forEach(([key, path]) => {
      if (!map.hasImage(`${key}-icon`)) {
        map.loadImage(path, (err, img) => {
          if (!err && img && !map.hasImage(`${key}-icon`)) {
            map.addImage(`${key}-icon`, img);
          }
        });
      }
    });
  };

  return (
    <div className="w-full h-screen" ref={recordRef}>
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 77.1025, latitude: 28.7041, zoom: 4, pitch: 45 }}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: "100%", height: "100%" }}
        onLoad={(e) => {
          handleMapLoad(e.target);
          preloadVehicleImages(e.target);
        }}
      >
        {/* From & To points */}
        {fromCoord && (
          <Source id="from-point" type="geojson" data={{
            type: "FeatureCollection",
            features: [{ type: "Feature", geometry: { type: "Point", coordinates: fromCoord } }]
          }}>
            <Layer id="from-layer" type="circle" paint={{ "circle-radius": 8, "circle-color": "#22c55e" }} />
          </Source>
        )}
        {toCoord && (
          <Source id="to-point" type="geojson" data={{
            type: "FeatureCollection",
            features: [{ type: "Feature", geometry: { type: "Point", coordinates: toCoord } }]
          }}>
            <Layer id="to-layer" type="circle" paint={{ "circle-radius": 8, "circle-color": "#3b82f6" }} />
          </Source>
        )}

        {/* Route line */}
        {routeCoords && (
          <Source id="route" type="geojson" data={{
            type: "Feature",
            geometry: { type: "LineString", coordinates: routeCoords }
          }}>
            <Layer id="route-layer" type="line" paint={{
              "line-color": "#ff5733",
              "line-width": 5,
              "line-dasharray": [2, 4]
            }} />
          </Source>
        )}

        {/* Tail */}
        <Source id="tail" type="geojson" data={{
          type: "Feature",
          geometry: { type: "LineString", coordinates: tailCoords.map(t => t.coord || t) }
        }}>
          <Layer id="tail-layer" type="line" paint={{
            "line-color": "#ffd369",
            "line-width": 6,
            "line-opacity": 0.7,
            "line-blur": 2,
          }} />
        </Source>

        {/* Vehicle */}
        <Source id="vehicle-point" type="geojson" data={{
          type: "FeatureCollection",
          features: [{
            type: "Feature",
            geometry: { type: "Point", coordinates: vehiclePos || [0, 0] },
            properties: { rotation: vehicleRotation }
          }]
        }}>
          <Layer id="vehicle-layer" type="symbol" layout={{
            "icon-image": `${vehicle}-icon`,
            "icon-size": getIconSize(),
            "icon-rotate": ["get", "rotation"],
            "icon-rotation-alignment": "map",
            "icon-allow-overlap": true
          }} />
        </Source>
      </Map>
    </div>
  );
};

export default MapView;
