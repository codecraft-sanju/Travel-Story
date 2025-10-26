import React from "react";
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
  return (
    <>
      {/* === Floating Down Arrow (when closed) === */}
      {!sheetOpen && (
        <div
          className="md:hidden fixed top-2 left-1/2 -translate-x-1/2 z-20 bg-white/70 backdrop-blur-lg border border-white/40 rounded-full shadow-md p-2 active:scale-95 transition-all cursor-pointer"
          onClick={() => setSheetOpen(true)}
        >
          <FaChevronDown className="text-gray-700" size={18} />
        </div>
      )}

      {/* === 🔝 Top Sheet Panel === */}
      <div
        className={`top-sheet md:hidden fixed left-0 right-0 z-30 ${
          sheetOpen ? "top-0 opacity-100" : "-top-[75vh] opacity-0"
        } transition-all duration-300 ease-out`}
      >
        <div
          className={`mx-auto w-[96vw] ${
            sheetOpen ? "translate-y-0" : "-translate-y-[60vh]"
          } transition-transform duration-300 ease-out`}
        >
          <div className="bg-white/85 backdrop-blur-xl border border-white/30 rounded-b-3xl shadow-[0_8px_30px_rgba(0,0,0,0.25)] p-3">
            {/* === Drag Handle === */}
            <div
              className="flex items-center justify-center w-full py-1 cursor-pointer select-none"
              onClick={() => setSheetOpen((s) => !s)}
            >
              <div className="w-12 h-1.5 rounded-full bg-gray-400/60" />
              <div className="ml-3 text-gray-700">
                {sheetOpen ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>

            {/* === Title === */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <FaPlane />
              <h2 className="font-semibold text-base">Plane Journey</h2>
            </div>

            {/* === Inputs === */}
            <div className="px-1">
              {/* From Input */}
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

              {/* To Input */}
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

              {/* === Buttons === */}
              <div className="flex gap-2 mt-2 flex-wrap">
                <Btn onClick={generateRoute}>
                  <FaRoute /> Route
                </Btn>
                <Btn onClick={startJourney} disabled={isPlaying}>
                  <FaPlay /> {isPlaying ? "Recording..." : "Start"}
                </Btn>
                <Btn onClick={swap} >
                  <FaExchangeAlt /> Swap
                </Btn>
                {isPlaying && (
                  <Btn variant="danger" onClick={stopJourneyNow}>
                    <FaStop /> Stop
                  </Btn>
                )}
              </div>

              {/* === Advanced Settings === */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-gray-700">FPS</label>
                  <input
                    type="number"
                    min={24}
                    max={120}
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
                    value={Math.round(bitrate / 1_000_000)}
                    onChange={(e) =>
                      setBitrate(Number(e.target.value || 5) * 1_000_000)
                    }
                    className="w-full border rounded-xl px-3 py-2 text-[13.5px]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-700">Zoom (Mob)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={zoomMobileOverride}
                    onChange={(e) =>
                      setZoomMobileOverride(Number(e.target.value))
                    }
                    className="w-full border rounded-xl px-3 py-2 text-[13.5px]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-700">Zoom (Desk)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={zoomDesktopOverride}
                    onChange={(e) =>
                      setZoomDesktopOverride(Number(e.target.value))
                    }
                    className="w-full border rounded-xl px-3 py-2 text-[13.5px]"
                  />
                </div>
              </div>

              {/* === Progress & Video === */}
              <div className="mt-3">
                <ProgressBar progress={progress} />
              </div>
              <VideoPanel videoUrl={videoUrl} setVideoUrl={setVideoUrl} />
            </div>
          </div>
        </div>
      </div>

      {/* Compact floating progress when playing */}
      {isPlaying && <ProgressBar progress={progress} mobile />}
    </>
  );
}
