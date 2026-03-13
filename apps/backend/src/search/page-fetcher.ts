import * as cheerio from 'cheerio';

const PAGE_FETCH_TIMEOUT = 10_000;
const MAX_CONTENT_LENGTH = 5_000;

export interface FetchedPage {
  url: string;
  title: string;
  content: string;
}

export async function fetchPageContent(url: string): Promise<FetchedPage | null> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(PAGE_FETCH_TIMEOUT),
      headers: { 'User-Agent': 'Factly/1.0' },
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
    return null;
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  $('script, style, nav, footer, header, noscript, iframe, svg, aside').remove();

  const title = $('title').text().trim() || $('h1').first().text().trim() || url;
  const content = $('body').text().replace(/\s+/g, ' ').trim();

  if (content.length === 0) return null;

  return {
    url,
    title,
    content: content.slice(0, MAX_CONTENT_LENGTH),
  };
}

export async function fetchAllPages(urls: string[]): Promise<{ pages: FetchedPage[]; failures: number }> {
  const results = await Promise.allSettled(urls.map(fetchPageContent));

  const pages: FetchedPage[] = [];
  let failures = 0;

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value !== null) {
      pages.push(result.value);
    } else {
      failures++;
    }
  }

  return { pages, failures };
}
