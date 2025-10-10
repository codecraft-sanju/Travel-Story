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

  // --- Video Recording ---
  const startRecording = (fps = 30, bitrate = 4000000) => {
    const canvas = recordRef.current?.querySelector("canvas");
    if (!canvas) return;

    const stream = canvas.captureStream(fps);
    const options = { mimeType: "video/webm;codecs=vp9", videoBitsPerSecond: bitrate };
    mediaRecorderRef.current = new MediaRecorder(stream, options);
    recordedChunks.current = [];
    mediaRecorderRef.current.ondataavailable = (e) => e.data.size && recordedChunks.current.push(e.data);
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
    } catch {
      setSuggestions([]);
    }
  };

  const handleSelectCity = (place, type) => {
    if (!place?.center) return;
    type === "from"
      ? (setFromCity(place.place_name), setFromCoord(place.center), setFromSuggestions([]))
      : (setToCity(place.place_name), setToCoord(place.center), setToSuggestions([]));
    setVehiclePos(null);
    setVehicleRotation(0);
    setRouteCoords(null);
    setTailCoords([]);
    setRecordedVideo(null);
  };

  // --- Generate Route with smooth Bezier ---
  const generateRoute = () => {
    if (!fromCoord || !toCoord) return;
    const line = turf.greatCircle(fromCoord, toCoord, { npoints: 300 });
    const bezier = turf.bezierSpline(line, { resolution: 10000, sharpness: 0.85 });
    setRouteCoords(bezier.geometry.coordinates);

    if (mapRef.current) {
      const bounds = [
        [Math.min(fromCoord[0], toCoord[0]), Math.min(fromCoord[1], toCoord[1])],
        [Math.max(fromCoord[0], toCoord[0]), Math.max(fromCoord[1], toCoord[1])]
      ];
      mapRef.current.fitBounds(bounds, { padding: 100, duration: 1500 });
    }
  };

  // --- Start Journey ---
  const startJourney = async () => {
    if (!routeCoords?.length) return;
    setJourneyStarted(true);

    const map = mapRef.current?.getMap();

    // preload icons
    const vehicles = ["plane", "bike", "car"];
    for (const v of vehicles) {
      const img = `${import.meta.env.BASE_URL}${v}.png`;
      if (!map.hasImage(`${v}-icon`)) await new Promise(resolve => map.loadImage(img, (err, image) => (!err && !map.hasImage(`${v}-icon`)) && map.addImage(`${v}-icon`, image), resolve()));
    }

    // --- Adaptive FPS & mobile handling ---
    const isMobile = window.innerWidth < 768;
    const fps = isMobile ? 20 : 60;
    const bitrate = isMobile ? 2500000 : 4000000;
    const tailRatio = isMobile ? 0.03 : 0.07;
    const cameraDuration = isMobile ? 500 : 250;

    startRecording(fps, bitrate);

    const index = { i: 0 };
    const total = routeCoords.length;
    const distance = turf.distance(turf.point(fromCoord), turf.point(toCoord));
    const duration = isMobile
      ? Math.min(20, Math.max(10, distance / 100))
      : Math.min(15, Math.max(5, distance / 150));

    gsap.ticker.fps(fps);
    gsap.killTweensOf(index);

    setTimeout(() => {
      gsap.to(index, {
        i: total - 1,
        duration,
        ease: "power2.inOut",
        onUpdate: () => {
          const posIndex = Math.floor(index.i);
          const pos = routeCoords[posIndex];
          if (!pos) return;

          setVehiclePos(pos);

          // Tail with opacity
          const tailLength = Math.max(5, Math.floor(total * tailRatio));
          const start = Math.max(0, posIndex - tailLength);
          const tailSlice = routeCoords.slice(start, posIndex + 1);
          setTailCoords(tailSlice.map((c, i) => ({ coord: c, opacity: (i + 1) / tailSlice.length })));

          // Rotation
          if (posIndex < routeCoords.length - 1) {
            const angle = turf.bearing(turf.point(pos), turf.point(routeCoords[posIndex + 1]));
            setVehicleRotation(angle);
          }

          // Camera
          if (mapRef.current) {
            const nextIndex = Math.min(routeCoords.length - 1, posIndex + 3);
            const nextPos = routeCoords[nextIndex];
            const bearing = turf.bearing(turf.point(pos), turf.point(nextPos));
            mapRef.current.easeTo({ center: pos, bearing, pitch: isMobile ? 45 : 60, duration: isMobile ? 0 : cameraDuration, easing: t => t });
          }
        },
        onComplete: () => {
          stopRecording();
          setTimeout(() => setJourneyStarted(false), 1000);
        }
      });
    }, 700);
  };

  const handleMapLoad = map => {
    const vehicles = ["plane", "bike", "car"];
    vehicles.forEach(v => {
      const img = `${import.meta.env.BASE_URL}${v}.png`;
      if (!map.hasImage(`${v}-icon`)) map.loadImage(img, (err, image) => (!err && !map.hasImage(`${v}-icon`)) && map.addImage(`${v}-icon`, image));
    });
  };

  return (
    <div className="relative w-full h-screen bg-gray-100 overflow-hidden">
      {!journeyStarted && <ControlPanel
        fromCity={fromCity} setFromCity={setFromCity}
        toCity={toCity} setToCity={setToCity}
        vehicle={vehicle} setVehicle={setVehicle}
        fromSuggestions={fromSuggestions} toSuggestions={toSuggestions}
        fetchSuggestions={fetchSuggestions}
        setFromSuggestions={setFromSuggestions} setToSuggestions={setToSuggestions}
        handleSelectCity={handleSelectCity}
        generateRoute={generateRoute}
        startJourney={startJourney}
      />}
      <MapView
        mapRef={mapRef} recordRef={recordRef} MAPBOX_TOKEN={MAPBOX_TOKEN}
        handleMapLoad={handleMapLoad}
        fromCoord={fromCoord} toCoord={toCoord}
        routeCoords={routeCoords} tailCoords={tailCoords}
        vehiclePos={vehiclePos} vehicleRotation={vehicleRotation}
        vehicle={vehicle}
      />
      <VideoModal recordedVideo={recordedVideo} />
    </div>
  );
};

export default App;
