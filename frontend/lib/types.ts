export type Domain = "packaging" | "ev_component";

export interface PropertyTarget {
  property_name: string;
  target_value: number;
  weight: number;
  id?: number;
}

export interface Project {
  id: number;
  name: string;
  domain: Domain;
  created_at: string;
  share_token: string | null;
  property_targets: PropertyTarget[];
  // Dashboard triage summary — present on the project-list response, null elsewhere.
  latest_run_status?: "pending" | "running" | "completed" | "failed" | null;
  candidate_count?: number | null;
  top_score?: number | null;
  last_activity?: string | null;
}

export interface Prediction {
  property_name: string;
  predicted_value: number;
  confidence: number;
  model_version: string;
}

export interface CandidateSummary {
  id: number;
  smiles: string;
  novelty_score: number;
  composite_score: number;
  rank: number;
  starred: boolean;
  predictions: Prediction[];
}

export interface SimilarMolecule {
  name: string;
  smiles: string;
  similarity: number;
  note: string;
}

export interface Explanation {
  summary: string;
  feature_importance: { factor: string; direction: string; points: number; property?: string }[];
  trade_offs: string[];
  similar_molecules: SimilarMolecule[];
  cost_estimate_usd_per_kg: number | null;
  ml_drivers: { factor: string; direction: string; impact: number }[];
}

export interface CandidateDetail extends CandidateSummary {
  generation_method: string;
  project_id: number;
  next_candidate_id: number | null;
  prev_candidate_id: number | null;
  pubchem_cid: number | null; // null unchecked, 0 novel, >0 known compound CID
  explanation: Explanation;
}

export interface SynthesisStep {
  step: number;
  description: string;
  precursors: string[];
  reaction_hint: string;
}

export interface SynthesisRoute {
  source_engine: string;
  steps: SynthesisStep[];
  largest_block_pct: number | null;
  building_blocks: number;
  flags: string[];
  note: string;
}

export interface SharedProject {
  name: string;
  domain: Domain;
  created_at: string;
  property_targets: PropertyTarget[];
  run: RunStatus | null;
  candidates: CandidateSummary[];
}

export interface ReferenceMolecule {
  name: string;
  smiles: string;
  note: string;
  formula: string;
  mol_weight: number;
  logp: number;
  tpsa: number;
  ring_count: number;
  ester_groups: number;
  hydroxyl_groups: number;
  svg: string | null;
}

export interface GenerationPoint {
  gen: number;
  best: number;
  valid: number;
}

export interface RunStatus {
  id: number;
  status: "pending" | "running" | "completed" | "failed";
  error: string;
  started_at: string | null;
  finished_at: string | null;
  progress_generation: number;
  progress_total: number;
  progress_best_fitness: number;
  progress_valid_count: number;
  progress_history: GenerationPoint[];
}
