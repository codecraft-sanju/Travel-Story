import React from "react";
import Map from "react-map-gl";

export default function MapView({
  mapRef,
  onLoad,
  MAPBOX_TOKEN,
  recordWrapRef,
  fromCity,
  toCity,
}) {
  return (
    <div ref={recordWrapRef} className="absolute inset-0">
      {/* 📍 Overlay Text (shows on map + in recorded video) */}
      {fromCity && toCity && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-1.5 rounded-full text-sm font-medium z-20 backdrop-blur-sm shadow-md pointer-events-none">
          📍 {fromCity.split(",")[0]} → {toCity.split(",")[0]}
        </div>
      )}

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
