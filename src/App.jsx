import React, { useState, useRef } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl";
import axios from "axios";
import { gsap } from "gsap";
import * as turf from "@turf/turf";
import "mapbox-gl/dist/mapbox-gl.css";

const App = () => {
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [vehicle, setVehicle] = useState("plane");
  const [fromCoord, setFromCoord] = useState(null);
  const [toCoord, setToCoord] = useState(null);
  const [vehiclePos, setVehiclePos] = useState(null);
  const [routeCoords, setRouteCoords] = useState(null);
  const [tailCoords, setTailCoords] = useState([]);
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);

  const mapRef = useRef();
  const recordRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunks = useRef([]);

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

  // --- Recording ---
  const startRecording = () => {
    const canvas = recordRef.current.querySelector("canvas");
    if (!canvas) return;

    const stream = canvas.captureStream(30); // 30fps
    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
    });

    recordedChunks.current = [];
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunks.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "travel-story.webm";
      a.click();
    };

    mediaRecorderRef.current.start();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
  };

  // --- Autocomplete ---
  const fetchSuggestions = async (query, setSuggestions) => {
    if (!query) return setSuggestions([]);
    try {
      const res = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json`,
        {
          params: {
            access_token: MAPBOX_TOKEN,
            autocomplete: true,
            limit: 6,
          },
        }
      );
      setSuggestions(res.data.features || []);
    } catch (err) {
      console.error("Geocoding error:", err);
      setSuggestions([]);
    }
  };

  const handleSelectCity = (place, type) => {
    if (!place?.center) return;
    if (type === "from") {
      setFromCity(place.place_name);
      setFromCoord(place.center);
      setFromSuggestions([]);
    } else {
      setToCity(place.place_name);
      setToCoord(place.center);
      setToSuggestions([]);
    }
    setVehiclePos(null);
    setRouteCoords(null);
    setTailCoords([]);
  };

  // --- Generate route ---
  const generateRoute = () => {
    if (!fromCoord || !toCoord) return;
    const line = turf.greatCircle(fromCoord, toCoord, { npoints: 120 });
    setRouteCoords(line.geometry.coordinates);

    if (mapRef.current) {
      const bounds = [
        [Math.min(fromCoord[0], toCoord[0]), Math.min(fromCoord[1], toCoord[1])],
        [Math.max(fromCoord[0], toCoord[0]), Math.max(fromCoord[1], toCoord[1])],
      ];
      mapRef.current.fitBounds(bounds, { padding: 80, duration: 1000 });
    }
  };

  // --- Animate journey & record ---
  const startJourney = () => {
    if (!routeCoords || routeCoords.length === 0) return;

    startRecording(); // start video recording

    let index = { i: 0 };
    const total = routeCoords.length;
    const duration = 6; // seconds

    gsap.killTweensOf(index);
    gsap.to(index, {
      i: total - 1,
      duration,
      ease: "power1.inOut",
      onUpdate: () => {
        const posIndex = Math.floor(index.i);
        const pos = routeCoords[posIndex];
        setVehiclePos(pos);

        // Tail effect
        const tailLength = Math.max(6, Math.floor(total * 0.06));
        const start = Math.max(0, posIndex - tailLength);
        setTailCoords(routeCoords.slice(start, posIndex + 1));

        // Map follows vehicle
        if (mapRef.current) {
          mapRef.current.easeTo({ center: pos, duration: 100 });
        }
      },
      onComplete: () => {
        stopRecording(); // stops recording + triggers download
      },
    });
  };

  const vehicleIcon = {
    plane: "/plane.png",
    bike: "/bike.png",
    car: "/car.png",
  }[vehicle];

  return (
    <div className="relative w-full h-screen bg-gray-100">
      {/* Control Panel */}
      <div className="absolute z-20 p-4 bg-white shadow-lg rounded-md top-4 left-4 w-80">
        <h2 className="font-bold text-xl mb-2">Travel Route</h2>

        {/* From input */}
        <input
          type="text"
          placeholder="From City"
          value={fromCity}
          onChange={(e) => {
            setFromCity(e.target.value);
            fetchSuggestions(e.target.value, setFromSuggestions);
          }}
          className="border p-2 mb-1 w-full rounded"
        />
        {fromSuggestions.length > 0 && (
          <ul className="border rounded bg-white shadow max-h-40 overflow-y-auto mb-2">
            {fromSuggestions.map((p) => (
              <li
                key={p.id}
                className="p-2 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSelectCity(p, "from")}
              >
                {p.place_name}
              </li>
            ))}
          </ul>
        )}

        {/* To input */}
        <input
          type="text"
          placeholder="To City"
          value={toCity}
          onChange={(e) => {
            setToCity(e.target.value);
            fetchSuggestions(e.target.value, setToSuggestions);
          }}
          className="border p-2 mb-1 w-full rounded"
        />
        {toSuggestions.length > 0 && (
          <ul className="border rounded bg-white shadow max-h-40 overflow-y-auto mb-2">
            {toSuggestions.map((p) => (
              <li
                key={p.id}
                className="p-2 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSelectCity(p, "to")}
              >
                {p.place_name}
              </li>
            ))}
          </ul>
        )}

        {/* Vehicle */}
        <select
          value={vehicle}
          onChange={(e) => setVehicle(e.target.value)}
          className="border p-2 mb-2 w-full rounded"
        >
          <option value="plane">Aeroplane</option>
          <option value="bike">Bike</option>
          <option value="car">Car</option>
        </select>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={generateRoute}
            className="bg-gray-600 text-white w-1/2 py-2 rounded hover:bg-gray-700"
          >
            Show Route
          </button>
          <button
            onClick={startJourney}
            className="bg-blue-600 text-white w-1/2 py-2 rounded hover:bg-blue-700"
          >
            Start Journey 🎥
          </button>
        </div>
      </div>

      {/* Map Container (recorded) */}
      <div className="w-full h-screen" ref={recordRef}>
        <Map
          ref={mapRef}
          initialViewState={{ longitude: 77.1025, latitude: 28.7041, zoom: 4 }}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/streets-v11"
          style={{ width: "100%", height: "100%" }}
        >
          {/* Markers */}
          {fromCoord && (
            <Marker longitude={fromCoord[0]} latitude={fromCoord[1]}>
              <div className="w-4 h-4 bg-green-500 rounded-full" />
            </Marker>
          )}
          {toCoord && (
            <Marker longitude={toCoord[0]} latitude={toCoord[1]}>
              <div className="w-4 h-4 bg-blue-500 rounded-full" />
            </Marker>
          )}

          {/* Route */}
          {routeCoords && (
            <Source
              id="route"
              type="geojson"
              data={{ type: "Feature", geometry: { type: "LineString", coordinates: routeCoords } }}
            >
              <Layer
                id="route-layer"
                type="line"
                paint={{
                  "line-color": "#ff5733",
                  "line-width": 4,
                  "line-dasharray": [2, 4],
                }}
              />
            </Source>
          )}

          {/* Tail trail */}
          {tailCoords.length > 0 && (
            <Source
              id="tail"
              type="geojson"
              data={{ type: "Feature", geometry: { type: "LineString", coordinates: tailCoords } }}
            >
              <Layer
                id="tail-layer"
                type="line"
                paint={{
                  "line-color": "#ffbd69",
                  "line-width": 6,
                  "line-opacity": 0.6,
                  "line-blur": 2,
                }}
              />
            </Source>
          )}

          {/* Vehicle */}
          {vehiclePos && (
            <Marker longitude={vehiclePos[0]} latitude={vehiclePos[1]}>
              <img src={vehicleIcon} alt={vehicle} className="w-12 h-12 drop-shadow-lg" />
            </Marker>
          )}
        </Map>
      </div>
    </div>
  );
};

export default App;
