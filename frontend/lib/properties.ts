import { Domain } from "./types";

export interface PropertyDef {
  key: string;
  label: string;
  hint: string;
}

export const PROPERTIES: PropertyDef[] = [
  { key: "biodegradability", label: "Biodegradability", hint: "Breaks down naturally after use" },
  { key: "thermal_stability", label: "Thermal stability", hint: "Withstands heat without degrading" },
  { key: "lightweight", label: "Lightweight", hint: "Low material density" },
  { key: "flexibility", label: "Flexibility", hint: "Bends without cracking" },
  { key: "affordability", label: "Affordability", hint: "Cheap, commodity feedstocks" },
];

export const PROPERTY_LABEL: Record<string, string> = Object.fromEntries(
  PROPERTIES.map((p) => [p.key, p.label])
);

export const DOMAINS: { key: Domain; label: string; blurb: string; emoji: string }[] = [
  {
    key: "packaging",
    label: "Biodegradable packaging",
    blurb: "Compostable food-packaging polymers — India's single-use plastic problem.",
    emoji: "🌱",
  },
  {
    key: "ev_component",
    label: "EV component material",
    blurb: "Lightweight, low-cost separators and casings for India's EV push.",
    emoji: "🔋",
  },
];

// Sensible starting targets per flagship scenario (PRD section 9).
export const DOMAIN_PRESETS: Record<Domain, Record<string, number>> = {
  packaging: {
    biodegradability: 85,
    thermal_stability: 55,
    lightweight: 70,
    flexibility: 60,
    affordability: 75,
  },
  ev_component: {
    biodegradability: 25,
    thermal_stability: 80,
    lightweight: 85,
    flexibility: 45,
    affordability: 70,
  },
};
