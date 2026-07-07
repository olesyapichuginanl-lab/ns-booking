// Artist Database Application
let artists = [];
let selectedArtistId = null;
let currentPage = 1;
let pageSize = 25;
let searchTimeout = null;
let appMode = localStorage.getItem('appMode') || 'private'; // 'public' | 'private'
let sortColumn = localStorage.getItem('artistSortColumn') || 'name';
let sortDirection = localStorage.getItem('artistSortDirection') || 'asc';
let currentView = localStorage.getItem('crmView') || 'dashboard'; // 'dashboard' | 'artists'
let currentArtistTab = 'crm'; // 'crm' | 'analytics' | 'documents' | 'ai'

function toggleMode() {
    appMode = appMode === 'private' ? 'public' : 'private';
    localStorage.setItem('appMode', appMode);
    applyMode();
    if (currentView === 'dashboard') renderDashboard();
    renderArtists();
    if (selectedArtistId) showSidePanel(selectedArtistId);
}

function switchView(view) {
    currentView = view;
    localStorage.setItem('crmView', currentView);
    applyView();
}

function applyView() {
    const dashboard = document.getElementById('dashboardView');
    const artists = document.getElementById('artistsView');
    const tabDashboard = document.getElementById('tabDashboard');
    const tabArtists = document.getElementById('tabArtists');

    if (!dashboard || !artists) return;

    if (currentView === 'dashboard') {
        dashboard.classList.remove('hidden');
        artists.classList.add('hidden');
        tabDashboard?.classList.add('active');
        tabArtists?.classList.remove('active');
        renderDashboard();
    } else {
        dashboard.classList.add('hidden');
        artists.classList.remove('hidden');
        tabDashboard?.classList.remove('active');
        tabArtists?.classList.add('active');
        renderArtists();
    }
}

function applyMode() {
    const isPublic = appMode === 'public';
    document.body.classList.toggle('mode-public', isPublic);
    document.body.classList.toggle('mode-private', !isPublic);
}

function switchArtistTab(tab) {
    currentArtistTab = tab;
    if (selectedArtistId) renderArtistTab();
}

function updateArtistTabUI() {
    const tabs = ['crm', 'analytics', 'documents', 'ai'];
    tabs.forEach(t => {
        const el = document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1));
        el?.classList.toggle('active', t === currentArtistTab);
    });

    const footer = document.getElementById('panelFooter');
    if (footer) {
        footer.classList.toggle('hidden', currentArtistTab !== 'crm');
    }
}

async function renderArtistTab() {
    const artist = artists.find(a => a.id === selectedArtistId);
    if (!artist) return;

    updateArtistTabUI();
    const panelBody = document.getElementById('panelBody');
    if (!panelBody) return;
    panelBody.scrollTop = 0;

    if (currentArtistTab === 'crm') {
        panelBody.innerHTML = renderArtistCrm(artist);
    } else if (currentArtistTab === 'analytics') {
        panelBody.innerHTML = '<div class="ai-tab-placeholder">Analytics temporarily disabled</div>';
    } else if (currentArtistTab === 'documents') {
        panelBody.innerHTML = renderArtistDocuments(artist);
    } else if (currentArtistTab === 'ai') {
        panelBody.innerHTML = renderArtistAi(artist);
    }
}

// Ensure every artist object has all CRM fields with defaults
function normalizeArtist(artist) {
    return {
        ...artist,
        manager: artist.manager ?? '',
        lastContact: artist.lastContact ?? '',
        nextContact: artist.nextContact ?? '',
        nextAction: artist.nextAction ?? '',
        artistSource: artist.artistSource ?? '',
        internalNotes: artist.internalNotes ?? '',
        website: artist.website ?? '',
        instagram: artist.instagram ?? '',
        facebook: artist.facebook ?? '',
        spotify: artist.spotify ?? '',
        youtube: artist.youtube ?? '',
        tiktok: artist.tiktok ?? '',
        yandex: artist.yandex ?? '',
        soundcloud: artist.soundcloud ?? '',
        vk: artist.vk ?? '',
        timeline: Array.isArray(artist.timeline) ? artist.timeline : []
    };
}

