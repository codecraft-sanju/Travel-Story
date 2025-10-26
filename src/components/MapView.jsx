import React, { memo } from "react";
import Map from "react-map-gl";

const MapView = ({
  mapRef,
  onLoad,
  MAPBOX_TOKEN,
  recordWrapRef,
  fromCity,
  toCity,
}) => {
  const hasCities = fromCity && toCity;
  const fromLabel = hasCities ? fromCity.split(",")[0].trim() : "";
  const toLabel = hasCities ? toCity.split(",")[0].trim() : "";

  return (
    <div
      ref={recordWrapRef}
      className="absolute inset-0 overflow-hidden rounded-2xl shadow-lg"
    >
      {/* 📍 Route Label */}
      {hasCities && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600/80 to-purple-600/80 text-white px-5 py-1.5 rounded-full text-sm font-semibold z-20 backdrop-blur-md shadow-xl border border-white/20 select-none pointer-events-none">
          📍 {fromLabel} → {toLabel}
        </div>
      )}

      {/* 🗺️ Map */}
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 77.1025,
          latitude: 28.7041,
          zoom: 3.2,
          pitch: 45,
          bearing: 0,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        onLoad={onLoad}
        attributionControl={false}
        dragRotate={true}
      />
    </div>
  );
};

export default memo(MapView);
