import * as cheerio from 'cheerio';

const MAX_TEXT_LENGTH = 50_000;

export class WebScraperError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'WebScraperError';
    this.statusCode = statusCode;
  }
}

export async function extractTextFromUrl(url: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { 'User-Agent': 'Factly/1.0' },
    });
  } catch (err: any) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new WebScraperError('URL fetch timed out', 504);
    }
    throw new WebScraperError(`Failed to fetch URL: ${err.message}`, 502);
  }

  if (!response.ok) {
    throw new WebScraperError(
      `URL returned HTTP ${response.status}`,
      response.status >= 400 && response.status < 500 ? 422 : 502,
    );
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
    throw new WebScraperError(
      `Unsupported content type: ${contentType}`,
      422,
    );
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove non-content elements
  $('script, style, nav, footer, header, noscript, iframe, svg').remove();

  const text = $('body').text().replace(/\s+/g, ' ').trim();

  if (text.length === 0) {
    throw new WebScraperError('No text content could be extracted from the page', 422);
  }

  return text.slice(0, MAX_TEXT_LENGTH);
}