// Load a single source file and return its artists array
async function loadSourceFile(filename) {
    try {
        const response = await fetch(`artists/${filename}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
const list = Array.isArray(data)
    ? data
    : Array.isArray(data.artists)
        ? data.artists
        : [];
                console.log(`Loaded: artists/${filename} (${list.length} records)`);
        return list;
    } catch (error) {
        console.warn(`Skipped: artists/${filename} — ${error.message}`);
        return [];
    }
}

// Load artists from artists/index.json and all listed sources
async function loadArtists() {
    try {
        const indexResponse = await fetch('artists/index.json');
        if (!indexResponse.ok) throw new Error('Cannot load artists/index.json');
        const index = await indexResponse.json();
        const sources = Array.isArray(index.sources) ? index.sources : [];

        const results = await Promise.all(sources.map(loadSourceFile));
        artists = results.flat().map(normalizeArtist);
    } catch (error) {
        console.error('Error loading artists:', error);
        artists = [];
    }

    // Merge artists added or edited via the UI (stored in localStorage)
    mergeLocalStorageArtists();
    loadNotesFromLocalStorage();
    buildFilters();
    applyMode();
    applyView();
}

function mergeLocalStorageArtists() {
    let stored = [];
    try {
        stored = JSON.parse(localStorage.getItem('artists') || '[]');
    } catch (e) {
        stored = [];
    }
    if (!Array.isArray(stored) || stored.length === 0) return;

    const map = new Map(artists.map(a => [a.id, a]));
    stored.forEach(a => {
        if (a && a.id) {
            map.set(a.id, normalizeArtist({ ...(map.get(a.id) || {}), ...a }));
        }
    });
    artists = Array.from(map.values());
}

// Save artists to JSON (simulated - in real app, this would be a backend API)
function saveArtists() {
    // In a real application, this would send data to a server
    console.log('Artists saved:', artists);
    localStorage.setItem('artists', JSON.stringify(artists));
}

// Build filter dropdowns dynamically from current artists
function buildFilters() {
    const genres = [...new Set(artists.map(a => a.genre).filter(Boolean))].sort();
    const countries = [...new Set(artists.map(a => a.country).filter(Boolean))].sort();
    const agencyTypes = [...new Set(artists.map(a => a.agencyType).filter(Boolean))].sort();

    const genreEl = document.getElementById('genreFilter');
    const countryEl = document.getElementById('countryFilter');
    const agencyTypeEl = document.getElementById('agencyTypeFilter');

    const prev = {
        genre: genreEl.value,
        country: countryEl.value,
        agencyType: agencyTypeEl.value
    };

    genreEl.innerHTML = '<option value="">All Genres</option>' +
        genres.map(g => `<option value="${g}">${g}</option>`).join('');

    countryEl.innerHTML = '<option value="">All Countries</option>' +
        countries.map(c => `<option value="${c}">${flagLabel(c)} ${c}</option>`).join('');

    agencyTypeEl.innerHTML = '<option value="">All Agency Types</option>' +
        agencyTypes.map(t => `<option value="${t}">${t}</option>`).join('');

    if (prev.genre && genres.includes(prev.genre)) genreEl.value = prev.genre;
    if (prev.country && countries.includes(prev.country)) countryEl.value = prev.country;
    if (prev.agencyType && agencyTypes.includes(prev.agencyType)) agencyTypeEl.value = prev.agencyType;

}

// Render artists to the table
function renderArtists() {
    const tableBody = document.getElementById('artistsTableBody');
    const emptyState = document.getElementById('emptyState');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const genreFilter = document.getElementById('genreFilter').value;
    const countryFilter = document.getElementById('countryFilter').value;
    const bookingStatusFilter = document.getElementById('bookingStatusFilter').value;
    const agencyTypeFilter = document.getElementById('agencyTypeFilter').value;

    // Filter artists
    let filteredArtists = artists.filter(artist => {
        const searchFields = [
            artist.name || '',
            artist.genre || '',
            artist.contact || '',
            artist.country || '',
            artist.agency || '',
            artist.website || '',
            artist.instagram || '',
            artist.notes || ''
        ].join(' ').toLowerCase();

        const matchesSearch = searchFields.includes(searchTerm);
        const matchesGenre = !genreFilter || artist.genre === genreFilter;
        const matchesCountry = !countryFilter || artist.country === countryFilter;
        const matchesBookingStatus = !bookingStatusFilter || artist.bookingStatus === bookingStatusFilter;
        const matchesAgencyType = !agencyTypeFilter || artist.agencyType === agencyTypeFilter;

        return matchesSearch && matchesGenre && matchesCountry && matchesBookingStatus && matchesAgencyType;
    });

    // Sort artists
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    filteredArtists.sort((a, b) => {
        let valA, valB;
        switch (sortColumn) {
            case 'name': valA = a.name || ''; valB = b.name || ''; break;
            case 'genre': valA = a.genre || ''; valB = b.genre || ''; break;
            case 'country': valA = a.country || ''; valB = b.country || ''; break;
            case 'agency': valA = a.agency || 'Independent'; valB = b.agency || 'Independent'; break;
            case 'bookingFee': valA = a.bookingFee ?? a.price ?? 0; valB = b.bookingFee ?? b.price ?? 0; break;
            case 'plannedEvent': valA = a.plannedEvent || ''; valB = b.plannedEvent || ''; break;
            case 'bookingStatus': valA = a.bookingStatus || ''; valB = b.bookingStatus || ''; break;
            case 'interest': valA = a.interest || 0; valB = b.interest || 0; break;
            case 'priority': valA = a.priority || 0; valB = b.priority || 0; break;
            default: return 0;
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
            return (valA - valB) * multiplier;
        }
        return valA.localeCompare(valB) * multiplier;
    });

    // Calculate pagination
    const totalPages = Math.ceil(filteredArtists.length / pageSize) || 1;
    const paginatedArtists = filteredArtists.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    if (filteredArtists.length === 0) {
        tableBody.innerHTML = '';
        emptyState.classList.remove('hidden');
        document.getElementById('pagination').classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    document.getElementById('pagination').classList.remove('hidden');

    tableBody.innerHTML = paginatedArtists.map((artist, index) => `
        <tr class="${selectedArtistId === artist.id ? 'selected' : ''} fade-in" style="animation-delay:${index * 0.015}s" onclick="selectArtist('${artist.id}')">
            <td class="px-4 py-3 whitespace-nowrap">
                <div class="flex items-center gap-2.5">
                    <div class="crm-avatar">${artist.name.charAt(0).toUpperCase()}</div>
                    <span class="font-medium text-sm">${artist.name}</span>
                </div>
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
                <span class="${genreClass(artist.genre)} badge">${artist.genre || '-'}</span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm">${flagLabel(artist.country)}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm">
                <span class="agency-${slugify(artist.agency || 'independent')} badge">${artist.agency || 'Independent'}</span>
            </td>
            <td class="private-only px-4 py-3 whitespace-nowrap text-sm font-mono">${getBookingFeeLabel(artist.bookingFee ?? artist.price)}</td>
            <td class="private-only px-4 py-3 whitespace-nowrap text-sm">${artist.plannedEvent || '-'}</td>
            <td class="private-only px-4 py-3 whitespace-nowrap">
                <span class="bstatus-${slugify(artist.bookingStatus)} badge">${artist.bookingStatus || '-'}</span>
            </td>
            <td class="private-only px-4 py-3 whitespace-nowrap text-sm">${starsLabel(artist.interest)}</td>
            <td class="private-only px-4 py-3 whitespace-nowrap text-sm">${starsLabel(artist.priority)}</td>
        </tr>
    `).join('');

    updatePagination(filteredArtists.length, totalPages);
    updateSortArrows();
}

// Toggle column sorting
function sortBy(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    localStorage.setItem('artistSortColumn', sortColumn);
    localStorage.setItem('artistSortDirection', sortDirection);
    currentPage = 1;
    renderArtists();
}

// Render arrow indicators on table headers
function updateSortArrows() {
    document.querySelectorAll('.sortable-header').forEach(th => {
        const up = th.querySelector('.sort-arrow-up');
        const down = th.querySelector('.sort-arrow-down');
        if (!up || !down) return;

        up.classList.remove('active');
        down.classList.remove('active');

        if (th.dataset.column === sortColumn) {
            th.classList.add('sort-active');
            if (sortDirection === 'asc') {
                up.classList.add('active');
            } else {
                down.classList.add('active');
            }
        } else {
            th.classList.remove('sort-active');
        }
    });
}

// Update pagination controls
function updatePagination(totalItems, totalPages) {
    const pageInfo = document.getElementById('pageInfo');
    const firstPageBtn = document.getElementById('firstPageBtn');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const lastPageBtn = document.getElementById('lastPageBtn');

    pageInfo.textContent = `Страница ${currentPage} из ${totalItems > 0 ? totalPages : 1} (${totalItems} записей)`;
    
    firstPageBtn.disabled = currentPage === 1;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage >= totalPages;
    lastPageBtn.disabled = currentPage >= totalPages;
}

// Country flag emoji map
const COUNTRY_FLAGS = {
    'Netherlands': '🇳🇱',
    'Italy': '🇮🇹',
    'Germany': '🇩🇪',
    'France': '🇫🇷',
    'Belgium': '🇧🇪',
    'United Kingdom': '🇬🇧',
    'UK': '🇬🇧',
    'Spain': '🇪🇸',
    'Portugal': '🇵🇹',
    'Switzerland': '🇨🇭',
    'Austria': '🇦🇹',
    'Poland': '🇵🇱',
    'Czech Republic': '🇨🇿',
    'Denmark': '🇩🇰',
    'Sweden': '🇸🇪',
    'Norway': '🇳🇴',
    'Finland': '🇫🇮',
    'USA': '🇺🇸',
    'United States': '🇺🇸',
    'Canada': '🇨🇦',
    'Australia': '🇦🇺',
    'Brazil': '🇧🇷',
    'Mexico': '🇲🇽',
    'Japan': '🇯🇵',
    'Russia': '🇷🇺',
    'Россия': '🇷🇺',
    'Украина': '🇺🇦',
    'Ukraine': '🇺🇦',
    'Беларусь': '🇧🇾',
    'Belarus': '🇧🇾',
    'Казахстан': '🇰🇿',
    'Kazakhstan': '🇰🇿',
    'Hungary': '🇭🇺',
    'Romania': '🇷🇴',
    'Croatia': '🇭🇷',
    'Serbia': '🇷🇸',
    'Slovakia': '🇸🇰',
    'Slovenia': '🇸🇮',
    'Greece': '🇬🇷',
    'Turkey': '🇹🇷',
    'Israel': '🇮🇱',
    'South Africa': '🇿🇦',
    'New Zealand': '🇳🇿',
    'Ireland': '🇮🇪',
    'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
};

// Return flag emoji + country name, or just country name if unknown
function flagLabel(country) {
    if (!country) return '-';
    const flag = COUNTRY_FLAGS[country];
    return flag ? `${flag} ${country}` : country;
}

// Sanitize genre string to a CSS-safe class name
function genreClass(genre) {
    return 'genre-' + (genre || 'unknown').toLowerCase().replace(/\s+/g, '-');
}

// Get booking fee display string
function getBookingFeeLabel(level) {
    const n = parseInt(level) || 0;
    if (n <= 0) return '-';
    return '€'.repeat(Math.min(n, 5));
}

// Slugify a string for use as a CSS class
function slugify(str) {
    return (str || 'none').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// Render star rating (1-5)
function starsLabel(val) {
    const n = parseInt(val) || 0;
    if (n <= 0) return '<span class="text-gray-600">-</span>';
    return '<span class="text-yellow-400">' + '★'.repeat(Math.min(n, 5)) + '</span>';
}

// Get status label (legacy field, kept for backward compat)
function getStatusLabel(status) {
    const labels = { 'active': 'Active', 'inactive': 'Inactive', 'pending': 'Pending' };
    return labels[status] || status || '-';
}

// Copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Скопировано: ' + text);
    }).catch(err => {
        console.error('Ошибка копирования:', err);
    });
}

// Open link in new tab
function openLink(url) {
    window.open(url, '_blank');
}

// Save a single artist's current state to localStorage edits
function saveArtistEdit(artistId) {
    const artist = artists.find(a => a.id === artistId);
    if (!artist) return;

    let edits = {};
    try {
        edits = JSON.parse(localStorage.getItem('artist_edits') || '{}');
    } catch (e) {
        edits = {};
    }

    edits[artistId] = { ...artist };
    localStorage.setItem('artist_edits', JSON.stringify(edits));
}

// Merge locally edited artists over JSON-loaded artists by id
function mergeArtistEdits() {
    let edits = {};
    try {
        edits = JSON.parse(localStorage.getItem('artist_edits') || '{}');
    } catch (e) {
        edits = {};
    }

    const map = new Map(artists.map(artist => [artist.id, artist]));
    Object.values(edits).forEach(edit => {
        if (edit && edit.id) {
            map.set(edit.id, normalizeArtist({ ...(map.get(edit.id) || {}), ...edit }));
        }
    });
    artists = Array.from(map.values());
}

// Legacy: notes still persisted via the same artist edits map
function saveNotesToLocalStorage(artistId, notes) {
    const artist = artists.find(a => a.id === artistId);
    if (artist) {
        artist.notes = notes;
    }
    saveArtistEdit(artistId);
    saveArtists();
}

// Load notes from localStorage (kept for compat; mergeArtistEdits does the real work)
function loadNotesFromLocalStorage() {
    mergeArtistEdits();
}

// Import JSON file
function importJsonFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Accept flat array OR { artists: [...] } wrapper
            const imported = Array.isArray(importedData)
                ? importedData
                : Array.isArray(importedData.artists) ? importedData.artists : null;

            if (imported) {
                // Merge by id: update existing, add new, keep existing not in import
                const currentMap = new Map(artists.map(a => [a.id, a]));
                imported.forEach(item => {
                    if (item && item.id) {
                        currentMap.set(item.id, normalizeArtist({ ...(currentMap.get(item.id) || {}), ...item }));
                    }
                });
                artists = Array.from(currentMap.values());

                // Apply localStorage edits on top of merged data
                loadNotesFromLocalStorage();

                // Rebuild filters from new data
                buildFilters();

                // Re-render and persist
                if (currentView === 'dashboard') renderDashboard();
                renderArtists();
                saveArtists();

                alert('JSON импортирован');
            } else {
                alert('Ошибка: JSON файл должен содержать массив артистов');
            }
        } catch (error) {
            console.error('Error parsing JSON:', error);
            alert('Ошибка при чтении JSON файла');
        }
    };
    
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

// Reset all local edits and reload original JSON data
function resetLocalChanges() {
    if (!confirm('Сбросить все локальные изменения? Это удалит правки из localStorage и перезагрузит данные из JSON-файлов.')) {
        return;
    }
    localStorage.removeItem('artist_edits');
    localStorage.removeItem('artists');
    loadArtists().then(() => {
        if (currentView === 'dashboard') renderDashboard();
    });
    alert('Локальные изменения сброшены. Оригинальные данные загружены.');
}

// Export database as JSON (merges current artists incl. localStorage edits)
function exportDatabase() {
    // current artists already includes merged localStorage edits
    const exportData = { artists };
    const jsonString = JSON.stringify(exportData, null, 2);

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'artists-export.json';

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('База экспортирована как artists-export.json');
}

// Select artist and open side panel
function selectArtist(id) {
    selectedArtistId = id;
    renderArtists();
    showSidePanel(id);
}

// Pagination functions
function goToFirstPage() {
    currentPage = 1;
    renderArtists();
}

function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderArtists();
    }
}

function goToNextPage() {
    const totalPages = Math.ceil(artists.length / pageSize) || 1;
    if (currentPage < totalPages) {
        currentPage++;
        renderArtists();
    }
}

function goToLastPage() {
    const totalPages = Math.ceil(artists.length / pageSize) || 1;
    currentPage = totalPages;
    renderArtists();
}

function changePageSize(newSize) {
    pageSize = parseInt(newSize);
    currentPage = 1;
    renderArtists();
}

// Show side panel with artist details
function showSidePanel(id) {
    const artist = artists.find(a => a.id === id);
    if (!artist) return;

    selectedArtistId = id;
    currentArtistTab = 'crm';

    const sidePanel = document.getElementById('sidePanel');
    sidePanel.classList.remove('closed');
    sidePanel.classList.add('open');

    renderArtistTab();

    // Background analytics refresh is now handled by AnalyticsManager in the Node.js runtime.
}

function renderArtistPlatforms(artist) {
    if (!window.PlatformManager || !window.PLATFORM_META) return '';
    const statuses = window.PlatformManager.getAllStatuses(artist);
    const fields = statuses.map(s => {
        const meta = window.PLATFORM_META[s.platform];
        const statusClass = s.connected ? 'platform-status-ok' : s.invalid ? 'platform-status-warn' : 'platform-status-off';
        const statusText = s.connected ? '✓ Connected' : s.invalid ? '⚠ Invalid link' : '○ Not specified';
        return `
            <div class="platform-field-row ${s.invalid ? 'platform-invalid' : ''}">
                <div class="platform-field-icon" style="color:${meta.color}">${meta.icon}</div>
                <input type="url" class="platform-field-input"
                    value="${escapeHtml(s.url)}"
                    placeholder="${meta.name} URL"
                    onchange="updatePlatformLink('${artist.id}', '${s.platform}', this.value)"
                    onblur="updatePlatformLink('${artist.id}', '${s.platform}', this.value)">
                <div class="platform-field-status ${statusClass}">${statusText}</div>
            </div>`;
    }).join('');
    return `
        <div class="private-only border-t border-gray-700 pt-4 mt-4">
            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Платформы</h3>
            <div class="platform-fields">${fields}</div>
        </div>`;
}

window.updatePlatformLink = function(artistId, platform, url) {
    const artist = artists.find(a => a.id === artistId);
    if (!artist) return;
    artist[platform] = url.trim();
    saveArtists();
    saveArtistEdit(artistId);
    if (selectedArtistId === artistId) {
        renderArtistTab();
    }
};

function renderArtistCrm(artist) {
    return `
        <div class="flex items-center gap-3.5 mb-6">
            <div class="w-12 h-12 rounded-full crm-avatar text-lg">${artist.name.charAt(0).toUpperCase()}</div>
            <div class="min-w-0">
                <h3 class="crm-section-title text-white leading-tight truncate">${artist.name}</h3>
                <div class="flex items-center gap-2 mt-1">
                    <span class="${genreClass(artist.genre)} badge">${artist.genre || '-'}</span>
                    <span class="agency-${slugify(artist.agency || 'independent')} badge">${artist.agency || 'Independent'}</span>
                </div>
            </div>
        </div>

        <div class="space-y-5">
            <div class="panel-row">
                <div class="detail-label">Страна</div>
                <div class="detail-value">${flagLabel(artist.country)}</div>
            </div>

            <div class="panel-row">
                <div class="detail-label">Тип агентства</div>
                <div class="detail-value">${artist.agencyType || '-'}</div>
            </div>

            <div class="panel-row private-only">
                <div class="detail-label">Контакт</div>
                <div class="detail-value flex items-center justify-between gap-2">
                    <span class="truncate text-sm">${artist.contact || '-'}</span>
                    ${artist.contact ? `<button onclick="copyToClipboard('${artist.contact}')" class="crm-btn-sm">Копировать</button>` : ''}
                </div>
            </div>

            ${artist.website ? `
            <div class="panel-row">
                <div class="detail-label">Сайт</div>
                <div class="detail-value flex items-center justify-between gap-2">
                    <span class="truncate text-sm">${artist.website}</span>
                    <button onclick="openLink('${artist.website}')" class="crm-btn-sm">Открыть</button>
                </div>
            </div>` : ''}

            ${artist.facebook ? `
            <div class="panel-row">
                <div class="detail-label">Facebook</div>
                <div class="detail-value text-sm">${artist.facebook}</div>
            </div>` : ''}

            ${renderArtistPlatforms(artist)}

            <div class="private-only border-t border-gray-700 pt-4">
                <div class="grid grid-cols-2 gap-4">
                    <div class="panel-row">
                        <div class="detail-label">Booking Fee</div>
                        <div class="detail-value font-mono text-base">${getBookingFeeLabel(artist.bookingFee ?? artist.price)}</div>
                    </div>
                    <div class="panel-row">
                        <div class="detail-label">Статус</div>
                        <div class="detail-value">
                            <span class="bstatus-${slugify(artist.bookingStatus)} badge">${artist.bookingStatus || '-'}</span>
                        </div>
                    </div>
                    <div class="panel-row">
                        <div class="detail-label">Интерес</div>
                        <div class="detail-value">${starsLabel(artist.interest)}</div>
                    </div>
                    <div class="panel-row">
                        <div class="detail-label">Приоритет</div>
                        <div class="detail-value">${starsLabel(artist.priority)}</div>
                    </div>
                </div>
            </div>

            <div class="panel-row private-only">
                <div class="detail-label">Запланированное событие</div>
                <div class="detail-value">${artist.plannedEvent || '-'}</div>
            </div>

            <div class="private-only border-t border-gray-700 pt-4">
                <div class="detail-label mb-1">Заметки</div>
                <textarea
                    id="artistNotesEdit"
                    class="w-full bg-gray-700 border border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows="4"
                    placeholder="Добавить заметки..."
                    onchange="saveNotesToLocalStorage('${artist.id}', this.value)"
                >${artist.notes || ''}</textarea>
            </div>

            <div class="private-only border-t border-gray-700 pt-4">
                <div class="grid grid-cols-2 gap-4">
                    <div class="panel-row">
                        <div class="detail-label">Manager</div>
                        <div class="detail-value">${artist.manager || '-'}</div>
                    </div>
                    <div class="panel-row">
                        <div class="detail-label">Artist Source</div>
                        <div class="detail-value">${artist.artistSource || '-'}</div>
                    </div>
                    <div class="panel-row">
                        <div class="detail-label">Last Contact</div>
                        <div class="detail-value">${artist.lastContact || '-'}</div>
                    </div>
                    <div class="panel-row">
                        <div class="detail-label">Next Contact</div>
                        <div class="detail-value">${artist.nextContact || '-'}</div>
                    </div>
                </div>
                <div class="panel-row">
                    <div class="detail-label">Next Action</div>
                    <div class="detail-value">${artist.nextAction || '-'}</div>
                </div>
                <div class="panel-row">
                    <div class="detail-label">Internal Notes</div>
                    <div class="detail-value text-sm">${artist.internalNotes || '-'}</div>
                </div>
            </div>

            ${renderTimelineReadonly(artist.timeline || [])}

        </div>
    `;
}

function renderArtistDocuments(artist) {
    return `
        <div class="ai-tab-placeholder">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            <div><strong>Documents</strong></div>
            <div>Прикрепление документов, райдеров и техников будет доступно в следующем обновлении.</div>
        </div>
    `;
}

function renderArtistAi(artist) {
    return `
        <div class="ai-tab-placeholder">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            <div><strong>AI Intelligence</strong></div>
            <div>Расширенный AI-ассистент для анализа рисков, подбора событий и прогнозирования спроса будет добавлен позже.</div>
        </div>
    `;
}

// Dashboard rendering
function renderDashboard() {
    const isPublic = appMode === 'public';

    // KPIs
    const total = artists.length;
    const activeNegotiations = artists.filter(a => a.bookingStatus === 'Negotiating').length;
    const needContact = artists.filter(a => !a.lastContact || isOverdue(a.nextContact)).length;
    const confirmed = artists.filter(a => a.bookingStatus === 'Confirmed' || a.bookingStatus === 'Booked').length;
    const overdue = artists.filter(a => isOverdue(a.nextContact)).length;

    const kpiData = [
        { label: 'Всего артистов', value: total, color: 'blue' },
        { label: 'В переговорах', value: activeNegotiations, color: 'amber' },
        { label: 'Нужен контакт', value: needContact, color: 'purple' },
        { label: 'Подтверждено', value: confirmed, color: 'green' },
        { label: 'Просрочено', value: overdue, color: 'red' }
    ];

    document.getElementById('kpiCards').innerHTML = kpiData.map(kpi => `
        <div class="kpi-card kpi-${kpi.color}">
            <div class="kpi-value">${kpi.value}</div>
            <div class="kpi-label">${kpi.label}</div>
        </div>
    `).join('');

    if (!isPublic) {
        // Missing social/streaming links
        const missingLinks = generateMissingLinks();
        const missingSection = document.getElementById('missingLinksSection');
        if (missingSection) {
            missingSection.style.display = missingLinks.length > 0 ? 'block' : 'none';
        }
        renderTaskList('missingLinksList', 'missingLinksCount', missingLinks);

        // Today's tasks
        const tasks = generateTasks();
        renderTaskList('tasksList', 'tasksCount', tasks);

        // AI Recommendations
        const recommendations = generateRecommendations();
        renderTaskList('recommendationsList', 'recommendationsCount', recommendations);

        // Waiting for reply
        const waiting = artists
            .filter(a => a.bookingStatus === 'Waiting Reply')
            .sort((a, b) => new Date(a.lastContact || 0) - new Date(b.lastContact || 0));
        renderArtistList('waitingList', 'waitingCount', waiting, 'lastContact');

        // Upcoming events
        const events = groupByPlannedEvent();
        renderEvents(events);
    }
}

function generateMissingLinks() {
    const platforms = ['spotify', 'youtube', 'instagram', 'tiktok', 'yandex', 'soundcloud', 'vk', 'facebook'];
    return artists
        .filter(a => !platforms.some(p => a[p] && a[p].trim()))
        .map(a => ({ artist: a, text: 'Добавить ссылки на соцсети/стриминги', type: 'links' }));
}

function isOverdue(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
}

function isToday(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

function daysSince(dateStr) {
    if (!dateStr) return Infinity;
    const date = new Date(dateStr);
    const today = new Date();
    return Math.floor((today - date) / (1000 * 60 * 60 * 24));
}

function generateTasks() {
    const tasks = [];
    artists.forEach(a => {
        if (a.nextContact && (isToday(a.nextContact) || isOverdue(a.nextContact))) {
            tasks.push({ artist: a, text: `Связаться с артистом (Next Contact ${a.nextContact})`, type: 'contact' });
        }
        if (a.bookingStatus === 'Waiting Reply') {
            tasks.push({ artist: a, text: 'Ожидает ответа — проверить статус', type: 'waiting' });
        }
        if (!a.plannedEvent) {
            tasks.push({ artist: a, text: 'Запланировать событие', type: 'event' });
        }
        if ((a.bookingFee === undefined || a.bookingFee === null || a.bookingFee === 0) && (a.price === undefined || a.price === null || a.price === 0)) {
            tasks.push({ artist: a, text: 'Указать Booking Fee', type: 'fee' });
        }
    });
    return tasks;
}

function generateRecommendations() {
    const recs = [];
    const platforms = [
        { key: 'spotify', label: 'Spotify', type: 'spotify' },
        { key: 'youtube', label: 'YouTube', type: 'youtube' },
        { key: 'instagram', label: 'Instagram', type: 'instagram' },
        { key: 'tiktok', label: 'TikTok', type: 'tiktok' },
        { key: 'yandex', label: 'Yandex Music', type: 'yandex' },
        { key: 'soundcloud', label: 'SoundCloud', type: 'soundcloud' },
        { key: 'vk', label: 'VK', type: 'vk' },
        { key: 'facebook', label: 'Facebook', type: 'facebook' }
    ];
    artists.forEach(a => {
        platforms.forEach(p => {
            if (!a[p.key] || !a[p.key].trim()) {
                recs.push({ artist: a, text: `Добавить ${p.label}`, type: p.type });
            }
        });
        if ((a.bookingFee === undefined || a.bookingFee === null || a.bookingFee === 0) && (a.price === undefined || a.price === null || a.price === 0)) {
            recs.push({ artist: a, text: 'Указать Booking Fee', type: 'fee' });
        }
        if (!a.manager) {
            recs.push({ artist: a, text: 'Назначить менеджера', type: 'manager' });
        }
        if (a.bookingStatus === 'Negotiating' && a.lastContact && daysSince(a.lastContact) > 14) {
            recs.push({ artist: a, text: 'Переговоры простаивают более 14 дней', type: 'stale' });
        }
        if (!a.plannedEvent) {
            recs.push({ artist: a, text: 'Добавить Planned Event', type: 'event' });
        }
    });
    return recs;
}

function groupByPlannedEvent() {
    const map = new Map();
    artists.forEach(a => {
        const event = a.plannedEvent?.trim() || 'Без события';
        if (!map.has(event)) map.set(event, { event, artists: [] });
        map.get(event).artists.push(a);
    });
    return Array.from(map.values()).sort((a, b) => b.artists.length - a.artists.length);
}

function renderTaskList(containerId, countId, items) {
    const container = document.getElementById(containerId);
    const count = document.getElementById(countId);
    if (!container || !count) return;
    count.textContent = items.length;

    if (items.length === 0) {
        container.innerHTML = '<div class="dashboard-empty">Нет данных</div>';
        return;
    }

    container.innerHTML = items.slice(0, 20).map(item => `
        <div class="dashboard-item" onclick="goToArtist('${item.artist.id}')">
            <div class="dashboard-item-icon ${item.type}"></div>
            <div class="dashboard-item-body">
                <div class="dashboard-item-title">${escapeHtml(item.artist.name)}</div>
                <div class="dashboard-item-text">${escapeHtml(item.text)}</div>
            </div>
        </div>
    `).join('');
}

function renderArtistList(containerId, countId, items, dateField) {
    const container = document.getElementById(containerId);
    const count = document.getElementById(countId);
    if (!container || !count) return;
    count.textContent = items.length;

    if (items.length === 0) {
        container.innerHTML = '<div class="dashboard-empty">Нет данных</div>';
        return;
    }

    container.innerHTML = items.map(a => `
        <div class="dashboard-item" onclick="goToArtist('${a.id}')">
            <div class="dashboard-item-body">
                <div class="dashboard-item-title">${escapeHtml(a.name)}</div>
                <div class="dashboard-item-text">${dateField && a[dateField] ? 'Последний контакт: ' + a[dateField] : (a.bookingStatus || '-')}</div>
            </div>
        </div>
    `).join('');
}

function renderEvents(events) {
    const container = document.getElementById('eventsList');
    const count = document.getElementById('eventsCount');
    if (!container || !count) return;
    count.textContent = events.length;

    if (events.length === 0) {
        container.innerHTML = '<div class="dashboard-empty">Нет данных</div>';
        return;
    }

    container.innerHTML = events.map(e => `
        <div class="dashboard-event-card">
            <div class="dashboard-event-name">${escapeHtml(e.event)}</div>
            <div class="dashboard-event-count">${e.artists.length} артист${e.artists.length === 1 ? '' : e.artists.length < 5 ? 'а' : 'ов'}</div>
        </div>
    `).join('');
}

function goToArtist(id) {
    selectedArtistId = id;
    switchView('artists');
    showSidePanel(id);
    renderArtists();
}

// Render a read-only timeline block for the side panel
function renderTimelineReadonly(timeline) {
    const sorted = [...timeline].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (sorted.length === 0) return '';

    const items = sorted.map(entry => `
        <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <div class="timeline-meta">${entry.date || 'No date'}</div>
                <div class="timeline-title">${escapeHtml(entry.title || 'No title')}</div>
                <div class="timeline-comment">${escapeHtml(entry.comment || '')}</div>
            </div>
        </div>
    `).join('');

    return `
        <div class="private-only border-t border-gray-700 pt-4">
            <div class="detail-label mb-2">Timeline</div>
            <div class="timeline-list">${items}</div>
        </div>
    `;
}

// Close side panel
function closeSidePanel() {
    const sidePanel = document.getElementById('sidePanel');
    sidePanel.classList.remove('open');
    sidePanel.classList.add('closed');
    selectedArtistId = null;
    renderArtists();
}

function populateEditPanel(artist) {
    const isNew = !artist;
    const a = artist || {};

    document.getElementById('editPanelTitle').textContent = isNew ? 'New Artist' : (a.name || 'Artist');
    document.getElementById('editPanelGenre').textContent = a.genre || '-';
    document.getElementById('editPanelGenre').className = `badge ${genreClass(a.genre)}`;
    document.getElementById('editPanelCountry').textContent = a.country ? flagLabel(a.country) + ' ' + a.country : '';
    document.getElementById('editPanelAgency').textContent = a.agency ? '· ' + a.agency : '';

    document.getElementById('artistId').value = a.id || '';
    document.getElementById('artistName').value = a.name || '';
    document.getElementById('artistGenre').value = a.genre || '';
    document.getElementById('artistContact').value = a.contact || '';
    document.getElementById('artistDescription').value = a.description || '';
    document.getElementById('artistCountry').value = a.country || '';
    document.getElementById('artistAgency').value = a.agency || '';
    document.getElementById('artistStatus').value = a.status || 'active';
    document.getElementById('artistPriority').value = a.priority || 0;
    document.getElementById('artistInterest').value = a.interest || 0;
    document.getElementById('artistBookingStatus').value = a.bookingStatus || '';
    document.getElementById('artistAgencyType').value = a.agencyType || '';
    document.getElementById('artistPlannedEvent').value = a.plannedEvent || '';
    document.getElementById('artistBookingFee').value = a.bookingFee ?? a.price ?? 0;
    document.getElementById('artistWebsite').value = a.website || '';
    document.getElementById('artistInstagram').value = a.instagram || '';
    document.getElementById('artistFacebook').value = a.facebook || '';
    document.getElementById('artistSpotify').value = a.spotify || '';
    document.getElementById('artistYouTube').value = a.youtube || '';
    document.getElementById('artistTikTok').value = a.tiktok || '';
    document.getElementById('artistYandex').value = a.yandex || '';
    document.getElementById('artistSoundCloud').value = a.soundcloud || '';
    document.getElementById('artistVK').value = a.vk || '';
    document.getElementById('artistNotes').value = a.notes || '';

    // CRM fields
    document.getElementById('artistManager').value = a.manager || '';
    document.getElementById('artistLastContact').value = a.lastContact || '';
    document.getElementById('artistNextContact').value = a.nextContact || '';
    document.getElementById('artistNextAction').value = a.nextAction || '';
    document.getElementById('artistSource').value = a.artistSource || '';
    document.getElementById('artistInternalNotes').value = a.internalNotes || '';

    renderTimelineEditor(a.timeline || []);
}

// Render timeline editor entries in the edit panel
function renderTimelineEditor(timeline) {
    const editor = document.getElementById('timelineEditor');
    const empty = document.getElementById('timelineEmpty');
    if (!editor || !empty) return;

    const sorted = [...timeline].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sorted.length === 0) {
        editor.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    editor.innerHTML = sorted.map((entry, index) => `
        <div class="timeline-entry" data-index="${index}">
            <div class="grid grid-cols-3 gap-3 mb-2">
                <div class="col-span-1">
                    <input type="date" class="timeline-date w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm" value="${entry.date || ''}">
                </div>
                <div class="col-span-2">
                    <input type="text" class="timeline-title w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm" placeholder="Title" value="${escapeHtml(entry.title || '')}">
                </div>
            </div>
            <textarea class="timeline-comment w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm mb-2" rows="2" placeholder="Comment">${escapeHtml(entry.comment || '')}</textarea>
            <div class="flex justify-end">
                <button type="button" onclick="deleteTimelineEntry(this)" class="btn-danger" style="height: 28px; padding: 0 10px; font-size: 0.8rem;">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    Удалить
                </button>
            </div>
        </div>
    `).join('');
}

// Collect timeline entries from the edit panel, sorted newest first
function collectTimelineEntries() {
    const editor = document.getElementById('timelineEditor');
    if (!editor) return [];
    const entries = [];
    editor.querySelectorAll('.timeline-entry').forEach(entry => {
        entries.push({
            date: entry.querySelector('.timeline-date').value,
            title: entry.querySelector('.timeline-title').value,
            comment: entry.querySelector('.timeline-comment').value
        });
    });
    return entries.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Add a new empty timeline entry
function addTimelineEntry() {
    const editor = document.getElementById('timelineEditor');
    const empty = document.getElementById('timelineEmpty');
    if (!editor) return;
    if (empty) empty.classList.add('hidden');

    const today = new Date().toISOString().split('T')[0];
    const div = document.createElement('div');
    div.className = 'timeline-entry';
    div.innerHTML = `
        <div class="grid grid-cols-3 gap-3 mb-2">
            <div class="col-span-1">
                <input type="date" class="timeline-date w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm" value="${today}">
            </div>
            <div class="col-span-2">
                <input type="text" class="timeline-title w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm" placeholder="Title">
            </div>
        </div>
        <textarea class="timeline-comment w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm mb-2" rows="2" placeholder="Comment"></textarea>
        <div class="flex justify-end">
            <button type="button" onclick="deleteTimelineEntry(this)" class="btn-danger" style="height: 28px; padding: 0 10px; font-size: 0.8rem;">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                Удалить
            </button>
        </div>
    `;
    editor.insertBefore(div, editor.firstChild);
}

// Delete a timeline entry from the edit panel
function deleteTimelineEntry(button) {
    const entry = button.closest('.timeline-entry');
    if (!entry) return;
    entry.remove();
    const editor = document.getElementById('timelineEditor');
    const empty = document.getElementById('timelineEmpty');
    if (editor && empty && editor.querySelectorAll('.timeline-entry').length === 0) {
        empty.classList.remove('hidden');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Open edit panel for adding artist
function openAddModal() {
    document.getElementById('artistForm').reset();
    populateEditPanel(null);
    openEditPanel();
}

// Open edit panel for editing artist
function editArtist() {
    if (!selectedArtistId) return;

    const artist = artists.find(a => a.id === selectedArtistId);
    if (!artist) return;

    populateEditPanel(artist);
    openEditPanel();
}

function openEditPanel() {
    const overlay = document.getElementById('editPanelOverlay');
    const panel = document.getElementById('editPanel');
    overlay.classList.remove('hidden');
    panel.classList.remove('closed');
    panel.classList.add('open');
}

// Close edit panel
function closeEditPanel() {
    const overlay = document.getElementById('editPanelOverlay');
    const panel = document.getElementById('editPanel');
    panel.classList.remove('open');
    panel.classList.add('closed');
    overlay.classList.add('hidden');
}

// Save artist (add or edit)
function saveArtist(event) {
    event.preventDefault();

    const id = document.getElementById('artistId').value;
    const artistData = {
        id: id || Date.now().toString(),
        name: document.getElementById('artistName').value,
        genre: document.getElementById('artistGenre').value,
        contact: document.getElementById('artistContact').value,
        bookingFee: parseInt(document.getElementById('artistBookingFee').value) || 0,
        description: document.getElementById('artistDescription').value,
        country: document.getElementById('artistCountry').value,
        agency: document.getElementById('artistAgency').value,
        status: document.getElementById('artistStatus').value,
        priority: parseInt(document.getElementById('artistPriority').value) || 0,
        interest: parseInt(document.getElementById('artistInterest').value) || 0,
        bookingStatus: document.getElementById('artistBookingStatus').value,
        agencyType: document.getElementById('artistAgencyType').value,
        plannedEvent: document.getElementById('artistPlannedEvent').value,
        website: document.getElementById('artistWebsite').value,
        instagram: document.getElementById('artistInstagram').value,
        facebook: document.getElementById('artistFacebook').value,
        spotify: document.getElementById('artistSpotify').value,
        youtube: document.getElementById('artistYouTube').value,
        tiktok: document.getElementById('artistTikTok').value,
        yandex: document.getElementById('artistYandex').value,
        soundcloud: document.getElementById('artistSoundCloud').value,
        vk: document.getElementById('artistVK').value,
        notes: document.getElementById('artistNotes').value,
        manager: document.getElementById('artistManager').value,
        lastContact: document.getElementById('artistLastContact').value,
        nextContact: document.getElementById('artistNextContact').value,
        nextAction: document.getElementById('artistNextAction').value,
        artistSource: document.getElementById('artistSource').value,
        internalNotes: document.getElementById('artistInternalNotes').value,
        timeline: collectTimelineEntries()
    };

    if (id) {
        // Update existing artist
        const index = artists.findIndex(a => a.id === id);
        if (index !== -1) {
            artists[index] = artistData;
        }
        // Update side panel if this artist is selected
        if (selectedArtistId === id) {
            showSidePanel(id);
        }
    } else {
        // Add new artist
        artists.push(artistData);
    }

    saveArtists();
    saveArtistEdit(artistData.id);
    renderArtists();
    if (currentView === 'dashboard') renderDashboard();
    closeEditPanel();
}


// Delete artist
function deleteArtist() {
    if (!selectedArtistId) return;
    
    if (confirm('Удалить этого артиста?')) {
        artists = artists.filter(a => a.id !== selectedArtistId);
        saveArtists();
        closeSidePanel();
        renderArtists();
        if (currentView === 'dashboard') renderDashboard();
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load artists on page load (renderArtists inside will update arrows)
    loadArtists();

    // Add artist button
    document.getElementById('addArtistBtn').addEventListener('click', openAddModal);

    // Import JSON button
    document.getElementById('importJsonBtn').addEventListener('click', () => {
        document.getElementById('jsonFileInput').click();
    });

    // JSON file input change
    document.getElementById('jsonFileInput').addEventListener('change', importJsonFile);

    // Export Database button
    document.getElementById('exportDatabaseBtn').addEventListener('click', exportDatabase);

    // Form submit
    document.getElementById('artistForm').addEventListener('submit', saveArtist);

    // Search input with debounce for performance
    document.getElementById('searchInput').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            renderArtists();
        }, 300);
    });

    // Genre filter
    document.getElementById('genreFilter').addEventListener('change', renderArtists);

    // Country filter
    document.getElementById('countryFilter').addEventListener('change', renderArtists);

    // Booking status filter
    document.getElementById('bookingStatusFilter').addEventListener('change', renderArtists);

    // Agency type filter
    document.getElementById('agencyTypeFilter').addEventListener('change', renderArtists);

    // Pagination controls
    document.getElementById('firstPageBtn').addEventListener('click', goToFirstPage);
    document.getElementById('prevPageBtn').addEventListener('click', goToPrevPage);
    document.getElementById('nextPageBtn').addEventListener('click', goToNextPage);
    document.getElementById('lastPageBtn').addEventListener('click', goToLastPage);
    document.getElementById('pageSize').addEventListener('change', (e) => changePageSize(e.target.value));

    // Close panel button
    document.getElementById('closePanelBtn').addEventListener('click', closeSidePanel);

    // Edit artist button
    document.getElementById('editArtistBtn').addEventListener('click', editArtist);

    // Delete artist button
    document.getElementById('deleteArtistBtn').addEventListener('click', deleteArtist);

    // Close edit panel on outside click (overlay)
    document.getElementById('editPanelOverlay').addEventListener('click', () => {
        closeEditPanel();
    });

    // Close edit panel on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeEditPanel();
            closeSidePanel();
        }
    });
});
