import React, { useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Btn from "./Btn";
import VideoPanel from "./VideoPanel";
import ProgressBar from "./ProgressBar";
import {
  FaChevronDown,
  FaChevronUp,
  FaPlane,
  FaRoute,
  FaExchangeAlt,
  FaStop,
  FaPlay,
  FaMapMarkerAlt,
} from "react-icons/fa";

// 🎯 Reusable Mobile Input Component
const MobileInput = ({
  label,
  value,
  setValue,
  suggestions,
  setSuggestions,
  debounceKey,
  debounceRef,
  fetchSuggestions,
  selectPlace,
}) => {
  const inputRef = useRef(null);

  // 🧩 Hide suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!inputRef.current?.contains(e.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [setSuggestions]);

  return (
    <div className="relative mb-2" ref={inputRef}>
      <label className="text-[11px] font-medium text-gray-700">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
          <FaMapMarkerAlt />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            setValue(val);
            clearTimeout(debounceRef.current[debounceKey]);
            debounceRef.current[debounceKey] = setTimeout(
              () => fetchSuggestions(val, setSuggestions),
              250
            );
          }}
          placeholder={`${label} City / Airport`}
          className="w-full border rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-400 text-[13.5px] outline-none transition-all"
        />
        {suggestions?.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full border rounded-xl bg-white/95 backdrop-blur shadow-md max-h-40 overflow-y-auto animate-fadeIn">
            {suggestions.map((p) => (
              <li
                key={p.id}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-[13px] transition"
                onClick={() => selectPlace(p, debounceKey)}
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

export default function MobileSheet({
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
  const toggleSheet = useCallback(() => setSheetOpen((p) => !p), [setSheetOpen]);

  return (
    <>
      {/* 🧭 Floating arrow button */}
      {!sheetOpen && (
        <div
          className="md:hidden fixed top-2 left-1/2 -translate-x-1/2 z-20 bg-white/70 backdrop-blur-lg border border-white/40 rounded-full shadow-md p-2 active:scale-95 cursor-pointer transition-all"
          onClick={() => setSheetOpen(true)}
        >
          <FaChevronDown className="text-gray-700" size={18} />
        </div>
      )}

      {/* 🪄 Animated Sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            {/* 🩶 Backdrop overlay */}
            <motion.div
              className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
            />

            {/* 🎬 Sliding Panel */}
            <motion.div
              key="sheet"
              initial={{ y: "-100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 14,
                mass: 0.8,
              }}
              className="md:hidden fixed top-0 left-0 right-0 z-30 mx-auto w-[96vw]"
            >
              <div className="bg-white/90 backdrop-blur-2xl border border-white/30 rounded-b-3xl shadow-[0_8px_25px_rgba(0,0,0,0.25)] p-3">
                
                {/* Handle */}
                <div
                  className="flex items-center justify-center w-full py-1 cursor-pointer select-none"
                  onClick={toggleSheet}
                >
                  <div className="w-12 h-1.5 rounded-full bg-gray-400/60" />
                  <div className="ml-3 text-gray-700">
                    <FaChevronUp />
                  </div>
                </div>

                {/* Header */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <FaPlane className="text-blue-600" />
                  <h2 className="font-semibold text-base">Plane Journey</h2>
                </div>

                {/* Inputs */}
                <div className="px-1">
                  <MobileInput
                    label="From"
                    value={fromCity}
                    setValue={setFromCity}
                    suggestions={fromSug}
                    setSuggestions={setFromSug}
                    debounceKey="from"
                    debounceRef={debounceRef}
                    fetchSuggestions={fetchSuggestions}
                    selectPlace={selectPlace}
                  />
                  <MobileInput
                    label="To"
                    value={toCity}
                    setValue={setToCity}
                    suggestions={toSug}
                    setSuggestions={setToSug}
                    debounceKey="to"
                    debounceRef={debounceRef}
                    fetchSuggestions={fetchSuggestions}
                    selectPlace={selectPlace}
                  />

                  {/* Buttons */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Btn onClick={generateRoute}>
                      <FaRoute /> Route
                    </Btn>
                    <Btn onClick={startJourney} disabled={isPlaying}>
                      <FaPlay /> {isPlaying ? "Recording..." : "Start"}
                    </Btn>
                    <Btn onClick={swap}>
                      <FaExchangeAlt /> Swap
                    </Btn>
                    {isPlaying && (
                      <Btn variant="danger" onClick={stopJourneyNow}>
                        <FaStop /> Stop
                      </Btn>
                    )}
                  </div>

                  {/* Advanced Settings */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
                    <div>
                      <label className="text-[11px] text-gray-700">FPS</label>
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
                      <label className="text-[11px] text-gray-700">Bitrate (Mbps)</label>
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
                      <label className="text-[11px] text-gray-700">Zoom (Mob)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={zoomMobileOverride}
                        onChange={(e) => setZoomMobileOverride(Number(e.target.value))}
                        className="w-full border rounded-xl px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-700">Zoom (Desk)</label>
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
                  <div className="mt-3">
                    {progress > 0 && <ProgressBar progress={progress} />}
                  </div>
                  <VideoPanel videoUrl={videoUrl} setVideoUrl={setVideoUrl} />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating progress bar */}
      {isPlaying && <ProgressBar progress={progress} mobile />}
    </>
  );
}
