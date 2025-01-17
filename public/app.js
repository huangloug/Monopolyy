const socket = io();
const setupContainer = document.getElementById('setup-container');
const mainContainer = document.getElementById('main-container');
const waitingRoom = document.getElementById('waiting-room');
const playerNameInput = document.getElementById('player-name');
const avatarUploadInput = document.getElementById('avatar-upload');
const joinGameButton = document.getElementById('join-game');
const waitingPlayersList = document.getElementById('waiting-players-list');
const playersList = document.getElementById('players-list');
const readyButton = document.getElementById('ready-button');
const countdownTimer = document.getElementById('countdown-timer');
const playerAssetsList = document.getElementById('player-assets-list');
const propertyInfo = document.getElementById('property-info');
const diceResultSpan = document.getElementById('dice-result');
const rollDiceButton = document.getElementById('roll-dice');

let playersData = {};
let properties = [];
let hasJoinGame = false;
let countdownInterval = null;

function showScreen(screen) {
    const screens = ['setup', 'waiting', 'main'];
    screens.forEach(s => {
        const container = document.getElementById(`${s}-container`);
        if (container) {
            container.style.visibility = s === screen ? 'visible' : 'hidden';
            container.style.display = s === screen ? 'flex' : 'none';
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    showScreen('setup');
});

joinGameButton.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    const avatarFile = avatarUploadInput.files[0];
    if (!playerName) {
        alert('Vui lòng nhập tên!');
        return;
    }
    if (!avatarFile) {
        alert('Vui lòng tải ảnh đại diện!');
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        const avatarData = reader.result;
        socket.emit('join-game', { name: playerName, avatar: avatarData });
        hasJoinGame = true;
        showScreen('waiting');
    };
    reader.onerror = () => {
        alert('Có lỗi xảy ra khi đọc ảnh đại diện!');
    };
    reader.readAsDataURL(avatarFile);
});

function updateWaitingRoom(players) {
    waitingPlayersList.innerHTML = '';
    Object.values(players).forEach(player => {
        const li = document.createElement('li');
        li.classList.add('list-group-item');
        li.textContent = `${player.name} - ${player.isReady ? 'Sẵn sàng' : 'Chưa sẵn sàng'}`;
        waitingPlayersList.appendChild(li);
    });
}

function updatePlayersList() {
    playersList.innerHTML = '';
    Object.values(playersData).forEach(player => {
        const li = document.createElement('li');
        li.classList.add('list-group-item', 'd-flex', 'align-items-center', 'justify-content-between');
        const avatar = document.createElement('img');
        avatar.src = player.avatar;
        avatar.classList.add('player-avatar', 'me-2');
        const name = document.createElement('span');
        name.textContent = player.name;
        const money = document.createElement('span');
        money.textContent = `$${player.money}`;
        money.classList.add('player-money');
        li.appendChild(avatar);
        li.appendChild(name);
        li.appendChild(money);
        li.addEventListener('click', () => showPlayerDetails(player));
        playersList.appendChild(li);
    });
}

function updatePlayerPositions() {
    const playersContainer = document.getElementById('players');
    playersContainer.innerHTML = '';
    Object.values(playersData).forEach(player => {
        const playerMarker = document.createElement('div');
        playerMarker.classList.add('player-marker');
        playerMarker.style.left = `${player.position * 50}px`;
        playerMarker.textContent = player.name;
        playersContainer.appendChild(playerMarker);
    });
}

socket.on('waiting-room', (players) => {
    if (!hasJoinGame) return;
    updateWaitingRoom(players);
});

socket.on('start-game', (players) => {
    showScreen('main');
    playersData = players;
    updatePlayersList();
    updatePlayerPositions();
});

socket.on('update-players', (players) => {
    playersData = players;
    updatePlayersList();
    updatePlayerPositions();
});

socket.on('start-countdown', (duration) => {
    let remainingTime = duration;
    countdownTimer.textContent = `Game bắt đầu trong ${remainingTime} giây...`;
    countdownInterval = setInterval(() => {
        remainingTime--;
        countdownTimer.textContent = `Game bắt đầu trong ${remainingTime} giây...`;
        if (remainingTime <= 0) {
            clearInterval(countdownInterval);
            countdownTimer.textContent = '';
        }
    }, 1000);
});

readyButton.addEventListener('click', () => {
    socket.emit('player-ready');
    readyButton.disabled = true;
});

rollDiceButton.addEventListener('click', () => {
    const dice = Math.floor(Math.random() * 6) + 1;
    socket.emit('roll-dice', { dice });
    diceResultSpan.textContent = dice; 
});

function showPlayerDetails(player) {
    playerAssetsList.innerHTML = '';
    if (player.assets && player.assets.length > 0) {
        player.assets.forEach(asset => {
            const li = document.createElement('li');
            li.classList.add('list-group-item');
            li.textContent = asset.name;
            playerAssetsList.appendChild(li);
        });
    } else {
        const noAssets = document.createElement('li');
        noAssets.classList.add('list-group-item');
        noAssets.textContent = 'Không có tài sản nào.';
        playerAssetsList.appendChild(noAssets);
    }
    const playerDetailsModal = new bootstrap.Modal(document.getElementById('playerDetailsModal'));
    playerDetailsModal.show();
}

socket.on('property-info', ({ property }) => {
    propertyInfo.innerHTML = `
        <p><strong>Chủ sở hữu:</strong> ${property.owner ? playersData[property.owner].name : 'Không có'}</p>
        <p><strong>Tình trạng:</strong> ${property.level}</p>
        <p><strong>Tên đất:</strong> ${property.name}</p>
        <p><strong>Trị giá:</strong> $${property.value}</p>
    `;
    const propertyDetailsModal = new bootstrap.Modal(document.getElementById('propertyDetailsModal'));
    propertyDetailsModal.show();
});

socket.on('property-purchased', ({ playerId, propertyId }) => {
    const player = playersData[playerId];
    const property = properties.find(p => p.id === propertyId);
    alert(`${player.name} đã mua ${property.name} với giá $${property.value}!`);
});

socket.on('player-lost', ({ playerId }) => {
    delete playersData[playerId];
    updatePlayersList();
    alert(`Người chơi ${playersData[playerId]?.name || 'N/A'} đã bị loại!`);

    const remainingPlayers = Object.keys(playersData);
    if (remainingPlayers.length === 1) {
        alert(`Người chơi ${playersData[remainingPlayers[0]].name} đã thắng!`);
        socket.emit('game-over');
    }
});
