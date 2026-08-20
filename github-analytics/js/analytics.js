/**
 * analytics.js
 * Responsible for turning raw GitHub API data into calculated metrics:
 * totals, distributions, repository scoring, and generated insights.
 * Contains no DOM code and no API calls — pure data transforms.
 */

const Analytics = (() => {

  function formatCompactNumber(n) {
    if (n === null || n === undefined) return '—';
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (abs >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  }

  function formatRelativeTime(dateString) {
    if (!dateString) return 'unknown';
    const then = new Date(dateString).getTime();
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - then) / 1000));

    const units = [
      ['year', 31536000],
      ['month', 2592000],
      ['week', 604800],
      ['day', 86400],
      ['hour', 3600],
      ['minute', 60],
    ];
    for (const [label, secs] of units) {
      const value = Math.floor(diffSec / secs);
      if (value >= 1) return `${value} ${label}${value > 1 ? 's' : ''} ago`;
    }
    return 'just now';
  }

  function totalStars(repos) {
    return repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
  }

  function totalForks(repos) {
    return repos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0);
  }

  function averageStars(repos) {
    return repos.length ? totalStars(repos) / repos.length : 0;
  }

  function averageForks(repos) {
    return repos.length ? totalForks(repos) / repos.length : 0;
  }

  function repoTypeBreakdown(repos) {
    const total = repos.length || 1;
    const forks = repos.filter((r) => r.fork).length;
    const archived = repos.filter((r) => r.archived).length;
    const original = repos.length - forks;
    return {
      total: repos.length,
      original: { count: original, pct: Math.round((original / total) * 100) },
      forks: { count: forks, pct: Math.round((forks / total) * 100) },
      archived: { count: archived, pct: Math.round((archived / total) * 100) },
    };
  }

  function repoActivityBreakdown(repos) {
    const now = Date.now();
    const day = 86400000;
    let active = 0; // updated within 30 days
    let recent = 0; // updated within 31-180 days
    let inactive = 0; // older than 180 days
    repos.forEach((r) => {
      const updated = r.pushed_at || r.updated_at;
      if (!updated) { inactive += 1; return; }
      const diffDays = (now - new Date(updated).getTime()) / day;
      if (diffDays <= 30) active += 1;
      else if (diffDays <= 180) recent += 1;
      else inactive += 1;
    });
    const total = repos.length || 1;
    return {
      active: { count: active, pct: Math.round((active / total) * 100) },
      recent: { count: recent, pct: Math.round((recent / total) * 100) },
      inactive: { count: inactive, pct: Math.round((inactive / total) * 100) },
    };
  }

  /**
   * Builds a percentage distribution from aggregated language byte totals.
   * Falls back to counting primary `language` field across repos when
   * byte-level data could not be retrieved.
   */
  function languageDistribution(byteTotals, repos, usedFallback) {
    let counts = {};
    if (!usedFallback && byteTotals && Object.keys(byteTotals).length) {
      counts = byteTotals;
    } else {
      repos.forEach((r) => {
        if (r.language) counts[r.language] = (counts[r.language] || 0) + 1;
      });
    }

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, v]) => sum + v, 0);
    if (!total) return { entries: [], usedFallback: true };

    const top = entries.slice(0, 6);
    const restTotal = entries.slice(6).reduce((sum, [, v]) => sum + v, 0);

    const result = top.map(([name, value]) => ({
      name,
      value,
      pct: Math.round((value / total) * 1000) / 10,
    }));
    if (restTotal > 0) {
      result.push({ name: 'Other', value: restTotal, pct: Math.round((restTotal / total) * 1000) / 10 });
    }
    return { entries: result, usedFallback: !!usedFallback };
  }

  /**
   * Repository "activity score" used to rank Top Repositories.
   * stars * 3 + forks * 2 + recency bonus (0-10, decaying over a year).
   */
  function repoScore(repo) {
    const stars = repo.stargazers_count || 0;
    const forks = repo.forks_count || 0;
    const updated = repo.pushed_at || repo.updated_at;
    let recencyBonus = 0;
    if (updated) {
      const daysAgo = (Date.now() - new Date(updated).getTime()) / 86400000;
      recencyBonus = Math.max(0, 10 - daysAgo / 36.5); // ~0 after 365 days
    }
    return stars * 3 + forks * 2 + recencyBonus;
  }

  function rankRepositories(repos) {
    return repos
      .map((r) => Object.assign({}, r, { _score: repoScore(r) }))
      .sort((a, b) => b._score - a._score);
  }

  /**
   * A simple, transparently-labelled "Activity Score" (0-100) per repo,
   * explicitly NOT presented as an official GitHub metric.
   */
  function repoHealth(repo) {
    let score = 0;
    const updated = repo.pushed_at || repo.updated_at;
    if (updated) {
      const daysAgo = (Date.now() - new Date(updated).getTime()) / 86400000;
      if (daysAgo <= 30) score += 40;
      else if (daysAgo <= 90) score += 25;
      else if (daysAgo <= 365) score += 10;
    }
    score += Math.min(30, Math.log2((repo.stargazers_count || 0) + 1) * 6);
    score += Math.min(15, Math.log2((repo.forks_count || 0) + 1) * 4);
    if (repo.archived) score = Math.max(0, score - 30);
    if ((repo.open_issues_count || 0) > 0 && (repo.open_issues_count || 0) < 20) score += 5;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function topStarredRepos(repos, limit) {
    return repos
      .slice()
      .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
      .slice(0, limit || 10)
      .filter((r) => (r.stargazers_count || 0) > 0);
  }

  const EVENT_LABELS = {
    PushEvent: (e) => `Pushed ${e.payload && e.payload.commits ? e.payload.commits.length : ''} commit${e.payload && e.payload.commits && e.payload.commits.length === 1 ? '' : 's'} to ${e.repo.name}`,
    PullRequestEvent: (e) => `${e.payload && e.payload.action === 'closed' ? 'Closed' : 'Opened'} a pull request in ${e.repo.name}`,
    IssuesEvent: (e) => `${e.payload && e.payload.action === 'closed' ? 'Closed' : 'Opened'} an issue in ${e.repo.name}`,
    IssueCommentEvent: (e) => `Commented on an issue in ${e.repo.name}`,
    CreateEvent: (e) => `Created ${e.payload && e.payload.ref_type ? e.payload.ref_type : 'repository'} in ${e.repo.name}`,
    DeleteEvent: (e) => `Deleted a ${e.payload && e.payload.ref_type ? e.payload.ref_type : 'ref'} in ${e.repo.name}`,
    ForkEvent: (e) => `Forked ${e.repo.name}`,
    WatchEvent: () => `Starred a repository`,
    PublicEvent: (e) => `Made ${e.repo.name} public`,
    ReleaseEvent: (e) => `Published a release in ${e.repo.name}`,
    MemberEvent: (e) => `Added a collaborator to ${e.repo.name}`,
    CommitCommentEvent: (e) => `Commented on a commit in ${e.repo.name}`,
  };

  function friendlyEvent(event) {
    const fn = EVENT_LABELS[event.type];
    const text = fn ? fn(event) : `${event.type.replace('Event', '')} in ${event.repo && event.repo.name}`;
    return {
      text,
      time: event.created_at,
      repoName: event.repo && event.repo.name,
      repoUrl: event.repo && event.repo.name ? `https://github.com/${event.repo.name}` : null,
    };
  }

  function generateInsights(ctx) {
    const insights = [];
    const { repos, langDist, typeBreakdown, activityBreakdown, user } = ctx;

    if (!repos.length) {
      insights.push('This account has no public repositories yet.');
      return insights;
    }

    const topByStars = repos.slice().sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))[0];
    if (topByStars && topByStars.stargazers_count > 0) {
      insights.push(`Your most popular repository is ${topByStars.name} with ${formatCompactNumber(topByStars.stargazers_count)} stars.`);
    }

    if (langDist.entries.length) {
      const top = langDist.entries[0];
      insights.push(`${top.name} is the most-used language, making up ${top.pct}% of analyzed code.`);
    }

    if (activityBreakdown.active.pct > 0) {
      insights.push(`${activityBreakdown.active.pct}% of repositories were updated within the last 30 days.`);
    }

    insights.push(`${typeBreakdown.original.pct}% of public repositories are original projects, not forks.`);

    if (user.public_repos) {
      insights.push(`${user.public_repos} public ${user.public_repos === 1 ? 'repository is' : 'repositories are'} available on this profile.`);
    }

    if (repos.length >= 3) {
      const avg = averageStars(repos);
      insights.push(`Repositories average ${avg.toFixed(1)} stars each.`);
    }

    return insights.slice(0, 6);
  }

  return {
    formatCompactNumber,
    formatRelativeTime,
    totalStars,
    totalForks,
    averageStars,
    averageForks,
    repoTypeBreakdown,
    repoActivityBreakdown,
    languageDistribution,
    rankRepositories,
    repoScore,
    repoHealth,
    topStarredRepos,
    friendlyEvent,
    generateInsights,
  };
})();
