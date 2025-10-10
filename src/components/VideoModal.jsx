import React from "react";
import { FaSave, FaShareAlt } from "react-icons/fa";

const VideoModal = ({ recordedVideo }) => {
  if (!recordedVideo) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-30">
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-11/12 sm:w-[400px] text-center">
        <h3 className="font-semibold text-lg mb-3">Your Travel Story</h3>
        <video src={recordedVideo} controls className="rounded-lg mb-3 w-full" />
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              const a = document.createElement("a");
              a.href = recordedVideo;
              a.download = "my-travel-story.webm";
              a.click();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-1"
          >
            <FaSave /> Save Video
          </button>
          <button onClick={() => alert("Sharing not supported on this device.")}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-1">
            <FaShareAlt /> Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;
