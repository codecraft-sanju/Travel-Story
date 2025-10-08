import React, { useState, useRef } from "react";
import axios from "axios";
import { gsap } from "gsap";
import * as turf from "@turf/turf";

import ControlPanel from "./components/ControlPanel";
import MapView from "./components/MapView";
import VideoModal from "./components/VideoModal";

const App = () => {
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [vehicle, setVehicle] = useState("plane");
  const [fromCoord, setFromCoord] = useState(null);
  const [toCoord, setToCoord] = useState(null);
  const [vehiclePos, setVehiclePos] = useState(null);
  const [vehicleRotation, setVehicleRotation] = useState(0);
  const [routeCoords, setRouteCoords] = useState(null);
  const [tailCoords, setTailCoords] = useState([]);
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [journeyStarted, setJourneyStarted] = useState(false);

  const mapRef = useRef();
  const recordRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunks = useRef([]);
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

  // --- Recording ---
  const startRecording = () => {
    const canvas = recordRef.current?.querySelector("canvas");
    if (!canvas) return;
    const stream = canvas.captureStream(60);
    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: 6000000,
    });
    recordedChunks.current = [];
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.current.push(e.data);
    };
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunks.current, { type: "video/webm" });
      setRecordedVideo(URL.createObjectURL(blob));
    };
    mediaRecorderRef.current.start();
  };
  const stopRecording = () => mediaRecorderRef.current?.stop();

  // --- Autocomplete ---
  const fetchSuggestions = async (query, setSuggestions) => {
    if (!query) return setSuggestions([]);
    try {
      const res = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
        { params: { access_token: MAPBOX_TOKEN, autocomplete: true, limit: 6 } }
      );
      setSuggestions(res.data.features || []);
    } catch (err) {
      console.error(err);
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
    setVehicleRotation(0);
    setRouteCoords(null);
    setTailCoords([]);
    setRecordedVideo(null);
  };

  // --- Generate Route ---
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

  // --- Start Journey (Mobile Optimized) ---
  const startJourney = () => {
    if (!routeCoords?.length) return;

    setJourneyStarted(true);
    startRecording();

    const index = { i: 0 };
    const total = routeCoords.length;
    const duration = 6;

    const tailRatio = window.innerWidth < 768 ? 0.04 : 0.06; // shorter tail on mobile
    const cameraDuration = window.innerWidth < 768 ? 300 : 100; // slower camera on mobile

    gsap.killTweensOf(index);
    gsap.to(index, {
      i: total - 1,
      duration,
      ease: "power1.inOut",
      onUpdate: () => {
        const posIndex = Math.floor(index.i);
        const pos = routeCoords[posIndex];

        setVehiclePos(pos);
        const tailLength = Math.max(6, Math.floor(total * tailRatio));
        const start = Math.max(0, posIndex - tailLength);
        setTailCoords(routeCoords.slice(start, posIndex + 1));

        if (posIndex < routeCoords.length - 1) {
          const angle = turf.bearing(turf.point(pos), turf.point(routeCoords[posIndex + 1]));
          setVehicleRotation(angle);
        }

        if (mapRef.current) {
          const nextIndex = Math.min(routeCoords.length - 1, posIndex + 3);
          const nextPos = routeCoords[nextIndex];
          const bearing = turf.bearing(turf.point(pos), turf.point(nextPos));
          mapRef.current.easeTo({ center: pos, bearing, pitch: 45, duration: cameraDuration, easing: (t) => t });
        }
      },
      onComplete: () => stopRecording(),
    });
  };

  const handleMapLoad = (map) => {
    const vehicleIcon = { plane: "/plane.png", bike: "/bike.png", car: "/car.png" }[vehicle];
    if (!map.hasImage("vehicle-icon")) {
      map.loadImage(vehicleIcon, (error, image) => {
        if (!error && !map.hasImage("vehicle-icon")) map.addImage("vehicle-icon", image);
      });
    }
  };

  return (
    <div className="relative w-full h-screen bg-gray-100">
      {!journeyStarted && (
        <ControlPanel
          fromCity={fromCity}
          setFromCity={setFromCity}
          toCity={toCity}
          setToCity={setToCity}
          vehicle={vehicle}
          setVehicle={setVehicle}
          fromSuggestions={fromSuggestions}
          toSuggestions={toSuggestions}
          fetchSuggestions={fetchSuggestions}
          setFromSuggestions={setFromSuggestions}
          setToSuggestions={setToSuggestions}
          handleSelectCity={handleSelectCity}
          generateRoute={generateRoute}
          startJourney={startJourney}
        />
      )}

      <MapView
        mapRef={mapRef}
        recordRef={recordRef}
        MAPBOX_TOKEN={MAPBOX_TOKEN}
        handleMapLoad={handleMapLoad}
        fromCoord={fromCoord}
        toCoord={toCoord}
        routeCoords={routeCoords}
        tailCoords={tailCoords}
        vehiclePos={vehiclePos}
        vehicleRotation={vehicleRotation}
        vehicle={vehicle} // Pass vehicle for dynamic icon
      />

      <VideoModal recordedVideo={recordedVideo} />
    </div>
  );
};

export default App;
