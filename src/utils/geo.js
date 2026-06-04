export const isPointInPolygon = ([longitude, latitude], polygon) => {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects = yi > latitude !== yj > latitude
      && longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }

  return inside;
};
