import React from "react";

export default function ProgressBar({ progress, mobile }) {
  return (
    <div className={`${mobile ? "absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[90vw]" : "mt-4"}`}>
      <div className={`${mobile ? "h-3 bg-gray-800/50" : "h-2 bg-gray-200"} rounded-full overflow-hidden`}>
        <div
          className={`${mobile ? "h-full bg-blue-500" : "h-full bg-blue-600"} transition-all`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {!mobile && <p className="text-xs mt-1 text-gray-700">{progress}% complete</p>}
    </div>
  );
}
