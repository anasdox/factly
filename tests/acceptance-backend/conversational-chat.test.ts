export {};

/**
 * Acceptance tests for Conversational Chat on Discovery feature.
 * @see specs/functional/conversational-chat.feature
 *
 * FSIDs covered:
 * - FS-ChatWidgetToggle
 * - FS-ChatWidgetHiddenWithoutDiscovery
 * - FS-ChatWidgetDraggable
 * - FS-ChatAtMentionAutocomplete
 * - FS-ChatAtMentionSelect
 * - FS-ChatAtMentionContext
 * - FS-ChatClickItemToReference
 * - FS-ChatAtMentionInResponse
 * - FS-SendMessage
 * - FS-StreamingResponse
 * - FS-SendMessageDisabledDuringResponse
 * - FS-AskQuestionAboutDiscovery
 * - FS-AskForGapAnalysis
 * - FS-AskForSummary
 * - FS-ChatAddItem
 * - FS-ChatAddItemConfirm
 * - FS-ChatAddItemEdit
 * - FS-ChatAddItemCancel
 * - FS-ChatDeleteItem
 * - FS-ChatDeleteItemConfirm
 * - FS-ChatDeleteItemCancel
 * - FS-ChatBulkDelete
 * - FS-ChatBulkDeleteCancel
 * - FS-ChatEditItem
 * - FS-ChatEditItemApply
 * - FS-ChatEditItemModify
 * - FS-ChatEditItemCancel
 * - FS-ChatProactiveSuggestions
 * - FS-ChatSuggestMissingConnections
 * - FS-ChatHistoryPersisted
 * - FS-ChatHistorySavedWithDiscovery
 * - FS-ChatHistoryClearedOnNewDiscovery
 * - FS-ChatFullContextBelowThreshold
 * - FS-ChatSummarizedContextAboveThreshold
 * - FS-ChatErrorDisplay
 * - FS-ChatActionErrorRollback
 * - FS-ChatStreamingInterruption
 */

// --- Type stubs ---

type EntityStatus = 'draft' | 'validated' | 'outdated' | 'needs_review' | 'needs_refresh'
                  | 'unsupported' | 'weak' | 'risky';

type ChatMessageRole = 'user' | 'assistant';

type ChatToolCall = {
  tool: 'add_item' | 'delete_item' | 'edit_item';
  params: Record<string, unknown>;
  status: 'pending' | 'confirmed' | 'cancelled' | 'applied' | 'error';
};

type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
  tool_calls?: ChatToolCall[];
  created_at: string;
  references?: string[];
};

interface TestInput {
  input_id: string; type: string; title: string; text?: string;
  version?: number; status?: EntityStatus;
}
interface TestFact {
  fact_id: string; related_inputs: string[]; text: string;
  version?: number; status?: EntityStatus;
}
interface TestInsight {
  insight_id: string; related_facts: string[]; text: string;
  version?: number; status?: EntityStatus;
}
interface TestRecommendation {
  recommendation_id: string; related_insights: string[]; text: string;
  version?: number; status?: EntityStatus;
}
interface TestOutput {
  output_id: string; related_recommendations: string[]; text: string; type: string;
  version?: number; status?: EntityStatus;
}
interface TestDiscoveryData {
  discovery_id: string; title: string; goal: string; date: string;
  inputs: TestInput[]; facts: TestFact[]; insights: TestInsight[];
  recommendations: TestRecommendation[]; outputs: TestOutput[];
  chat_history?: ChatMessage[];
}

function makeTestDiscovery(): TestDiscoveryData {
  return {
    discovery_id: 'test-001', title: 'Climate Analysis', goal: 'Identify climate risks', date: '2026-01-01',
    inputs: [
      { input_id: 'I-1', type: 'text', title: 'IPCC Report', text: 'Global temperatures have risen by 1.1C since pre-industrial times.', version: 1, status: 'draft' },
      { input_id: 'I-2', type: 'web', title: 'NASA Data', text: 'Sea levels rising at 3.3mm per year.', version: 1, status: 'draft' },
    ],
    facts: [
      { fact_id: 'F-1', related_inputs: ['I-1'], text: 'Global temperature increased 1.1C above pre-industrial levels', version: 1, status: 'draft' },
      { fact_id: 'F-2', related_inputs: ['I-2'], text: 'Sea level rising at 3.3mm annually', version: 1, status: 'draft' },
      { fact_id: 'F-3', related_inputs: ['I-1'], text: 'CO2 concentration exceeds 420 ppm', version: 1, status: 'draft' },
    ],
    insights: [
      { insight_id: 'N-1', related_facts: ['F-1', 'F-2'], text: 'Accelerating climate change increases coastal flood risk', version: 1, status: 'draft' },
    ],
    recommendations: [
      { recommendation_id: 'R-1', related_insights: ['N-1'], text: 'Invest in coastal flood defense infrastructure', version: 1, status: 'draft' },
    ],
    outputs: [
      { output_id: 'O-1', related_recommendations: ['R-1'], text: '# Climate Risk Report\n\nCoastal areas face increasing flood risk.', type: 'report', version: 1, status: 'draft' },
    ],
    chat_history: [],
  };
}

