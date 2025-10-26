import React from "react";
import Btn from "./Btn";
import { FaDownload, FaShareAlt, FaTimes } from "react-icons/fa";

export default function VideoPanel({ videoUrl, setVideoUrl }) {
  if (!videoUrl) return null;

  return (
    <div className="mt-4 border rounded-xl p-3 bg-white/90 shadow-lg max-h-[70vh] flex flex-col overflow-hidden">
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
                await navigator.share({
                  url: videoUrl,
                  title: "My Air Journey ✈️",
                });
              } else {
                // ✨ Fancy alert instead of boring one
                const popup = document.createElement("div");
                popup.innerHTML = `
                  <div style="
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                  ">
                    <div style="
                      background: white;
                      border-radius: 16px;
                      padding: 20px 24px;
                      text-align: center;
                      max-width: 300px;
                      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                      animation: fadeIn 0.3s ease;
                      font-family: sans-serif;
                    ">
                      <h3 style="font-size: 17px; font-weight: 600; margin-bottom: 8px;">
                        ⚠️ Share Not Supported
                      </h3>
                      <p style="font-size: 14px; color: #444; margin-bottom: 16px;">
                        Your browser doesn’t support direct sharing.<br/>
                        👉 Please <b>Download</b> the video first,<br/>
                        then upload it manually to Instagram or WhatsApp!
                      </p>
                      <button id="popupClose" style="
                        background: #2563eb;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        padding: 8px 16px;
                        font-size: 14px;
                        cursor: pointer;
                      ">OK, Got it!</button>
                    </div>
                  </div>
                `;
                document.body.appendChild(popup);
                popup.querySelector("#popupClose").onclick = () =>
                  popup.remove();
              }
            } catch {
              // Fallback if any error occurs
              alert(
                "Couldn't share the video 😕 Please download and upload manually."
              );
            }
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
