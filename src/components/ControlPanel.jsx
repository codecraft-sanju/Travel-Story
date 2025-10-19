import React, { useRef } from "react";
import { FaPlane, FaExchangeAlt } from "react-icons/fa";

const ControlPanel = ({
  fromCity,
  setFromCity,
  toCity,
  setToCity,
  fromSuggestions,
  toSuggestions,
  fetchSuggestions,
  setFromSuggestions,
  setToSuggestions,
  handleSelectCity,
  generateRoute,
  startJourney,
}) => {
  const debounceRef = useRef({ from: null, to: null });

  const onChangeFrom = (val) => {
    setFromCity(val);
    clearTimeout(debounceRef.current.from);
    debounceRef.current.from = setTimeout(() => {
      fetchSuggestions(val, setFromSuggestions);
    }, 250);
  };

  const onChangeTo = (val) => {
    setToCity(val);
    clearTimeout(debounceRef.current.to);
    debounceRef.current.to = setTimeout(() => {
      fetchSuggestions(val, setToSuggestions);
    }, 250);
  };

  const swap = () => {
    if (!fromCity && !toCity) return;
    const f = fromCity;
    const t = toCity;
    setFromCity(t);
    setToCity(f);
    setFromSuggestions([]);
    setToSuggestions([]);
  };

  return (
    <div className="absolute z-20 p-4 bg-white shadow-lg rounded-md top-4 left-4 w-80">
      <h2 className="font-bold text-xl mb-2">✈️ Travel Route (Plane Only)</h2>

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="From City"
          value={fromCity}
          onChange={(e) => onChangeFrom(e.target.value)}
          className="border p-2 mb-1 w-full rounded focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="button"
          onClick={swap}
          className="shrink-0 h-9 w-9 rounded bg-gray-100 hover:bg-gray-200 grid place-items-center"
          title="Swap"
        >
          <FaExchangeAlt />
        </button>
      </div>

      {fromSuggestions.length > 0 && (
        <ul className="border rounded bg-white shadow max-h-40 overflow-y-auto mb-2">
          {fromSuggestions.map((p) => (
            <li
              key={p.id}
              className="p-2 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSelectCity(p, "from")}
            >
              {p.place_name}
            </li>
          ))}
        </ul>
      )}

      <input
        type="text"
        placeholder="To City"
        value={toCity}
        onChange={(e) => onChangeTo(e.target.value)}
        className="border p-2 mb-1 w-full rounded focus:ring-2 focus:ring-blue-400"
      />

      {toSuggestions.length > 0 && (
        <ul className="border rounded bg-white shadow max-h-40 overflow-y-auto mb-2">
          {toSuggestions.map((p) => (
            <li
              key={p.id}
              className="p-2 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSelectCity(p, "to")}
            >
              {p.place_name}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <button
          onClick={generateRoute}
          className="bg-gray-600 text-white w-1/2 py-2 rounded hover:bg-gray-700 flex items-center justify-center gap-1"
        >
          Show Route
        </button>
        <button
          onClick={startJourney}
          className="bg-blue-600 text-white w-1/2 py-2 rounded hover:bg-blue-700 flex items-center justify-center gap-1"
        >
          Start Journey <FaPlane />
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