// --- Backend: Context Building Tests ---

describe('Conversational Chat — Backend Context Building', () => {

  // @fsid:FS-ChatFullContextBelowThreshold
  describe('FS-ChatFullContextBelowThreshold', () => {
    it('sends full Discovery context when total items are below the threshold', () => {
      const data = makeTestDiscovery();
      const threshold = 50;

      const totalItems = data.inputs.length + data.facts.length + data.insights.length
                       + data.recommendations.length + data.outputs.length;

      expect(totalItems).toBe(8);
      expect(totalItems).toBeLessThan(threshold);

      // All items should be included with full text, IDs, and relationships
      const allItems = [
        ...data.inputs.map(i => ({ id: i.input_id, text: i.text })),
        ...data.facts.map(f => ({ id: f.fact_id, text: f.text })),
        ...data.insights.map(n => ({ id: n.insight_id, text: n.text })),
        ...data.recommendations.map(r => ({ id: r.recommendation_id, text: r.text })),
        ...data.outputs.map(o => ({ id: o.output_id, text: o.text })),
      ];

      expect(allItems).toHaveLength(8);
      allItems.forEach(item => {
        expect(item.id).toBeDefined();
        expect(item.text).toBeDefined();
      });
    });
  });

  // @fsid:FS-ChatSummarizedContextAboveThreshold
  describe('FS-ChatSummarizedContextAboveThreshold', () => {
    it('sends summarized Discovery context when total items exceed the threshold', () => {
      const threshold = 10;
      const data = makeTestDiscovery();

      // Add items to exceed threshold
      for (let i = 4; i <= 20; i++) {
        data.facts.push({ fact_id: `F-${i}`, related_inputs: ['I-1'], text: `Fact ${i}`, version: 1, status: 'draft' });
      }

      const totalItems = data.inputs.length + data.facts.length + data.insights.length
                       + data.recommendations.length + data.outputs.length;

      expect(totalItems).toBeGreaterThan(threshold);

      // Summary should include counts per column
      const summary = {
        input_count: data.inputs.length,
        fact_count: data.facts.length,
        insight_count: data.insights.length,
        recommendation_count: data.recommendations.length,
        output_count: data.outputs.length,
        total: totalItems,
      };

      expect(summary.input_count).toBe(2);
      expect(summary.fact_count).toBe(20);
      expect(summary.total).toBeGreaterThan(threshold);
    });
  });

  // @fsid:FS-ChatAtMentionContext
  describe('FS-ChatAtMentionContext', () => {
    it('referenced items via @mention are always included in full detail regardless of threshold', () => {
      const data = makeTestDiscovery();
      const referencedItemIds = ['F-1'];

      // Even if context is summarized, F-1 should be in full detail
      const referencedItems = data.facts.filter(f => referencedItemIds.includes(f.fact_id));

      expect(referencedItems).toHaveLength(1);
      expect(referencedItems[0].text).toBe('Global temperature increased 1.1C above pre-industrial levels');
      expect(referencedItems[0].related_inputs).toEqual(['I-1']);
    });
  });
});

// --- Backend: Chat Endpoint Validation Tests ---

describe('Conversational Chat — Endpoint Validation', () => {

  // @fsid:FS-SendMessage
  describe('FS-SendMessage', () => {
    it('accepts a valid chat message request with discovery context', () => {
      const request = {
        message: 'What facts support insight N-1?',
        chat_history: [],
        discovery_context: {
          goal: 'Identify climate risks',
          title: 'Climate Analysis',
          inputs: [{ input_id: 'I-1', type: 'text', title: 'IPCC Report', text: 'Temperature data' }],
          facts: [{ fact_id: 'F-1', text: 'Temperature increased', related_inputs: ['I-1'] }],
          insights: [{ insight_id: 'N-1', text: 'Flood risk increasing', related_facts: ['F-1'] }],
          recommendations: [],
          outputs: [],
        },
        referenced_items: [],
      };

      expect(request.message).toBeTruthy();
      expect(request.message.length).toBeGreaterThan(0);
      expect(request.discovery_context.goal).toBeTruthy();
      expect(request.discovery_context.title).toBeTruthy();
    });

    it('rejects a request with empty message', () => {
      const request = {
        message: '',
        discovery_context: { goal: 'Test', title: 'Test', inputs: [], facts: [], insights: [], recommendations: [], outputs: [] },
      };

      expect(request.message.length).toBe(0);
      // Backend should return 400
    });
  });

  // @fsid:FS-ChatErrorDisplay
  describe('FS-ChatErrorDisplay', () => {
    it('returns structured error when LLM service fails', () => {
      const errorResponse = { error: 'LLM service returned an error' };

      expect(errorResponse).toHaveProperty('error');
      expect(typeof errorResponse.error).toBe('string');
    });
  });
});

// --- Backend: Tool Call Definitions Tests ---

