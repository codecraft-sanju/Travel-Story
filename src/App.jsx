import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import axios from "axios";
import { gsap } from "gsap";
import * as turf from "@turf/turf";
import debounce from "lodash.debounce";

// 🧩 components
import Btn from "./components/Btn";
import InputsPanel from "./components/InputsPanel";
import MobileSheet from "./components/MobileSheet";
import MapView from "./components/MapView";
import { isMobileFn, getZoom, getPitch } from "./utils/helpers";
import { fcPoint, emptyFC, fcVehicle } from "./utils/mapUtils";

// 🧱 constants
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const PLANE_ICON = "plane-icon";
const PLANE_ICON_SIZE = 0.16;
const PLANE_ICON_URL = "/plane.png";

export default function App() {
  // =============================
  // 🧠 States
  // =============================
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [fromSug, setFromSug] = useState([]);
  const [toSug, setToSug] = useState([]);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  const [fps, setFps] = useState(60);
  const [bitrate, setBitrate] = useState(5_000_000);
  const [zoomMobileOverride, setZoomMobileOverride] = useState(5.7);
  const [zoomDesktopOverride, setZoomDesktopOverride] = useState(4.6);

  const [isMobile, setIsMobile] = useState(isMobileFn());
  const [sheetOpen, setSheetOpen] = useState(true);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // =============================
  // 🪄 Refs
  // =============================
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

  // =============================
  // 🌍 Fetch Suggestions (Debounced)
  // =============================
  const fetchSuggestions = useCallback(async (query, setList) => {
    if (!query?.trim()) return setList([]);
    try {
      const res = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json`,
        { params: { access_token: MAPBOX_TOKEN, autocomplete: true, limit: 6 } }
      );
      setList(res.data.features || []);
    } catch (err) {
      console.error(err);
      setList([]);
    }
  }, []);

  const debouncedFetch = useMemo(
    () => debounce(fetchSuggestions, 400),
    [fetchSuggestions]
  );

  // =============================
  // 🗺️ Place Selection + Swap
  // =============================
  const selectPlace = useCallback((p, type) => {
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
  }, []);

  const swap = useCallback(() => {
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
  }, [toCity]);

  // =============================
  // 🧭 Route Generation
  // =============================
  const generateRoute = useCallback(() => {
    const from = fromRef.current;
    const to = toRef.current;
    const map = mapRef.current?.getMap?.();
    if (!from || !to || !map) return alert("Pick both places first.");

    setIsLoadingRoute(true);
    setTimeout(() => setIsLoadingRoute(false), 1200);

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

    // === 📍 Add route label text
    const centerLon = (from[0] + to[0]) / 2;
    const maxLat = Math.max(from[1], to[1]);
    const labelPoint = [centerLon, maxLat + 5];
    const labelText = `📍 ${fromCity.split(",")[0]} → ${toCity.split(",")[0]}`;

    if (map.getLayer("route-label")) map.removeLayer("route-label");
    if (map.getSource("route-label")) map.removeSource("route-label");

    map.addSource("route-label", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: labelPoint },
            properties: { title: labelText },
          },
        ],
      },
    });

    map.addLayer({
      id: "route-label",
      type: "symbol",
      source: "route-label",
      layout: {
        "text-field": ["get", "title"],
        "text-size": isMobile ? 17 : 22,
        "text-anchor": "top",
        "text-offset": [0, 0.5],
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "#000000",
        "text-halo-width": 2.5,
      },
    });

    gsap.fromTo(
      map.getCanvas(),
      { opacity: 0.8 },
      { opacity: 1, duration: 0.6, ease: "power2.out" }
    );

    const padding = isMobile ? 70 : 140;
    const bounds = [
      [Math.min(from[0], to[0]), Math.min(from[1], to[1])],
      [Math.max(from[0], to[0]), Math.max(from[1], to[1])],
    ];
    map.fitBounds(bounds, { padding, duration: 1200 });
  }, [fromCity, toCity, isMobile]);

  // =============================
  // 🎥 Recording Logic
  // =============================
  const startRecording = useCallback(async () => {
    const canvas = recordWrapRef.current?.querySelector("canvas");
    if (!canvas) return alert("Canvas not found");

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
  }, [fps, bitrate, isMobile]);

  const stopRecording = useCallback(async () => {
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
  }, []);

  // =============================
  // ✈️ Journey Animation
  // =============================
  const startJourney = useCallback(async () => {
    const coords = routeRef.current;
    const map = mapRef.current?.getMap?.();
    if (!coords?.length || !map) return alert("Make the route first.");

    tlRef.current?.kill?.();
    setIsPlaying(true);
    setProgress(0);

    if (isMobile) {
      setSheetOpen(false);
      gsap.to(".bottom-sheet", { y: "100%", opacity: 0, duration: 0.45, ease: "power2.out" });
    }

    await startRecording();

    const totalKm = turf.length(
      { type: "Feature", geometry: { type: "LineString", coordinates: coords } },
      { units: "kilometers" }
    );
    const duration = Math.min(18, Math.max(8, totalKm / 180));

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
        map.getSource("vehicle-point")?.setData(
          fcVehicle(pos, bearing, PLANE_ICON, PLANE_ICON_SIZE)
        );

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
        map.easeTo({
          center: lastPos,
          zoom: (isMobile ? zoomMobileOverride : zoomDesktopOverride) + 0.8,
          pitch: 28,
          bearing: 0,
          duration: 1800,
        });
        setTimeout(async () => {
          await stopRecording();
          setIsPlaying(false);
          if (isMobile) {
            setSheetOpen(true);
            gsap.to(".bottom-sheet", { y: "0%", opacity: 1, duration: 0.45, ease: "power2.out" });
          }
        }, 1500);
      },
    });

    tlRef.current = tl;
  }, [isMobile, startRecording, stopRecording, zoomMobileOverride, zoomDesktopOverride]);

  const stopJourneyNow = useCallback(async () => {
    tlRef.current?.kill?.();
    setIsPlaying(false);
    await stopRecording();
    if (isMobile) {
      setSheetOpen(true);
      gsap.to(".bottom-sheet", { y: "0%", opacity: 1, duration: 0.45, ease: "power2.out" });
    }
  }, [isMobile, stopRecording]);

  // =============================
  // 🧱 Map Setup
  // =============================
  const ensurePlaneIcon = (map) => {
    if (map.hasImage(PLANE_ICON)) return;
    map.loadImage(PLANE_ICON_URL, (err, img) => {
      if (!err && img && !map.hasImage(PLANE_ICON)) {
        map.addImage(PLANE_ICON, img, { pixelRatio: 2 });
      }
    });
  };

  const setupLayers = (map) => {
    const addSrc = (id, data) => !map.getSource(id) && map.addSource(id, data);
    const addLayer = (id, cfg) => !map.getLayer(id) && map.addLayer({ id, ...cfg });

    addSrc("from-point", { type: "geojson", data: emptyFC() });
    addLayer("from-layer", {
      type: "circle",
      source: "from-point",
      paint: { "circle-radius": 8, "circle-color": "#22c55e" },
    });

    addSrc("to-point", { type: "geojson", data: emptyFC() });
    addLayer("to-layer", {
      type: "circle",
      source: "to-point",
      paint: { "circle-radius": 8, "circle-color": "#3b82f6" },
    });

    addSrc("route", {
      type: "geojson",
      data: { type: "Feature", geometry: { type: "LineString", coordinates: [] } },
    });
    addLayer("route-layer", {
      type: "line",
      source: "route",
      paint: { "line-color": "#00ffff", "line-width": 5, "line-opacity": 0.9 },
    });

    addSrc("tail", {
      type: "geojson",
      data: { type: "Feature", geometry: { type: "LineString", coordinates: [] } },
    });
    addLayer("tail-layer", {
      type: "line",
      source: "tail",
      paint: { "line-color": "#ffd369", "line-width": 7, "line-opacity": 0.6 },
    });

    addSrc("vehicle-point", {
      type: "geojson",
      data: fcVehicle([0, 0], 0, PLANE_ICON, PLANE_ICON_SIZE),
    });
    addLayer("vehicle-layer", {
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
  };

  // =============================
  // 📱 Responsive
  // =============================
  useEffect(() => {
    const onResize = () => setIsMobile(isMobileFn());
    window.addEventListener("resize", onResize);
    const vv = window.visualViewport;
    let baseH = vv ? vv.height : window.innerHeight;
    const onVV = () => {
      if (!vv) return;
      const keyboardLikelyOpen = baseH - vv.height > 120;
      setKeyboardOpen(keyboardLikelyOpen);
    };
    vv?.addEventListener("resize", onVV);

    return () => {
      window.removeEventListener("resize", onResize);
      vv?.removeEventListener("resize", onVV);
    };
  }, [isMobile]);

  useEffect(() => {
    return () => {
      tlRef.current?.kill?.();
      mediaRecorderRef.current?.stop?.();
      document.body.style.overflow = "auto";
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  // =============================
  // 🧩 Render
  // =============================
  return (
    <div className="relative w-full h-screen bg-black text-sm overflow-hidden">
      {isLoadingRoute && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-2 rounded-xl text-xs animate-pulse z-50">
          Generating Route...
        </div>
      )}

      <InputsPanel
        {...{
          fromCity,
          setFromCity,
          toCity,
          setToCity,
          fromSug,
          toSug,
          selectPlace,
          swap,
          fetchSuggestions: debouncedFetch,
          generateRoute,
          startJourney,
          stopJourneyNow,
          isPlaying,
          progress,
          fps,
          setFps,
          bitrate,
          setBitrate,
          zoomMobileOverride,
          setZoomMobileOverride,
          zoomDesktopOverride,
          setZoomDesktopOverride,
          videoUrl,
          setVideoUrl,
          debounceRef,
        }}
      />

      <MobileSheet
        {...{
          sheetOpen,
          setSheetOpen,
          fromCity,
          setFromCity,
          toCity,
          setToCity,
          fromSug,
          setFromSug,
          toSug,
          setToSug,
          selectPlace,
          swap,
          fetchSuggestions: debouncedFetch,
          generateRoute,
          startJourney,
          stopJourneyNow,
          isPlaying,
          progress,
          fps,
          setFps,
          bitrate,
          setBitrate,
          zoomMobileOverride,
          setZoomMobileOverride,
          zoomDesktopOverride,
          setZoomDesktopOverride,
          videoUrl,
          setVideoUrl,
          debounceRef,
        }}
      />

      <MapView
        mapRef={mapRef}
        onLoad={handleMapLoad}
        MAPBOX_TOKEN={MAPBOX_TOKEN}
        recordWrapRef={recordWrapRef}
        fromCity={fromCity}
        toCity={toCity}
      />
    </div>
  );
}
