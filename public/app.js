const socket = io();
const setupContainer = document.getElementById('setup-container');
const mainContainer = document.getElementById('main-container');
const playerNameInput = document.getElementById('player-name');
const avatarUploadInput = document.getElementById('avatar-upload');
const joinGameButton = document.getElementById('join-game');
const playersList = document.getElementById('players-list');
const assetsList = document.getElementById('assets-list');
const playersContainer = document.getElementById('players');
const playerAssetsList = document.getElementById('player-assets-list');
const propertyInfo = document.getElementById('property-info');
const diceResultSpan = document.getElementById('dice-result');
const waitingRoom = document.getElementById('waiting-room');
const waitingPlayersList = document.getElementById('waiting-players-list');
const readyButton = document.getElementById('ready-button');
const countdownTimer = document.getElementById('countdown-timer');
let playersData = {};  
let properties = []; 
let countdownInterval;

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
    };
    reader.readAsDataURL(avatarFile);
});
socket.on('waiting-room', (players) => {
    setupContainer.style.display = 'none';
    waitingRoom.style.display = 'flex';
    updateWaitingRoom(players);
});
socket.on('update-players', (players) => {
    playersData = players;
    console.log('Players updated:', players);
    updatePlayersList();
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
socket.on('update-properties', (serverProperties) => {
    properties = serverProperties;
});
function updatePlayersList() {
    playersList.innerHTML = '';
    for (const id in playersData) {
        const player = playersData[id];
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
    }
}
readyButton.addEventListener('click', () => {
    socket.emit('player-ready');
    readyButton.disabled = true; 
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
socket.on('start-game', (players) => {
    waitingRoom.style.display = 'none';
    mainContainer.style.display = 'flex';
    console.log('Game bắt đầu!', players);
});

function showPlayerDetails(player) {
    playerAssetsList.innerHTML = '';
    if (player.assets && player.assets.length > 0) {
        player.assets.forEach(asset => {
            const li = document.createElement('li');
            li.classList.add('list-group-item');
            li.textContent = asset.name;
            if (player.id === socket.id) {
                const upgradeButton = document.createElement('button');
                upgradeButton.textContent = 'Nâng cấp';
                upgradeButton.classList.add('btn', 'btn-primary', 'ms-2');
                upgradeButton.addEventListener('click', () => upgradeProperty(asset.id));
                li.appendChild(upgradeButton);
            }
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

socket.on('roll-dice', ({ playerId, dice, newPosition }) => {
    const player = playersData[playerId];
    if (!player) return;
    player.position = newPosition;
    const property = properties[newPosition];
    if (property.owner && property.owner !== playerId) {
        const rent = Math.floor(property.value * 0.05);
        player.money -= rent;
        playersData[property.owner].money += rent;
        if (player.money <= 0) {
            alert(`${player.name} đã thua vì hết tiền!`);
            socket.emit('player-lost', { playerId });
        } else {
            alert(`${player.name} phải trả $${rent} cho ${playersData[property.owner].name}`);
        }
    } else if (property.owner === playerId) {
        alert(`${player.name} đã quay lại đất của mình: ${property.name}`);
    } else if (!property.owner) {
        const purchaseModal = new bootstrap.Modal(document.getElementById('purchasePropertyModal'));
        document.getElementById('purchase-property-info').textContent = `Bạn có muốn mua ${property.name} với giá $${property.value}?`;
        document.getElementById('confirm-purchase-button').onclick = () => {
            socket.emit('buy-property', { propertyId: property.id });
            purchaseModal.hide();
        };
        purchaseModal.show();
    }
    updatePlayersList();
});
function upgradeProperty(propertyId) {
    const property = properties.find(prop => prop.id === propertyId);
    if (!property || property.owner !== socket.id) return;
    const upgradeCosts = {
        'Đất hoang': 0.2,
        'Nhà lá': 0.4,
        'Nhà 1 tầng': 0.8,
        'Nhà lầu': 1.2
    };
    const nextLevels = {
        'Đất hoang': 'Nhà lá',
        'Nhà lá': 'Nhà 1 tầng',
        'Nhà 1 tầng': 'Nhà lầu',
        'Nhà lầu': 'Lâu đài tình yêu'
    };
    const currentLevel = property.level;
    const nextLevel = nextLevels[currentLevel];
    const costMultiplier = upgradeCosts[currentLevel];
    if (!nextLevel || !costMultiplier) {
        alert('Đất đã đạt cấp tối đa!');
        return;
    }
    const upgradeCost = Math.floor(property.value * costMultiplier);
    const player = playersData[socket.id];
    if (player.money >= upgradeCost) {
        player.money -= upgradeCost;
        property.value = Math.floor(property.value * (1 + costMultiplier / 2));
        property.level = nextLevel;
        alert(`Đã nâng cấp ${property.name} lên ${nextLevel} với chi phí $${upgradeCost}`);
        updatePlayersList();
    } else {
        alert('Không đủ tiền để nâng cấp đất!');
    }
}
socket.on('player-lost', ({ playerId }) => {
    delete playersData[playerId];
    updatePlayersList();
    alert(`Người chơi đã bị loại khỏi trò chơi!`);
});
