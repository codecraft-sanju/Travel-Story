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
  FaTimes,
  FaCircleNotch,
} from "react-icons/fa";

import "mapbox-gl/dist/mapbox-gl.css";

// ==========================================
// 1. CONFIG & ASSETS
// ==========================================

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const PLANE_ICON_ID = "plane-icon";
const PLANE_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Airplane_silhouette.svg/2048px-Airplane_silhouette.svg.png"; 

// ==========================================
// 2. UI COMPONENTS
// ==========================================

const Btn = ({ onClick, children, variant = "primary", disabled = false, className = "" }) => {
  const base = "relative overflow-hidden flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-60 disabled:active:scale-100 shadow-md backdrop-blur-md";
  const variants = {
    primary: "bg-blue-600 text-white shadow-blue-500/30 hover:bg-blue-500",
    secondary: "bg-gray-100 text-gray-800 border border-gray-200 hover:bg-white",
    danger: "bg-red-500 text-white shadow-red-500/30",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const TechLoader = ({ text }) => (
  <motion.div 
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white"
  >
    <div className="bg-white/10 p-4 rounded-full backdrop-blur-md border border-white/20 animate-pulse">
       <FaPlane className="text-3xl text-white" />
    </div>
    <h3 className="mt-4 font-bold tracking-wide">{text}</h3>
  </motion.div>
);

const LocationInput = ({ 
  value, setValue, suggestions, setSuggestions, onSelect, placeholder, fetchSuggestions, className = "", zIndex = 50 
}) => {
  const inputRef = useRef(null);
  const debounce = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const val = e.target.value;
    setValue(val);
    
    if (!val.trim()) {
        setIsLoading(false);
        setSuggestions([]);
        return;
    }

    setIsLoading(true);
    if (debounce.current) clearTimeout(debounce.current);
    
    debounce.current = setTimeout(async () => {
        await fetchSuggestions(val, setSuggestions);
        setIsLoading(false);
    }, 300); 
  };

  const clearInput = () => {
    setValue("");
    setSuggestions([]);
    setIsLoading(false);
  };

  return (
    <div className={`mb-4 relative ${className}`} style={{ zIndex: zIndex }}>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 z-20">
        <FaMapMarkerAlt />
      </div>
      
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-10 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-gray-700 shadow-sm transition-all"
        onFocus={() => setTimeout(() => inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
      />

      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20">
        {isLoading ? (
            <FaCircleNotch className="animate-spin text-blue-500" />
        ) : value ? (
            <button onClick={clearInput} className="text-gray-400 p-1 hover:text-gray-600">
              <FaTimes />
            </button>
        ) : null}
      </div>
      
      <AnimatePresence>
        {(suggestions.length > 0 || isLoading) && (
          <motion.ul 
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute top-[110%] left-0 w-full bg-white rounded-2xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto z-[100] overflow-hidden"
          >
            {isLoading && suggestions.length === 0 ? (
                 <li className="px-5 py-4 text-sm text-gray-500 flex items-center justify-center gap-2">
                    <FaCircleNotch className="animate-spin text-blue-500" /> Searching...
                 </li>
            ) : (
                suggestions.map((s) => (
                <li 
                    key={s.id} 
                    onClick={() => { onSelect(s); setSuggestions([]); }}
                    className="px-5 py-3.5 border-b last:border-0 border-gray-50 hover:bg-blue-50 active:bg-blue-100 cursor-pointer text-sm font-medium text-gray-700 flex items-center gap-2"
                >
                    <span className="bg-gray-100 p-1.5 rounded-full text-gray-400 text-xs"><FaMapMarkerAlt/></span>
                    <span className="truncate">{s.place_name}</span>
                </li>
                ))
            )}
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
  const [viewState, setViewState] = useState({ longitude: 78.9629, latitude: 20.5937, zoom: 3 });
  const [loadingState, setLoadingState] = useState(null); 
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);

  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [fromSug, setFromSug] = useState([]);
  const [toSug, setToSug] = useState([]);

  const mapRef = useRef(null);
  const fromCoord = useRef(null);
  const toCoord = useRef(null);
  const routePath = useRef([]);
  const animTimeline = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const fetchSuggestions = async (query, setList) => {
    if (!query) return;
    try {
      const res = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`, {
        params: { access_token: MAPBOX_TOKEN, autocomplete: true, limit: 5 }
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
    mapRef.current?.flyTo({ center: coords, zoom: 4, duration: 1000 });
  };

  const generateRoute = async () => {
    if (!fromCoord.current || !toCoord.current) return alert("Select Origin & Destination");
    
    setLoadingState("Processing...");
    setIsDrawerOpen(false);

    try {
        const start = fromCoord.current;
        const end = toCoord.current;

        if(start[0] === end[0] && start[1] === end[1]) {
            throw new Error("Start and End cannot be same");
        }

        const greatCircle = turf.greatCircle(start, end, { npoints: 100 });
        const curved = turf.bezierSpline(greatCircle, { resolution: 10000, sharpness: 0.6 });
        const distance = turf.length(curved, { units: "kilometers" });
        
        const steps = Math.ceil(distance / 5); 
        const path = [];
        for(let i=0; i<=steps; i++) {
            path.push(turf.along(curved, (i * distance)/steps, { units: "kilometers" }).geometry.coordinates);
        }
        routePath.current = path;

        const map = mapRef.current?.getMap();
        if(map) {
            map.getSource("route-line")?.setData({ type: "Feature", geometry: { type: "LineString", coordinates: path } });
            
            const initialBearing = turf.bearing(turf.point(path[0]), turf.point(path[1]));
            map.getSource("plane-point")?.setData({
                type: "Feature",
                geometry: { type: "Point", coordinates: path[0] },
                properties: { rotate: initialBearing }
            });

            const bounds = new mapboxgl.LngLatBounds(start, end);
            map.fitBounds(bounds, { padding: 100, duration: 1000 });
        }

    } catch (error) {
        console.error("Route Error", error);
        alert("Could not generate route. Please try slightly different locations.");
    } finally {
        setLoadingState(null);
        setTimeout(() => setIsDrawerOpen(true), 300);
    }
  };

  const startFlight = async () => {
    if (routePath.current.length === 0) return generateRoute();

    setLoadingState("Readying..."); 
    setIsDrawerOpen(false);

    try {
        const map = mapRef.current?.getMap();
        const path = routePath.current;

        const canvas = document.querySelector(".mapboxgl-canvas");
        const stream = canvas.captureStream(25); 
        const rec = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
        chunksRef.current = [];
        rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        rec.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: "video/webm" });
            setVideoUrl(URL.createObjectURL(blob));
        };
        recorderRef.current = rec;

        const initialBearing = turf.bearing(turf.point(path[0]), turf.point(path[1]));
        map.jumpTo({ center: path[0], zoom: 5, pitch: 60, bearing: initialBearing });

        await new Promise(r => setTimeout(r, 800)); 

        setLoadingState(null);
        setIsPlaying(true);
        rec.start();

        const obj = { index: 0 };
        animTimeline.current = gsap.to(obj, {
            index: path.length - 1,
            duration: 12,
            ease: "none",
            onUpdate: () => {
                const i = Math.floor(obj.index);
                const curr = path[i];
                const next = path[i+1] || curr;
                const bearing = turf.bearing(turf.point(curr), turf.point(next));

                map.getSource("plane-point").setData({
                    type: "Feature",
                    geometry: { type: "Point", coordinates: curr },
                    properties: { rotate: bearing }
                });

                const tail = path.slice(Math.max(0, i - 40), i + 1);
                map.getSource("tail-line").setData({ type: "Feature", geometry: { type: "LineString", coordinates: tail } });

                map.easeTo({
                    center: curr, bearing, pitch: 60, zoom: 5.5, duration: 0
                });
            },
            onComplete: () => {
                stopFlight();
            }
        });
    } catch (err) {
        console.error("Flight Error", err);
        stopFlight();
    }
  };

  const stopFlight = () => {
    animTimeline.current?.kill();
    if(recorderRef.current?.state === "recording") recorderRef.current?.stop();
    setIsPlaying(false);
    setIsDrawerOpen(true);
    setLoadingState(null);
    mapRef.current?.easeTo({ pitch: 0, zoom: 3, duration: 1500 });
  };

  const onMapLoad = (e) => {
    const map = e.target;
    if(!map.hasImage(PLANE_ICON_ID)) {
      map.loadImage(PLANE_URL, (err, img) => {
        if(!err) map.addImage(PLANE_ICON_ID, img);
      });
    }

    const empty = { type: "FeatureCollection", features: [] };
    map.addSource("route-line", { type: "geojson", data: empty });
    map.addSource("tail-line", { type: "geojson", data: empty });
    map.addSource("from-point", { type: "geojson", data: empty });
    map.addSource("to-point", { type: "geojson", data: empty });
    map.addSource("plane-point", { type: "geojson", data: empty });

    map.addLayer({
      id: "route-layer", type: "line", source: "route-line",
      paint: { "line-color": "#ffffff", "line-width": 2, "line-opacity": 0.5, "line-dasharray": [2, 4] }
    });
    map.addLayer({
      id: "tail-layer", type: "line", source: "tail-line",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#fbbf24", "line-width": 4, "line-blur": 1 }
    });
    map.addLayer({ id: "from-l", type: "circle", source: "from-point", paint: { "circle-radius": 8, "circle-color": "#10b981", "circle-stroke-width": 2, "circle-stroke-color": "#fff" } });
    map.addLayer({ id: "to-l", type: "circle", source: "to-point", paint: { "circle-radius": 8, "circle-color": "#ef4444", "circle-stroke-width": 2, "circle-stroke-color": "#fff" } });
    
    // UPDATED PLANE SIZE LOGIC
    map.addLayer({
      id: "plane-layer", type: "symbol", source: "plane-point",
      layout: {
        "icon-image": PLANE_ICON_ID,
        "icon-rotate": ["get", "rotate"],
        "icon-rotation-alignment": "map",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        // SMALLER SIZE FOR MOBILE
        "icon-size": [
            "interpolate", ["linear"], ["zoom"], 
            0, 0.05,  // Zoom 0 (World): Tiny dot
            5, 0.2,   // Zoom 5 (Country): Small icon
            10, 0.4   // Zoom 10 (City): Visible but not huge
        ]
      }
    });
  };

  return (
    <div className="relative w-full h-[100dvh] bg-gray-900 overflow-hidden text-gray-800 font-sans">
      
      <AnimatePresence>
        {loadingState && <TechLoader text={loadingState} />}
      </AnimatePresence>

      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={viewState}
        onMove={e => setViewState(e.viewState)}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        onLoad={onMapLoad}
        attributionControl={false}
        reuseMaps
      />

      {isPlaying && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="absolute bottom-10 left-0 right-0 flex justify-center z-50">
          <Btn variant="danger" onClick={stopFlight} className="shadow-red-500/50 rounded-full px-8">
            <FaStop /> Stop
          </Btn>
        </motion.div>
      )}

      <AnimatePresence>
        {videoUrl && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[70] bg-black/80 backdrop-blur flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl">
              <h3 className="text-xl font-bold mb-4 text-center">Flight Ready!</h3>
              <video src={videoUrl} controls className="w-full rounded-xl mb-4 bg-black" />
              <div className="grid grid-cols-2 gap-3">
                <a href={videoUrl} download="flight.webm" className="flex items-center justify-center gap-2 bg-green-500 text-white font-bold py-3 rounded-xl shadow">Save</a>
                <button onClick={() => setVideoUrl(null)} className="font-bold text-gray-500 hover:bg-gray-100 rounded-xl">Close</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isDrawerOpen && !loadingState && !isPlaying && (
         <button onClick={() => setIsDrawerOpen(true)} className="absolute bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-xl z-40 animate-bounce">
           <FaChevronUp />
         </button>
      )}

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
              className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl rounded-t-[2.5rem] p-6 pb-8 z-40 shadow-[0_-10px_60px_rgba(0,0,0,0.4)]"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 opacity-50" onClick={() => setIsDrawerOpen(false)}/>
              
              <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2">
                <FaPlane className="text-blue-600 rotate-[-45deg]" /> Flight Plan
              </h2>

              <LocationInput 
                zIndex={50}
                placeholder="Where from?"
                value={fromCity} setValue={setFromCity}
                suggestions={fromSug} setSuggestions={setFromSug}
                fetchSuggestions={fetchSuggestions} onSelect={p => handleSelect(p, "from")}
              />

              <div className="flex justify-center -my-4 relative z-40 pointer-events-none">
                 <div className="bg-white p-1.5 rounded-full border border-gray-100 text-gray-400 shadow-sm">
                    <FaRoute className="rotate-90 text-sm" />
                 </div>
              </div>

              <LocationInput 
                zIndex={30}
                placeholder="Where to?"
                value={toCity} setValue={setToCity}
                suggestions={toSug} setSuggestions={setToSug}
                fetchSuggestions={fetchSuggestions} onSelect={p => handleSelect(p, "to")}
              />

              <div className="grid grid-cols-2 gap-4 mt-6 relative z-10">
                <Btn variant="secondary" onClick={generateRoute}>Preview</Btn>
                <Btn onClick={startFlight} disabled={!routePath.current.length}>
                  <FaPlay /> Fly Now
                </Btn>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}