import React from "react";
import Map from "react-map-gl";

export default function MapView({ mapRef, onLoad, MAPBOX_TOKEN, recordWrapRef }) {
  return (
    <div ref={recordWrapRef} className="absolute inset-0">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 77.1025,
          latitude: 28.7041,
          zoom: 3.2,
          pitch: 45,
        }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: "100%", height: "100%" }}
        onLoad={onLoad}
      />
    </div>
  );
}
