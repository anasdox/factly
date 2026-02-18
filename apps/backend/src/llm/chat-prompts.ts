export interface DiscoveryContext {
  title: string;
  goal: string;
  inputs: { input_id: string; type: string; title: string; text?: string; status?: string }[];
  facts: { fact_id: string; text: string; related_inputs: string[]; status?: string }[];
  insights: { insight_id: string; text: string; related_facts: string[]; status?: string }[];
  recommendations: { recommendation_id: string; text: string; related_insights: string[]; status?: string }[];
  outputs: { output_id: string; text: string; type: string; related_recommendations: string[]; status?: string }[];
}

export interface ReferencedItem {
  id: string;
  type: 'input' | 'fact' | 'insight' | 'recommendation' | 'output';
  text: string;
}

export interface ChatToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

const CHAT_SYSTEM_BASE = `You are Factly, an AI research assistant helping an analyst work on a Discovery session.

The Discovery pipeline follows this chain: Input → Fact → Insight → Recommendation → Output.
Each entity has an ID (e.g., I-1, F-1, N-1, R-1, O-1) and relationships to its upstream entities.

Your role:
- Answer questions about the Discovery using the provided context.
- When the analyst asks to add, delete, or edit items, ALWAYS use the appropriate tool. Do NOT describe what you would do — actually call the tool.
- For bulk deletions (e.g., "delete all insights"), you MUST list every matching ID in item_ids. Read the IDs from the Discovery context provided above. Never send an empty item_ids array.
- Proactively identify gaps, missing connections, and suggest improvements when asked.
- Always reference items by their IDs.
- Be concise and precise. Use the analyst's language.
- When referencing items in your responses, use the format: ID (e.g., F-1, N-1).`;

export function buildChatSystemPrompt(
  context: DiscoveryContext,
  threshold: number,
  referencedItems?: ReferencedItem[],
): string {
  const totalItems = context.inputs.length + context.facts.length + context.insights.length
                   + context.recommendations.length + context.outputs.length;

  let contextSection: string;
  if (totalItems <= threshold) {
    contextSection = buildFullContext(context);
  } else {
    contextSection = buildSummarizedContext(context, referencedItems);
  }

  return `${CHAT_SYSTEM_BASE}

Current Discovery:
Title: ${context.title}
Goal: ${context.goal}

${contextSection}`;
}

export function buildFullContext(context: DiscoveryContext): string {
  const sections: string[] = [];

  if (context.inputs.length > 0) {
    const items = context.inputs.map(i => {
      const text = i.text ? ` — "${i.text.substring(0, 200)}${i.text.length > 200 ? '...' : ''}"` : '';
      const status = i.status && i.status !== 'draft' ? ` [${i.status}]` : '';
      return `  - ${i.input_id} (${i.type}): ${i.title}${text}${status}`;
    }).join('\n');
    sections.push(`Inputs (${context.inputs.length}):\n${items}`);
  }

  if (context.facts.length > 0) {
    const items = context.facts.map(f => {
      const rels = f.related_inputs.length > 0 ? ` ← [${f.related_inputs.join(', ')}]` : '';
      const status = f.status && f.status !== 'draft' ? ` [${f.status}]` : '';
      return `  - ${f.fact_id}: ${f.text}${rels}${status}`;
    }).join('\n');
    sections.push(`Facts (${context.facts.length}):\n${items}`);
  }

  if (context.insights.length > 0) {
    const items = context.insights.map(n => {
      const rels = n.related_facts.length > 0 ? ` ← [${n.related_facts.join(', ')}]` : '';
      const status = n.status && n.status !== 'draft' ? ` [${n.status}]` : '';
      return `  - ${n.insight_id}: ${n.text}${rels}${status}`;
    }).join('\n');
    sections.push(`Insights (${context.insights.length}):\n${items}`);
  }

  if (context.recommendations.length > 0) {
    const items = context.recommendations.map(r => {
      const rels = r.related_insights.length > 0 ? ` ← [${r.related_insights.join(', ')}]` : '';
      const status = r.status && r.status !== 'draft' ? ` [${r.status}]` : '';
      return `  - ${r.recommendation_id}: ${r.text}${rels}${status}`;
    }).join('\n');
    sections.push(`Recommendations (${context.recommendations.length}):\n${items}`);
  }

  if (context.outputs.length > 0) {
    const items = context.outputs.map(o => {
      const textPreview = o.text.substring(0, 200) + (o.text.length > 200 ? '...' : '');
      const rels = o.related_recommendations.length > 0 ? ` ← [${o.related_recommendations.join(', ')}]` : '';
      const status = o.status && o.status !== 'draft' ? ` [${o.status}]` : '';
      return `  - ${o.output_id} (${o.type}): ${textPreview}${rels}${status}`;
    }).join('\n');
    sections.push(`Outputs (${context.outputs.length}):\n${items}`);
  }

  return sections.join('\n\n');
}

