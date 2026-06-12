// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

// Workday provider - uses the public CXS jobs endpoint exposed by Workday
// career sites. Workday tenant/site names cannot be derived reliably from a
// branded careers URL, so entries should provide an explicit `api:` URL:
// https://<tenant>.<shard>.myworkdayjobs.com/wday/cxs/<tenant>/<site>/jobs

const PAGE_SIZE = 20;
const MAX_PAGES = 250;

function parseApiUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  if (!/(^|\.)myworkdayjobs\.com$/i.test(parsed.hostname)) return null;
  if (!/^\/wday\/cxs\/[^/]+\/[^/]+\/jobs\/?$/i.test(parsed.pathname)) return null;
  return parsed;
}

function resolveApiUrl(entry) {
  const parsed = parseApiUrl(entry.api);
  return parsed ? parsed.href.replace(/\/$/, '') : null;
}

function publicBaseFromApi(apiUrl, entry) {
  const explicit = typeof entry.careers_url === 'string' ? entry.careers_url : '';
  if (explicit) {
    try {
      const parsed = new URL(explicit);
      if (parsed.protocol === 'https:' && /(^|\.)myworkdayjobs\.com$/i.test(parsed.hostname)) {
        return `${parsed.origin}${parsed.pathname.replace(/\/$/, '')}`;
      }
    } catch {
      // Use the API-derived public base.
    }
  }

  const parsed = new URL(apiUrl);
  const match = parsed.pathname.match(/^\/wday\/cxs\/[^/]+\/([^/]+)\/jobs\/?$/i);
  return `${parsed.origin}/en-US/${match?.[1] || ''}`.replace(/\/$/, '');
}

/** @type {Provider} */
export default {
  id: 'workday',

  detect(entry) {
    const apiUrl = resolveApiUrl(entry);
    return apiUrl ? { url: apiUrl } : null;
  },

  async fetch(entry, ctx) {
    const apiUrl = resolveApiUrl(entry);
    if (!apiUrl) {
      throw new Error(`workday: expected an HTTPS myworkdayjobs.com CXS jobs URL in api for ${entry.name}`);
    }

    const all = [];
    const publicBase = publicBaseFromApi(apiUrl, entry);
    let expectedTotal = null;

    for (let page = 0; page < MAX_PAGES; page++) {
      const offset = page * PAGE_SIZE;
      const json = await ctx.fetchJson(apiUrl, {
        method: 'POST',
        timeoutMs: 30_000,
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          appliedFacets: {},
          limit: PAGE_SIZE,
          offset,
          searchText: '',
        }),
        redirect: 'error',
      });

      const jobs = parseWorkdayResponse(json, entry.name, publicBase);
      all.push(...jobs);

      const reportedTotal = Number(json?.total);
      if (page === 0 && Number.isFinite(reportedTotal) && reportedTotal > 0) {
        expectedTotal = reportedTotal;
      }
      if (jobs.length === 0) break;
      if (expectedTotal !== null && offset + jobs.length >= expectedTotal) break;
      if (jobs.length < PAGE_SIZE) break;
    }

    return all;
  },
};

export function parseWorkdayResponse(json, companyName, publicBase) {
  const postings = Array.isArray(json?.jobPostings) ? json.jobPostings : [];
  const jobs = [];

  for (const posting of postings) {
    const title = typeof posting?.title === 'string' ? posting.title.trim() : '';
    const externalPath = typeof posting?.externalPath === 'string' ? posting.externalPath.trim() : '';
    if (!title || !externalPath) continue;

    let url;
    try {
      url = new URL(`${publicBase.replace(/\/$/, '')}/${externalPath.replace(/^\//, '')}`).href;
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || !/(^|\.)myworkdayjobs\.com$/i.test(parsed.hostname)) continue;
    } catch {
      continue;
    }

    const locations = [];
    if (typeof posting.locationsText === 'string') locations.push(posting.locationsText);
    if (Array.isArray(posting.locations)) {
      for (const location of posting.locations) {
        if (typeof location === 'string') locations.push(location);
        else if (typeof location?.descriptor === 'string') locations.push(location.descriptor);
      }
    }

    jobs.push({
      title,
      url,
      company: companyName,
      location: [...new Set(locations.map(x => x.trim()).filter(Boolean))].join(', '),
    });
  }

  return jobs;
}
