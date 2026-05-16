import {
  type FieldBoundary,
  getBoundaryCenter,
  isFieldBoundary,
} from "./field-boundary";

const LOCAL_FARMS_KEY = "satelles.localFarms";

export type StoredFarm = {
  id: string;
  user_id: string;
  name: string;
  crop: string | null;
  lat: number;
  lon: number;
  radius_km: number;
  boundary: FieldBoundary | null;
  created_at: string;
};

type FarmInsert = {
  user_id: string;
  name: string;
  crop: string | null;
  lat: number;
  lon: number;
  boundary: FieldBoundary;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function makeLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `farm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readAllFarms() {
  if (!canUseStorage()) return [] as StoredFarm[];

  try {
    const raw = localStorage.getItem(LOCAL_FARMS_KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredFarm[]) : [];
    return parsed.map((farm) => ({
      ...farm,
      boundary: isFieldBoundary(farm.boundary) ? farm.boundary : null,
    }));
  } catch {
    return [];
  }
}

function writeAllFarms(farms: StoredFarm[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(LOCAL_FARMS_KEY, JSON.stringify(farms));
}

export function listLocalFarms(userId: string) {
  return readAllFarms()
    .filter((farm) => farm.user_id === userId)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}

export function addLocalFarm(payload: FarmInsert) {
  const boundary = payload.boundary;
  const [lat, lon] = getBoundaryCenter(boundary, [payload.lat, payload.lon]);
  const farm: StoredFarm = {
    id: makeLocalId(),
    user_id: payload.user_id,
    name: payload.name,
    crop: payload.crop,
    lat,
    lon,
    radius_km: 0,
    boundary,
    created_at: new Date().toISOString(),
  };

  writeAllFarms([farm, ...readAllFarms()]);
  return farm;
}

export function removeLocalFarm(userId: string, farmId: string) {
  writeAllFarms(
    readAllFarms().filter(
      (farm) => farm.user_id !== userId || farm.id !== farmId,
    ),
  );
}
