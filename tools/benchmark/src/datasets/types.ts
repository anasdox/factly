export interface GoldFact {
  text: string;
  source_excerpt?: string;
}

export interface GoldInsight {
  text: string;
  source_facts: number[];
}

export interface GoldRecommendation {
  text: string;
  source_insights: number[];
}

export interface GoldOutput {
  text: string;
  output_type: string;
}

export interface FactExtractionCase {
  id: string;
  domain: string;
  input_text: string;
  goal: string;
  gold_facts: GoldFact[];
}

export interface InsightExtractionCase {
  id: string;
  domain: string;
  goal: string;
  facts: { fact_id: string; text: string }[];
  gold_insights: GoldInsight[];
}

export interface RecommendationExtractionCase {
  id: string;
  domain: string;
  goal: string;
  insights: { insight_id: string; text: string }[];
  gold_recommendations: GoldRecommendation[];
}

export interface OutputFormulationCase {
  id: string;
  domain: string;
  goal: string;
  output_type: string;
  recommendations: { recommendation_id: string; text: string }[];
  gold_outputs: GoldOutput[];
}

export interface DedupPair {
  id: string;
  text_a: string;
  text_b: string;
  is_duplicate: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  expected_score_range?: [number, number];
}

export interface DedupScanScenario {
  id: string;
  items: { id: string; text: string }[];
  expected_groups: string[][];
}

export interface ImpactScenario {
  id: string;
  old_text: string;
  new_text: string;
  children: { id: string; text: string }[];
  expected_impacts: { id: string; impacted: boolean }[];
}

export interface UpdateProposalScenario {
  id: string;
  entity_type: string;
  current_text: string;
  upstream_old_text: string;
  upstream_new_text: string;
  upstream_entity_type: string;
  goal: string;
  output_type?: string;
  expected_values_present: string[];
  expected_values_absent: string[];
}

export interface PipelineCase {
  id: string;
  domain: string;
  input_text: string;
  goal: string;
  output_type: string;
  gold_facts: GoldFact[];
  gold_insights: GoldInsight[];
  gold_recommendations: GoldRecommendation[];
  gold_outputs: GoldOutput[];
}

export type DatasetType =
  | 'fact-extraction'
  | 'insight-extraction'
  | 'recommendation-extraction'
  | 'output-formulation'
  | 'dedup-pairs'
  | 'dedup-scan'
  | 'impact'
  | 'update-proposal'
  | 'pipeline';
