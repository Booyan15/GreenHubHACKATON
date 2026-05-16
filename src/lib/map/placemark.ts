import L from "leaflet";

export const placemarkIcon = L.icon({
  iconUrl: "/placemark.png",
  iconRetinaUrl: "/placemark.png",
  iconSize: [44, 44],
  iconAnchor: [22, 44],
  popupAnchor: [0, -38],
  tooltipAnchor: [0, -34],
});

export const penDrawIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 9999px;
      background: #007aff;
      color: #fff;
      border: 2px solid #fff;
      box-shadow: 0 8px 24px rgba(0,0,0,0.28);
    ">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -18],
});
