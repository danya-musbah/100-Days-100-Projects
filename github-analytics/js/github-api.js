/**
 * github-api.js
 * Responsible for all communication with the GitHub REST API:
 * fetching profile, repositories, events, languages, and commit stats,
 * plus error classification and rate-limit tracking.
 */

const GitHubAPI = (() => {
  const BASE_URL = 'https://api.github.com';
  const MAX_REPO_PAGES = 5; // 5 * 100 = up to 500 repos, protects rate limits
  const REPO_LANGUAGE_FETCH_LIMIT = 30; // avoid burning the rate limit on huge accounts

  let rateLimit = { limit: null, remaining: null, reset: null };

  class GitHubAPIError extends Error {
    constructor(type, message, status) {
      super(message);
      this.type = type; // 'not-found' | 'rate-limit' | 'server' | 'network'
      this.status = status;
    }
  }

  function updateRateLimit(headers) {
    const limit = headers.get('x-ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');
    if (limit !== null) rateLimit.limit = Number(limit);
    if (remaining !== null) rateLimit.remaining = Number(remaining);
    if (reset !== null) rateLimit.reset = Number(reset);
  }

  function getRateLimit() {
    return Object.assign({}, rateLimit);
  }

  async function request(path, params) {
    const url = new URL(BASE_URL + path);
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.set(key, params[key]);
        }
      });
    }

    let response;
    try {
      response = await fetch(url.toString(), {
        headers: { Accept: 'application/vnd.github+json' },
      });
    } catch (err) {
      throw new GitHubAPIError('network', 'Unable to connect to GitHub.', 0);
    }

    updateRateLimit(response.headers);

    if (response.status === 404) {
      throw new GitHubAPIError('not-found', 'GitHub user not found.', 404);
    }
    if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
      throw new GitHubAPIError('rate-limit', 'GitHub API rate limit reached.', 403);
    }
    if (response.status === 403) {
      throw new GitHubAPIError('rate-limit', 'GitHub API access forbidden.', 403);
    }
    if (response.status >= 500) {
      throw new GitHubAPIError('server', 'GitHub is temporarily unavailable.', response.status);
    }
    if (!response.ok) {
      throw new GitHubAPIError('server', 'GitHub returned an unexpected error.', response.status);
    }

    // Some endpoints (e.g. stats/commit_activity) return 202 while GitHub
    // computes statistics asynchronously — caller must handle this.
    if (response.status === 202) {
      return { pending: true };
    }
    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async function fetchUser(username) {
    return request(`/users/${encodeURIComponent(username)}`);
  }

  async function fetchAllRepos(username) {
    let page = 1;
    let all = [];
    while (page <= MAX_REPO_PAGES) {
      const batch = await request(`/users/${encodeURIComponent(username)}/repos`, {
        per_page: 100,
        page,
        sort: 'updated',
      });
      if (!Array.isArray(batch) || batch.length === 0) break;
      all = all.concat(batch);
      if (batch.length < 100) break;
      page += 1;
    }
    return all;
  }

  async function fetchEvents(username) {
    try {
      const events = await request(`/users/${encodeURIComponent(username)}/events/public`, {
        per_page: 30,
      });
      return Array.isArray(events) ? events : [];
    } catch (err) {
      // Events are supplementary; never fail the whole dashboard because of them.
      return [];
    }
  }

  async function fetchRepoLanguages(owner, repo) {
    try {
      return await request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`);
    } catch (err) {
      return null;
    }
  }

  /**
   * Aggregates language byte counts across a repository's top N (by recency)
   * repositories, to keep request volume reasonable for large accounts.
   * Falls back to primary-language counting for repos beyond the limit,
   * or entirely if language requests fail.
   */
  async function fetchAggregatedLanguages(username, repos) {
    const nonForks = repos.filter((r) => !r.fork);
    const candidates = (nonForks.length ? nonForks : repos)
      .slice()
      .sort((a, b) => new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at))
      .slice(0, REPO_LANGUAGE_FETCH_LIMIT);

    const byteTotals = {};
    let anySucceeded = false;

    const results = await Promise.all(
      candidates.map((repo) => fetchRepoLanguages(username, repo.name))
    );

    results.forEach((langData) => {
      if (langData && typeof langData === 'object') {
        anySucceeded = true;
        Object.keys(langData).forEach((lang) => {
          byteTotals[lang] = (byteTotals[lang] || 0) + langData[lang];
        });
      }
    });

    return { byteTotals, usedFallback: !anySucceeded, sampledCount: candidates.length, totalRepoCount: repos.length };
  }

  async function fetchCommitActivity(owner, repo) {
    try {
      const data = await request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/stats/commit_activity`);
      if (!data || data.pending) return null;
      return Array.isArray(data) ? data : null;
    } catch (err) {
      return null;
    }
  }

  return {
    GitHubAPIError,
    fetchUser,
    fetchAllRepos,
    fetchEvents,
    fetchRepoLanguages,
    fetchAggregatedLanguages,
    fetchCommitActivity,
    getRateLimit,
  };
})();
