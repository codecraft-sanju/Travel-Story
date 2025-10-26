import React from "react";
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

export default function InputsPanel({
  fromCity,
  setFromCity,
  toCity,
  setToCity,
  fromSug,
  toSug,
  selectPlace,
  swap,
  fetchSuggestions,
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
}) {
  return (
    <div className="hidden md:block absolute top-4 left-4 z-20 w-[92vw] max-w-[480px] transition-all">
      <div className="bg-white/70 backdrop-blur-xl border border-white/30 p-4 rounded-2xl shadow-lg overflow-y-auto max-h-[85vh] md:max-h-[90vh]">
        <div className="flex items-center gap-2 mb-2">
          <FaPlane />
          <h2 className="font-semibold text-lg md:text-xl">Plane Journey Visualizer</h2>
        </div>

        {/* FROM input */}
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

        {/* TO input */}
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

        {/* Buttons */}
        <div className="flex gap-2 mt-3 flex-wrap">
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

        {/* Advanced settings */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-700">FPS</label>
            <input
              type="number"
              min={24}
              max={120}
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

        <ProgressBar progress={progress} />
        <VideoPanel videoUrl={videoUrl} setVideoUrl={setVideoUrl} />
      </div>
    </div>
  );
}
