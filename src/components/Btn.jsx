import React from "react";

export default function Btn({ children, onClick, variant = "primary", disabled, className = "" }) {
  const base =
    "px-3 py-2 rounded-xl backdrop-blur border transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2";
  const variants = {
    primary:
      "bg-blue-600/80 text-white border-white/10 hover:bg-blue-600 shadow-lg shadow-blue-500/20",
    secondary: "bg-white/80 text-gray-900 border-gray-200 hover:bg-white shadow-md",
    ghost: "bg-white/10 text-white border-white/20 hover:bg-white/20",
    danger: "bg-red-600 text-white border-red-500 hover:bg-red-700",
  };
  return (
    <button
      type="button"
      className={`${base} ${variants[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
