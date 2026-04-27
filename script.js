// Search
const SEARCH_HISTORY_KEY = 'pupamupa_search_history';
const SEARCH_HISTORY_LIMIT = 8;
const SEARCH_PRESET_SUGGESTIONS = [
    'github',
    'youtube',
    'chatgpt',
    'weather oslo',
    'translate russian to english',
    'javascript array methods',
    'css glassmorphism',
    'mdn fetch api',
    'tryhackme',
    'hackthebox',
    'spotify',
    'uah to nok'
];

let searchSuggestionItems = [];
let activeSearchSuggestionIndex = -1;
let fitViewportTimer = null;
let pageResizeObserver = null;

function performSearch(query = null) {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const value = typeof query === 'string' ? query.trim() : searchInput.value.trim();
    if (!value) return;

    searchInput.value = value;
    storeSearchQuery(value);
    hideSearchSuggestions();
    window.open(`https://google.com/search?q=${encodeURIComponent(value)}`, '_blank');
}

function loadSearchHistory() {
    const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!saved) return [];
    try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
    } catch {
        return [];
    }
}

function storeSearchQuery(query) {
    const normalized = query.trim();
    if (!normalized) return;

    const history = loadSearchHistory().filter(item => item.toLowerCase() !== normalized.toLowerCase());
    history.unshift(normalized);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, SEARCH_HISTORY_LIMIT)));
}

function getSearchSuggestions(query) {
    const normalized = query.trim().toLowerCase();
    const history = loadSearchHistory();
    const unique = new Set();
    const items = [];

    const appendSuggestions = (values, type) => {
        values.forEach(value => {
            if (typeof value !== 'string') return;
            const cleaned = value.trim();
            if (!cleaned) return;
            const lower = cleaned.toLowerCase();
            if (normalized && !lower.includes(normalized)) return;
            if (unique.has(lower)) return;
            unique.add(lower);
            items.push({ value: cleaned, type });
        });
    };

    appendSuggestions(history, 'recent');
    appendSuggestions(SEARCH_PRESET_SUGGESTIONS, 'quick');

    if (!normalized) {
        return items.slice(0, 6);
    }

    const startsWith = [];
    const contains = [];
    items.forEach(item => {
        if (item.value.toLowerCase().startsWith(normalized)) {
            startsWith.push(item);
        } else {
            contains.push(item);
        }
    });

    return startsWith.concat(contains).slice(0, 8);
}

function hideSearchSuggestions() {
    const container = document.getElementById('searchSuggestions');
    if (!container) return;
    container.hidden = true;
    container.innerHTML = '';
    searchSuggestionItems = [];
    activeSearchSuggestionIndex = -1;
}

function scheduleViewportFit() {
    if (fitViewportTimer) clearTimeout(fitViewportTimer);
    fitViewportTimer = setTimeout(() => {
        fitPageToViewport();
    }, 40);
}

function fitPageToViewport() {
    const frame = document.querySelector('.viewport-fit');
    const pageScale = document.getElementById('pageScale');
    if (!frame || !pageScale) return;

    pageScale.style.transform = 'scale(1)';

    const naturalWidth = pageScale.scrollWidth;
    const naturalHeight = pageScale.scrollHeight;
    if (!naturalWidth || !naturalHeight) return;

    const widthScale = frame.clientWidth / naturalWidth;
    const heightScale = frame.clientHeight / naturalHeight;
    const scale = Math.min(1, widthScale, heightScale);

    pageScale.style.transform = `scale(${scale})`;
}

function initViewportFit() {
    fitPageToViewport();
    window.addEventListener('resize', scheduleViewportFit);

    const pageScale = document.getElementById('pageScale');
    if (!pageScale || typeof ResizeObserver === 'undefined') return;

    pageResizeObserver = new ResizeObserver(() => {
        scheduleViewportFit();
    });
    pageResizeObserver.observe(pageScale);
}

function applyActiveSearchSuggestion() {
    const container = document.getElementById('searchSuggestions');
    if (!container) return;

    const buttons = container.querySelectorAll('.search-suggestion');
    buttons.forEach((button, index) => {
        button.classList.toggle('active', index === activeSearchSuggestionIndex);
    });
}

function selectSearchSuggestion(index) {
    if (index < 0 || index >= searchSuggestionItems.length) return;
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    searchInput.value = searchSuggestionItems[index].value;
    activeSearchSuggestionIndex = index;
    applyActiveSearchSuggestion();
}