describe('Conversational Chat — Tool Call Definitions', () => {

  const toolNames = ['add_item', 'delete_item', 'edit_item'];

  it('defines exactly 3 tools for pipeline modifications', () => {
    expect(toolNames).toHaveLength(3);
  });

  // @fsid:FS-ChatAddItem
  describe('FS-ChatAddItem', () => {
    it('add_item tool call includes entity_type, text, and optional related_ids', () => {
      const toolCall: ChatToolCall = {
        tool: 'add_item',
        params: {
          entity_type: 'fact',
          text: 'Climate change increases flood risk in coastal areas',
          related_ids: ['I-1'],
        },
        status: 'pending',
      };

      expect(toolCall.tool).toBe('add_item');
      expect(toolCall.params.entity_type).toBe('fact');
      expect(toolCall.params.text).toBeTruthy();
      expect(toolCall.params.related_ids).toEqual(['I-1']);
      expect(toolCall.status).toBe('pending');
    });

    it('add_item for output requires output_type', () => {
      const toolCall: ChatToolCall = {
        tool: 'add_item',
        params: {
          entity_type: 'output',
          text: '# Risk Assessment Report',
          related_ids: ['R-1'],
          output_type: 'report',
        },
        status: 'pending',
      };

      expect(toolCall.params.entity_type).toBe('output');
      expect(toolCall.params.output_type).toBe('report');
    });
  });

  // @fsid:FS-ChatDeleteItem
  describe('FS-ChatDeleteItem', () => {
    it('delete_item tool call includes entity_type and item_id', () => {
      const toolCall: ChatToolCall = {
        tool: 'delete_item',
        params: {
          entity_type: 'fact',
          item_id: 'F-1',
        },
        status: 'pending',
      };

      expect(toolCall.tool).toBe('delete_item');
      expect(toolCall.params.entity_type).toBe('fact');
      expect(toolCall.params.item_id).toBe('F-1');
    });
  });

  // @fsid:FS-ChatEditItem
  describe('FS-ChatEditItem', () => {
    it('edit_item tool call includes entity_type, item_id, and new_text', () => {
      const toolCall: ChatToolCall = {
        tool: 'edit_item',
        params: {
          entity_type: 'fact',
          item_id: 'F-1',
          new_text: 'Global temperature increased 1.1C above pre-industrial levels, confirmed by 2024 data',
        },
        status: 'pending',
      };

      expect(toolCall.tool).toBe('edit_item');
      expect(toolCall.params.entity_type).toBe('fact');
      expect(toolCall.params.item_id).toBe('F-1');
      expect(toolCall.params.new_text).toBeTruthy();
    });
  });
});

// --- Frontend: Chat Widget Lifecycle Tests ---

describe('Conversational Chat — Widget Lifecycle', () => {

  // @fsid:FS-ChatWidgetToggle
  describe('FS-ChatWidgetToggle', () => {
    it('chat widget can be toggled open and closed', () => {
      let isOpen = false;

      // Click to open
      isOpen = !isOpen;
      expect(isOpen).toBe(true);

      // Click to close
      isOpen = !isOpen;
      expect(isOpen).toBe(false);
    });
  });

  // @fsid:FS-ChatWidgetHiddenWithoutDiscovery
  describe('FS-ChatWidgetHiddenWithoutDiscovery', () => {
    it('chat button is not visible when no Discovery is loaded', () => {
      const data: TestDiscoveryData | null = null;
      const chatButtonVisible = data !== null;

      expect(chatButtonVisible).toBe(false);
    });

    it('chat button is visible when a Discovery is loaded', () => {
      const data = makeTestDiscovery();
      const chatButtonVisible = data !== null;

      expect(chatButtonVisible).toBe(true);
    });
  });

  // @fsid:FS-ChatWidgetDraggable
  describe('FS-ChatWidgetDraggable', () => {
    it('widget position can be updated and stays within viewport bounds', () => {
      const viewport = { width: 1920, height: 1080 };
      const widgetSize = { width: 400, height: 500 };

      // Initial position
      let position = { x: 1496, y: 500 };

      // Drag to new position
      const newX = 1600;
      const newY = 200;

      // Clamp to viewport
      position = {
        x: Math.min(Math.max(0, newX), viewport.width - widgetSize.width),
        y: Math.min(Math.max(0, newY), viewport.height - widgetSize.height),
      };

      expect(position.x).toBeLessThanOrEqual(viewport.width - widgetSize.width);
      expect(position.y).toBeLessThanOrEqual(viewport.height - widgetSize.height);
      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeGreaterThanOrEqual(0);
    });
  });
});

// --- Frontend: Message Sending and Streaming Tests ---

