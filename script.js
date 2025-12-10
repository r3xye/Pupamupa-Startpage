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

// Вкладки
function switchTab(tabName, btn) {
    // Скрыть все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Убрать активный класс с кнопок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Показать нужную вкладку
    document.getElementById(tabName).classList.add('active');

    // Активировать нужную кнопку
    if (btn && btn.classList) {
        btn.classList.add('active');
    }
}

// Погода (используем Open-Meteo API - без ключа)
async function loadWeather() {
    try {
        // Получаем координаты через геолокацию
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
            );
            const data = await response.json();
            const temp = Math.round(data.current.temperature_2m);
            
            document.querySelector('.weather-temp').textContent = `${temp}°C`;
            document.querySelector('.weather-desc').textContent = 'Текущая погода';
        });
    } catch (e) {
        document.querySelector('.weather-temp').textContent = '--°C';
        document.querySelector('.weather-desc').textContent = 'Недоступно';
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

// Мини-сапёр
let minesweeperGrid = [];
const GRID_SIZE = 5;
const MINE_COUNT = 5;

function initMinesweeper() {
    minesweeperGrid = [];
    
    // Создаём сетку
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        minesweeperGrid.push({
            isMine: false,
            isRevealed: false,
            nearbyMines: 0
        });
    }

    // Случайно расставляем мины
    let minesPlaced = 0;
    while (minesPlaced < MINE_COUNT) {
        const randomIndex = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
        if (!minesweeperGrid[randomIndex].isMine) {
            minesweeperGrid[randomIndex].isMine = true;
            minesPlaced++;
        }
    }

    // Считаем соседние мины
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
    grid.innerHTML = '';

    minesweeperGrid.forEach((cell, index) => {
        const cellEl = document.createElement('div');
        cellEl.className = 'mine-cell';

        if (cell.isRevealed) {
            cellEl.classList.add('revealed');
            if (cell.isMine) {
                cellEl.textContent = '💣';
            } else if (cell.nearbyMines > 0) {
                cellEl.textContent = cell.nearbyMines;
            }
        }

        cellEl.addEventListener('click', () => revealCell(index));
        grid.appendChild(cellEl);
    });
}

function revealCell(index) {
    if (minesweeperGrid[index].isRevealed) return;

    minesweeperGrid[index].isRevealed = true;

    // Если открыли все клетки без мин - победа
    const unrevealed = minesweeperGrid.filter(c => !c.isRevealed).length;
    if (unrevealed === MINE_COUNT) {
        setTimeout(() => {
            alert('🎉 Ты выиграл! Молодец!');
            initMinesweeper();
        }, 100);
    }

    renderMinesweeper();
}

function toggleMinesweeper() {
    const minesweeper = document.getElementById('minesweeper');
    minesweeper.classList.toggle('hidden');
    if (!minesweeper.classList.contains('hidden') && minesweeperGrid.length === 0) {
        initMinesweeper();
    }
}

// Инициализация
window.addEventListener('load', () => {
    loadQuote();
    loadWeather();
});