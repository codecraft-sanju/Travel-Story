import React from "react";
import Map from "react-map-gl";

const MapView = ({ mapRef }) => {
  const setupLayers = (map) => {
    const layers = [
      ["from-point", "circle", { "circle-radius": 8, "circle-color": "#22c55e" }],
      ["to-point", "circle", { "circle-radius": 8, "circle-color": "#3b82f6" }],
      [
        "route",
        "line",
        {
          "line-color": "#fff",
          "line-width": 5,
          "line-blur": 1.2,
          "line-opacity": 0.85,
          "line-dasharray": [0.1, 1.8],
        },
      ],
      [
        "tail",
        "line",
        {
          "line-color": "#ffd369",
          "line-width": 7,
          "line-opacity": 0.7,
          "line-blur": 2.5,
        },
      ],
    ];

    layers.forEach(([id, type, paint]) => {
      if (!map.getSource(id)) {
        map.addSource(id, {
          type: "geojson",
          data:
            type === "line"
              ? { type: "Feature", geometry: { type: "LineString", coordinates: [] } }
              : { type: "FeatureCollection", features: [] },
        });
        map.addLayer({ id: `${id}-layer`, type, source: id, paint });
      }
    });

    if (!map.getSource("vehicle-point")) {
      map.addSource("vehicle-point", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [0, 0] },
              properties: { rotation: 0, icon: "plane-icon", size: 0.16 },
            },
          ],
        },
      });
      map.addLayer({
        id: "vehicle-layer",
        type: "symbol",
        source: "vehicle-point",
        layout: {
          "icon-image": ["get", "icon"],
          "icon-size": ["get", "size"],
          "icon-rotate": ["get", "rotation"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
        },
      });
    }
  };

  const preloadPlane = (map) => {
    if (!map.hasImage("plane-icon")) {
      map.loadImage("/plane.png", (err, img) => {
        if (!err && img && !map.hasImage("plane-icon")) {
          map.addImage("plane-icon", img, { sdf: false });
        }
      });
    }
  };

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: 77.1025,
        latitude: 28.7041,
        zoom: 3.2,
        pitch: 45,
        bearing: 0,
      }}
      mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
      mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
      style={{ width: "100%", height: "100%" }}
      onLoad={(e) => {
        const map = e.target;
        preloadPlane(map);
        setupLayers(map);
      }}
    />
  );
};

export default MapView;
