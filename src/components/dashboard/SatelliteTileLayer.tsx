import { TileLayer } from "react-leaflet";

export default function SatelliteTileLayer() {
  return (
    <>
      <TileLayer
        attribution="Imagery &copy; Esri"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />
      <TileLayer
        attribution="Boundaries & labels &copy; Esri"
        url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
      />
    </>
  );
}