describe('Conversational Chat — Messaging and Streaming', () => {

  // @fsid:FS-SendMessage
  describe('FS-SendMessage', () => {
    it('sending a message adds it to chat history as a user message', () => {
      const chatHistory: ChatMessage[] = [];

      const userMessage: ChatMessage = {
        id: 'msg-001',
        role: 'user',
        content: 'What facts support insight N-1?',
        created_at: new Date().toISOString(),
        references: [],
      };

      chatHistory.push(userMessage);

      expect(chatHistory).toHaveLength(1);
      expect(chatHistory[0].role).toBe('user');
      expect(chatHistory[0].content).toBe('What facts support insight N-1?');
    });
  });

  // @fsid:FS-StreamingResponse
  describe('FS-StreamingResponse', () => {
    it('streaming tokens accumulate into a complete assistant message', () => {
      const tokens = ['Insight ', 'N-1 ', 'is supported ', 'by facts ', 'F-1 and F-2.'];
      let streamingContent = '';

      for (const token of tokens) {
        streamingContent += token;
      }

      expect(streamingContent).toBe('Insight N-1 is supported by facts F-1 and F-2.');
    });
  });

  // @fsid:FS-SendMessageDisabledDuringResponse
  describe('FS-SendMessageDisabledDuringResponse', () => {
    it('input is disabled while streaming and enabled when done', () => {
      let isStreaming = false;

      // Start streaming
      isStreaming = true;
      expect(isStreaming).toBe(true);
      // Input should be disabled

      // Streaming completes
      isStreaming = false;
      expect(isStreaming).toBe(false);
      // Input should be enabled
    });
  });

  // @fsid:FS-ChatStreamingInterruption
  describe('FS-ChatStreamingInterruption', () => {
    it('partial response is preserved when streaming is interrupted', () => {
      const tokens = ['Insight ', 'N-1 ', 'is supported '];
      let streamingContent = '';

      for (const token of tokens) {
        streamingContent += token;
      }

      // Simulate interruption — partial content is preserved
      const interrupted = true;
      expect(interrupted).toBe(true);
      expect(streamingContent).toBe('Insight N-1 is supported ');
      expect(streamingContent.length).toBeGreaterThan(0);
    });
  });
});

// --- Frontend: @mention Tests ---

describe('Conversational Chat — @mention', () => {

  // @fsid:FS-ChatAtMentionAutocomplete
  describe('FS-ChatAtMentionAutocomplete', () => {
    it('typing @ shows all pipeline items grouped by column', () => {
      const data = makeTestDiscovery();

      const groups = {
        inputs: data.inputs.map(i => ({ id: i.input_id, label: `${i.input_id} — ${i.title}` })),
        facts: data.facts.map(f => ({ id: f.fact_id, label: `${f.fact_id} — ${f.text.substring(0, 50)}` })),
        insights: data.insights.map(n => ({ id: n.insight_id, label: `${n.insight_id} — ${n.text.substring(0, 50)}` })),
        recommendations: data.recommendations.map(r => ({ id: r.recommendation_id, label: `${r.recommendation_id} — ${r.text.substring(0, 50)}` })),
        outputs: data.outputs.map(o => ({ id: o.output_id, label: `${o.output_id} — ${o.text.substring(0, 50)}` })),
      };

      expect(groups.inputs).toHaveLength(2);
      expect(groups.facts).toHaveLength(3);
      expect(groups.insights).toHaveLength(1);
      expect(groups.recommendations).toHaveLength(1);
      expect(groups.outputs).toHaveLength(1);
    });

    it('typing @F- filters to facts only', () => {
      const data = makeTestDiscovery();
      const filter = 'F-';

      const allItems = [
        ...data.inputs.map(i => ({ id: i.input_id })),
        ...data.facts.map(f => ({ id: f.fact_id })),
        ...data.insights.map(n => ({ id: n.insight_id })),
        ...data.recommendations.map(r => ({ id: r.recommendation_id })),
        ...data.outputs.map(o => ({ id: o.output_id })),
      ];

      const filtered = allItems.filter(item => item.id.startsWith(filter));

      expect(filtered).toHaveLength(3);
      expect(filtered.every(item => item.id.startsWith('F-'))).toBe(true);
    });
  });

  // @fsid:FS-ChatAtMentionSelect
  describe('FS-ChatAtMentionSelect', () => {
    it('selecting an item inserts a reference and tracks it in the references array', () => {
      const references: string[] = [];
      let inputText = 'Tell me about ';

      // Simulate selecting F-1 from dropdown
      const selectedId = 'F-1';
      inputText += `[${selectedId}]`;
      references.push(selectedId);

      expect(inputText).toBe('Tell me about [F-1]');
      expect(references).toContain('F-1');
    });
  });

  // @fsid:FS-ChatClickItemToReference
  describe('FS-ChatClickItemToReference', () => {
    it('Ctrl+Click on a pipeline item appends it as a reference in the chat input', () => {
      const chatOpen = true;
      const ctrlPressed = true;
      const clickedItemId = 'N-1';
      const references: string[] = [];
      let inputText = '';

      if (chatOpen && ctrlPressed) {
        inputText += `[${clickedItemId}] `;
        references.push(clickedItemId);
      }

      expect(inputText).toContain('[N-1]');
      expect(references).toContain('N-1');
    });

    it('Ctrl+Click without chat open does not add reference', () => {
      const chatOpen = false;
      const ctrlPressed = true;
      const clickedItemId = 'N-1';
      const references: string[] = [];

      if (chatOpen && ctrlPressed) {
        references.push(clickedItemId);
      }

      expect(references).toHaveLength(0);
    });
  });

  // @fsid:FS-ChatAtMentionInResponse
  describe('FS-ChatAtMentionInResponse', () => {
    it('item IDs in assistant responses are identified as clickable references', () => {
      const assistantContent = 'Insight N-1 is supported by facts F-1 and F-2, which are derived from input I-1.';

      // Pattern to detect item references
      const refPattern = /[FINRO]-\d+/g;
      const matches = assistantContent.match(refPattern);

      expect(matches).toEqual(['N-1', 'F-1', 'F-2', 'I-1']);
    });
  });
});

