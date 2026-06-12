// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

// Official branded career sites with complete server-rendered job data.
const BOARD_HOSTS = {
  factorial: 'careers.factorialhr.com',
  forto: 'careers.forto.com',
  vinted: 'careers.vinted.com',
};

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(value) {
  return decodeHtml(String(value || '').replace(/<[^>]*>/g, ' '));
}

function trustedJobUrl(value, board) {
  const expectedHost = BOARD_HOSTS[board];
  const pathPrefix = {
    factorial: '/job_posting/',
    forto: '/forto-jobs/',
    vinted: '/jobs/',
  }[board];
  try {
    const parsed = new URL(decodeHtml(value));
    if (parsed.protocol !== 'https:' || parsed.hostname !== expectedHost) return '';
    if (!parsed.pathname.startsWith(pathPrefix)) return '';
    return parsed.href;
  } catch {
    return '';
  }
}

function assertBoardUrl(entry) {
  const board = typeof entry.board_type === 'string' ? entry.board_type : '';
  const expectedHost = BOARD_HOSTS[board];
  if (!expectedHost) throw new Error(`branded-html: unsupported board_type "${board}"`);

  let parsed;
  try {
    parsed = new URL(entry.careers_url);
  } catch {
    throw new Error(`branded-html: invalid careers_url for ${entry.name}`);
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== expectedHost) {
    throw new Error(`branded-html: ${board} must use https://${expectedHost}`);
  }
  return parsed.href;
}

export function parseFactorialHtml(html, companyName) {
  if (typeof html !== 'string') return [];
  const jobs = [];
  const pattern = /<li\b[^>]*class=['"][^'"]*\bjob-offer-item\b[^'"]*['"][^>]*data-job-postings-url=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/li>/gi;
  for (const match of html.matchAll(pattern)) {
    const titleMatch = match[2].match(/<div\b[^>]*class=['"][^'"]*font-bold[^'"]*factorial__headingFontFamily[^'"]*['"][^>]*>([\s\S]*?)<\/div>/i);
    const title = stripTags(titleMatch?.[1]);
    const url = trustedJobUrl(match[1], 'factorial');
    if (!title || !url) continue;
    jobs.push({ title, url, company: companyName, location: '' });
  }
  return jobs;
}

export function parseFortoHtml(html, companyName) {
  if (typeof html !== 'string') return [];
  const jobs = [];
  const pattern = /<li\b[^>]*class=["'][^"']*\blist-item\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
  for (const match of html.matchAll(pattern)) {
    const card = match[1];
    const title = stripTags(card.match(/<p\b[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1]);
    const location = stripTags(card.match(/<div\b[^>]*class=["'][^"']*\blist-item-location\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]);
    const url = trustedJobUrl(
      card.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*\bitem-link\b/i)?.[1],
      'forto',
    );
    if (!title || !url) continue;
    jobs.push({ title, url, company: companyName, location });
  }
  return jobs;
}

export function parseVintedHtml(html, companyName) {
  if (typeof html !== 'string') return [];
  const script = html.match(/<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!script) return [];

  let payload;
  try {
    payload = JSON.parse(script[1]);
  } catch {
    return [];
  }

  const dataMap = payload?.props?.jobs?.dataMap;
  if (!dataMap || typeof dataMap !== 'object') return [];

  const jobs = [];
  const seen = new Set();
  for (const board of Object.values(dataMap)) {
    const items = Array.isArray(board?.jobs) ? board.jobs : [];
    for (const job of items) {
      const url = typeof job?.absolute_url === 'string' ? job.absolute_url : '';
      const title = typeof job?.title === 'string' ? job.title.trim() : '';
      if (!url || !title || seen.has(url)) continue;
      let parsed;
      try {
        parsed = new URL(url);
      } catch {
        continue;
      }
      if (!trustedJobUrl(url, 'vinted')) continue;
      seen.add(url);
      jobs.push({
        title,
        url,
        company: companyName,
        location: typeof job?.location?.name === 'string' ? job.location.name : '',
      });
    }
  }
  return jobs;
}

const PARSERS = {
  factorial: parseFactorialHtml,
  forto: parseFortoHtml,
  vinted: parseVintedHtml,
};

/** @type {Provider} */
export default {
  id: 'branded-html',

  detect() {
    return null;
  },

  async fetch(entry, ctx) {
    const url = assertBoardUrl(entry);
    const parser = PARSERS[entry.board_type];
    const html = await ctx.fetchText(url, { redirect: 'error', timeoutMs: 30_000 });
    return parser(html, entry.name);
  },
};
