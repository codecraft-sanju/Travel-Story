export const fcPoint = (coords) => ({
  type: "FeatureCollection",
  features: [{ type: "Feature", geometry: { type: "Point", coordinates: coords } }],
});

export const emptyFC = () => ({ type: "FeatureCollection", features: [] });

export const fcVehicle = (coords, bearing, PLANE_ICON, PLANE_ICON_SIZE) => ({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: coords },
      properties: { rotation: bearing, icon: PLANE_ICON, size: PLANE_ICON_SIZE },
    },
  ],
});