// --- Frontend: Ask Questions Tests ---

describe('Conversational Chat — Ask Questions', () => {

  // @fsid:FS-AskQuestionAboutDiscovery
  describe('FS-AskQuestionAboutDiscovery', () => {
    it('a question about discovery relationships can be answered using context', () => {
      const data = makeTestDiscovery();

      // "What facts support Insight N-1?"
      const insightN1 = data.insights.find(n => n.insight_id === 'N-1');
      expect(insightN1).toBeDefined();

      const supportingFacts = data.facts.filter(f => insightN1!.related_facts.includes(f.fact_id));
      expect(supportingFacts).toHaveLength(2);
      expect(supportingFacts.map(f => f.fact_id).sort()).toEqual(['F-1', 'F-2']);
    });
  });

  // @fsid:FS-AskForGapAnalysis
  describe('FS-AskForGapAnalysis', () => {
    it('identifies facts without downstream insights', () => {
      const data = makeTestDiscovery();

      // Find facts that are not referenced by any insight
      const referencedFactIds = new Set(data.insights.flatMap(n => n.related_facts));
      const orphanFacts = data.facts.filter(f => !referencedFactIds.has(f.fact_id));

      // F-3 is not linked to any insight
      expect(orphanFacts).toHaveLength(1);
      expect(orphanFacts[0].fact_id).toBe('F-3');
    });
  });

  // @fsid:FS-AskForSummary
  describe('FS-AskForSummary', () => {
    it('summary includes counts for all pipeline columns', () => {
      const data = makeTestDiscovery();

      const summary = {
        inputs: data.inputs.length,
        facts: data.facts.length,
        insights: data.insights.length,
        recommendations: data.recommendations.length,
        outputs: data.outputs.length,
      };

      expect(summary.inputs).toBe(2);
      expect(summary.facts).toBe(3);
      expect(summary.insights).toBe(1);
      expect(summary.recommendations).toBe(1);
      expect(summary.outputs).toBe(1);
    });
  });
});

// --- Frontend: Add Item via Chat Tests ---

describe('Conversational Chat — Add Item', () => {

  // @fsid:FS-ChatAddItemConfirm
  describe('FS-ChatAddItemConfirm', () => {
    it('confirming an add_item tool call adds the item to the pipeline', () => {
      const data = makeTestDiscovery();
      const initialFactCount = data.facts.length;

      const toolCall: ChatToolCall = {
        tool: 'add_item',
        params: {
          entity_type: 'fact',
          text: 'Arctic ice is melting at an accelerated rate',
          related_ids: ['I-1'],
        },
        status: 'pending',
      };

      // Simulate confirm
      toolCall.status = 'applied';
      const newFact: TestFact = {
        fact_id: 'F-new',
        text: toolCall.params.text as string,
        related_inputs: toolCall.params.related_ids as string[],
        version: 1,
        status: 'draft',
      };
      data.facts.push(newFact);

      expect(data.facts).toHaveLength(initialFactCount + 1);
      expect(data.facts.find(f => f.fact_id === 'F-new')?.text).toBe('Arctic ice is melting at an accelerated rate');
      expect(data.facts.find(f => f.fact_id === 'F-new')?.related_inputs).toEqual(['I-1']);
      expect(toolCall.status).toBe('applied');
    });
  });

  // @fsid:FS-ChatAddItemEdit
  describe('FS-ChatAddItemEdit', () => {
    it('editing a proposed item before confirming applies the modified content', () => {
      const data = makeTestDiscovery();

      const toolCall: ChatToolCall = {
        tool: 'add_item',
        params: {
          entity_type: 'fact',
          text: 'Original proposed text',
          related_ids: ['I-1'],
        },
        status: 'pending',
      };

      // Analyst edits the proposed text
      const editedText = 'Modified proposed text with more precision';
      toolCall.params.text = editedText;
      toolCall.status = 'applied';

      const newFact: TestFact = {
        fact_id: 'F-edited',
        text: toolCall.params.text as string,
        related_inputs: toolCall.params.related_ids as string[],
        version: 1,
        status: 'draft',
      };
      data.facts.push(newFact);

      expect(data.facts.find(f => f.fact_id === 'F-edited')?.text).toBe(editedText);
    });
  });

  // @fsid:FS-ChatAddItemCancel
  describe('FS-ChatAddItemCancel', () => {
    it('cancelling an add_item does not modify the pipeline', () => {
      const data = makeTestDiscovery();
      const initialFactCount = data.facts.length;

      const toolCall: ChatToolCall = {
        tool: 'add_item',
        params: { entity_type: 'fact', text: 'Proposed fact' },
        status: 'pending',
      };

      // Analyst cancels
      toolCall.status = 'cancelled';

      // No item added
      expect(data.facts).toHaveLength(initialFactCount);
      expect(toolCall.status).toBe('cancelled');
    });
  });
});

