// Цитаты
const quotes = [
    "Код — это поэзия, написанная для машин.",
    "Лучшее время для посадки дерева было 20 лет назад.  Второе лучшее время — сейчас.",
    "Не бойся ошибок, бойся не делать попыток.",
    "Качество кода — это инвестиция в будущее.",
    "Simplicitas est summa sophisticatio.",
    "First, solve the problem. Then, write the code.",
    "Отладка в два раза сложнее, чем написание кода.",
    "Заранее оптимизация — корень всех зол.",
    "Код, который я писал год назад — это дерьмо.",
    "Любой достаточно продвинутый код неотличим от магии.",
    "Выглядит неправильно, но работает...  пока.",
    "Это не ошибка, это фича! ",
];

function loadQuote() {
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    document.getElementById('quote').textContent = `"${quote}"`;
}

// Поиск
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput.value.trim()) {
        window.open(`https://google.com/search?q=${encodeURIComponent(searchInput.value)}`, '_blank');
    }
}

document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

// Погода (MET Norway API)
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

// Время
function updateTime() {
    const now = new Date();
    const time = now.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    document.getElementById('time').textContent = time;
}

setInterval(updateTime, 1000);
updateTime();

// Steam API - получить скидки в гривнях
async function loadSteamGames() {
    try {
        const response = await fetch('https://steamapi.xpaw.me/?format=json');
        const data = await response.json();
        const container = document.getElementById('steamGames');
        
        if (!data || !data.response || !data.response.apps) throw new Error('No data');
        
        const apps = data.response.apps.slice(0, 3);
        container.innerHTML = '';
        
        apps.forEach(app => {
            const priceUah = (app.price * 25).toFixed(0);
            const gameEl = document.createElement('div');
            gameEl.className = 'steam-game';
            gameEl.innerHTML = `
                <span class="game-name">${app.name}</span>
                <span class="game-price">₴${priceUah}</span>
            `;
            container.appendChild(gameEl);
        });
    } catch (e) {
        document.getElementById('steamGames').innerHTML = '<div class="steam-game">Steam API unavailable</div>';
        console.warn('Steam API error', e);
    }
}

// Мини-сапёр (ИСПРАВЛЕННАЯ ВЕРСИЯ)
let minesweeperGrid = [];
const GRID_SIZE = 5;
const MINE_COUNT = 5;
let gameState = 'idle';

function initMinesweeper() {
    minesweeperGrid = [];
    gameState = 'playing';
    
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        minesweeperGrid.push({
            isMine: false,
            isRevealed: false,
            isFlagged: false,
            nearbyMines: 0
        });
    }

    let minesPlaced = 0;
    while (minesPlaced < MINE_COUNT) {
        const randomIndex = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
        if (!minesweeperGrid[randomIndex].isMine) {
            minesweeperGrid[randomIndex].isMine = true;
            minesPlaced++;
        }
    }

    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        if (!minesweeperGrid[i].isMine) {
            let count = 0;
            const row = Math.floor(i / GRID_SIZE);
            const col = i % GRID_SIZE;

            for (let r = row - 1; r <= row + 1; r++) {
                for (let c = col - 1; c <= col + 1; c++) {
                    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
                        const index = r * GRID_SIZE + c;
                        if (minesweeperGrid[index].isMine) count++;
                    }
                }
            }
            minesweeperGrid[i].nearbyMines = count;
        }
    }

    renderMinesweeper();
}

function renderMinesweeper() {
    const grid = document.getElementById('mineGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;
    grid.style.gap = '4px';

    minesweeperGrid.forEach((cell, index) => {
        const cellEl = document.createElement('div');
        cellEl.className = 'mine-cell';
        cellEl.style.cssText = `
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: ${cell.isRevealed ? 'rgba(100,100,150,0.3)' : 'rgba(139,63,230,0.3)'};
            border: 1px solid var(--accent);
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-size: 12px;
        `;

        if (cell.isRevealed) {
            if (cell.isMine) {
                cellEl.textContent = '💣';
            } else if (cell.nearbyMines > 0) {
                cellEl.textContent = cell.nearbyMines;
                cellEl.style.color = '#ffd700';
            }
        } else {
            cellEl.textContent = '?';
            cellEl.style.color = 'rgba(255,255,255,0.6)';
        }

        cellEl.addEventListener('click', () => revealCell(index));
        grid.appendChild(cellEl);
    });
}

function revealCell(index) {
    if (gameState !== 'playing') return;
    if (minesweeperGrid[index].isRevealed) return;

    minesweeperGrid[index].isRevealed = true;

    if (minesweeperGrid[index].isMine) {
        gameState = 'lost';
        revealAll();
        setTimeout(() => {
            alert('💣 Game Over! You hit a mine.');
            initMinesweeper();
        }, 200);
        return;
    }

    const unrevealed = minesweeperGrid.filter(c => !c.isRevealed).length;
    if (unrevealed === MINE_COUNT) {
        gameState = 'won';
        setTimeout(() => {
            alert('🎉 You Won! Great job!');
            initMinesweeper();
        }, 200);
    }

    renderMinesweeper();
}

function revealAll() {
    minesweeperGrid.forEach(cell => {
        cell.isRevealed = true;
    });
    renderMinesweeper();
}

function toggleMinesweeper() {
    const minesweeper = document.getElementById('minesweeper');
    if (!minesweeper) return;
    
    minesweeper.style.display = minesweeper.style.display === 'none' ? 'block' : 'none';
    
    if (minesweeper.style.display !== 'none' && minesweeperGrid.length === 0) {
        initMinesweeper();
    }
}

// AI Link Categorizer (stub)
function categorizeLinks() {
    const textarea = document.getElementById('linksInput');
    if (textarea.value.trim()) {
        alert('Paste links and click this button to categorize them using AI!');
    }
}

// Инициализация
window.addEventListener('load', () => {
    loadQuote();
    loadWeather();
    loadSteamGames();
    setTimeout(() => {
        const minesweeper = document.getElementById('minesweeper');
        if (minesweeper) minesweeper.style.display = 'none';
    }, 100);
});