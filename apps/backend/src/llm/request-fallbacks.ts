/**
 * OpenAI-style models disagree on which request parameters they accept, and
 * refuse the ones they do not with a 400 whose message names the parameter.
 * Each fallback below recognises one such refusal and returns the request
 * adjusted to satisfy it, or null when the refusal is not its own. A request is
 * retried until it is accepted or refused for a reason no fallback recognises.
 */

type Body = Record<string, any>;
type Fallback = (message: string, body: Body) => Body | null;

function errorMessage(err: any): string {
  return typeof err?.message === 'string' ? err.message : '';
}

/** Older models want `max_tokens`, newer ones `max_completion_tokens`. */
const swapTokenParameter: Fallback = (message, body) => {
  for (const [from, to] of [['max_tokens', 'max_completion_tokens'], ['max_completion_tokens', 'max_tokens']]) {
    if (message.includes(`Unsupported parameter: '${from}'`) && from in body) {
      const { [from]: value, ...rest } = body;
      return { ...rest, [to]: value };
    }
  }
  return null;
};

/** Reasoning models accept only their default temperature. */
const dropTemperature: Fallback = (message, body) => {
  const refused = message.includes("'temperature' does not support")
    || message.includes("Unsupported parameter: 'temperature'");
  if (!refused || !('temperature' in body)) return null;
  const { temperature, ...rest } = body;
  return rest;
};

/**
 * Some reasoning models refuse function tools on /chat/completions unless
 * reasoning is turned off: "Function tools with reasoning_effort are not
 * supported ... set reasoning_effort to 'none'". The chat needs its tools more
 * than it needs reasoning.
 */
const disableReasoningForTools: Fallback = (message, body) => {
  const refused = message.includes('Function tools with reasoning_effort are not supported');
  if (!refused || !body.tools || body.reasoning_effort === 'none') return null;
  return { ...body, reasoning_effort: 'none' };
};

const FALLBACKS: Fallback[] = [swapTokenParameter, dropTemperature, disableReasoningForTools];

/** A bound on retries, so two fallbacks that undo each other cannot loop. */
const MAX_ATTEMPTS = 1 + FALLBACKS.length * 2;

export async function sendWithFallbacks<T>(body: Body, send: (body: Body) => Promise<T>): Promise<T> {
  let current = body;
  for (let attempt = 1; ; attempt++) {
    try {
      return await send(current);
    } catch (err: any) {
      const message = errorMessage(err);
      const adjusted = attempt < MAX_ATTEMPTS
        ? FALLBACKS.map((fallback) => fallback(message, current)).find((b): b is Body => b !== null)
        : undefined;
      if (!adjusted) throw err;
      current = adjusted;
    }
  }
}