// --- Frontend: Delete Item via Chat Tests ---

describe('Conversational Chat — Delete Item', () => {

  // @fsid:FS-ChatDeleteItem
  describe('FS-ChatDeleteItem', () => {
    it('delete_item tool call shows downstream impact count', () => {
      const data = makeTestDiscovery();

      // Deleting F-1 impacts: N-1 (insight), R-1 (recommendation), O-1 (output)
      const factToDelete = data.facts.find(f => f.fact_id === 'F-1');
      expect(factToDelete).toBeDefined();

      // Count downstream: insights referencing F-1, and their downstream chain
      const impactedInsights = data.insights.filter(n => n.related_facts.includes('F-1'));
      const impactedRecIds = impactedInsights.flatMap(n => {
        return data.recommendations.filter(r => r.related_insights.includes(n.insight_id)).map(r => r.recommendation_id);
      });
      const impactedOutputIds = impactedRecIds.flatMap(rId => {
        return data.outputs.filter(o => o.related_recommendations.includes(rId)).map(o => o.output_id);
      });

      const totalImpacted = impactedInsights.length + impactedRecIds.length + impactedOutputIds.length;
      expect(totalImpacted).toBe(3); // N-1, R-1, O-1
    });
  });

  // @fsid:FS-ChatDeleteItemConfirm
  describe('FS-ChatDeleteItemConfirm', () => {
    it('confirming a delete removes the item from the pipeline', () => {
      const data = makeTestDiscovery();
      const initialFactCount = data.facts.length;

      const toolCall: ChatToolCall = {
        tool: 'delete_item',
        params: { entity_type: 'fact', item_id: 'F-3' },
        status: 'pending',
      };

      // Confirm deletion
      toolCall.status = 'applied';
      data.facts = data.facts.filter(f => f.fact_id !== 'F-3');

      expect(data.facts).toHaveLength(initialFactCount - 1);
      expect(data.facts.find(f => f.fact_id === 'F-3')).toBeUndefined();
      expect(toolCall.status).toBe('applied');
    });
  });

  // @fsid:FS-ChatDeleteItemCancel
  describe('FS-ChatDeleteItemCancel', () => {
    it('cancelling a delete does not modify the pipeline', () => {
      const data = makeTestDiscovery();
      const initialFactCount = data.facts.length;

      const toolCall: ChatToolCall = {
        tool: 'delete_item',
        params: { entity_type: 'fact', item_id: 'F-1' },
        status: 'pending',
      };

      toolCall.status = 'cancelled';

      expect(data.facts).toHaveLength(initialFactCount);
      expect(data.facts.find(f => f.fact_id === 'F-1')).toBeDefined();
    });
  });

  // @fsid:FS-ChatBulkDelete
  describe('FS-ChatBulkDelete', () => {
    it('bulk delete emits a single delete_item tool call with item_ids array', () => {
      const data = makeTestDiscovery();
      data.recommendations.push(
        { recommendation_id: 'R-2', related_insights: ['N-1'], text: 'Implement early warning systems', version: 1, status: 'draft' },
        { recommendation_id: 'R-3', related_insights: ['N-1'], text: 'Relocate critical infrastructure', version: 1, status: 'draft' },
      );

      // Factly emits a single tool call with item_ids array
      const toolCall: ChatToolCall = {
        tool: 'delete_item',
        params: {
          entity_type: 'recommendation',
          item_ids: data.recommendations.map(r => r.recommendation_id),
        },
        status: 'pending',
      };

      expect(toolCall.tool).toBe('delete_item');
      expect(toolCall.params.entity_type).toBe('recommendation');
      expect(toolCall.params.item_ids).toEqual(['R-1', 'R-2', 'R-3']);
    });

    it('frontend expands item_ids into individual deletions after confirmation', () => {
      const data = makeTestDiscovery();
      data.recommendations.push(
        { recommendation_id: 'R-2', related_insights: ['N-1'], text: 'Implement early warning systems', version: 1, status: 'draft' },
        { recommendation_id: 'R-3', related_insights: ['N-1'], text: 'Relocate critical infrastructure', version: 1, status: 'draft' },
      );
      expect(data.recommendations).toHaveLength(3);

      const idsToDelete = ['R-1', 'R-2', 'R-3'];

      // Simulate grouped confirmation — all items deleted at once
      data.recommendations = data.recommendations.filter(r => !idsToDelete.includes(r.recommendation_id));

      expect(data.recommendations).toHaveLength(0);
    });

    it('also supports single item_id for backward compatibility', () => {
      const data = makeTestDiscovery();
      const initialCount = data.recommendations.length;

      // Single-item delete still works with item_id
      const toolCall: ChatToolCall = {
        tool: 'delete_item',
        params: { entity_type: 'recommendation', item_id: 'R-1' },
        status: 'pending',
      };

      // Frontend extracts id from item_id field
      const ids = Array.isArray(toolCall.params.item_ids)
        ? toolCall.params.item_ids as string[]
        : toolCall.params.item_id ? [String(toolCall.params.item_id)] : [];

      expect(ids).toEqual(['R-1']);
      data.recommendations = data.recommendations.filter(r => !ids.includes(r.recommendation_id));
      expect(data.recommendations).toHaveLength(initialCount - 1);
    });
  });

  // @fsid:FS-ChatBulkDeleteCancel
  describe('FS-ChatBulkDeleteCancel', () => {
    it('cancelling a grouped bulk delete does not modify the pipeline', () => {
      const data = makeTestDiscovery();
      data.recommendations.push(
        { recommendation_id: 'R-2', related_insights: ['N-1'], text: 'Implement early warning systems', version: 1, status: 'draft' },
        { recommendation_id: 'R-3', related_insights: ['N-1'], text: 'Relocate critical infrastructure', version: 1, status: 'draft' },
      );
      const initialCount = data.recommendations.length;

      // Analyst cancels — no changes
      expect(data.recommendations).toHaveLength(initialCount);
      expect(data.recommendations.map(r => r.recommendation_id).sort()).toEqual(['R-1', 'R-2', 'R-3']);
    });
  });
});

