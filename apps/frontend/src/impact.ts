import { API_URL } from './config';

export type ImpactResult = { ids: string[]; usedFallback: boolean };

export async function checkImpact(
  oldText: string,
  newText: string,
  children: { id: string; text: string }[],
  backendAvailable: boolean,
): Promise<ImpactResult> {
  if (children.length === 0) return { ids: [], usedFallback: false };

  if (backendAvailable) {
    try {
      const response = await fetch(`${API_URL}/check/impact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_text: oldText, new_text: newText, children }),
      });
      if (response.ok) {
        const result = await response.json();
        const ids = (result.impacted || [])
          .filter((r: any) => r.impacted === true)
          .map((r: any) => r.id);
        return { ids, usedFallback: false };
      }
      console.warn(`[impact] Backend returned ${response.status} for /check/impact — falling back to mark-all`);
    } catch (err) {
      console.warn('[impact] /check/impact request failed — falling back to mark-all', err);
    }
  }

  // Fallback: return ALL child IDs (safe default)
  return { ids: children.map(c => c.id), usedFallback: true };
}
