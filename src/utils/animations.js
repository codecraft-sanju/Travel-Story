import { gsap } from "gsap";

// 🎥 Cinematic camera tilt animation
export const animateCameraTilt = (map, frame) => {
  if (!map) return;
  const pitch = 35 + Math.sin(frame / 5) * 10;
  map.easeTo({ pitch, duration: 200 });
};
