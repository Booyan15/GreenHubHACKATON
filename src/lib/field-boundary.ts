export type FieldBoundary = [number, number][];

export const MIN_FIELD_BOUNDARY_POINTS = 3;

export function isFieldBoundary(value: unknown): value is FieldBoundary {
  return (
    Array.isArray(value) &&
    value.length >= MIN_FIELD_BOUNDARY_POINTS &&
    value.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        Number.isFinite(point[0]) &&
        Number.isFinite(point[1]),
    )
  );
}

export function getBoundaryCenter(
  boundary: FieldBoundary,
  fallback: [number, number],
): [number, number] {
  if (boundary.length === 0) return fallback;

  const total = boundary.reduce(
    (acc, point) => [acc[0] + point[0], acc[1] + point[1]] as [number, number],
    [0, 0] as [number, number],
  );

  return [total[0] / boundary.length, total[1] / boundary.length];
}

export function getBoundaryAreaHa(boundary: FieldBoundary) {
  if (boundary.length < MIN_FIELD_BOUNDARY_POINTS) return 0;

  const meanLat =
    boundary.reduce((sum, point) => sum + point[0], 0) / boundary.length;
  const metersPerLon = 111_320 * Math.cos((meanLat * Math.PI) / 180);
  const metersPerLat = 110_540;

  const projected = boundary.map(([lat, lon]) => ({
    x: lon * metersPerLon,
    y: lat * metersPerLat,
  }));

  const doubleArea = projected.reduce((sum, point, index) => {
    const next = projected[(index + 1) % projected.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0);

  return Math.abs(doubleArea) / 2 / 10_000;
}

export function formatBoundaryArea(boundary: FieldBoundary) {
  const area = getBoundaryAreaHa(boundary);
  if (area <= 0) return "0 ha";
  if (area < 10) return `${area.toFixed(1)} ha`;
  return `${Math.round(area)} ha`;
}

export function makeFieldBoundaryAroundPoint(
  center: [number, number],
  halfSizeMeters = 220,
): FieldBoundary {
  const [lat, lon] = center;
  const latDelta = halfSizeMeters / 110_540;
  const lonDelta = halfSizeMeters / (111_320 * Math.cos((lat * Math.PI) / 180));

  return [
    [lat - latDelta, lon - lonDelta],
    [lat - latDelta * 0.85, lon + lonDelta],
    [lat + latDelta, lon + lonDelta * 0.85],
    [lat + latDelta * 0.9, lon - lonDelta * 0.9],
  ];
}