export function buildSummarizedContext(
  context: DiscoveryContext,
  referencedItems?: ReferencedItem[],
): string {
  const sections: string[] = [];

  // Summary counts
  sections.push(`Pipeline summary:
  - Inputs: ${context.inputs.length}
  - Facts: ${context.facts.length}
  - Insights: ${context.insights.length}
  - Recommendations: ${context.recommendations.length}
  - Outputs: ${context.outputs.length}
  - Total: ${context.inputs.length + context.facts.length + context.insights.length + context.recommendations.length + context.outputs.length}`);

  // Key themes from first items of each column
  const themes: string[] = [];
  context.facts.slice(0, 5).forEach(f => themes.push(`  - ${f.fact_id}: ${f.text.substring(0, 100)}...`));
  context.insights.slice(0, 3).forEach(n => themes.push(`  - ${n.insight_id}: ${n.text.substring(0, 100)}...`));
  if (themes.length > 0) {
    sections.push(`Key themes:\n${themes.join('\n')}`);
  }

  // Orphan analysis
  const referencedFactIds = new Set(context.insights.flatMap(n => n.related_facts));
  const orphanFacts = context.facts.filter(f => !referencedFactIds.has(f.fact_id));
  const referencedInsightIds = new Set(context.recommendations.flatMap(r => r.related_insights));
  const orphanInsights = context.insights.filter(n => !referencedInsightIds.has(n.insight_id));

  if (orphanFacts.length > 0 || orphanInsights.length > 0) {
    const orphans: string[] = [];
    if (orphanFacts.length > 0) orphans.push(`  - ${orphanFacts.length} fact(s) without downstream insights`);
    if (orphanInsights.length > 0) orphans.push(`  - ${orphanInsights.length} insight(s) without downstream recommendations`);
    sections.push(`Gaps:\n${orphans.join('\n')}`);
  }

  // Referenced items in full detail
  if (referencedItems && referencedItems.length > 0) {
    const details = referencedItems.map(item => `  - ${item.id} (${item.type}): ${item.text}`).join('\n');
    sections.push(`Referenced items (full detail):\n${details}`);
  }

  return sections.join('\n\n');
}

export const CHAT_TOOLS: ChatToolDefinition[] = [
  {
    name: 'add_item',
    description: 'Add a new item to the Discovery pipeline. Always use this tool when the analyst asks to add a fact, insight, recommendation, or output. Propose the item with pre-filled fields for the analyst to confirm.',
    input_schema: {
      type: 'object',
      required: ['entity_type', 'text'],
      properties: {
        entity_type: {
          type: 'string',
          enum: ['fact', 'insight', 'recommendation', 'output'],
          description: 'The type of entity to add',
        },
        text: {
          type: 'string',
          description: 'The content text for the new item',
        },
        related_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs of related upstream items (e.g., input IDs for a fact, fact IDs for an insight)',
        },
        output_type: {
          type: 'string',
          enum: ['report', 'presentation', 'action_plan', 'brief'],
          description: 'Required only when entity_type is output',
        },
      },
    },
  },
  {
    name: 'delete_item',
    description: 'Delete one or more items from the Discovery pipeline. ALWAYS include the exact IDs to delete — read them from the Discovery context above. Use item_id for one item, item_ids for multiple.',
    input_schema: {
      type: 'object',
      required: ['entity_type', 'item_ids'],
      properties: {
        entity_type: {
          type: 'string',
          enum: ['input', 'fact', 'insight', 'recommendation', 'output'],
          description: 'The type of entity to delete',
        },
        item_id: {
          type: 'string',
          description: 'The ID of a single item to delete',
        },
        item_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'The IDs of items to delete. MUST contain the actual IDs from the Discovery context. For "delete all X", list every ID of that type.',
        },
      },
    },
  },
  {
    name: 'edit_item',
    description: 'Edit an existing item in the Discovery pipeline. Always use this tool when the analyst asks to modify an item\'s text. Show a before/after comparison for confirmation.',
    input_schema: {
      type: 'object',
      required: ['entity_type', 'item_id', 'new_text'],
      properties: {
        entity_type: {
          type: 'string',
          enum: ['input', 'fact', 'insight', 'recommendation', 'output'],
          description: 'The type of entity to edit',
        },
        item_id: {
          type: 'string',
          description: 'The ID of the item to edit',
        },
        new_text: {
          type: 'string',
          description: 'The proposed new text for the item',
        },
      },
    },
  },
];
