import { useEffect } from "react";
import { Circle, MapContainer, Marker, Polygon, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getRiskColor, type FloodWorkspace, type FloodZone } from "@/lib/government/flood";
import { placemarkIcon } from "@/lib/map/placemark";
import SatelliteTileLayer from "./SatelliteTileLayer";

export default function FloodRiskMap({
  workspace,
  selectedZoneId,
  onSelectZone,
  heightClassName = "h-[520px]",
}: {
  workspace: FloodWorkspace;
  selectedZoneId?: string;
  onSelectZone?: (zone: FloodZone) => void;
  heightClassName?: string;
}) {
  const selectedZone = workspace.zones.find((zone) => zone.id === selectedZoneId) ?? workspace.zones[0];

  return (
    <div className={`${heightClassName} w-full overflow-hidden rounded-2xl border border-border bg-secondary`}>
      <MapContainer
        center={workspace.center}
        zoom={12}
        maxBounds={workspace.bounds}
        maxBoundsViscosity={0.65}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <MapViewport workspace={workspace} selectedZone={selectedZone} />
        <SatelliteTileLayer />
        {workspace.zones.map((zone) => {
          const color = getRiskColor(zone.risk);
          const selected = selectedZone.id === zone.id;

          return (
            <Polygon
              key={zone.id}
              positions={zone.polygon}
              eventHandlers={{ click: () => onSelectZone?.(zone) }}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: selected ? 0.34 : 0.22,
                weight: selected ? 4 : 2,
              }}
            >
              <Popup>
                <div className="min-w-48">
                  <p className="font-medium">{zone.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {zone.probability}% flood probability · {zone.expectedRainMm} mm rain
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {zone.affectedPeople.toLocaleString()} residents exposed
                  </p>
                </div>
              </Popup>
            </Polygon>
          );
        })}
        {workspace.zones.map((zone) => (
          <Circle
            key={`${zone.id}-flood-extent`}
            center={zone.center}
            radius={Math.max(zone.floodDepthM, 0.2) * 900}
            pathOptions={{
              color: getRiskColor(zone.risk),
              fillColor: getRiskColor(zone.risk),
              fillOpacity: 0.12,
              weight: 1,
            }}
          />
        ))}
        {workspace.zones.map((zone) => (
          <Marker
            key={`${zone.id}-marker`}
            position={zone.center}
            icon={placemarkIcon}
            eventHandlers={{ click: () => onSelectZone?.(zone) }}
          >
            <Popup>{zone.name}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function MapViewport({ workspace, selectedZone }: { workspace: FloodWorkspace; selectedZone: FloodZone }) {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(workspace.bounds, { padding: [24, 24] });
    map.setMaxBounds(workspace.bounds);
    setTimeout(() => map.invalidateSize(), 100);
  }, [map, workspace]);

  useEffect(() => {
    if (selectedZone) map.flyTo(selectedZone.center, 13, { duration: 0.65 });
  }, [map, selectedZone]);

  return null;
}
