import React, { useState } from "react";
import MapComponent from "./MapComponent";
import axios from "axios";

const App = () => {
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [fromCoord, setFromCoord] = useState(null);
  const [toCoord, setToCoord] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Example: Use Geocoding API to convert city names to [lng, lat]
    const getCoord = async (city) => {
      const res = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${city}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`
      );
      return res.data.features[0].center;
    };

    const from = await getCoord(fromCity);
    const to = await getCoord(toCity);
    setFromCoord(from);
    setToCoord(to);
  };

  return (
    <div className="relative">
      <form className="absolute z-10 p-4 bg-white shadow-md rounded-md top-4 left-4" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="From City"
          value={fromCity}
          onChange={(e) => setFromCity(e.target.value)}
          className="border p-2 mr-2 rounded"
        />
        <input
          type="text"
          placeholder="To City"
          value={toCity}
          onChange={(e) => setToCity(e.target.value)}
          className="border p-2 mr-2 rounded"
        />
        <button className="bg-blue-500 text-white px-4 py-2 rounded">Start Journey</button>
      </form>

      <MapComponent fromCoord={fromCoord} toCoord={toCoord} />
    </div>
  );
};

export default App;
