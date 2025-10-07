import React, { useEffect, useRef } from "react";
import Map, { Marker } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MapComponent = ({ fromCoord, toCoord, vehicle = "plane" }) => {
  const mapRef = useRef();

  // Vehicle icon based on user selection
  const vehicleIcon = {
    plane: "/plane.png",
    bike: "/bike.png",
    car: "/car.png",
  }[vehicle];

  // Calculate midpoint for vehicle marker
  const midCoord =
    fromCoord && toCoord
      ? [
          (fromCoord[0] + toCoord[0]) / 2,
          (fromCoord[1] + toCoord[1]) / 2,
        ]
      : null;

  // Fit map to bounds
  useEffect(() => {
    if (fromCoord && toCoord && mapRef.current) {
      const bounds = [
        [Math.min(fromCoord[0], toCoord[0]), Math.min(fromCoord[1], toCoord[1])],
        [Math.max(fromCoord[0], toCoord[0]), Math.max(fromCoord[1], toCoord[1])],
      ];
      mapRef.current.fitBounds(bounds, { padding: 100, duration: 1000 });
    }
  }, [fromCoord, toCoord]);

  return (
    <div className="w-full h-screen">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 77.1025, latitude: 28.7041, zoom: 4 }}
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        style={{ width: "100%", height: "100%" }}
      >
        {/* From Marker */}
        {fromCoord && (
          <Marker longitude={fromCoord[0]} latitude={fromCoord[1]}>
            <div className="w-4 h-4 bg-green-500 rounded-full" title="From"></div>
          </Marker>
        )}

        {/* To Marker */}
        {toCoord && (
          <Marker longitude={toCoord[0]} latitude={toCoord[1]}>
            <div className="w-4 h-4 bg-blue-500 rounded-full" title="To"></div>
          </Marker>
        )}

        {/* Vehicle Marker */}
        {midCoord && vehicleIcon && (
          <Marker longitude={midCoord[0]} latitude={midCoord[1]}>
            <img src={vehicleIcon} alt={vehicle} className="w-12 h-12" />
          </Marker>
        )}
      </Map>
    </div>
  );
};

export default MapComponent;