function renderSearchSuggestions(query) {
    const container = document.getElementById('searchSuggestions');
    if (!container) return;

    searchSuggestionItems = getSearchSuggestions(query);
    activeSearchSuggestionIndex = -1;

    if (searchSuggestionItems.length === 0) {
        hideSearchSuggestions();
        return;
    }

    container.innerHTML = '';
    searchSuggestionItems.forEach((item, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'search-suggestion';
        button.innerHTML = `
            <span class="search-suggestion-text">${item.value}</span>
            <span class="search-suggestion-meta">${item.type}</span>
        `;
        button.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });
        button.addEventListener('click', () => {
            performSearch(item.value);
        });
        button.addEventListener('mouseenter', () => {
            activeSearchSuggestionIndex = index;
            applyActiveSearchSuggestion();
        });
        container.appendChild(button);
    });

    container.hidden = false;
}

function initSearchAutocomplete() {
    const searchInput = document.getElementById('searchInput');
    const suggestions = document.getElementById('searchSuggestions');
    if (!searchInput || !suggestions) return;

    searchInput.addEventListener('focus', () => {
        renderSearchSuggestions(searchInput.value);
    });

    searchInput.addEventListener('input', () => {
        renderSearchSuggestions(searchInput.value);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            if (searchSuggestionItems.length === 0) return;
            e.preventDefault();
            activeSearchSuggestionIndex = (activeSearchSuggestionIndex + 1) % searchSuggestionItems.length;
            selectSearchSuggestion(activeSearchSuggestionIndex);
            return;
        }

        if (e.key === 'ArrowUp') {
            if (searchSuggestionItems.length === 0) return;
            e.preventDefault();
            activeSearchSuggestionIndex = activeSearchSuggestionIndex <= 0
                ? searchSuggestionItems.length - 1
                : activeSearchSuggestionIndex - 1;
            selectSearchSuggestion(activeSearchSuggestionIndex);
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (activeSearchSuggestionIndex >= 0) {
                performSearch(searchSuggestionItems[activeSearchSuggestionIndex].value);
            } else {
                performSearch();
            }
            return;
        }

        if (e.key === 'Escape') {
            hideSearchSuggestions();
        }
    });

    searchInput.addEventListener('blur', () => {
        setTimeout(hideSearchSuggestions, 120);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box')) {
            hideSearchSuggestions();
        }
    });
}

