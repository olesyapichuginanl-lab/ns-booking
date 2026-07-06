// Artist Database Application
let artists = [];
let selectedArtistId = null;
let currentPage = 1;
let pageSize = 25;
let searchTimeout = null;
let appMode = localStorage.getItem('appMode') || 'private'; // 'public' | 'private'

function toggleMode() {
    appMode = appMode === 'private' ? 'public' : 'private';
    localStorage.setItem('appMode', appMode);
    applyMode();
    renderArtists();
    if (selectedArtistId) showSidePanel(selectedArtistId);
}

function applyMode() {
    const isPublic = appMode === 'public';
    document.body.classList.toggle('mode-public', isPublic);
    document.body.classList.toggle('mode-private', !isPublic);
    // Toggle indicator
    const slider = document.getElementById('modeSlider');
    const pubLabel = document.getElementById('modePublic');
    const privLabel = document.getElementById('modePrivate');
    if (slider) slider.style.transform = isPublic ? 'translateX(0)' : 'translateX(100%)';
    if (pubLabel) pubLabel.classList.toggle('mode-active', isPublic);
    if (privLabel) privLabel.classList.toggle('mode-active', !isPublic);
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
        artists = results.flat();
    } catch (error) {
        console.error('Error loading artists:', error);
        artists = [];
    }

    loadNotesFromLocalStorage();
    buildFilters();
    applyMode();
    renderArtists();
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
    const sortBy = document.getElementById('sortBy').value;

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
    filteredArtists.sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'country') return (a.country || '').localeCompare(b.country || '');
        if (sortBy === 'priority') return (b.priority || 0) - (a.priority || 0);
        if (sortBy === 'interest') return (b.interest || 0) - (a.interest || 0);
        if (sortBy === 'agency') return (a.agency || 'Independent').localeCompare(b.agency || 'Independent');

        return 0;
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
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">${artist.name.charAt(0).toUpperCase()}</div>
                    <span class="text-sm font-medium text-white">${artist.name}</span>
                </div>
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
                <span class="${genreClass(artist.genre)} badge">${artist.genre || '-'}</span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-400">${flagLabel(artist.country)}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-400">${artist.agency || 'Independent'}</td>
            <td class="private-only px-4 py-3 whitespace-nowrap text-sm font-mono text-amber-400">${getBookingFeeLabel(artist.bookingFee ?? artist.price)}</td>
            <td class="private-only px-4 py-3 whitespace-nowrap text-sm text-gray-400">${artist.plannedEvent || '-'}</td>
            <td class="private-only px-4 py-3 whitespace-nowrap">
                <span class="bstatus-${slugify(artist.bookingStatus)} badge">${artist.bookingStatus || '-'}</span>
            </td>
            <td class="private-only px-4 py-3 whitespace-nowrap text-sm">${starsLabel(artist.interest)}</td>
            <td class="private-only px-4 py-3 whitespace-nowrap text-sm">${starsLabel(artist.priority)}</td>
        </tr>
    `).join('');

    updatePagination(filteredArtists.length, totalPages);
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

    artists = artists.map(artist => {
        if (edits[artist.id]) {
            return { ...artist, ...edits[artist.id] };
        }
        return artist;
    });
}

// Legacy: notes still persisted via the same artist edits map
function saveNotesToLocalStorage(artistId, notes) {
    const artist = artists.find(a => a.id === artistId);
    if (artist) {
        artist.notes = notes;
    }
    saveArtistEdit(artistId);
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
                        currentMap.set(item.id, { ...(currentMap.get(item.id) || {}), ...item });
                    }
                });
                artists = Array.from(currentMap.values());

                // Apply localStorage edits on top of merged data
                loadNotesFromLocalStorage();

                // Rebuild filters from new data
                buildFilters();

                // Re-render
                renderArtists();

                alert('JSON файл успешно импортирован!');
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
    if (!confirm('Reset all local changes? This will remove edits stored in localStorage and reload data from JSON files.')) {
        return;
    }
    localStorage.removeItem('artist_edits');
    localStorage.removeItem('artists');
    loadArtists();
    alert('Local changes reset. Original data reloaded.');
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

    alert('Database exported as artists-export.json');
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

    const panelContent = document.getElementById('panelContent');
    panelContent.innerHTML = `
        <div class="flex items-center gap-3 mb-5">
            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white flex-shrink-0">${artist.name.charAt(0).toUpperCase()}</div>
            <div>
                <h3 class="text-lg font-semibold text-white leading-tight">${artist.name}</h3>
                <span class="${genreClass(artist.genre)} badge mt-1 inline-block">${artist.genre || '-'}</span>
            </div>
        </div>

        <div class="space-y-3">

            <div class="panel-row">
                <div class="detail-label">Country</div>
                <div class="detail-value">${flagLabel(artist.country)}</div>
            </div>

            <div class="panel-row">
                <div class="detail-label">Agency</div>
                <div class="detail-value">${artist.agency || '-'}</div>
            </div>

            <div class="panel-row">
                <div class="detail-label">Agency Type</div>
                <div class="detail-value">${artist.agencyType || '-'}</div>
            </div>

            <div class="panel-row private-only">
                <div class="detail-label">Booking Email</div>
                <div class="detail-value flex items-center justify-between gap-2">
                    <span class="truncate text-sm">${artist.contact || '-'}</span>
                    ${artist.contact ? `<button onclick="copyToClipboard('${artist.contact}')" class="crm-btn-sm">Copy</button>` : ''}
                </div>
            </div>

            ${artist.website ? `
            <div class="panel-row">
                <div class="detail-label">Website</div>
                <div class="detail-value flex items-center justify-between gap-2">
                    <span class="truncate text-blue-400 text-sm">${artist.website}</span>
                    <button onclick="openLink('${artist.website}')" class="crm-btn-sm">Open</button>
                </div>
            </div>` : ''}

            ${artist.instagram ? `
            <div class="panel-row">
                <div class="detail-label">Instagram</div>
                <div class="detail-value flex items-center justify-between gap-2">
                    <span class="truncate text-sm">${artist.instagram}</span>
                    <button onclick="openLink('https://instagram.com/${artist.instagram.replace('@','')}')" class="crm-btn-sm">Open</button>
                </div>
            </div>` : ''}

            ${artist.facebook ? `
            <div class="panel-row">
                <div class="detail-label">Facebook</div>
                <div class="detail-value text-sm">${artist.facebook}</div>
            </div>` : ''}

            <div class="private-only" style="border-top:1px solid #374151;margin:4px 0"></div>

            <div class="panel-row private-only">
                <div class="detail-label">Booking Fee</div>
                <div class="detail-value font-mono text-amber-400 text-base">${getBookingFeeLabel(artist.bookingFee ?? artist.price)}</div>
            </div>

            <div class="panel-row private-only">
                <div class="detail-label">Booking Status</div>
                <div class="detail-value">
                    <span class="bstatus-${slugify(artist.bookingStatus)} badge">${artist.bookingStatus || '-'}</span>
                </div>
            </div>

            <div class="panel-row private-only">
                <div class="detail-label">Interest</div>
                <div class="detail-value">${starsLabel(artist.interest)}</div>
            </div>

            <div class="panel-row private-only">
                <div class="detail-label">Priority</div>
                <div class="detail-value">${starsLabel(artist.priority)}</div>
            </div>

            <div class="panel-row private-only">
                <div class="detail-label">Planned Event</div>
                <div class="detail-value">${artist.plannedEvent || '-'}</div>
            </div>

            <div class="private-only" style="border-top:1px solid #374151;margin:4px 0"></div>

            <div class="private-only">
                <div class="detail-label mb-1">Notes</div>
                <textarea
                    id="artistNotesEdit"
                    class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows="4"
                    placeholder="Add notes..."
                    onchange="saveNotesToLocalStorage('${artist.id}', this.value)"
                >${artist.notes || ''}</textarea>
            </div>

        </div>
    `;

    const sidePanel = document.getElementById('sidePanel');
    sidePanel.classList.remove('closed');
    sidePanel.classList.add('open');
}

// Close side panel
function closeSidePanel() {
    const sidePanel = document.getElementById('sidePanel');
    sidePanel.classList.remove('open');
    sidePanel.classList.add('closed');
    selectedArtistId = null;
    renderArtists();
}

// Open modal for adding artist
function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Добавить артиста';
    document.getElementById('artistForm').reset();
    document.getElementById('artistId').value = '';
    document.getElementById('artistModal').classList.remove('hidden');
    document.getElementById('artistModal').classList.add('flex');
}

// Open modal for editing artist
function editArtist() {
    if (!selectedArtistId) return;
    
    const artist = artists.find(a => a.id === selectedArtistId);
    if (!artist) return;

    document.getElementById('modalTitle').textContent = 'Редактировать артиста';
    document.getElementById('artistId').value = artist.id;
    document.getElementById('artistName').value = artist.name;
    document.getElementById('artistGenre').value = artist.genre;
    document.getElementById('artistContact').value = artist.contact || '';
    document.getElementById('artistDescription').value = artist.description || '';
    document.getElementById('artistCountry').value = artist.country || '';
    document.getElementById('artistAgency').value = artist.agency || '';
    document.getElementById('artistStatus').value = artist.status || 'active';
    document.getElementById('artistPriority').value = artist.priority || 0;
    document.getElementById('artistInterest').value = artist.interest || 0;
    document.getElementById('artistBookingStatus').value = artist.bookingStatus || '';
    document.getElementById('artistAgencyType').value = artist.agencyType || '';
    document.getElementById('artistPlannedEvent').value = artist.plannedEvent || '';
    document.getElementById('artistBookingFee').value = artist.bookingFee ?? artist.price ?? 0;
    document.getElementById('artistWebsite').value = artist.website || '';
    document.getElementById('artistInstagram').value = artist.instagram || '';
    document.getElementById('artistFacebook').value = artist.facebook || '';
    document.getElementById('artistNotes').value = artist.notes || '';

    document.getElementById('artistModal').classList.remove('hidden');
    document.getElementById('artistModal').classList.add('flex');
}

// Close modal
function closeModal() {
    document.getElementById('artistModal').classList.add('hidden');
    document.getElementById('artistModal').classList.remove('flex');
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
        notes: document.getElementById('artistNotes').value
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
    closeModal();
}

// Delete artist
function deleteArtist() {
    if (!selectedArtistId) return;
    
    if (confirm('Вы уверены, что хотите удалить этого артиста?')) {
        artists = artists.filter(a => a.id !== selectedArtistId);
        saveArtists();
        closeSidePanel();
        renderArtists();
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load artists on page load
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

    // Reset Local Changes button
    document.getElementById('resetChangesBtn').addEventListener('click', resetLocalChanges);

    // Cancel button
    document.getElementById('cancelBtn').addEventListener('click', closeModal);

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

    // Sort by
    document.getElementById('sortBy').addEventListener('change', renderArtists);

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

    // Close modal on outside click
    document.getElementById('artistModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('artistModal')) {
            closeModal();
        }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeSidePanel();
        }
    });
});
