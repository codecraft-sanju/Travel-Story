import React from "react";
import Btn from "./Btn";
import { FaDownload, FaShareAlt, FaTimes } from "react-icons/fa";

export default function VideoPanel({ videoUrl, setVideoUrl }) {
  if (!videoUrl) return null;

  return (
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
          <FaDownload /> Download
        </Btn>
        <Btn
          variant="secondary"
          onClick={async () => {
            try {
              if (navigator.canShare && navigator.canShare({ url: videoUrl })) {
                await navigator.share({ url: videoUrl, title: "My Air Journey" });
              } else {
                alert("Native sharing not supported.");
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
