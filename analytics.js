/**
 * Artist Intelligence — UI Rendering Layer
 *
 * This module consumes the analytics model produced by
 * analytics/AnalyticsManager.js. It does not generate data, estimate values,
 * or call providers. All rendering is based on the passed analytics object.
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────────
  // PLATFORM CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────────
  const PLATFORM_ORDER = ['spotify', 'youtube', 'instagram', 'soundcloud', 'vk', 'yandex'];

  const PLATFORM_META = {
    spotify: {
      name: 'Spotify',
      color: '#1db954',
      icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.6 14.4c-.2.3-.5.4-.8.2-2.2-1.3-5-1.7-8.3-.9-.3.1-.6-.1-.7-.4-.1-.3.1-.6.4-.7 3.6-.9 6.7-.4 9.2 1.2.3.1.4.4.2.6zm1.2-2.7c-.2.4-.7.5-1 .3-2.5-1.5-6.3-2-9.3-1.1-.4.1-.8-.1-.9-.5-.1-.4.1-.8.5-.9 3.4-.9 7.6-.4 10.5 1.4.3.2.4.6.2.8zm.1-2.8c-3-1.8-8-2-10.9-.9-.5.2-1-.1-1.1-.5-.2-.5.1-1 .5-1.1 3.3-1.2 8.8-.9 12.3 1.2.4.3.6.8.3 1.2-.3.3-.8.5-1.1.1z"/></svg>'
    },
    youtube: {
      name: 'YouTube',
      color: '#ff0000',
      icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.8 8.001s-.2-1.4-.8-2c-.8-.9-1.6-.9-2-1-2.8-.2-7-.2-7-.2s-4.2 0-7 .2c-.4.1-1.2.1-2 1-.6.6-.8 2-.8 2S2 9.6 2 11.2v1.6c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.8.9 1.8.8 2.2.9 1.6.2 6.8.2 6.8.2s4.2 0 7-.2c.4-.1 1.2-.1 2-1 .6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.6c0-1.6-.2-3.2-.2-3.2zM9.9 15.1V8.9l5.4 3.1-5.4 3.1z"/></svg>'
    },
    instagram: {
      name: 'Instagram',
      color: '#e1306c',
      icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.3 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .3-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.3-1-.4-2.2-.1-1.3-.1-1.7-.1-4.9s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.3 2.2-.4 1.3-.1 1.7-.1 4.9-.1M12 0C8.7 0 8.3 0 7 .1 5.7.2 4.9.4 4.2.7c-.8.3-1.4.7-2.1 1.4C1.4 2.8 1 3.4.7 4.2.4 4.9.2 5.7.1 7 0 8.3 0 8.7 0 12s0 3.7.1 5c.1 1.3.3 2.1.6 2.8.3.8.7 1.4 1.4 2.1.7.7 1.3 1.1 2.1 1.4.7.3 1.5.5 2.8.6C8.3 24 8.7 24 12 24s3.7 0 5-.1c1.3-.1 2.1-.3 2.8-.6.8-.3 1.4-.7 2.1-1.4.7-.7 1.1-1.3 1.4-2.1.3-.7.5-1.5.6-2.8.1-1.3.1-1.7.1-5s0-3.7-.1-5c-.1-1.3-.3-2.1-.6-2.8-.3-.8-.7-1.4-1.4-2.1C21.2 1.4 20.6 1 19.8.7c-.7-.3-1.5-.5-2.8-.6C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM18.4 5.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z"/></svg>'
    },
    soundcloud: {
      name: 'SoundCloud',
      color: '#ff5500',
      icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1.8 12.3c.2 0 .4-.1.5-.2l1.8-2.3v7.1c-.2.3-.5.5-.9.5-.5 0-.9-.4-.9-.9V13c0-.4.2-.7.5-.8zm3.2.5c.1-.1.3-.2.5-.2l1.3-1.7v6.2c-.1.3-.4.6-.8.6-.5 0-.9-.4-.9-.9v-3.4c0-.3.1-.5.4-.6zm3.1.5c.1-.1.3-.2.5-.2l1.1-1.4v5.4c-.1.3-.4.5-.7.5-.5 0-.9-.4-.9-.9v-2.8c0-.3.1-.5.4-.6zm3.1.4c.1-.1.3-.2.5-.2l.9-1.2v4.8c-.1.3-.4.5-.7.5-.5 0-.9-.4-.9-.9v-2.2c0-.3.1-.5.3-.6zm3 .4c.2-.1.4-.1.5-.1l.7-.9v4.2c-.1.3-.3.5-.7.5-.5 0-.9-.4-.9-.9v-1.8c0-.3.1-.5.4-.6zm3 .4c.2 0 .4-.1.5-.2l.5-.6v3.7c-.1.3-.3.5-.7.5-.5 0-.9-.4-.9-.9v-1.4c0-.3.1-.5.4-.6zm3 .4c.2 0 .4-.1.5-.2l.3-.4v3.1c-.1.3-.3.5-.7.5-.5 0-.9-.4-.9-.9v-1.1c0-.3.1-.5.4-.5zm3 .3c.2 0 .4-.1.5-.2l.2-.2v2.7c-.1.3-.3.5-.7.5-.5 0-.9-.4-.9-.9v-.8c0-.3.1-.5.4-.5z"/></svg>'
    },
    vk: {
      name: 'VK',
      color: '#4c75a3',
      icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.714-1.033-1.033-1.49-1.171-1.744-1.171-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4 8.594 4 8.194c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.814-.542 1.27-1.422 2.176-3.61 2.176-3.61.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z"/></svg>'
    },
    yandex: {
      name: 'Yandex Music',
      color: '#ffcc00',
      icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.16 2.5h-2.8v9.9L6.2 2.5H3.1l4.1 9.8-4.2 9.2h3.1l3.2-7.2 3.2 7.2h3.1l-4.2-9.2 4.1-9.8h-3.1l-3.16 9.9V2.5zM17.5 2.5v19h2.8v-19h-2.8z"/></svg>'
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // LINK VALIDATION & PLATFORM MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────
  const LinkValidator = {
    patterns: {
      spotify: /open\.spotify\.com\/artist\/[a-zA-Z0-9]+/i,
      youtube: /youtube\.com\/(c\/|channel\/|@|user\/)[a-zA-Z0-9_-]+/i,
      instagram: /instagram\.com\/[a-zA-Z0-9_.]+/i,
      soundcloud: /soundcloud\.com\/[a-zA-Z0-9_-]+/i,
      vk: /vk\.com\/[a-zA-Z0-9_.]+/i,
      yandex: /music\.yandex\.ru\/artist\/\d+/i
    },

    validate(platform, url) {
      if (!url || typeof url !== 'string') return false;
      return this.patterns[platform]?.test(url.trim()) || false;
    },

    extractId(platform, url) {
      if (!url || typeof url !== 'string') return null;
      const m = url.trim().match(this.patterns[platform]);
      return m ? m[0] : null;
    }
  };

  const PlatformManager = {
    getStatus(artist, platform) {
      const url = artist?.[platform];
      const valid = LinkValidator.validate(platform, url);
      return {
        platform,
        url: url || '',
        connected: Boolean(url && valid),
        invalid: Boolean(url && !valid),
        missing: !url,
        extractedId: LinkValidator.extractId(platform, url)
      };
    },

    getAllStatuses(artist) {
      return PLATFORM_ORDER.map(p => this.getStatus(artist, p));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────────────────────────────
  function formatNumber(n) {
    if (n === undefined || n === null || n === 0) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return n.toString();
  }

  function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d)) return '-';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(d);
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function daysSince(date) {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d)) return null;
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  }

  function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
  }

  function trendIndicator(change) {
    const value = parseFloat(change) || 0;
    const sign = value >= 0 ? '↑' : '↓';
    const cls = value >= 0 ? 'text-emerald-400' : 'text-rose-400';
    return `<span class="${cls}">${sign} ${Math.abs(value).toFixed(1)}%</span>`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SVG CHART COMPONENTS
  // ─────────────────────────────────────────────────────────────────────────────
  function areaSparklineSVG(data, color = '#3b82f6', height = 60) {
    if (!data || data.length < 2) return '';
    const width = 100;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const area = `0,${height} ` + points.join(' ') + ` ${width},${height}`;
    return `
      <svg viewBox="0 0 ${width} ${height}" class="ai-chart" preserveAspectRatio="none">
        <polygon fill="${color}" fill-opacity="0.15" points="${area}"/>
        <polyline fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${points.join(' ')}"/>
      </svg>`;
  }

  function donutChart(percent, color = '#3b82f6', size = 120, stroke = 10) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="ai-donut">
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="${stroke}"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${color}" stroke-width="${stroke}"
          stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"
          transform="rotate(-90 ${size / 2} ${size / 2})"/>
        <text x="50%" y="50%" dy="0.1em" text-anchor="middle" class="ai-donut-text">${percent ?? '-'}</text>
      </svg>`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION RENDERERS
  // ─────────────────────────────────────────────────────────────────────────────
  function statCard(label, value, change, sublabel = '') {
    return `
      <div class="ai-stat-card">
        <div class="ai-stat-label">${label}</div>
        <div class="ai-stat-value">${value}</div>
        ${change !== undefined ? `<div class="ai-stat-change">${trendIndicator(change)}</div>` : ''}
        ${sublabel ? `<div class="ai-stat-sublabel">${sublabel}</div>` : ''}
      </div>`;
  }

  function chartCard(title, chartHtml, footer = '') {
    return `
      <div class="ai-card">
        <div class="ai-card-header">${title}</div>
        <div class="ai-card-body">${chartHtml}</div>
        ${footer ? `<div class="ai-card-footer">${footer}</div>` : ''}
      </div>`;
  }

  function sectionHeader(title, meta = '') {
    return `<div class="ai-section-header"><h3>${title}</h3>${meta ? `<div class="ai-section-meta">${meta}</div>` : ''}</div>`;
  }

  function platformIcon(platform) {
    return `<span class="ai-platform-icon" style="color:${PLATFORM_META[platform].color}">${PLATFORM_META[platform].icon}</span>`;
  }

  function platformStatusLabel(platformData) {
    if (platformData.status === 'success') return '✓ Verified';
    if (platformData.status === 'stale') return '⚠ Stale';
    if (platformData.status === 'error') return '✗ Failed';
    return '○ Not configured';
  }

  function hasIssue(data) {
    return Object.values(data.platforms || {}).some(p => p.status === 'error' || p.status === 'stale');
  }

  function renderUpdateBar(data) {
    const lastUpdated = data.lastUpdated;
    const issue = hasIssue(data);

    let staleMessage = '';
    if (issue) {
      const staleDates = Object.values(data.platforms)
        .filter(p => p.status === 'stale' || p.status === 'error')
        .map(p => p.updatedAt)
        .filter(Boolean);
      const oldestDate = staleDates.length
        ? new Date(Math.min(...staleDates.map(d => new Date(d).getTime())))
        : null;
      staleMessage = oldestDate
        ? `⚠ Last update failed. Showing previous verified data collected ${formatDate(oldestDate)}.`
        : '⚠ Last update failed. Showing previous verified data.';
    }

    return `
      <div class="ai-update-bar">
        <div class="ai-update-info">
          <span class="ai-dot ${issue ? 'ai-dot-warning' : 'ai-dot-active'}"></span>
          <span>Last Updated: ${formatDate(lastUpdated)}</span>
        </div>
        ${issue ? `<div class="ai-stale-warning">${staleMessage}</div>` : ''}
      </div>`;
  }

  function renderKPIs(summary) {
    const rows = [];
    if (summary.totalFollowers !== null) rows.push(statCard('Followers', formatNumber(summary.totalFollowers)));
    if (summary.totalSubscribers !== null) rows.push(statCard('Subscribers', formatNumber(summary.totalSubscribers)));
    if (summary.totalMonthlyListeners !== null) rows.push(statCard('Monthly Listeners', formatNumber(summary.totalMonthlyListeners)));
    if (summary.totalMonthlyPlays !== null) rows.push(statCard('Monthly Plays', formatNumber(summary.totalMonthlyPlays)));
    if (summary.avgPopularity !== null) rows.push(statCard('Avg Popularity', summary.avgPopularity + '/100'));
    rows.push(statCard('Platforms Connected', summary.platformsConnected.toString()));
    rows.push(statCard('Platforms With Errors', summary.platformsWithErrors.toString()));
    rows.push(statCard('Latest Release', escapeHtml(summary.latestRelease?.title) || '—', undefined, summary.latestRelease?.date ? formatDate(summary.latestRelease.date) : ''));
    rows.push(statCard('Booking Potential', summary.bookingPotential !== null ? summary.bookingPotential : '—'));

    return `
      <div class="ai-section">
        ${sectionHeader('KPI')}
        <div class="ai-grid ai-cols-4">${rows.join('')}</div>
      </div>`;
  }

  function renderAiInsight(data) {
    return `
      <div class="ai-section">
        ${sectionHeader('AI Insight')}
        <div class="ai-card">
          <div class="ai-card-body">
            <div class="ai-insight">${escapeHtml(data.aiInsight || 'Not enough historical data.')}</div>
          </div>
        </div>
      </div>`;
  }

  function renderCharts(charts) {
    const followers = charts?.followersGrowth?.map(p => p.value);
    const subscribers = charts?.subscribersGrowth?.map(p => p.value);
    const monthlyPlays = charts?.monthlyPlaysTrend?.map(p => p.value);

    const cards = [];
    if (followers && followers.length >= 2) cards.push(chartCard('Followers Growth', areaSparklineSVG(followers, '#3b82f6', 120)));
    if (subscribers && subscribers.length >= 2) cards.push(chartCard('Subscribers Growth', areaSparklineSVG(subscribers, '#ff0000', 120)));
    if (monthlyPlays && monthlyPlays.length >= 2) cards.push(chartCard('Monthly Plays Trend', areaSparklineSVG(monthlyPlays, '#8b5cf6', 120)));

    if (cards.length === 0) return '';

    return `
      <div class="ai-section">
        ${sectionHeader('Trends')}
        <div class="ai-grid ai-cols-2">${cards.join('')}</div>
      </div>`;
  }

  function renderReleaseTimeline(timeline) {
    if (!timeline || timeline.length === 0) return '';
    const rows = timeline.map(r => `
      <div class="ai-timeline-item">
        <div class="ai-timeline-dot"></div>
        <div class="ai-timeline-content">
          <div class="ai-timeline-title">${escapeHtml(r.title)}</div>
          <div class="ai-timeline-meta">${formatDate(r.date)} · ${daysSince(r.date) ?? '?'} days ago · ${(r.platforms || []).map(p => PLATFORM_META[p]?.name || p).join(', ')}</div>
        </div>
      </div>
    `).join('');
    return `
      <div class="ai-section">
        ${sectionHeader('Release Timeline')}
        <div class="ai-card">
          <div class="ai-card-body ai-timeline">${rows}</div>
        </div>
      </div>`;
  }

  function renderPlatforms(platforms) {
    const cards = PLATFORM_ORDER.map(key => {
      const p = platforms[key] || {};
      const meta = PLATFORM_META[key];
      const m = p.meta || {};
      const statusClass = p.status === 'success' ? 'ai-status-success' : p.status === 'stale' ? 'ai-status-stale' : p.status === 'error' ? 'ai-status-error' : 'ai-status-off';
      const statusIcon = p.status === 'success' ? '✓' : p.status === 'stale' ? '⚠' : p.status === 'error' ? '✗' : '—';
      const statusLabel = p.status === 'success' ? 'Verified' : p.status === 'stale' ? 'Stale' : p.status === 'error' ? 'Failed' : 'Not configured';
      const hasMetrics = p.followers !== null || p.subscribers !== null || p.monthlyListeners !== null || p.monthlyPlays !== null || p.popularity !== null;

      const metricLines = [];
      if (p.followers !== null) metricLines.push(`${formatNumber(p.followers)} followers`);
      if (p.subscribers !== null) metricLines.push(`${formatNumber(p.subscribers)} subscribers`);
      if (p.monthlyListeners !== null) metricLines.push(`${formatNumber(p.monthlyListeners)} monthly listeners`);
      if (p.monthlyPlays !== null) metricLines.push(`${formatNumber(p.monthlyPlays)} monthly plays`);
      if (p.popularity !== null) metricLines.push(`${p.popularity}/100 popularity`);

      return `
        <div class="ai-platform-card ${p.status === 'success' ? 'ai-platform-connected' : p.status === 'error' ? 'ai-platform-invalid' : 'ai-platform-missing'}">
          <div class="ai-platform-header">
            ${platformIcon(key)}
            <div class="ai-platform-name">${meta.name}</div>
            <div class="ai-platform-status">${platformStatusLabel(p)}</div>
          </div>
          <div class="ai-platform-body">
            ${hasMetrics ? `<div class="ai-platform-metrics">${metricLines.join(' · ')}</div>` : ''}
            <div class="ai-platform-source">
              <div><strong>Source:</strong> ${p.source || m.dataSource || '—'}</div>
              <div><strong>Method:</strong> ${m.collectionMethod || 'Rendered Page Parser'}</div>
              <div><strong>Updated:</strong> ${p.updatedAt ? formatDate(p.updatedAt) : '—'}</div>
              <div class="ai-platform-source-status ${statusClass}"><strong>Status:</strong> ${statusIcon} ${statusLabel}</div>
              ${p.error ? `<div class="ai-platform-error"><strong>Error:</strong> ${escapeHtml(p.error)}</div>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');
    return `
      <div class="ai-section">
        ${sectionHeader('Platform Status')}
        <div class="ai-platform-list">${cards}</div>
      </div>`;
  }

  function renderDebugPanel(data) {
    const isAdmin = window.__AI_ADMIN_MODE__ === true;
    if (!isAdmin) return '';

    const rows = PLATFORM_ORDER.map(key => {
      const p = data.platforms[key] || {};
      const m = p.meta || {};
      const d = data.debug?.[key] || {};
      return `
        <div class="ai-debug-row">
          <div class="ai-debug-provider">${PLATFORM_META[key].name}</div>
          <div class="ai-debug-status ai-status-${p.status}">${p.status}</div>
          <div class="ai-debug-field"><strong>Last refresh:</strong> ${d.lastRefresh ? formatDate(d.lastRefresh) : '—'}</div>
          <div class="ai-debug-field"><strong>Duration:</strong> ${d.duration ? d.duration + ' ms' : '—'}</div>
          <div class="ai-debug-field"><strong>Parsed:</strong> ${d.parsedFields?.join(', ') || '—'}</div>
          <div class="ai-debug-field"><strong>Missing:</strong> ${d.missingFields?.join(', ') || '—'}</div>
          <div class="ai-debug-field"><strong>Error:</strong> ${d.lastError ? escapeHtml(d.lastError) : '—'}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="ai-section ai-debug-section">
        <details class="ai-debug-panel">
          <summary>Developer / Debug</summary>
          <div class="ai-debug-body">
            <div class="ai-debug-grid">${rows}</div>
          </div>
        </details>
      </div>
    `;
  }

  function renderHistory(history) {
    if (!history || history.length === 0) return '';
    const rows = history.slice().reverse().slice(0, 10).map(h => `
      <div class="ai-history-row">
        <div class="ai-history-date">${formatDate(h.date)}</div>
        <div class="ai-history-provider">${h.platform || '—'}</div>
        <div class="ai-history-followers">${formatNumber(h.followers)}</div>
        <div class="ai-history-popularity">${h.popularity ? h.popularity.toFixed(1) : '-'}</div>
        <div class="ai-history-release">${h.latestRelease || '—'}</div>
      </div>
    `).join('');
    return `
      <div class="ai-section">
        ${sectionHeader('Update History', `<span class="ai-count">${history.length}</span>`)}
        <div class="ai-card">
          <div class="ai-card-body ai-history">
            <div class="ai-history-row ai-history-header">
              <div>Date</div><div>Source</div><div>Followers</div><div>Popularity</div><div>Release</div>
            </div>
            ${rows || '<div class="ai-history-empty">History is empty</div>'}
          </div>
        </div>
      </div>`;
  }

  function renderAnalytics(data) {
    if (!data || !data.platforms) {
      return `<div class="ai-analytics"><div class="ai-stale-warning">No analytics available.</div></div>`;
    }
    return `
      <div class="ai-analytics">
        ${renderUpdateBar(data)}
        ${renderKPIs(data.summary)}
        ${renderAiInsight(data)}
        ${renderCharts(data.charts)}
        ${renderReleaseTimeline(data.charts?.releaseTimeline)}
        ${renderPlatforms(data.platforms)}
        ${renderDebugPanel(data)}
        ${renderHistory(data.history)}
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────────
  window.renderAnalytics = renderAnalytics;
  window.PLATFORM_ORDER = PLATFORM_ORDER;
  window.PLATFORM_META = PLATFORM_META;
  window.LinkValidator = LinkValidator;
  window.PlatformManager = PlatformManager;
})();