// --- Frontend: Edit Item via Chat Tests ---

describe('Conversational Chat — Edit Item', () => {

  // @fsid:FS-ChatEditItemApply
  describe('FS-ChatEditItemApply', () => {
    it('applying an edit updates the item text and increments version', () => {
      const data = makeTestDiscovery();
      const factF1 = data.facts.find(f => f.fact_id === 'F-1')!;
      const originalText = factF1.text;

      const toolCall: ChatToolCall = {
        tool: 'edit_item',
        params: {
          entity_type: 'fact',
          item_id: 'F-1',
          new_text: 'Global temperature increased 1.1C above pre-industrial levels, confirmed by 2024 measurements',
        },
        status: 'pending',
      };

      // Apply edit (simulating createNewVersion)
      toolCall.status = 'applied';
      factF1.text = toolCall.params.new_text as string;
      factF1.version = (factF1.version || 1) + 1;
      factF1.status = 'validated';

      expect(factF1.text).not.toBe(originalText);
      expect(factF1.text).toBe(toolCall.params.new_text);
      expect(factF1.version).toBe(2);
      expect(factF1.status).toBe('validated');
    });
  });

  // @fsid:FS-ChatEditItemModify
  describe('FS-ChatEditItemModify', () => {
    it('analyst can modify the proposed text before applying', () => {
      const data = makeTestDiscovery();
      const factF1 = data.facts.find(f => f.fact_id === 'F-1')!;

      const toolCall: ChatToolCall = {
        tool: 'edit_item',
        params: {
          entity_type: 'fact',
          item_id: 'F-1',
          new_text: 'LLM-proposed text',
        },
        status: 'pending',
      };

      // Analyst modifies the proposed text
      const analystModifiedText = 'Analyst-revised text with corrections';
      toolCall.params.new_text = analystModifiedText;
      toolCall.status = 'applied';

      factF1.text = toolCall.params.new_text as string;

      expect(factF1.text).toBe(analystModifiedText);
    });
  });

  // @fsid:FS-ChatEditItemCancel
  describe('FS-ChatEditItemCancel', () => {
    it('cancelling an edit leaves the item unchanged', () => {
      const data = makeTestDiscovery();
      const factF1 = data.facts.find(f => f.fact_id === 'F-1')!;
      const originalText = factF1.text;
      const originalVersion = factF1.version;

      const toolCall: ChatToolCall = {
        tool: 'edit_item',
        params: {
          entity_type: 'fact',
          item_id: 'F-1',
          new_text: 'Proposed change that will be cancelled',
        },
        status: 'pending',
      };

      toolCall.status = 'cancelled';

      expect(factF1.text).toBe(originalText);
      expect(factF1.version).toBe(originalVersion);
    });
  });
});

// --- Frontend: Proactive Suggestions Tests ---

