import { SearchProvider, SearchResult } from './provider';

export class BraveSearchProvider implements SearchProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(query: string, count: number): Promise<SearchResult[]> {
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(Math.min(count, 20)));

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': this.apiKey,
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`Brave Search API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const results: SearchResult[] = [];

    if (data.web?.results) {
      for (const item of data.web.results) {
        if (item.url && item.title) {
          results.push({
            title: item.title,
            url: item.url,
            snippet: item.description || '',
          });
        }
      }
    }

    return results;
  }
}
