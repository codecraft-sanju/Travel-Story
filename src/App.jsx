import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  memo,
} from "react";
import Map, { Source, Layer } from "react-map-gl";
import axios from "axios";
import { gsap } from "gsap";
import * as turf from "@turf/turf";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaPlane,
  FaRoute,
  FaPlay,
  FaStop,
  FaMapMarkerAlt,
  FaChevronUp,
  FaCircleNotch,
} from "react-icons/fa";

import "mapbox-gl/dist/mapbox-gl.css";

// ==========================================
// 1. CONFIG & ASSETS
// ==========================================

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const PLANE_ICON_ID = "plane-icon";
// High Quality Plane Icon
const PLANE_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Airplane_silhouette.svg/2048px-Airplane_silhouette.svg.png"; 

// ==========================================
// 2. MODERN UI COMPONENTS
// ==========================================

// --- Glassmorphic Button ---
const Btn = ({ onClick, children, variant = "primary", disabled = false, className = "" }) => {
  const base = "relative overflow-hidden flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-lg backdrop-blur-md";
  
  const variants = {
    primary: "bg-blue-600 text-white shadow-blue-500/40 hover:bg-blue-500",
    secondary: "bg-white/80 text-gray-800 border border-white/50 hover:bg-white",
    danger: "bg-red-500 text-white shadow-red-500/40",
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

// --- Tech Loader Overlay ---
const TechLoader = ({ text }) => (
  <motion.div 
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white"
  >
    <div className="relative w-20 h-20 flex items-center justify-center mb-4">
      {/* Radar Effect rings */}
      <span className="absolute inset-0 border-4 border-blue-500/30 rounded-full animate-ping" />
      <span className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin" />
      <FaPlane className="text-2xl text-white rotate-45" />
    </div>
    <h3 className="text-lg font-bold tracking-wider animate-pulse">{text}</h3>
    <p className="text-xs text-gray-400 mt-2">Optimizing Flight Path...</p>
  </motion.div>
);

// --- Input Field (Modified to accept className for z-index control) ---
const LocationInput = ({ value, setValue, suggestions, setSuggestions, onSelect, placeholder, fetchSuggestions, className = "" }) => {
  const inputRef = useRef(null);
  const debounce = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value;
    setValue(val);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchSuggestions(val, setSuggestions), 300);
  };

  return (
    // FIX: Using dynamic className to control stacking order
    <div className={`mb-4 relative ${className}`}>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 z-10">
        <FaMapMarkerAlt />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-gray-700 shadow-inner"
        onFocus={() => setTimeout(() => inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
      />
      
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.ul 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-56 overflow-y-auto z-[60]"
          >
            {suggestions.map((s) => (
              <li 
                key={s.id} 
                onClick={() => { onSelect(s); setSuggestions([]); }}
                className="px-5 py-3 border-b last:border-0 border-gray-100 hover:bg-blue-50 active:bg-blue-100 cursor-pointer text-sm font-medium text-gray-600 truncate"
              >
                {s.place_name}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// 3. MAIN APP
// ==========================================

export default function App() {
  // --- State ---
  const [viewState, setViewState] = useState({ longitude: 78.9629, latitude: 20.5937, zoom: 3 });
  const [loadingState, setLoadingState] = useState(null); // 'routing' | 'preparing' | null
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);

  // Inputs
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [fromSug, setFromSug] = useState([]);
  const [toSug, setToSug] = useState([]);

  // Refs
  const mapRef = useRef(null);
  const fromCoord = useRef(null);
  const toCoord = useRef(null);
  const routePath = useRef([]);
  const animTimeline = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  // --- API ---
  const fetchSuggestions = async (query, setList) => {
    if (!query) return setList([]);
    try {
      const res = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`, {
        params: { access_token: MAPBOX_TOKEN, autocomplete: true, limit: 3 }
      });
      setList(res.data.features || []);
    } catch (e) { console.error(e); }
  };

  const handleSelect = (feat, type) => {
    const coords = feat.center;
    if (type === "from") {
      fromCoord.current = coords;
      setFromCity(feat.place_name.split(",")[0]);
      mapRef.current?.getSource("from-point")?.setData({ type: "Feature", geometry: { type: "Point", coordinates: coords } });
    } else {
      toCoord.current = coords;
      setToCity(feat.place_name.split(",")[0]);
      mapRef.current?.getSource("to-point")?.setData({ type: "Feature", geometry: { type: "Point", coordinates: coords } });
    }
    
    // Quick fly to show selection
    mapRef.current?.flyTo({ center: coords, zoom: 4 });
  };

  // --- LOGIC: Route Generation ---
  const generateRoute = async () => {
    if (!fromCoord.current || !toCoord.current) return alert("Please select both locations");
    
    setLoadingState("routing");
    setIsDrawerOpen(false);

    // Artificial delay to show loader (feels more "pro")
    await new Promise(r => setTimeout(r, 800));

    const start = fromCoord.current;
    const end = toCoord.current;

    // 1. Calculate Bezier Curve
    const greatCircle = turf.greatCircle(start, end, { npoints: 100 });
    const curved = turf.bezierSpline(greatCircle, { resolution: 10000, sharpness: 0.6 }); // Sharpness adjustment
    const distance = turf.length(curved, { units: "kilometers" });
    
    // 2. Create high-res path for smoothness
    const steps = Math.ceil(distance / 2); // 1 point every 2km
    const path = [];
    for(let i=0; i<steps; i++) {
      path.push(turf.along(curved, (i * distance)/steps, { units: "kilometers" }).geometry.coordinates);
    }
    routePath.current = path;

    // 3. Update Map Layers
    const map = mapRef.current?.getMap();
    map?.getSource("route-line")?.setData({ type: "Feature", geometry: { type: "LineString", coordinates: path } });
    
    // 4. Place Plane at Start IMMEDIATELY
    const initialBearing = turf.bearing(turf.point(path[0]), turf.point(path[1]));
    map?.getSource("plane-point")?.setData({
      type: "Feature",
      geometry: { type: "Point", coordinates: path[0] },
      properties: { rotate: initialBearing }
    });

    // 5. Fit Bounds
    const bounds = new mapboxgl.LngLatBounds(start, end);
    map?.fitBounds(bounds, { padding: 100, duration: 1500 });

    setLoadingState(null);
    setTimeout(() => setIsDrawerOpen(true), 500);
  };

  // --- LOGIC: Flight Animation ---
  const startFlight = async () => {
    if (routePath.current.length === 0) return generateRoute();

    setLoadingState("preparing"); // Show loader while we setup video
    setIsDrawerOpen(false);

    const map = mapRef.current?.getMap();
    const path = routePath.current;

    // 1. Setup Recorder
    const canvas = document.querySelector(".mapboxgl-canvas");
    const stream = canvas.captureStream(30); // 30fps is stable for mobile
    const rec = new MediaRecorder(stream, { mimeType: "video/webm" });
    chunksRef.current = [];
    rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = () => {
       const blob = new Blob(chunksRef.current, { type: "video/webm" });
       setVideoUrl(URL.createObjectURL(blob));
    };
    recorderRef.current = rec;

    // 2. Reset Camera to Start Position (Instant)
    const initialBearing = turf.bearing(turf.point(path[0]), turf.point(path[1]));
    map.jumpTo({ center: path[0], zoom: 5, pitch: 60, bearing: initialBearing });

    // 3. Buffer Delay (Wait for map tiles to load at start)
    await new Promise(r => setTimeout(r, 1500)); 

    // 4. GO!
    setLoadingState(null);
    setIsPlaying(true);
    rec.start();

    // 5. GSAP Animation
    const obj = { index: 0 };
    animTimeline.current = gsap.to(obj, {
      index: path.length - 1,
      duration: 14, // Slower flight for grandeur
      ease: "none",
      onUpdate: () => {
        const i = Math.floor(obj.index);
        const curr = path[i];
        const next = path[i+1] || curr;
        const bearing = turf.bearing(turf.point(curr), turf.point(next));

        // Update Plane
        map.getSource("plane-point").setData({
          type: "Feature",
          geometry: { type: "Point", coordinates: curr },
          properties: { rotate: bearing }
        });

        // Update Tail
        const tail = path.slice(Math.max(0, i - 50), i + 1);
        map.getSource("tail-line").setData({ type: "Feature", geometry: { type: "LineString", coordinates: tail } });

        // Update Camera
        map.easeTo({
          center: curr,
          bearing: bearing,
          pitch: 60,
          zoom: 5.5, // Slightly zoomed in
          duration: 0 // Instant follow
        });
      },
      onComplete: () => {
        rec.stop();
        setIsPlaying(false);
        setIsDrawerOpen(true);
        map.easeTo({ pitch: 0, zoom: 3, duration: 2000 });
      }
    });
  };

  const stopFlight = () => {
    animTimeline.current?.kill();
    recorderRef.current?.stop();
    setIsPlaying(false);
    setIsDrawerOpen(true);
    setLoadingState(null);
  };

  // --- Map Load ---
  const onMapLoad = (e) => {
    const map = e.target;
    
    // Load Icon immediately
    if(!map.hasImage(PLANE_ICON_ID)) {
      map.loadImage(PLANE_URL, (err, img) => {
        if(!err) map.addImage(PLANE_ICON_ID, img);
      });
    }

    // Sources
    const empty = { type: "FeatureCollection", features: [] };
    map.addSource("route-line", { type: "geojson", data: empty });
    map.addSource("tail-line", { type: "geojson", data: empty });
    map.addSource("from-point", { type: "geojson", data: empty });
    map.addSource("to-point", { type: "geojson", data: empty });
    map.addSource("plane-point", { type: "geojson", data: empty });

    // Layers
    // 1. Dashed Route
    map.addLayer({
      id: "route-layer", type: "line", source: "route-line",
      paint: { "line-color": "#ffffff", "line-width": 2, "line-opacity": 0.5, "line-dasharray": [2, 4] }
    });

    // 2. Gold Tail
    map.addLayer({
      id: "tail-layer", type: "line", source: "tail-line",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#fbbf24", "line-width": 4, "line-blur": 1 }
    });

    // 3. Markers
    map.addLayer({ id: "from-l", type: "circle", source: "from-point", paint: { "circle-radius": 8, "circle-color": "#10b981", "circle-stroke-width": 2, "circle-stroke-color": "#fff" } });
    map.addLayer({ id: "to-l", type: "circle", source: "to-point", paint: { "circle-radius": 8, "circle-color": "#ef4444", "circle-stroke-width": 2, "circle-stroke-color": "#fff" } });

    // 4. PLANE (Dynamic Size)
    map.addLayer({
      id: "plane-layer", type: "symbol", source: "plane-point",
      layout: {
        "icon-image": PLANE_ICON_ID,
        "icon-rotate": ["get", "rotate"],
        "icon-rotation-alignment": "map",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        // DYNAMIC ICON SIZE: Zoom 0 -> 0.2 size, Zoom 10 -> 0.8 size
        "icon-size": [
          "interpolate", ["linear"], ["zoom"],
          0, 0.2,
          5, 0.5,
          10, 0.8
        ]
      }
    });
  };

  return (
    <div className="relative w-full h-[100dvh] bg-gray-900 overflow-hidden text-gray-800 font-sans">
      
      {/* LOADERS */}
      <AnimatePresence>
        {loadingState === "routing" && <TechLoader key="l1" text="Calculating Trajectory..." />}
        {loadingState === "preparing" && <TechLoader key="l2" text="Initializing Systems..." />}
      </AnimatePresence>

      {/* MAP */}
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={viewState}
        onMove={e => setViewState(e.viewState)}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        onLoad={onMapLoad}
        attributionControl={false}
      />

      {/* STOP BUTTON */}
      {isPlaying && (
        <motion.div 
          initial={{ y: 100 }} animate={{ y: 0 }}
          className="absolute bottom-10 left-0 right-0 flex justify-center z-50"
        >
          <Btn variant="danger" onClick={stopFlight} className="shadow-red-500/50 rounded-full px-8">
            <FaStop /> Abort Flight
          </Btn>
        </motion.div>
      )}

      {/* VIDEO DOWNLOAD MODAL */}
      <AnimatePresence>
        {videoUrl && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[70] bg-black/80 backdrop-blur flex items-center justify-center p-6"
          >
            <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl">
              <h3 className="text-xl font-bold mb-4 text-center">Flight Recorded 🎬</h3>
              <video src={videoUrl} controls className="w-full rounded-xl mb-4 bg-black" />
              <div className="grid grid-cols-2 gap-3">
                <a href={videoUrl} download="flight-journey.webm" className="flex items-center justify-center gap-2 bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-500/30">
                  Save Video
                </a>
                <button onClick={() => setVideoUrl(null)} className="font-bold text-gray-500 hover:bg-gray-100 rounded-xl">
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DRAWER TOGGLE */}
      {!isDrawerOpen && !loadingState && !isPlaying && (
         <button onClick={() => setIsDrawerOpen(true)} className="absolute bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-xl z-40 animate-bounce">
           <FaChevronUp />
         </button>
      )}

      {/* DRAWER UI */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)} className="absolute inset-0 bg-black/20 backdrop-blur-[1px] z-30"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] p-6 pb-8 z-40 shadow-[0_-10px_60px_rgba(0,0,0,0.4)]"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" onClick={() => setIsDrawerOpen(false)}/>
              
              <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2">
                <FaPlane className="text-blue-600 rotate-[-45deg]" /> Flight Plan
              </h2>

              {/* FIX: Gave 'From' input higher z-index (z-50) so dropdown shows ON TOP of 'To' input */}
              <LocationInput 
                className="z-50"
                placeholder="Origin Airport / City"
                value={fromCity} setValue={setFromCity}
                suggestions={fromSug} setSuggestions={setFromSug}
                fetchSuggestions={fetchSuggestions} onSelect={p => handleSelect(p, "from")}
              />

              <div className="flex justify-center -my-3 relative z-10">
                 <div className="bg-gray-100 p-2 rounded-full border-4 border-white text-gray-400">
                    <FaRoute className="rotate-90" />
                 </div>
              </div>

              {/* FIX: Gave 'To' input lower z-index (z-40) */}
              <LocationInput 
                className="z-40"
                placeholder="Destination Airport / City"
                value={toCity} setValue={setToCity}
                suggestions={toSug} setSuggestions={setToSug}
                fetchSuggestions={fetchSuggestions} onSelect={p => handleSelect(p, "to")}
              />

              <div className="grid grid-cols-2 gap-4 mt-6 relative z-30">
                <Btn variant="secondary" onClick={generateRoute}>Preview Path</Btn>
                <Btn onClick={startFlight} disabled={!routePath.current.length}>
                  <FaPlay /> Take Off
                </Btn>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}