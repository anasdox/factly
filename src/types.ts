type InputType = {
    input_id: string;
    type: string;
    title: string;
    url: string;
  };
  
  type FactType = {
    fact_id: string;
    related_inputs: string[];
    text: string;
  };
  
  type InsightType = {
    insight_id: string;
    related_facts: string[];
    text: string;
  };
  
  type RecommendationType = {
    recommendation_id: string;
    related_insights: string[];
    text: string;
  };
  
  type OutputType = {
    output_id: string;
    related_recommendations: string[];
    text: string;
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