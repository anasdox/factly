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

type ChatToolCallStatus = 'pending' | 'confirmed' | 'cancelled' | 'applied' | 'error';

type ChatToolCall = {
  tool: 'add_item' | 'delete_item' | 'edit_item';
  params: Record<string, unknown>;
  status: ChatToolCallStatus;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tool_calls?: ChatToolCall[];
  created_at: string;
  references?: string[];
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
  chat_history?: ChatMessage[];
};

type ItemType = InputType | FactType | InsightType | RecommendationType | OutputType;

type OpenEditModalFunction = (item: ItemType) => void;
