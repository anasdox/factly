import { BraveSearchProvider } from './brave-provider';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchProvider {
  search(query: string, count: number): Promise<SearchResult[]>;
}

export function createSearchProvider(): SearchProvider | null {
  const providerName = process.env.SEARCH_PROVIDER;
  const apiKey = process.env.SEARCH_API_KEY;

  if (!providerName || !apiKey) {
    return null;
  }

  if (providerName === 'brave') {
    return new BraveSearchProvider(apiKey);
  }

  return null;
}
