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
  property_targets: PropertyTarget[];
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
}

export interface CandidateDetail extends CandidateSummary {
  generation_method: string;
  project_id: number;
  next_candidate_id: number | null;
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
  estimated_cost: number;
  estimated_yield: number;
  green_chemistry_score: number;
  confidence: number;
  note: string;
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
}