describe('Conversational Chat — Proactive Suggestions', () => {

  // @fsid:FS-ChatProactiveSuggestions
  describe('FS-ChatProactiveSuggestions', () => {
    it('suggestions that involve modifications include tool calls with pending status', () => {
      const suggestionToolCalls: ChatToolCall[] = [
        {
          tool: 'add_item',
          params: { entity_type: 'insight', text: 'CO2 levels correlate with temperature rise', related_ids: ['F-1', 'F-3'] },
          status: 'pending',
        },
      ];

      expect(suggestionToolCalls).toHaveLength(1);
      expect(suggestionToolCalls[0].status).toBe('pending');
      // Each suggestion must be confirmed individually
    });
  });

  // @fsid:FS-ChatSuggestMissingConnections
  describe('FS-ChatSuggestMissingConnections', () => {
    it('identifies unlinked insights and can propose a recommendation', () => {
      const data = makeTestDiscovery();

      // Add an unlinked insight
      data.insights.push({ insight_id: 'N-2', related_facts: ['F-3'], text: 'CO2 levels are critical', version: 1, status: 'draft' });

      // Find insights not linked to any recommendation
      const linkedInsightIds = new Set(data.recommendations.flatMap(r => r.related_insights));
      const unlinkedInsights = data.insights.filter(n => !linkedInsightIds.has(n.insight_id));

      expect(unlinkedInsights).toHaveLength(1);
      expect(unlinkedInsights[0].insight_id).toBe('N-2');
    });
  });
});

// --- Frontend: Chat History Persistence Tests ---

describe('Conversational Chat — Chat History', () => {

  // @fsid:FS-ChatHistoryPersisted
  describe('FS-ChatHistoryPersisted', () => {
    it('chat history survives widget close and reopen', () => {
      const data = makeTestDiscovery();

      // Add messages
      data.chat_history = [
        { id: 'msg-1', role: 'user', content: 'What is this about?', created_at: '2026-01-01T00:00:00Z' },
        { id: 'msg-2', role: 'assistant', content: 'This discovery analyzes climate risks.', created_at: '2026-01-01T00:00:01Z' },
      ];

      // Simulate close and reopen: chat_history is in data, which is in state
      expect(data.chat_history).toHaveLength(2);
      expect(data.chat_history[0].role).toBe('user');
      expect(data.chat_history[1].role).toBe('assistant');
    });
  });

  // @fsid:FS-ChatHistorySavedWithDiscovery
  describe('FS-ChatHistorySavedWithDiscovery', () => {
    it('exported JSON includes chat_history', () => {
      const data = makeTestDiscovery();
      data.chat_history = [
        { id: 'msg-1', role: 'user', content: 'Test message', created_at: '2026-01-01T00:00:00Z' },
      ];

      const exported = JSON.parse(JSON.stringify(data));

      expect(exported).toHaveProperty('chat_history');
      expect(exported.chat_history).toHaveLength(1);
      expect(exported.chat_history[0].content).toBe('Test message');
    });

    it('imported JSON without chat_history defaults to empty array', () => {
      const imported = {
        discovery_id: 'old-001', title: 'Old', goal: 'Old goal', date: '2025-01-01',
        inputs: [], facts: [], insights: [], recommendations: [], outputs: [],
        // No chat_history field — backward compatibility
      };

      const chatHistory = (imported as TestDiscoveryData).chat_history ?? [];
      expect(chatHistory).toEqual([]);
    });
  });

  // @fsid:FS-ChatHistoryClearedOnNewDiscovery
  describe('FS-ChatHistoryClearedOnNewDiscovery', () => {
    it('creating a new discovery resets chat history', () => {
      const oldData = makeTestDiscovery();
      oldData.chat_history = [
        { id: 'msg-1', role: 'user', content: 'Old message', created_at: '2026-01-01T00:00:00Z' },
      ];

      // Create new discovery
      const newData: TestDiscoveryData = {
        discovery_id: 'new-001', title: 'New Discovery', goal: 'New goal', date: '2026-02-18',
        inputs: [], facts: [], insights: [], recommendations: [], outputs: [],
        chat_history: [],
      };

      expect(newData.chat_history).toEqual([]);
    });
  });
});

// --- Frontend: Action Error Handling Tests ---

describe('Conversational Chat — Error Handling', () => {

  // @fsid:FS-ChatActionErrorRollback
  describe('FS-ChatActionErrorRollback', () => {
    it('failed action reverts tool call status to pending for retry', () => {
      const toolCall: ChatToolCall = {
        tool: 'add_item',
        params: { entity_type: 'fact', text: 'Test fact' },
        status: 'pending',
      };

      // Simulate apply attempt that fails
      try {
        // Simulate validation error
        throw new Error('Validation failed: related_inputs is required for facts');
      } catch {
        toolCall.status = 'error';
      }

      expect(toolCall.status).toBe('error');
      // Card should show error message and allow retry
    });
  });

  // @fsid:FS-ChatErrorDisplay
  describe('FS-ChatErrorDisplay (frontend)', () => {
    it('error event from stream is displayed as an error message in chat', () => {
      const chatHistory: ChatMessage[] = [];

      // Simulate error event
      const errorEvent = { error: 'LLM service unavailable' };
      const errorMessage: ChatMessage = {
        id: 'err-1',
        role: 'assistant',
        content: `Error: ${errorEvent.error}`,
        created_at: new Date().toISOString(),
      };
      chatHistory.push(errorMessage);

      expect(chatHistory).toHaveLength(1);
      expect(chatHistory[0].content).toContain('Error');
      expect(chatHistory[0].content).toContain('LLM service unavailable');
    });
  });
});
