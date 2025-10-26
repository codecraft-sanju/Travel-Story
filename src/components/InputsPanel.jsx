import React, { useRef, useEffect, useCallback, memo } from "react";
import Btn from "./Btn";
import VideoPanel from "./VideoPanel";
import ProgressBar from "./ProgressBar";
import {
  FaPlane,
  FaRoute,
  FaExchangeAlt,
  FaStop,
  FaPlay,
  FaMapMarkerAlt,
} from "react-icons/fa";

// 🧩 Reusable Location Input
const LocationInput = ({
  label,
  value,
  onChange,
  suggestions,
  onSelect,
  placeholder,
  debounceRef,
  debounceKey,
  fetchSuggestions,
}) => {
  const inputRef = useRef(null);

  // Hide suggestions on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (!inputRef.current?.contains(e.target)) {
        suggestions.length = 0; // clears suggestions
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [suggestions]);

  return (
    <div className="mb-3" ref={inputRef}>
      <label className="text-xs font-medium text-gray-700">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
          <FaMapMarkerAlt />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val);
            clearTimeout(debounceRef.current[debounceKey]);
            debounceRef.current[debounceKey] = setTimeout(
              () => fetchSuggestions(val, onSelect),
              250
            );
          }}
          placeholder={placeholder}
          className="w-full border rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
        />
        {suggestions?.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full border rounded-xl bg-white shadow-lg max-h-40 overflow-y-auto animate-fadeIn">
            {suggestions.map((p) => (
              <li
                key={p.id}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm transition"
                onClick={() => onSelect(p, debounceKey)}
              >
                {p.place_name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default function InputsPanel({
  fromCity = "",
  setFromCity = () => {},
  toCity = "",
  setToCity = () => {},
  fromSug = [],
  toSug = [],
  selectPlace = () => {},
  swap = () => {},
  fetchSuggestions = () => {},
  generateRoute = () => {},
  startJourney = () => {},
  stopJourneyNow = () => {},
  isPlaying = false,
  progress = 0,
  fps = 60,
  setFps = () => {},
  bitrate = 5000000,
  setBitrate = () => {},
  zoomMobileOverride = 10,
  setZoomMobileOverride = () => {},
  zoomDesktopOverride = 5,
  setZoomDesktopOverride = () => {},
  videoUrl = "",
  setVideoUrl = () => {},
  debounceRef = { current: {} },
}) {
  const handleFpsChange = useCallback(
    (e) => setFps(Number(e.target.value || 60)),
    [setFps]
  );

  const handleBitrateChange = useCallback(
    (e) => setBitrate(Number(e.target.value || 5) * 1_000_000),
    [setBitrate]
  );

  return (
    <div className="hidden md:block absolute top-4 left-4 z-20 w-[92vw] max-w-[480px] transition-all">
      <div className="bg-white/70 backdrop-blur-xl border border-white/30 p-4 rounded-2xl shadow-lg overflow-y-auto max-h-[85vh] md:max-h-[90vh]">
        <div className="flex items-center gap-2 mb-3">
          <FaPlane className="text-blue-600" />
          <h2 className="font-semibold text-lg md:text-xl">Plane Journey Visualizer</h2>
        </div>

        {/* Location Inputs */}
        <LocationInput
          label="From"
          value={fromCity}
          onChange={setFromCity}
          suggestions={fromSug}
          onSelect={selectPlace}
          placeholder="From City / Airport"
          debounceRef={debounceRef}
          debounceKey="from"
          fetchSuggestions={fetchSuggestions}
        />
        <LocationInput
          label="To"
          value={toCity}
          onChange={setToCity}
          suggestions={toSug}
          onSelect={selectPlace}
          placeholder="To City / Airport"
          debounceRef={debounceRef}
          debounceKey="to"
          fetchSuggestions={fetchSuggestions}
        />

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <Btn onClick={generateRoute}>
            <FaRoute /> Show Route
          </Btn>
          <Btn onClick={startJourney} disabled={isPlaying}>
            <FaPlay /> {isPlaying ? "Recording..." : "Start Journey"}
          </Btn>
          <Btn onClick={swap} variant="ghost" title="Swap">
            <FaExchangeAlt /> Swap
          </Btn>
          {isPlaying && (
            <Btn variant="danger" onClick={stopJourneyNow}>
              <FaStop /> Stop
            </Btn>
          )}
        </div>

        {/* Advanced Settings */}
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div>
            <label className="text-xs text-gray-700">FPS</label>
            <input
              type="number"
              min={24}
              max={120}
              value={fps}
              onChange={handleFpsChange}
              className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-700">Bitrate (Mbps)</label>
            <input
              type="number"
              min={1}
              max={20}
              value={Math.round(bitrate / 1_000_000)}
              onChange={handleBitrateChange}
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

        {/* Progress + Video */}
        <ProgressBar progress={progress} />
        <VideoPanel videoUrl={videoUrl} setVideoUrl={setVideoUrl} />
      </div>
    </div>
  );
}