// Weather (MET Norway API)
async function loadWeather() {
    try {
        const osloLat = 59.9139;
        const osloLon = 10.7522;
        document.querySelector('.weather-temp').textContent = '...';
        document.querySelector('.weather-desc').textContent = 'Oslo, fetching...';
        const weatherMeta = document.getElementById('weatherMeta');
        if (weatherMeta) weatherMeta.textContent = 'Updating...';

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
            if (weatherMeta) {
                const now = new Date();
                weatherMeta.textContent = `Updated ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            }
            scheduleViewportFit();
        } else {
            throw new Error('No data');
        }
    } catch (e) {
        document.querySelector('.weather-temp').textContent = '--°C';
        document.querySelector('.weather-desc').textContent = 'Unavailable';
        const weatherMeta = document.getElementById('weatherMeta');
        if (weatherMeta) weatherMeta.textContent = 'Service unavailable';
        console.warn('Weather error', e);
        scheduleViewportFit();
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
    const timeMeta = document.getElementById('timeMeta');
    if (timeMeta) {
        const dateText = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        timeMeta.textContent = dateText;
    }
}

setInterval(updateTime, 1000);
updateTime();

// UAH <-> NOK converter
let fxRates = null;

function getFxElements() {
    return {
        amount: document.getElementById('fxAmount'),
        from: document.getElementById('fxFrom'),
        to: document.getElementById('fxTo'),
        result: document.getElementById('fxResult'),
        meta: document.getElementById('fxMeta')
    };
}

function getCrossRate(from, to) {
    if (!fxRates || !fxRates[from] || !fxRates[to]) return null;
    return fxRates[to] / fxRates[from];
}

function formatFxNumber(value) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
    }).format(value);
}

function convertFx() {
    const { amount, from, to, result, meta } = getFxElements();
    if (!amount || !from || !to || !result || !meta) return;

    const amountValue = Number.parseFloat(amount.value);
    if (!Number.isFinite(amountValue) || amountValue < 0) {
        result.textContent = '--.--';
        meta.textContent = 'Enter a valid amount';
        return;
    }

    const rate = getCrossRate(from.value, to.value);
    if (!rate) {
        result.textContent = '--.--';
        meta.textContent = 'Rate unavailable';
        return;
    }

    const converted = amountValue * rate;
    result.textContent = formatFxNumber(converted);
    meta.textContent = `1 ${from.value} = ${formatFxNumber(rate)} ${to.value}`;
}

function swapFxPair() {
    const { from, to } = getFxElements();
    if (!from || !to) return;
    const prev = from.value;
    from.value = to.value;
    to.value = prev;
    convertFx();
}

async function loadFxRates() {
    const { result, meta } = getFxElements();
    if (!result || !meta) return;

    result.textContent = '--.--';
    meta.textContent = 'Updating rate...';

    try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!response.ok) throw new Error(`Rate API HTTP ${response.status}`);
        const data = await response.json();
        if (!data || data.result !== 'success' || !data.rates) throw new Error('Bad rate payload');
        fxRates = data.rates;
        convertFx();
        scheduleViewportFit();
    } catch (e) {
        meta.textContent = 'Rate unavailable';
        console.warn('FX rate error', e);
        scheduleViewportFit();
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

// Translator
function decodeHtmlEntities(text) {
    const parser = document.createElement('textarea');
    parser.innerHTML = text;
    return parser.value;
}

function setTranslatorStatus(text, isError = false) {
    const statusEl = document.getElementById('translatorStatus');
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.style.color = isError ? '#fb4934' : '';
}

function swapLanguages() {
    const source = document.getElementById('sourceLang');
    const target = document.getElementById('targetLang');
    const input = document.getElementById('translatorInput');
    const output = document.getElementById('translatorOutput');
    if (!source || !target || !input || !output) return;

    if (source.value === 'auto') {
        source.value = target.value;
    } else {
        const prevSource = source.value;
        source.value = target.value;
        target.value = prevSource;
    }

    const prevInput = input.value;
    input.value = output.value;
    output.value = prevInput;
}

async function translateText() {
    const source = document.getElementById('sourceLang');
    const target = document.getElementById('targetLang');
    const input = document.getElementById('translatorInput');
    const output = document.getElementById('translatorOutput');
    if (!source || !target || !input || !output) return;

    const text = input.value.trim();
    if (!text) {
        output.value = '';
        setTranslatorStatus('Type text to translate');
        return;
    }

    setTranslatorStatus('Translating...');
    try {
        const translated = await translateWithGoogle(text, source.value, target.value);
        output.value = translated;
        setTranslatorStatus('Done');
    } catch (primaryError) {
        try {
            const translated = await translateWithMyMemory(text, source.value, target.value);
            output.value = translated;
            setTranslatorStatus('Done (fallback)');
        } catch (fallbackError) {
            const fallbackUrl = `https://translate.google.com/?sl=${source.value}&tl=${target.value}&text=${encodeURIComponent(text)}&op=translate`;
            output.value = 'Translation API is unavailable right now.';
            setTranslatorStatus('API unavailable. Google Translate opened in new tab.', true);
            window.open(fallbackUrl, '_blank');
            console.warn('Translator error', primaryError, fallbackError);
        }
    }
}

function mapLanguageCode(langCode) {
    if (langCode === 'no') return 'nb';
    return langCode;
}

function splitTextForTranslation(text, maxLen = 900) {
    if (text.length <= maxLen) return [text];

    const chunks = [];
    const lines = text.split('\n');
    let buffer = '';

    lines.forEach((line, idx) => {
        const candidate = buffer ? `${buffer}\n${line}` : line;
        if (candidate.length <= maxLen) {
            buffer = candidate;
            return;
        }
        if (buffer) {
            chunks.push(buffer);
            buffer = '';
        }
        if (line.length <= maxLen) {
            buffer = line;
            return;
        }

        let cursor = 0;
        while (cursor < line.length) {
            chunks.push(line.slice(cursor, cursor + maxLen));
            cursor += maxLen;
        }

        if (idx < lines.length - 1) {
            buffer = '';
        }
    });

    if (buffer) chunks.push(buffer);
    return chunks;
}

async function fetchJsonWithTimeout(url, timeoutMs = 7000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    } finally {
        clearTimeout(timeoutId);
    }
}

