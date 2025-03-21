const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: '*', 
        methods: ['GET', 'POST']
    }
});
let properties = [];
app.use(express.static('public'));

const colors = ['red', 'blue', 'green', 'yellow'];
const propertyNames = [
    'Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng',
    'Nha Trang', 'Huế', 'Vũng Tàu', 'Đà Lạt', 'Quảng Ninh',
    'Sapa', 'Hội An', 'Phú Quốc', 'Bình Dương', 'Bắc Ninh',
    'Thái Nguyên'
];

function initializeProperties() {
    properties = propertyNames.map((name, index) => ({
        id: index,
        name,
        owner: null,
        level: 'Đất hoang',
        value: Math.floor(Math.random() * (1000 - 300 + 1)) + 300,
        color: colors[index % colors.length]
    }));
}
initializeProperties();
let players = {};

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    socket.on('join-game', ({ name, avatar }) => {
        players[socket.id] = {
            id: socket.id,
            name,
            avatar,
            money: 1500,
            position: 0,
            assets: [],
            isReady: false
        };
        io.emit('waiting-room', players);
    });
    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('waiting-room', players);
    });
    socket.on('player-ready', () => {
        if (players[socket.id]) {
            players[socket.id].isReady = true;
            console.log('Player ready:', players[socket.id]);
            io.emit('waiting-room', players); 
            const allReady = Object.values(players).every(player => player.isReady);
            console.log('All players ready:', allReady);
            if (allReady && Object.keys(players).length > 1) {
                console.log('Starting countdown for game...');
                io.emit('start-countdown', 10); 
                setTimeout(() => {
                    io.emit('start-game', players);
                }, 10000);
            }
        }
    });
    
    
    socket.on('buy-property', ({ propertyId }) => {
        const player = players[socket.id];
        const property = properties.find(prop => prop.id === propertyId);
        if (property && !property.owner && player.money >= property.value) {
            player.money -= property.value;
            property.owner = socket.id;
            player.assets.push(property);
            const sameColorProperties = properties.filter(
                prop => prop.color === property.color && prop.owner === socket.id
            );
            if (sameColorProperties.length > 1) {
                sameColorProperties.forEach(prop => {
                    prop.value = Math.floor(prop.value * 1.05);
                });
            }
            io.emit('update-players', players);
            io.emit('update-properties', properties);
        }
    });

    socket.on('roll-dice', ({ dice }) => {
        const player = players[socket.id];
        if (!player) return;

        player.position = (player.position + dice) % properties.length;
        const property = properties[player.position];

        if (property.owner && property.owner !== socket.id) {
            const rent = Math.floor(property.value * 0.05);
            player.money -= rent;
            players[property.owner].money += rent;
        }

        io.emit('update-players', players);
        io.emit('property-info', { property, player });
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete players[socket.id];
        properties.forEach(property => {
            if (property.owner === socket.id) {
                property.owner = null;
            }
        });

        io.emit('update-players', players);
        io.emit('update-properties', properties);
    });

    socket.on('player-lost', ({ playerId }) => {
        delete players[playerId];
        properties.forEach(property => {
            if (property.owner === playerId) {
                property.owner = null;
            }
        });
        io.emit('update-players', players);
        io.emit('update-properties', properties);
    });
});

server.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});
