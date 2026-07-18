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

// Human-readable presentation for polymerisation-feasibility classifications.
// tone drives colour: "good" = supported single monomer, "info" = needs a
// co-monomer, "warn" = manual review, "muted" = no supported family.
export const POLYMER_CLASS_META: Record<
  string,
  { label: string; tone: "good" | "info" | "warn" | "muted"; blurb: string }
> = {
  ab_monomer: {
    label: "Self-polymerising",
    tone: "good",
    blurb: "Carries complementary reactive groups — can polymerise on its own.",
  },
  ring_opening_monomer: {
    label: "Ring-opening monomer",
    tone: "good",
    blurb: "A strained ring that can open and chain-extend into a polymer.",
  },
  diacid_comonomer: {
    label: "Diacid co-monomer",
    tone: "info",
    blurb: "Needs a diol or diamine partner to build a polymer.",
  },
  diol_comonomer: {
    label: "Diol co-monomer",
    tone: "info",
    blurb: "Needs a diacid or diisocyanate partner to build a polymer.",
  },
  diamine_comonomer: {
    label: "Diamine co-monomer",
    tone: "info",
    blurb: "Needs a diacid or diacyl partner to build a polymer.",
  },
  flagged: {
    label: "Needs manual review",
    tone: "warn",
    blurb: "Supported chemistry, but a structural concern warrants expert review.",
  },
  unsupported: {
    label: "No supported family",
    tone: "muted",
    blurb: "Valid molecule, but no supported packaging polymerisation route was found.",
  },
};

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

// Named scenario presets shown as quick chips in the wizard.
export interface ScenarioPreset {
  label: string;
  values: Record<string, number>;
}

export const SCENARIO_PRESETS: Record<Domain, ScenarioPreset[]> = {
  packaging: [
    {
      label: "Hot-food container",
      values: { biodegradability: 80, thermal_stability: 75, lightweight: 60, flexibility: 45, affordability: 70 },
    },
    {
      label: "Carry bag film",
      values: { biodegradability: 90, thermal_stability: 40, lightweight: 80, flexibility: 85, affordability: 85 },
    },
    {
      label: "Produce wrap",
      values: { biodegradability: 90, thermal_stability: 35, lightweight: 75, flexibility: 90, affordability: 80 },
    },
  ],
  ev_component: [
    {
      label: "Battery separator",
      values: { biodegradability: 20, thermal_stability: 90, lightweight: 85, flexibility: 55, affordability: 65 },
    },
    {
      label: "Cell casing",
      values: { biodegradability: 15, thermal_stability: 85, lightweight: 80, flexibility: 30, affordability: 70 },
    },
    {
      label: "Cable insulation",
      values: { biodegradability: 30, thermal_stability: 75, lightweight: 70, flexibility: 85, affordability: 75 },
    },
  ],
};

// Physically-antagonistic property pairs; warn when both targets are ambitious.
const CONFLICT_RULES: { a: string; b: string; threshold: number; note: string }[] = [
  {
    a: "biodegradability",
    b: "thermal_stability",
    threshold: 72,
    note: "Bonds that break down easily also tend to fail under heat — expect a trade-off between biodegradability and thermal stability.",
  },
  {
    a: "thermal_stability",
    b: "flexibility",
    threshold: 75,
    note: "Rigid, heat-resistant backbones usually bend poorly — very high thermal stability and flexibility rarely co-exist.",
  },
  {
    a: "thermal_stability",
    b: "affordability",
    threshold: 78,
    note: "High-temperature polymers usually need exotic monomers — expect cost pressure at this thermal target.",
  },
];

export function detectConflicts(values: Record<string, number>): string[] {
  return CONFLICT_RULES.filter(
    (r) => (values[r.a] ?? 0) >= r.threshold && (values[r.b] ?? 0) >= r.threshold
  ).map((r) => r.note);
}