function extractGoogleTranslatedText(data) {
    if (!Array.isArray(data) || !Array.isArray(data[0])) return '';
    return data[0].map(part => (Array.isArray(part) ? part[0] : '')).join('');
}

async function translateWithGoogle(text, sourceLang, targetLang) {
    const sl = sourceLang === 'auto' ? 'auto' : mapLanguageCode(sourceLang);
    const tl = mapLanguageCode(targetLang);
    const chunks = splitTextForTranslation(text, 900);
    const translatedChunks = [];

    for (const chunk of chunks) {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(chunk)}`;
        const data = await fetchJsonWithTimeout(url, 7000);
        const translated = extractGoogleTranslatedText(data);
        if (!translated) throw new Error('Empty Google translation');
        translatedChunks.push(translated);
    }

    return translatedChunks.join('\n');
}

async function translateWithMyMemory(text, sourceLang, targetLang) {
    const sl = sourceLang === 'auto' ? 'auto' : sourceLang;
    const tl = targetLang;
    const chunks = splitTextForTranslation(text, 450);
    const translatedChunks = [];

    for (const chunk of chunks) {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${encodeURIComponent(sl)}|${encodeURIComponent(tl)}`;
        const data = await fetchJsonWithTimeout(url, 8000);
        const translated = data && data.responseData && data.responseData.translatedText
            ? decodeHtmlEntities(data.responseData.translatedText)
            : '';
        if (!translated) throw new Error('Empty MyMemory translation');
        translatedChunks.push(translated);
    }

    return translatedChunks.join('\n');
}

// Snake
const SNAKE_COLS = 16;
const SNAKE_ROWS = 10;
const SNAKE_CELL_SIZE = 16;
let snake = [];
let snakeFood = { x: 0, y: 0 };
let snakeDirection = { x: 1, y: 0 };
let snakeNextDirection = { x: 1, y: 0 };
let snakeScore = 0;
let snakeInterval = null;
let snakeRunning = false;

function setSnakeStatus(text) {
    const statusEl = document.getElementById('snakeStatus');
    if (statusEl) statusEl.textContent = text;
}

function setSnakeScore(value) {
    const scoreEl = document.getElementById('snakeScore');
    if (scoreEl) scoreEl.textContent = `Score: ${value}`;
}

function randomSnakeCell() {
    return {
        x: Math.floor(Math.random() * SNAKE_COLS),
        y: Math.floor(Math.random() * SNAKE_ROWS)
    };
}

function spawnSnakeFood() {
    let candidate = randomSnakeCell();
    while (snake.some(part => part.x === candidate.x && part.y === candidate.y)) {
        candidate = randomSnakeCell();
    }
    snakeFood = candidate;
}

function drawSnake() {
    const canvas = document.getElementById('snakeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#2d3331';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    for (let x = 0; x <= SNAKE_COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * SNAKE_CELL_SIZE, 0);
        ctx.lineTo(x * SNAKE_CELL_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= SNAKE_ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * SNAKE_CELL_SIZE);
        ctx.lineTo(canvas.width, y * SNAKE_CELL_SIZE);
        ctx.stroke();
    }

    ctx.fillStyle = '#fb4934';
    ctx.fillRect(
        snakeFood.x * SNAKE_CELL_SIZE + 2,
        snakeFood.y * SNAKE_CELL_SIZE + 2,
        SNAKE_CELL_SIZE - 4,
        SNAKE_CELL_SIZE - 4
    );

    snake.forEach((part, index) => {
        ctx.fillStyle = index === 0 ? '#b8bb26' : '#83a598';
        ctx.fillRect(
            part.x * SNAKE_CELL_SIZE + 1.5,
            part.y * SNAKE_CELL_SIZE + 1.5,
            SNAKE_CELL_SIZE - 3,
            SNAKE_CELL_SIZE - 3
        );
    });
}

function stopSnake() {
    if (snakeInterval) {
        clearInterval(snakeInterval);
        snakeInterval = null;
    }
    snakeRunning = false;
}

