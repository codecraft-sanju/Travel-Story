import React, { useEffect } from "react";
import Map, { Source, Layer } from "react-map-gl";

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
  vehicle, // Added vehicle prop
}) => {
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Dynamically load vehicle icon if not exists
    const vehicleIcon = { plane: "/plane.png", bike: "/bike.png", car: "/car.png" }[vehicle];
    if (!map.hasImage("vehicle-icon")) {
      map.loadImage(vehicleIcon, (err, img) => {
        if (!err && !map.hasImage("vehicle-icon")) map.addImage("vehicle-icon", img);
      });
    }

    // Update vehicle position
    if (vehiclePos) {
      const vehicleSource = map.getSource("vehicle-point");
      if (vehicleSource) {
        vehicleSource.setData({
          type: "FeatureCollection",
          features: [
            { type: "Feature", geometry: { type: "Point", coordinates: vehiclePos }, properties: { rotation: vehicleRotation } },
          ],
        });
      }
    }

    // Update tail
    if (tailCoords.length > 0) {
      const tailSource = map.getSource("tail");
      if (tailSource) {
        tailSource.setData({
          type: "Feature",
          geometry: { type: "LineString", coordinates: tailCoords },
        });
      }
    }
  }, [vehicle, vehiclePos, vehicleRotation, tailCoords]);

  return (
    <div className="w-full h-screen" ref={recordRef}>
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 77.1025, latitude: 28.7041, zoom: 4 }}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        style={{ width: "100%", height: "100%" }}
        onLoad={(e) => handleMapLoad(e.target)}
      >
        {fromCoord && (
          <Source
            id="from-point"
            type="geojson"
            data={{ type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Point", coordinates: fromCoord } }] }}
          >
            <Layer id="from-layer" type="circle" paint={{ "circle-radius": 6, "circle-color": "#22c55e" }} />
          </Source>
        )}
        {toCoord && (
          <Source
            id="to-point"
            type="geojson"
            data={{ type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Point", coordinates: toCoord } }] }}
          >
            <Layer id="to-layer" type="circle" paint={{ "circle-radius": 6, "circle-color": "#3b82f6" }} />
          </Source>
        )}
        {routeCoords && (
          <Source id="route" type="geojson" data={{ type: "Feature", geometry: { type: "LineString", coordinates: routeCoords } }}>
            <Layer id="route-layer" type="line" paint={{ "line-color": "#ff5733", "line-width": 4, "line-dasharray": [2, 4] }} />
          </Source>
        )}
        <Source id="tail" type="geojson" data={{ type: "Feature", geometry: { type: "LineString", coordinates: tailCoords } }}>
          <Layer id="tail-layer" type="line" paint={{ "line-color": "#ffbd69", "line-width": 6, "line-opacity": 0.6, "line-blur": 2 }} />
        </Source>
        <Source
          id="vehicle-point"
          type="geojson"
          data={{ type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Point", coordinates: vehiclePos || [0, 0] }, properties: { rotation: vehicleRotation } }] }}
        >
          <Layer
            id="vehicle-layer"
            type="symbol"
            layout={{
              "icon-image": "vehicle-icon",
              "icon-size": 0.11,
              "icon-rotate": ["get", "rotation"],
              "icon-rotation-alignment": "map",
              "icon-allow-overlap": true,
            }}
          />
        </Source>
      </Map>
    </div>
  );
};

export default MapView;
