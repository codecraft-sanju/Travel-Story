import React, { useState, useRef } from "react";
import axios from "axios";
import { gsap } from "gsap";
import * as turf from "@turf/turf";
import Map from "react-map-gl";

// ==========================
// ✈️ CONFIG
// ==========================
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const PLANE_ICON = "plane-icon";
const PLANE_ICON_SIZE = 0.16;

// glass button reusable
const Btn = ({ children, onClick, variant = "primary", disabled }) => {
  const base =
    "px-4 py-2 rounded-xl backdrop-blur border transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary:
      "bg-blue-600/80 text-white border-white/10 hover:bg-blue-600 shadow-lg shadow-blue-500/20",
    secondary:
      "bg-white/80 text-gray-900 border-gray-200 hover:bg-white shadow-md",
    ghost: "bg-white/10 text-white border-white/20 hover:bg-white/20",
  };
  return (
    <button
      className={`${base} ${variants[variant]}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default function App() {
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [fromSug, setFromSug] = useState([]);
  const [toSug, setToSug] = useState([]);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);

  const fromRef = useRef(null);
  const toRef = useRef(null);
  const mapRef = useRef(null);
  const recordWrapRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const routeRef = useRef([]);
  const animObj = useRef({ i: 0 });

  // ==========================
  // 🌍 FETCH CITY SUGGESTIONS
  // ==========================
  const fetchSuggestions = async (query, setList) => {
    if (!query) return setList([]);
    try {
      const res = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json`,
        {
          params: { access_token: MAPBOX_TOKEN, autocomplete: true, limit: 6 },
        }
      );
      setList(res.data.features || []);
    } catch {
      setList([]);
    }
  };

  // ==========================
  // 📍 CITY SELECT
  // ==========================
  const selectPlace = (p, type) => {
    const map = mapRef.current?.getMap();
    if (!p?.center) return;
    if (type === "from") {
      fromRef.current = p.center;
      setFromCity(p.place_name);
      setFromSug([]);
      map?.getSource("from-point")?.setData({
        type: "FeatureCollection",
        features: [
          { type: "Feature", geometry: { type: "Point", coordinates: p.center } },
        ],
      });
    } else {
      toRef.current = p.center;
      setToCity(p.place_name);
      setToSug([]);
      map?.getSource("to-point")?.setData({
        type: "FeatureCollection",
        features: [
          { type: "Feature", geometry: { type: "Point", coordinates: p.center } },
        ],
      });
    }
  };

  const swap = () => {
    const tempCity = fromCity;
    setFromCity(toCity);
    setToCity(tempCity);
    const tempCoord = fromRef.current;
    fromRef.current = toRef.current;
    toRef.current = tempCoord;
  };

  // ==========================
  // 🧭 GENERATE ROUTE
  // ==========================
  const generateRoute = () => {
    const from = fromRef.current;
    const to = toRef.current;
    const map = mapRef.current?.getMap();
    if (!from || !to || !map) return;

    const great = turf.greatCircle(from, to, { npoints: 200 });
    const smooth = turf.bezierSpline(great, { resolution: 10000, sharpness: 0.85 });

    const totalKm = turf.length(smooth, { units: "kilometers" });
    const steps = Math.max(10, Math.floor(totalKm / 5));
    const coords = [];
    for (let i = 0; i <= steps; i++) {
      const d = (totalKm * i) / steps;
      const pt = turf.along(smooth, d, { units: "kilometers" });
      coords.push(pt.geometry.coordinates);
    }
    routeRef.current = coords;

    map.getSource("route")?.setData({
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords },
    });

    map.fitBounds(
      [
        [Math.min(from[0], to[0]), Math.min(from[1], to[1])],
        [Math.max(from[0], to[0]), Math.max(from[1], to[1])],
      ],
      { padding: 120, duration: 1200 }
    );
  };

  // ==========================
  // 🎥 RECORDING
  // ==========================
  const startRecording = async (fps = 60, bitrate = 4_000_000) => {
    const canvas = recordWrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const stream = canvas.captureStream(fps);
    const rec = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: bitrate,
    });
    chunksRef.current = [];
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setVideoUrl(URL.createObjectURL(blob));
    };
    rec.start();
    mediaRecorderRef.current = rec;
  };
  const stopRecording = () => mediaRecorderRef.current?.stop();

  // ==========================
  // 🛫 START JOURNEY
  // ==========================
  const startJourney = async () => {
    const coords = routeRef.current;
    const map = mapRef.current?.getMap();
    if (!coords?.length || !map) return;
    setIsPlaying(true);
    setProgress(0);
    await startRecording();

    const totalKm = turf.length(
      { type: "Feature", geometry: { type: "LineString", coordinates: coords } },
      { units: "kilometers" }
    );
    const duration = Math.min(18, Math.max(8, totalKm / 180));

    gsap.to(animObj.current, {
      i: coords.length - 1,
      duration,
      ease: "power2.inOut",
      onUpdate: () => {
        const i = Math.floor(animObj.current.i);
        const pos = coords[i];
        const next = coords[i + 1] || pos;
        const bearing = turf.bearing(turf.point(pos), turf.point(next));

        const tail = coords.slice(Math.max(0, i - 15), i + 1);
        map.getSource("tail")?.setData({
          type: "Feature",
          geometry: { type: "LineString", coordinates: tail },
        });

        map.getSource("vehicle-point")?.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: pos },
              properties: { rotation: bearing, icon: PLANE_ICON, size: PLANE_ICON_SIZE },
            },
          ],
        });

        map.easeTo({
          center: pos,
          bearing,
          pitch: 60,
          duration: 200,
          easing: (t) => t,
        });

        setProgress(Math.round((i / coords.length) * 100));
      },
      onComplete: () => {
        stopRecording();
        setIsPlaying(false);
      },
    });
  };

  // ==========================
  // 🌍 MAP SETUP INSIDE JSX
  // ==========================
  const handleMapLoad = (e) => {
    const map = e.target;
    if (!map.hasImage(PLANE_ICON)) {
      map.loadImage("/plane.png", (err, img) => {
        if (!err && img && !map.hasImage(PLANE_ICON)) {
          map.addImage(PLANE_ICON, img);
        }
      });
    }

    const addSrc = (id, data) => {
      if (!map.getSource(id)) map.addSource(id, data);
    };
    const addLayer = (id, config) => {
      if (!map.getLayer(id)) map.addLayer(config);
    };

    addSrc("from-point", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    addLayer("from-layer", {
      id: "from-layer",
      type: "circle",
      source: "from-point",
      paint: { "circle-radius": 8, "circle-color": "#22c55e" },
    });

    addSrc("to-point", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    addLayer("to-layer", {
      id: "to-layer",
      type: "circle",
      source: "to-point",
      paint: { "circle-radius": 8, "circle-color": "#3b82f6" },
    });

    addSrc("route", {
      type: "geojson",
      data: { type: "Feature", geometry: { type: "LineString", coordinates: [] } },
    });
    addLayer("route-layer", {
      id: "route-layer",
      type: "line",
      source: "route",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#00ffff",
        "line-width": 5,
        "line-opacity": 0.9,
        "line-blur": 0.3,
      },
    });

    addSrc("tail", {
      type: "geojson",
      data: { type: "Feature", geometry: { type: "LineString", coordinates: [] } },
    });
    addLayer("tail-layer", {
      id: "tail-layer",
      type: "line",
      source: "tail",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#ffd369",
        "line-width": 7,
        "line-opacity": 0.6,
        "line-blur": 2.5,
      },
    });

    addSrc("vehicle-point", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [0, 0] },
            properties: { rotation: 0, icon: PLANE_ICON, size: PLANE_ICON_SIZE },
          },
        ],
      },
    });
    addLayer("vehicle-layer", {
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
  };

  // ==========================
  // 🎛️ CONTROL PANEL + MAP
  // ==========================
  return (
    <div className="relative w-full h-screen bg-black text-sm">
      <div className="absolute top-4 left-4 z-20 w-[92vw] max-w-[420px]">
        <div className="bg-white/70 backdrop-blur-xl border border-white/30 p-4 rounded-2xl shadow-lg">
          <h2 className="font-semibold text-lg mb-2">✈️ Plane Journey Visualizer</h2>

          <input
            type="text"
            value={fromCity}
            onChange={(e) => {
              setFromCity(e.target.value);
              clearTimeout(window.__df1);
              window.__df1 = setTimeout(
                () => fetchSuggestions(e.target.value, setFromSug),
                250
              );
            }}
            placeholder="From City / Airport"
            className="w-full border rounded-xl px-3 py-2 mb-2 focus:ring-2 focus:ring-blue-400"
          />
          {fromSug.length > 0 && (
            <ul className="border rounded-xl bg-white max-h-40 overflow-y-auto mb-2">
              {fromSug.map((p) => (
                <li
                  key={p.id}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => selectPlace(p, "from")}
                >
                  {p.place_name}
                </li>
              ))}
            </ul>
          )}

          <input
            type="text"
            value={toCity}
            onChange={(e) => {
              setToCity(e.target.value);
              clearTimeout(window.__df2);
              window.__df2 = setTimeout(
                () => fetchSuggestions(e.target.value, setToSug),
                250
              );
            }}
            placeholder="To City / Airport"
            className="w-full border rounded-xl px-3 py-2 mb-2 focus:ring-2 focus:ring-blue-400"
          />
          {toSug.length > 0 && (
            <ul className="border rounded-xl bg-white max-h-40 overflow-y-auto mb-2">
              {toSug.map((p) => (
                <li
                  key={p.id}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => selectPlace(p, "to")}
                >
                  {p.place_name}
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2 mt-2">
            <Btn onClick={generateRoute}>Show Route</Btn>
            <Btn onClick={startJourney} disabled={isPlaying}>
              {isPlaying ? "Recording..." : "Start Journey"}
            </Btn>
            <Btn onClick={swap} variant="ghost">
              ↔️
            </Btn>
          </div>

          <div className="mt-3">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs mt-1 text-gray-600">{progress}% complete</p>
          </div>

          {videoUrl && (
            <div className="mt-4 border rounded-xl p-3 bg-white/80">
              <video src={videoUrl} controls className="rounded-lg w-full mb-2" />
              <div className="flex gap-2">
                <Btn
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = videoUrl;
                    a.download = "my-flight.webm";
                    a.click();
                  }}
                >
                  💾 Save
                </Btn>
                <Btn
                  variant="secondary"
                  onClick={async () => {
                    try {
                      if (navigator.canShare && navigator.canShare({ url: videoUrl })) {
                        await navigator.share({ url: videoUrl, title: "My Air Journey" });
                      } else {
                        alert("Sharing not supported.");
                      }
                    } catch {}
                  }}
                >
                  📤 Share
                </Btn>
                <Btn variant="ghost" onClick={() => setVideoUrl(null)}>
                  ❌ Close
                </Btn>
              </div>
            </div>
          )}
        </div>
      </div>

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
          onLoad={handleMapLoad}
        />
      </div>
    </div>
  );
}
