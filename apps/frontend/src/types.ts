type EntityStatus = 'draft' | 'validated' | 'outdated' | 'needs_review' | 'needs_refresh'
                  | 'unsupported' | 'weak' | 'risky';

type VersionEntry = { version: number; text: string; created_at: string };

type InputType = {
  input_id: string;
  type: string;
  title: string;
  url?: string;
  text?: string;
  version?: number;
  status?: EntityStatus;
  created_at?: string;
  versions?: VersionEntry[];
};

type FactType = {
  fact_id: string;
  related_inputs: string[];
  text: string;
  source_excerpt?: string;
  version?: number;
  status?: EntityStatus;
  created_at?: string;
  versions?: VersionEntry[];
};

type InsightType = {
  insight_id: string;
  related_facts: string[];
  text: string;
  version?: number;
  status?: EntityStatus;
  created_at?: string;
  versions?: VersionEntry[];
};

type RecommendationType = {
  recommendation_id: string;
  related_insights: string[];
  text: string;
  version?: number;
  status?: EntityStatus;
  created_at?: string;
  versions?: VersionEntry[];
};

type OutputType = {
  output_id: string;
  related_recommendations: string[];
  text: string;
  type: 'report' | 'presentation' | 'action_plan' | 'brief';
  version?: number;
  status?: EntityStatus;
  created_at?: string;
  versions?: VersionEntry[];
};

type DiscoveryData = {
  discovery_id: string;
  title: string;
  goal: string;
  date: string;
  inputs: InputType[];
  facts: FactType[];
  insights: InsightType[];
  recommendations: RecommendationType[];
  outputs: OutputType[];
};

type ItemType = InputType | FactType | InsightType | RecommendationType | OutputType;

type OpenEditModalFunction = (item: ItemType) => void;
