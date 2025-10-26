import React from "react";
import Btn from "./Btn";
import { FaDownload, FaShareAlt, FaTimes } from "react-icons/fa";

export default function VideoPanel({ videoUrl, setVideoUrl }) {
  if (!videoUrl) return null;

  return (
    <div
      className="mt-4 border rounded-xl p-3 bg-white/90 shadow-lg max-h-[70vh] flex flex-col overflow-hidden"
    >
      {/* 🎥 Video */}
      <div className="flex-1 overflow-y-auto">
        <video
          src={videoUrl}
          controls
          className="rounded-lg w-full mb-3"
          style={{ maxHeight: "40vh" }}
        />
      </div>

      {/* 🔘 Buttons always visible */}
      <div className="flex gap-2 flex-wrap justify-start sticky bottom-0 bg-white/90 backdrop-blur-sm pt-2 pb-1 mt-auto">
        <Btn
          onClick={() => {
            const a = document.createElement("a");
            a.href = videoUrl;
            a.download = "plane-journey.webm";
            a.click();
          }}
        >
          <FaDownload /> Download
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
          <FaShareAlt /> Share
        </Btn>

        <Btn variant="ghost" onClick={() => setVideoUrl(null)}>
          <FaTimes /> Close
        </Btn>
      </div>
    </div>
  );
}
