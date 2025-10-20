import React, { useRef, useState, useEffect, useMemo } from "react";
import axios from "axios";
import { gsap } from "gsap";
import * as turf from "@turf/turf";
import Map from "react-map-gl";
import {
  FaExchangeAlt,
  FaShareAlt,
  FaTimes,
  FaRoute,
  FaPlay,
  FaDownload,
  FaMapMarkerAlt,
  FaPlane,
  FaStop,
  FaChevronUp,
  FaChevronDown,
} from "react-icons/fa";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const PLANE_ICON = "plane-icon";
const PLANE_ICON_SIZE = 0.16;
const PLANE_ICON_URL = "/plane.png";

// 🔘 Button
const Btn = ({ children, onClick, variant = "primary", disabled, className = "" }) => {
  const base =
    "px-3 py-2 rounded-xl backdrop-blur border transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2";
  const variants = {
    primary:
      "bg-blue-600/80 text-white border-white/10 hover:bg-blue-600 shadow-lg shadow-blue-500/20",
    secondary: "bg-white/80 text-gray-900 border-gray-200 hover:bg-white shadow-md",
    ghost: "bg-white/10 text-white border-white/20 hover:bg-white/20",
    danger: "bg-red-600 text-white border-red-500 hover:bg-red-700",
  };
  return (
    <button
      type="button"
      className={`${base} ${variants[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

// 🧮 responsive helpers
const isMobileFn = () => window.innerWidth < 768;
const getZoom = () => (isMobileFn() ? 5.8 : window.innerWidth < 1280 ? 4.8 : 4.2);
const getPitch = () => (isMobileFn() ? 58 : 52);

export default function App() {
  // =======================
  // State
  // =======================
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [fromSug, setFromSug] = useState([]);
  const [toSug, setToSug] = useState([]);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);

  // advanced options
  const [fps, setFps] = useState(60);
  const [bitrate, setBitrate] = useState(5_000_000);
  const [zoomMobileOverride, setZoomMobileOverride] = useState(5.7);
  const [zoomDesktopOverride, setZoomDesktopOverride] = useState(4.6);

  // responsive + sheet
  const [isMobile, setIsMobile] = useState(isMobileFn());
  const [sheetOpen, setSheetOpen] = useState(true); // bottom sheet open/close on mobile
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // Refs
  const mapRef = useRef(null);
  const recordWrapRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const routeRef = useRef([]);
  const animObj = useRef({ i: 0 });
  const debounceRef = useRef({ from: null, to: null });
  const tlRef = useRef(null);
  const fromRef = useRef(null);
  const toRef = useRef(null);

  // =======================
  // Fetch Suggestions
  // =======================
  const fetchSuggestions = async (query, setList) => {
    if (!query?.trim()) return setList([]);
    try {
      const res = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
        { params: { access_token: MAPBOX_TOKEN, autocomplete: true, limit: 6 } }
      );
      setList(res.data.features || []);
    } catch {
      setList([]);
    }
  };

  // =======================
  // Place selection / swap
  // =======================
  const fcPoint = (coords) => ({
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry: { type: "Point", coordinates: coords } }],
  });
  const emptyFC = () => ({ type: "FeatureCollection", features: [] });

  const selectPlace = (p, type) => {
    const map = mapRef.current?.getMap?.();
    if (!p?.center || !map) return;
    const coords = p.center;
    if (type === "from") {
      fromRef.current = coords;
      setFromCity(p.place_name);
      setFromSug([]);
      map.getSource("from-point")?.setData(fcPoint(coords));
    } else {
      toRef.current = coords;
      setToCity(p.place_name);
      setToSug([]);
      map.getSource("to-point")?.setData(fcPoint(coords));
    }
    map.flyTo({ center: coords, zoom: 5, duration: 800 });
  };

  const swap = () => {
    const map = mapRef.current?.getMap?.();
    [fromRef.current, toRef.current] = [toRef.current, fromRef.current];
    setFromCity((prev) => {
      const oldFrom = prev;
      setToCity(oldFrom);
      return toCity;
    });
    if (map) {
      map.getSource("from-point")?.setData(fromRef.current ? fcPoint(fromRef.current) : emptyFC());
      map.getSource("to-point")?.setData(toRef.current ? fcPoint(toRef.current) : emptyFC());
    }
  };

  // =======================
  // Route
  // =======================
  const generateRoute = () => {
    const from = fromRef.current;
    const to = toRef.current;
    const map = mapRef.current?.getMap?.();
    if (!from || !to || !map) {
      alert("Pick both places first.");
      return;
    }
    const great = turf.greatCircle(from, to, { npoints: 200 });
    const smooth = turf.bezierSpline(great, { resolution: 10_000, sharpness: 0.85 });

    const totalKm = turf.length(smooth, { units: "kilometers" });
    const steps = Math.max(20, Math.floor(totalKm / 5));
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

    const padding = isMobile ? 70 : 140;
    const bounds = [
      [Math.min(from[0], to[0]), Math.min(from[1], to[1])],
      [Math.max(from[0], to[0]), Math.max(from[1], to[1])],
    ];
    map.fitBounds(bounds, { padding, duration: 1200 });
  };

  // =======================
  // Recording
  // =======================
  const startRecording = async () => {
    const canvas = recordWrapRef.current?.querySelector("canvas");
    if (!canvas) {
      alert("Canvas not found");
      return;
    }

    // smart defaults per device
    const targetFps = isMobile ? Math.min(30, fps) : fps;
    const targetBitrate = isMobile ? Math.min(3_000_000, bitrate) : bitrate;

    const stream = canvas.captureStream(targetFps);
    const tryTypes = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
      "video/mp4",
    ];
    let mimeType = "";
    for (const t of tryTypes) {
      if (MediaRecorder.isTypeSupported?.(t)) {
        mimeType = t;
        break;
      }
    }
    const rec = new MediaRecorder(stream, {
      mimeType: mimeType || undefined,
      videoBitsPerSecond: targetBitrate,
    });

    chunksRef.current = [];
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => {
      const type = mimeType?.includes("webm") ? "video/webm" : "video/mp4";
      const blob = new Blob(chunksRef.current, { type });
      const url = URL.createObjectURL(blob);
      setVideoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      document.body.style.overflow = "auto";
    };

    document.body.style.overflow = "hidden";
    mediaRecorderRef.current = rec;
    rec.start(100);
  };

  const stopRecording = async () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === "recording") {
      await new Promise((resolve) => {
        const prev = rec.onstop;
        rec.onstop = () => {
          prev?.();
          resolve();
        };
        rec.stop();
      });
    }
  };

  // =======================
  // Journey
  // =======================
  const fcVehicle = (coords, bearing) => ({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: coords },
        properties: { rotation: bearing, icon: PLANE_ICON, size: PLANE_ICON_SIZE },
      },
    ],
  });

  const startJourney = async () => {
    const coords = routeRef.current;
    const map = mapRef.current?.getMap?.();
    if (!coords?.length || !map) {
      alert("Make the route first.");
      return;
    }

    tlRef.current?.kill?.();
    setIsPlaying(true);
    setProgress(0);

    // hide panel on mobile
    if (isMobile) {
      setSheetOpen(false);
      gsap.to(".bottom-sheet", { y: "100%", opacity: 0, duration: 0.45, ease: "power2.out" });
    }

    await startRecording();

    const totalKm = turf.length(
      { type: "Feature", geometry: { type: "LineString", coordinates: coords } },
      { units: "kilometers" }
    );
    const duration = Math.min(18, Math.max(8, totalKm / 180)); // seconds

    animObj.current.i = 0;

    const tl = gsap.to(animObj.current, {
      i: coords.length - 1,
      duration,
      ease: "power2.inOut",
      onUpdate: () => {
        const i = Math.floor(animObj.current.i);
        const pos = coords[i];
        const next = coords[i + 1] || pos;
        const bearing = turf.bearing(turf.point(pos), turf.point(next));
        const tail = coords.slice(Math.max(0, i - 18), i + 1);

        map.getSource("tail")?.setData({
          type: "Feature",
          geometry: { type: "LineString", coordinates: tail },
        });
        map.getSource("vehicle-point")?.setData(fcVehicle(pos, bearing));

        const zoom =
          isMobile ? (zoomMobileOverride || getZoom()) : (zoomDesktopOverride || getZoom());

        map.easeTo({
          center: pos,
          bearing,
          pitch: getPitch(),
          zoom,
          duration: 180,
        });

        setProgress(Math.round((i / (coords.length - 1)) * 100));
      },
      onComplete: async () => {
        const lastPos = coords[coords.length - 1];
        const zoom =
          (isMobile ? (zoomMobileOverride || getZoom()) : (zoomDesktopOverride || getZoom())) + 0.8;

        map.easeTo({
          center: lastPos,
          zoom,
          pitch: 28,
          bearing: 0,
          duration: 1800,
        });

        const buffer = Math.max(1200, duration * 200);
        setTimeout(async () => {
          await stopRecording();
          setIsPlaying(false);
          if (isMobile) {
            setSheetOpen(true);
            gsap.to(".bottom-sheet", { y: "0%", opacity: 1, duration: 0.45, ease: "power2.out" });
          }
        }, buffer);
      },
    });

    tlRef.current = tl;
  };

  const stopJourneyNow = async () => {
    tlRef.current?.kill?.();
    setIsPlaying(false);
    await stopRecording();
    if (isMobile) {
      setSheetOpen(true);
      gsap.to(".bottom-sheet", { y: "0%", opacity: 1, duration: 0.45, ease: "power2.out" });
    }
  };

  // =======================
  // Map Setup + Icon Safety
  // =======================
  const ensurePlaneIcon = (map) => {
    if (map.hasImage(PLANE_ICON)) return;

    if (!map.__styleImageMissingAttached) {
      map.on("styleimagemissing", (e) => {
        if (e.id === PLANE_ICON && !map.hasImage(PLANE_ICON)) {
          map.loadImage(PLANE_ICON_URL, (err, img) => {
            if (!err && img && !map.hasImage(PLANE_ICON)) {
              map.addImage(PLANE_ICON, img, { pixelRatio: 2 });
            }
          });
        }
      });
      map.__styleImageMissingAttached = true;
    }

    map.loadImage(PLANE_ICON_URL, (err, img) => {
      if (!err && img && !map.hasImage(PLANE_ICON)) {
        map.addImage(PLANE_ICON, img, { pixelRatio: 2 });
      }
    });
  };

  const addSrc = (map, id, data) => {
    if (!map.getSource(id)) map.addSource(id, data);
  };
  const addLayer = (map, id, cfg) => {
    if (!map.getLayer(id)) map.addLayer({ id, ...cfg });
  };

  const setupLayers = (map) => {
    addSrc(map, "from-point", { type: "geojson", data: emptyFC() });
    addLayer(map, "from-layer", {
      type: "circle",
      source: "from-point",
      paint: { "circle-radius": 8, "circle-color": "#22c55e" },
    });

    addSrc(map, "to-point", { type: "geojson", data: emptyFC() });
    addLayer(map, "to-layer", {
      type: "circle",
      source: "to-point",
      paint: { "circle-radius": 8, "circle-color": "#3b82f6" },
    });

    addSrc(map, "route", {
      type: "geojson",
      data: { type: "Feature", geometry: { type: "LineString", coordinates: [] } },
    });
    addLayer(map, "route-layer", {
      type: "line",
      source: "route",
      paint: { "line-color": "#00ffff", "line-width": 5, "line-opacity": 0.9 },
    });

    addSrc(map, "tail", {
      type: "geojson",
      data: { type: "Feature", geometry: { type: "LineString", coordinates: [] } },
    });
    addLayer(map, "tail-layer", {
      type: "line",
      source: "tail",
      paint: { "line-color": "#ffd369", "line-width": 7, "line-opacity": 0.6 },
    });

    addSrc(map, "vehicle-point", { type: "geojson", data: fcVehicle([0, 0], 0) });
    addLayer(map, "vehicle-layer", {
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

  const handleMapLoad = (e) => {
    const map = e.target;
    ensurePlaneIcon(map);
    setupLayers(map);
    map.on("styledata", () => {
      ensurePlaneIcon(map);
      setupLayers(map);
    });
  };

  // =======================
  // Responsive + Keyboard
  // =======================
  useEffect(() => {
    const onResize = () => setIsMobile(isMobileFn());
    window.addEventListener("resize", onResize);

    // detect soft keyboard (visualViewport supported on most modern browsers)
    const vv = window.visualViewport;
    let baseH = vv ? vv.height : window.innerHeight;
    const onVV = () => {
      if (!vv) return;
      const keyboardLikelyOpen = baseH - vv.height > 120; // heuristic
      setKeyboardOpen(keyboardLikelyOpen);
      if (keyboardLikelyOpen && isMobile) {
        setSheetOpen(false);
        gsap.to(".bottom-sheet", { y: "100%", opacity: 0.9, duration: 0.25 });
      }
      if (!keyboardLikelyOpen && isMobile && !isPlaying) {
        setSheetOpen(true);
        gsap.to(".bottom-sheet", { y: "0%", opacity: 1, duration: 0.25 });
      }
    };
    vv?.addEventListener("resize", onVV);

    return () => {
      window.removeEventListener("resize", onResize);
      vv?.removeEventListener("resize", onVV);
    };
  }, [isMobile, isPlaying]);

  // cleanup
  useEffect(() => {
    return () => {
      tlRef.current?.kill?.();
      mediaRecorderRef.current?.stop?.();
      document.body.style.overflow = "auto";
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =======================
  // UI
  // =======================
  const zoomMobile = useMemo(
    () => (zoomMobileOverride ? zoomMobileOverride : getZoom()),
    [zoomMobileOverride]
  );
  const zoomDesktop = useMemo(
    () => (zoomDesktopOverride ? zoomDesktopOverride : getZoom()),
    [zoomDesktopOverride]
  );

  return (
    <div className="relative w-full h-screen bg-black text-sm overflow-hidden">
      {/* Desktop/Tablet Panel (top-left). Hidden on mobile in favor of bottom sheet */}
      <div className="hidden md:block absolute top-4 left-4 z-20 w-[92vw] max-w-[480px] transition-all">
        <div className="bg-white/70 backdrop-blur-xl border border-white/30 p-4 rounded-2xl shadow-lg overflow-y-auto max-h-[85vh] md:max-h-[90vh]">
          <div className="flex items-center gap-2 mb-2">
            <FaPlane />
            <h2 className="font-semibold text-lg md:text-xl">Plane Journey Visualizer</h2>
          </div>

          {/* Inputs */}
          <label className="text-xs font-medium text-gray-700">From</label>
          <div className="relative mb-2">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              <FaMapMarkerAlt />
            </div>
            <input
              type="text"
              value={fromCity}
              onChange={(e) => {
                const val = e.target.value;
                setFromCity(val);
                clearTimeout(debounceRef.current.from);
                debounceRef.current.from = setTimeout(
                  () => fetchSuggestions(val, setFromSug),
                  250
                );
              }}
              placeholder="From City / Airport"
              className="w-full border rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-400"
            />
            {fromSug.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full border rounded-xl bg-white max-h-40 overflow-y-auto">
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
          </div>

          <label className="text-xs font-medium text-gray-700">To</label>
          <div className="relative mb-2">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              <FaMapMarkerAlt />
            </div>
            <input
              type="text"
              value={toCity}
              onChange={(e) => {
                const val = e.target.value;
                setToCity(val);
                clearTimeout(debounceRef.current.to);
                debounceRef.current.to = setTimeout(
                  () => fetchSuggestions(val, setToSug),
                  250
                );
              }}
              placeholder="To City / Airport"
              className="w-full border rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-400"
            />
            {toSug.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full border rounded-xl bg-white max-h-40 overflow-y-auto">
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
          </div>

          {/* Controls */}
          <div className="flex gap-2 mt-3 flex-wrap">
            <Btn onClick={generateRoute}>
              <FaRoute /> Show Route
            </Btn>
            <Btn onClick={startJourney} disabled={isPlaying}>
              <FaPlay />
              {isPlaying ? "Recording..." : "Start Journey"}
            </Btn>
            <Btn onClick={swap} variant="ghost" title="Swap">
              <FaExchangeAlt />
              Swap
            </Btn>
            {isPlaying && (
              <Btn variant="danger" onClick={stopJourneyNow} title="Stop Now">
                <FaStop />
                Stop
              </Btn>
            )}
          </div>

          {/* Advanced */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-700">FPS</label>
              <input
                type="number"
                min={24}
                max={120}
                step={1}
                value={fps}
                onChange={(e) => setFps(Number(e.target.value || 60))}
                className="w-full border rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs text-gray-700">Bitrate (Mbps)</label>
              <input
                type="number"
                min={1}
                max={20}
                step={1}
                value={Math.round(bitrate / 1_000_000)}
                onChange={(e) => setBitrate(Number(e.target.value || 5) * 1_000_000)}
                className="w-full border rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs text-gray-700">Zoom (Mobile)</label>
              <input
                type="number"
                step="0.1"
                value={zoomMobileOverride}
                onChange={(e) => setZoomMobileOverride(Number(e.target.value))}
                className="w-full border rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs text-gray-700">Zoom (Desktop)</label>
              <input
                type="number"
                step="0.1"
                value={zoomDesktopOverride}
                onChange={(e) => setZoomDesktopOverride(Number(e.target.value))}
                className="w-full border rounded-xl px-3 py-2"
              />
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs mt-1 text-gray-700">{progress}% complete</p>
          </div>

          {/* Video */}
          {videoUrl && (
            <div className="mt-4 border rounded-xl p-3 bg-white/90 shadow-lg overflow-y-auto max-h-[60vh]">
              <video src={videoUrl} controls className="rounded-lg w-full mb-3" />
              <div className="flex gap-2 flex-wrap">
                <Btn
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = videoUrl;
                    a.download = "plane-journey.webm";
                    a.click();
                  }}
                >
                  <FaDownload />
                  Download
                </Btn>
                <Btn
                  variant="secondary"
                  onClick={async () => {
                    try {
                      if (navigator.canShare && navigator.canShare({ url: videoUrl })) {
                        await navigator.share({ url: videoUrl, title: "My Air Journey" });
                      } else {
                        alert("Native sharing not supported on this device.");
                      }
                    } catch {}
                  }}
                >
                  <FaShareAlt />
                  Share
                </Btn>
                <Btn variant="ghost" onClick={() => setVideoUrl(null)}>
                  <FaTimes />
                  Close
                </Btn>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Sheet */}
      <div
        className={`bottom-sheet md:hidden fixed left-0 right-0 z-30 ${
          sheetOpen ? "bottom-0" : "-bottom-[75vh]"
        }`}
        style={{ transition: "transform .3s ease" }}
      >
        <div
          className={`mx-auto w-[96vw] ${
            sheetOpen ? "translate-y-0" : "translate-y-[60vh]"
          } transition-all`}
        >
          <div className="bg-white/85 backdrop-blur-xl border border-white/30 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.25)] p-3">
            {/* Drag handle & toggle */}
            <div
              className="flex items-center justify-center w-full py-1 cursor-pointer select-none"
              onClick={() => setSheetOpen((s) => !s)}
            >
              <div className="w-12 h-1.5 rounded-full bg-gray-400/60" />
              <div className="ml-3 text-gray-700">{sheetOpen ? <FaChevronDown /> : <FaChevronUp />}</div>
            </div>

            {/* Title */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <FaPlane />
              <h2 className="font-semibold text-base">Plane Journey</h2>
            </div>

            {/* Inputs */}
            <div className="px-1">
              <label className="text-[11px] font-medium text-gray-700">From</label>
              <div className="relative mb-2">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <FaMapMarkerAlt />
                </div>
                <input
                  type="text"
                  value={fromCity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFromCity(val);
                    clearTimeout(debounceRef.current.from);
                    debounceRef.current.from = setTimeout(
                      () => fetchSuggestions(val, setFromSug),
                      250
                    );
                  }}
                  placeholder="From City / Airport"
                  className="w-full border rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-400 text-[13.5px]"
                />
                {fromSug.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full border rounded-xl bg-white max-h-40 overflow-y-auto">
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
              </div>

              <label className="text-[11px] font-medium text-gray-700">To</label>
              <div className="relative mb-2">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <FaMapMarkerAlt />
                </div>
                <input
                  type="text"
                  value={toCity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setToCity(val);
                    clearTimeout(debounceRef.current.to);
                    debounceRef.current.to = setTimeout(
                      () => fetchSuggestions(val, setToSug),
                      250
                    );
                  }}
                  placeholder="To City / Airport"
                  className="w-full border rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-400 text-[13.5px]"
                />
                {toSug.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full border rounded-xl bg-white max-h-40 overflow-y-auto">
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
              </div>

              {/* Controls */}
              <div className="flex gap-2 mt-2 flex-wrap">
                <Btn onClick={generateRoute}>
                  <FaRoute /> Route
                </Btn>
                <Btn onClick={startJourney} disabled={isPlaying}>
                  <FaPlay />
                  {isPlaying ? "Recording..." : "Start"}
                </Btn>
                <Btn onClick={swap} variant="ghost" title="Swap">
                  <FaExchangeAlt />
                  Swap
                </Btn>
                {isPlaying && (
                  <Btn variant="danger" onClick={stopJourneyNow} title="Stop Now">
                    <FaStop />
                    Stop
                  </Btn>
                )}
              </div>

              {/* Advanced (compact) */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-gray-700">FPS</label>
                  <input
                    type="number"
                    min={24}
                    max={120}
                    step={1}
                    value={fps}
                    onChange={(e) => setFps(Number(e.target.value || 60))}
                    className="w-full border rounded-xl px-3 py-2 text-[13.5px]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-700">Bitrate (Mbps)</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    step={1}
                    value={Math.round(bitrate / 1_000_000)}
                    onChange={(e) => setBitrate(Number(e.target.value || 5) * 1_000_000)}
                    className="w-full border rounded-xl px-3 py-2 text-[13.5px]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-700">Zoom (Mob)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={zoomMobileOverride}
                    onChange={(e) => setZoomMobileOverride(Number(e.target.value))}
                    className="w-full border rounded-xl px-3 py-2 text-[13.5px]"
                  />
                </div>
                <div>
                  <label className="text=[11px] text-gray-700">Zoom (Desk)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={zoomDesktopOverride}
                    onChange={(e) => setZoomDesktopOverride(Number(e.target.value))}
                    className="w-full border rounded-xl px-3 py-2 text-[13.5px]"
                  />
                </div>
              </div>

              {/* Progress */}
              <div className="mt-3">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-[11px] mt-1 text-gray-700">{progress}% complete</p>
              </div>

              {/* Video */}
              {videoUrl && (
                <div className="mt-3 border rounded-xl p-3 bg-white/90 shadow-lg overflow-y-auto max-h-[50vh]">
                  <video src={videoUrl} controls className="rounded-lg w-full mb-3" />
                  <div className="flex gap-2 flex-wrap">
                    <Btn
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = videoUrl;
                        a.download = "plane-journey.webm";
                        a.click();
                      }}
                    >
                      <FaDownload />
                      Download
                    </Btn>
                    <Btn
                      variant="secondary"
                      onClick={async () => {
                        try {
                          if (navigator.canShare && navigator.canShare({ url: videoUrl })) {
                            await navigator.share({ url: videoUrl, title: "My Air Journey" });
                          } else {
                            alert("Native sharing not supported on this device.");
                          }
                        } catch {}
                      }}
                    >
                      <FaShareAlt />
                      Share
                    </Btn>
                    <Btn variant="ghost" onClick={() => setVideoUrl(null)}>
                      <FaTimes />
                      Close
                    </Btn>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Compact progress bar (always visible on mobile while playing) */}
      {isPlaying && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[90vw] md:hidden">
          <div className="h-3 bg-gray-800/50 rounded-full overflow-hidden shadow-lg backdrop-blur-md">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Map */}
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
