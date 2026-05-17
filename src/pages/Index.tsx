import { useState } from "react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";
import LocationChooser, { SavedLocation } from "@/components/landing/LocationChooser";
import { DEFAULT_COUNTRY_ID, getCountryById } from "@/lib/countries";

const LOCATION_STORAGE_KEY = "satelles.location";

function getInitialLocation(): SavedLocation {
  const fallback = getCountryById(DEFAULT_COUNTRY_ID);

  if (typeof window === "undefined") {
    return {
      name: fallback?.name ?? "North Macedonia",
      region: fallback?.region,
      lat: fallback?.lat ?? 41.6086,
      lon: fallback?.lon ?? 21.7453,
    };
  }

  try {
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as SavedLocation) : null;
    if (parsed && Number.isFinite(parsed.lat) && Number.isFinite(parsed.lon)) return parsed;
  } catch {
    // Fall through to default country.
  }

  return {
    name: fallback?.name ?? "North Macedonia",
    region: fallback?.region,
    lat: fallback?.lat ?? 41.6086,
    lon: fallback?.lon ?? 21.7453,
  };
}

export default function Index() {
  const [selectedLocation, setSelectedLocation] = useState(getInitialLocation);

  return (
    <div className="min-h-screen bg-background">
      <LocationChooser onPick={setSelectedLocation} />
      <Navbar />
      <Hero selectedLocation={selectedLocation} />
      <Features />
      <Pricing />
      <Footer />
    </div>
  );
}
