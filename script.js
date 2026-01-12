// Search
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput.value.trim()) {
        window.open(`https://google.com/search?q=${encodeURIComponent(searchInput.value)}`, '_blank');
    }
}

document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

// Weather (MET Norway API)
async function loadWeather() {
    try {
        const osloLat = 59.9139;
        const osloLon = 10.7522;
        document.querySelector('.weather-temp').textContent = '...';
        document.querySelector('.weather-desc').textContent = 'Oslo, fetching...';

        const resp = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${osloLat}&lon=${osloLon}`);
        if (!resp.ok) throw new Error('MET API error');
        const json = await resp.json();

        const timeseries = json.properties && json.properties.timeseries;
        if (timeseries && timeseries.length > 0) {
            const first = timeseries[0];
            const instant = first.data && first.data.instant && first.data.instant.details;
            const summary = first.data && (first.data.next_1_hours || first.data.next_6_hours || first.data.next_12_hours);
            const temp = instant && instant.air_temperature;
            const desc = summary && summary.summary && summary.summary.symbol_code ? summary.summary.symbol_code.replace(/_/g, ' ') : '—';

            if (typeof temp === 'number') {
                document.querySelector('.weather-temp').textContent = `${Math.round(temp)}°C`;
            } else {
                document.querySelector('.weather-temp').textContent = '--°C';
            }

            document.querySelector('.weather-desc').textContent = `Oslo — ${desc}`;
        } else {
            throw new Error('No data');
        }
    } catch (e) {
        document.querySelector('.weather-temp').textContent = '--°C';
        document.querySelector('.weather-desc').textContent = 'Unavailable';
        console.warn('Weather error', e);
    }
}

// Time
function updateTime() {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 => 12
    minutes = minutes < 10 ? '0' + minutes : minutes;
    const time = `${hours}:${minutes} ${ampm}`;
    document.getElementById('time').textContent = time;
}

setInterval(updateTime, 1000);
updateTime();

// Steam API - fetch discounts in UAH
async function loadSteamGames() {
    const container = document.getElementById('steamGames');
    if (!container) return;
    container.innerHTML = '<div class="steam-game">Loading...</div>';

    try {
        const response = await fetch('https://store.steampowered.com/api/featuredcategories?cc=ua&l=uk');
        if (!response.ok) throw new Error('Steam store error');
        const data = await response.json();
        const items = data && data.specials && data.specials.items ? data.specials.items : [];
        if (!items.length) throw new Error('No specials');

        const formatter = new Intl.NumberFormat('uk-UA', {
            style: 'currency',
            currency: 'UAH',
            maximumFractionDigits: 0
        });

        const top = items
            .slice()
            .sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0))
            .slice(0, 3);

        container.innerHTML = '';

        top.forEach(app => {
            const finalPrice = typeof app.final_price === 'number' ? app.final_price / 100 : null;
            const priceText = finalPrice === 0 ? 'Free' : (finalPrice ? formatter.format(finalPrice) : '—');
            const discountText = app.discount_percent ? `-${app.discount_percent}%` : '';
            const gameEl = document.createElement('div');
            gameEl.className = 'steam-game';
            gameEl.innerHTML = `
                <span class="game-name">${app.name}</span>
                <span class="game-price">${discountText} ${priceText}</span>
            `;
            container.appendChild(gameEl);
        });
    } catch (e) {
        console.warn('Steam API error', e);
        await loadSteamGamesLegacy(container);
    }
}

async function loadSteamGamesLegacy(container) {
    try {
        const response = await fetch('https://steamapi.xpaw.me/?format=json');
        if (!response.ok) throw new Error('Legacy Steam API error');
        const data = await response.json();
        if (!data || !data.response || !data.response.apps) throw new Error('No data');

        const apps = data.response.apps.slice(0, 3);
        container.innerHTML = '';

        apps.forEach(app => {
            const priceUah = app.price ? `₴${(app.price * 25).toFixed(0)}` : '—';
            const gameEl = document.createElement('div');
            gameEl.className = 'steam-game';
            gameEl.innerHTML = `
                <span class="game-name">${app.name}</span>
                <span class="game-price">${priceUah}</span>
            `;
            container.appendChild(gameEl);
        });
    } catch (e) {
        container.innerHTML = '<div class="steam-game">Steam API unavailable</div>';
        console.warn('Steam legacy API error', e);
    }
}

// Minesweeper
let minesweeperGrid = [];
const GRID_SIZE = 8;
const MINE_COUNT = 10;
let gameState = 'ready';
let minesPlaced = false;

function startMinesweeper() {
    minesweeperGrid = [];
    minesPlaced = false;
    gameState = 'ready';

    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        minesweeperGrid.push({
            isMine: false,
            isRevealed: false,
            isFlagged: false,
            nearbyMines: 0
        });
    }

    updateMineStatus('Click a cell to start');
    renderMinesweeper();
}

function placeMines(excludeIndex) {
    let placed = 0;
    while (placed < MINE_COUNT) {
        const randomIndex = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
        if (randomIndex === excludeIndex) continue;
        if (!minesweeperGrid[randomIndex].isMine) {
            minesweeperGrid[randomIndex].isMine = true;
            placed++;
        }
    }

    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        if (!minesweeperGrid[i].isMine) {
            minesweeperGrid[i].nearbyMines = countNearbyMines(i);
        }
    }
}

function countNearbyMines(index) {
    let count = 0;
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;

    for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
            if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
                const idx = r * GRID_SIZE + c;
                if (minesweeperGrid[idx].isMine) count++;
            }
        }
    }
    return count;
}

function renderMinesweeper() {
    const grid = document.getElementById('mineGrid');
    if (!grid) return;

    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;

    minesweeperGrid.forEach((cell, index) => {
        const cellEl = document.createElement('div');
        cellEl.className = 'mine-cell';

        if (cell.isRevealed) cellEl.classList.add('revealed');
        if (cell.isFlagged) cellEl.classList.add('flagged');
        if (cell.isMine && gameState !== 'playing' && gameState !== 'ready') {
            cellEl.classList.add('mine');
        }

        if (cell.isFlagged && !cell.isRevealed) {
            cellEl.textContent = '🚩';
        } else if (cell.isRevealed) {
            if (cell.isMine) {
                cellEl.textContent = '💣';
            } else if (cell.nearbyMines > 0) {
                cellEl.textContent = cell.nearbyMines;
                cellEl.style.color = '#ffd700';
            } else {
                cellEl.textContent = '';
            }
        } else {
            cellEl.textContent = '';
        }

        cellEl.addEventListener('click', () => handleCellClick(index));
        cellEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            toggleFlag(index);
        });
        grid.appendChild(cellEl);
    });
}

function handleCellClick(index) {
    if (gameState === 'lost' || gameState === 'won') return;
    const cell = minesweeperGrid[index];
    if (cell.isRevealed || cell.isFlagged) return;

    if (!minesPlaced) {
        placeMines(index);
        minesPlaced = true;
        gameState = 'playing';
        updateMineStatus('Good luck!');
    }

    revealCell(index);
    renderMinesweeper();
}

function revealCell(index) {
    const cell = minesweeperGrid[index];
    if (cell.isRevealed || cell.isFlagged) return;

    cell.isRevealed = true;

    if (cell.isMine) {
        gameState = 'lost';
        revealAll();
        updateMineStatus('Boom. You lost.');
        return;
    }

    if (cell.nearbyMines === 0) {
        floodReveal(index);
    }

    checkWin();
}

function floodReveal(startIndex) {
    const queue = [startIndex];
    const visited = new Set();

    while (queue.length > 0) {
        const index = queue.shift();
        if (visited.has(index)) continue;
        visited.add(index);

        const cell = minesweeperGrid[index];
        if (cell.isFlagged) continue;
        cell.isRevealed = true;

        if (cell.nearbyMines === 0) {
            const row = Math.floor(index / GRID_SIZE);
            const col = index % GRID_SIZE;

            for (let r = row - 1; r <= row + 1; r++) {
                for (let c = col - 1; c <= col + 1; c++) {
                    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
                        const idx = r * GRID_SIZE + c;
                        if (!visited.has(idx)) queue.push(idx);
                    }
                }
            }
        }
    }
}

function toggleFlag(index) {
    if (gameState === 'lost' || gameState === 'won') return;
    const cell = minesweeperGrid[index];
    if (cell.isRevealed) return;
    cell.isFlagged = !cell.isFlagged;
    renderMinesweeper();
}

function revealAll() {
    minesweeperGrid.forEach(cell => {
        cell.isRevealed = true;
    });
}

function checkWin() {
    const totalNonMines = (GRID_SIZE * GRID_SIZE) - MINE_COUNT;
    const revealedNonMines = minesweeperGrid.filter(c => !c.isMine && c.isRevealed).length;
    if (revealedNonMines === totalNonMines) {
        gameState = 'won';
        revealAll();
        updateMineStatus('Victory!');
    }
}

function updateMineStatus(text) {
    const statusEl = document.getElementById('mineStatus');
    if (statusEl) statusEl.textContent = text;
}

// Link Categorizer
const CATEGORY_DEFS = [
    { name: 'Video', domains: ['youtube.com', 'twitch.tv', 'tiktok.com', 'vimeo.com'] },
    { name: 'Music', domains: ['spotify.com', 'soundcloud.com', 'music.yandex.ru', 'bandcamp.com'] },
    { name: 'Games', domains: ['store.steampowered.com', 'steamcommunity.com', 'epicgames.com', 'itch.io', 'gog.com'] },
    { name: 'Development', domains: ['github.com', 'gitlab.com', 'bitbucket.org', 'codepen.io', 'npmjs.com', 'developer.mozilla.org', 'stackoverflow.com'] },
    { name: 'Security', domains: ['tryhackme.com', 'hacktricks.xyz', 'hackthebox.com'] },
    { name: 'Shopping', domains: ['amazon.com', 'aliexpress.com', 'ozon.ru', 'wildberries.ru', 'ebay.com'] },
    { name: 'Social', domains: ['x.com', 'twitter.com', 'vk.com', 'facebook.com', 'instagram.com', 'reddit.com', 'discord.com'] },
    { name: 'News', domains: ['news.ycombinator.com', 'bbc.com', 'meduza.io', 'lenta.ru'] },
    { name: 'Tools', domains: ['drive.google.com', 'docs.google.com', 'notion.so', 'trello.com', 'figma.com'] },
    { name: 'Search', domains: ['google.com', 'duckduckgo.com', 'yandex.ru', 'bing.com'] },
    { name: 'Other', domains: [] }
];

const LINKS_STORAGE_KEY = 'pupamupa_links';
let categorizeTimer = null;

function categorizeLinks() {
    const textarea = document.getElementById('linksInput');
    const resultsEl = document.getElementById('categorizerResults');
    if (!textarea || !resultsEl) return;

    const urls = parseLinksFromText(textarea.value);
    saveLinks(urls.map(url => url.href));

    const categories = new Map();
    urls.forEach(url => {
        const category = findCategory(url.hostname);
        if (!categories.has(category)) categories.set(category, []);
        categories.get(category).push({
            href: url.href,
            label: url.hostname + (url.pathname !== '/' ? url.pathname : '')
        });
    });

    resultsEl.innerHTML = '';

    if (categories.size === 0) {
        resultsEl.innerHTML = '<div class="category-group"><h4>Nothing to sort</h4></div>';
        return;
    }

    CATEGORY_DEFS.forEach(def => {
        const items = categories.get(def.name);
        if (!items || items.length === 0) return;
        resultsEl.appendChild(buildCategoryGroup(def.name, items));
    });
}

function scheduleCategorize() {
    if (categorizeTimer) clearTimeout(categorizeTimer);
    categorizeTimer = setTimeout(() => {
        categorizeLinks();
    }, 250);
}

function saveLinks(links) {
    localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(links));
}

function restoreLinksInput() {
    const textarea = document.getElementById('linksInput');
    if (!textarea) return;
    const saved = loadLinks();
    if (saved.length > 0) {
        textarea.value = saved.join('\n');
    }
}

function loadLinks() {
    const saved = localStorage.getItem(LINKS_STORAGE_KEY);
    if (!saved) return [];
    try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function parseLinksFromText(text) {
    const lines = text.split(/\n|,/).map(line => line.trim()).filter(Boolean);
    const map = new Map();
    lines.forEach(line => {
        const tokens = line.split(/\s+/).filter(Boolean);
        tokens.forEach(token => {
            const url = normalizeUrl(token);
            if (!url) return;
            if (!map.has(url.href)) {
                map.set(url.href, url);
            }
        });
    });
    return Array.from(map.values());
}

function normalizeUrl(raw) {
    let input = raw.trim();
    if (!input) return null;
    if (!/^https?:\/\//i.test(input)) {
        input = `https://${input}`;
    }
    try {
        return new URL(input);
    } catch {
        return null;
    }
}

function findCategory(hostname) {
    const host = hostname.replace(/^www\./, '');
    for (const def of CATEGORY_DEFS) {
        for (const domain of def.domains) {
            if (host === domain || host.endsWith(`.${domain}`)) {
                return def.name;
            }
        }
    }
    return 'Other';
}

function buildCategoryGroup(name, items) {
    const group = document.createElement('div');
    group.className = 'category-group';

    const title = document.createElement('h4');
    title.textContent = `${name} (${items.length})`;
    group.appendChild(title);

    const list = document.createElement('div');
    list.className = 'category-links';

    items.forEach(item => {
        const linkEl = document.createElement('a');
        linkEl.className = 'category-link';
        linkEl.href = item.href;
        linkEl.target = '_blank';
        linkEl.rel = 'noopener';
        linkEl.textContent = item.label;
        list.appendChild(linkEl);
    });

    group.appendChild(list);
    return group;
}

// Init
window.addEventListener('load', () => {
    loadWeather();
    loadSteamGames();
    startMinesweeper();
    restoreLinksInput();
    categorizeLinks();

    const textarea = document.getElementById('linksInput');
    if (textarea) {
        textarea.addEventListener('input', scheduleCategorize);
    }
});
