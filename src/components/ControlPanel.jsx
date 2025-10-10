import React from "react";
import { FaPlane } from "react-icons/fa";

const ControlPanel = ({
  fromCity,
  setFromCity,
  toCity,
  setToCity,
  vehicle,
  setVehicle,
  fromSuggestions,
  toSuggestions,
  fetchSuggestions,
  setFromSuggestions,
  setToSuggestions,
  handleSelectCity,
  generateRoute,
  startJourney,
}) => {
  return (
    <div className="absolute z-20 p-4 bg-white shadow-lg rounded-md top-4 left-4 w-80">
      <h2 className="font-bold text-xl mb-2">Travel Route</h2>

      <input
        type="text"
        placeholder="From City"
        value={fromCity}
        onChange={(e) => {
          setFromCity(e.target.value);
          fetchSuggestions(e.target.value, setFromSuggestions);
        }}
        className="border p-2 mb-1 w-full rounded focus:ring-2 focus:ring-blue-400"
      />
      {fromSuggestions.length > 0 && (
        <ul className="border rounded bg-white shadow max-h-40 overflow-y-auto mb-2">
          {fromSuggestions.map((p) => (
            <li key={p.id} className="p-2 cursor-pointer hover:bg-gray-100" onClick={() => handleSelectCity(p, "from")}>
              {p.place_name}
            </li>
          ))}
        </ul>
      )}

      <input
        type="text"
        placeholder="To City"
        value={toCity}
        onChange={(e) => {
          setToCity(e.target.value);
          fetchSuggestions(e.target.value, setToSuggestions);
        }}
        className="border p-2 mb-1 w-full rounded focus:ring-2 focus:ring-blue-400"
      />
      {toSuggestions.length > 0 && (
        <ul className="border rounded bg-white shadow max-h-40 overflow-y-auto mb-2">
          {toSuggestions.map((p) => (
            <li key={p.id} className="p-2 cursor-pointer hover:bg-gray-100" onClick={() => handleSelectCity(p, "to")}>
              {p.place_name}
            </li>
          ))}
        </ul>
      )}

      <select value={vehicle} onChange={(e) => setVehicle(e.target.value)} className="border p-2 mb-2 w-full rounded focus:ring-2 focus:ring-blue-400">
        <option value="plane">Aeroplane</option>
        <option value="bike">Bike</option>
        <option value="car">Car</option>
      </select>

      <div className="flex gap-2">
        <button onClick={generateRoute} className="bg-gray-600 text-white w-1/2 py-2 rounded hover:bg-gray-700 flex items-center justify-center gap-1">
          Show Route
        </button>
        <button onClick={startJourney} className="bg-blue-600 text-white w-1/2 py-2 rounded hover:bg-blue-700 flex items-center justify-center gap-1">
          Start Journey <FaPlane />
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