function snakeTick() {
    snakeDirection = snakeNextDirection;
    const head = snake[0];
    const nextHead = {
        x: head.x + snakeDirection.x,
        y: head.y + snakeDirection.y
    };

    const hitWall = nextHead.x < 0 || nextHead.x >= SNAKE_COLS || nextHead.y < 0 || nextHead.y >= SNAKE_ROWS;
    const hitSelf = snake.some(part => part.x === nextHead.x && part.y === nextHead.y);
    if (hitWall || hitSelf) {
        stopSnake();
        setSnakeStatus('Access denied. Press Restart Snake.');
        return;
    }

    snake.unshift(nextHead);

    if (nextHead.x === snakeFood.x && nextHead.y === snakeFood.y) {
        snakeScore += 1;
        setSnakeScore(snakeScore);
        setSnakeStatus('Target acquired');
        spawnSnakeFood();
    } else {
        snake.pop();
    }

    drawSnake();
}

function startSnakeGame() {
    snake = [
        { x: 6, y: 5 },
        { x: 5, y: 5 },
        { x: 4, y: 5 }
    ];
    snakeDirection = { x: 1, y: 0 };
    snakeNextDirection = { x: 1, y: 0 };
    snakeScore = 0;
    setSnakeScore(snakeScore);
    setSnakeStatus('Use arrow keys');
    spawnSnakeFood();
    drawSnake();

    stopSnake();
    snakeRunning = true;
    snakeInterval = setInterval(snakeTick, 135);
}

function setSnakeDirection(dx, dy) {
    if (!snakeRunning) return;
    if (snakeDirection.x === -dx && snakeDirection.y === -dy) return;
    snakeNextDirection = { x: dx, y: dy };
}

function isSnakeModalOpen() {
    const modal = document.getElementById('snakeModal');
    return Boolean(modal && !modal.hidden);
}

function openSnakeModal() {
    const modal = document.getElementById('snakeModal');
    if (!modal) return;
    modal.hidden = false;
    startSnakeGame();
}

function closeSnakeModal() {
    const modal = document.getElementById('snakeModal');
    if (!modal) return;
    modal.hidden = true;
    stopSnake();
}

function initSnakeControls() {
    const toggleBtn = document.getElementById('toggleSnakeBtn');
    const restartBtn = document.getElementById('snakeRestartBtn');
    const closeBtn = document.getElementById('snakeCloseBtn');
    const backdrop = document.getElementById('snakeBackdrop');

    if (toggleBtn) toggleBtn.addEventListener('click', openSnakeModal);
    if (restartBtn) restartBtn.addEventListener('click', startSnakeGame);
    if (closeBtn) closeBtn.addEventListener('click', closeSnakeModal);
    if (backdrop) backdrop.addEventListener('click', closeSnakeModal);
    closeSnakeModal();

    window.addEventListener('keydown', (e) => {
        if (!isSnakeModalOpen()) return;
        const activeTag = document.activeElement && document.activeElement.tagName
            ? document.activeElement.tagName.toLowerCase()
            : '';
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

        if (e.key === 'Escape') {
            closeSnakeModal();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSnakeDirection(0, -1);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSnakeDirection(0, 1);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setSnakeDirection(-1, 0);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            setSnakeDirection(1, 0);
        }
    });
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
        scheduleViewportFit();
        return;
    }

    CATEGORY_DEFS.forEach(def => {
        const items = categories.get(def.name);
        if (!items || items.length === 0) return;
        resultsEl.appendChild(buildCategoryGroup(def.name, items));
    });
    scheduleViewportFit();
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
    loadFxRates();
    startMinesweeper();
    initSearchAutocomplete();
    restoreLinksInput();
    categorizeLinks();

    const textarea = document.getElementById('linksInput');
    if (textarea) {
        textarea.addEventListener('input', scheduleCategorize);
    }

    const translateBtn = document.getElementById('translateBtn');
    const swapBtn = document.getElementById('swapLangBtn');
    const translatorInput = document.getElementById('translatorInput');
    if (translateBtn) {
        translateBtn.addEventListener('click', translateText);
    }
    if (swapBtn) {
        swapBtn.addEventListener('click', swapLanguages);
    }
    if (translatorInput) {
        translatorInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                translateText();
            }
        });
    }

    const fxAmount = document.getElementById('fxAmount');
    const fxFrom = document.getElementById('fxFrom');
    const fxTo = document.getElementById('fxTo');
    const fxSwapBtn = document.getElementById('fxSwapBtn');
    if (fxAmount) fxAmount.addEventListener('input', convertFx);
    if (fxFrom) fxFrom.addEventListener('change', convertFx);
    if (fxTo) fxTo.addEventListener('change', convertFx);
    if (fxSwapBtn) fxSwapBtn.addEventListener('click', swapFxPair);

    initSnakeControls();
    initViewportFit();
});
