export const isMobileFn = () => window.innerWidth < 768;
export const getZoom = () => (isMobileFn() ? 5.8 : window.innerWidth < 1280 ? 4.8 : 4.2);
export const getPitch = () => (isMobileFn() ? 58 : 52);
