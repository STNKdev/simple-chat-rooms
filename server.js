// imports
const express = require('express');

// instance
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.json());

const rooms = new Map();

// Endpoint
app.get('/rooms/:id', (request, response) => {
  const { id: roomId} = request.params;
  const obj = rooms.has(roomId)
      ? {
        users: [...rooms.get(roomId).get('users').values()],
        messages: [...rooms.get(roomId).get('messages').values()]
      }
      : {
        users: [],
        messages: []
      };
  response.json(obj);
});

app.post('/rooms', (request, response) => {
  const {roomId, userName} = request.body;
  if (!rooms.has(roomId)) {
    rooms.set(
        roomId,
        new Map([
            ['users', new Map()],
            ['messages', []]
        ])
    );
  }
  response.send();
});

// Endpoint

io.on('connection', (socket) => {
  socket.on('ROOM:JOIN', ({ roomId, userName }) => {
    socket.join(roomId);
    rooms.get(roomId).get('users').set(socket.id, userName);
    const users = [...rooms.get(roomId).get('users').values()];
    socket.to(roomId).broadcast.emit('ROOM:SET_USERS', users);
  });

  socket.on('ROOM:NEW_MESSAGE', ({ roomId, userName, text }) => {
    const message = {
      userName,
      text
    }
    rooms.get(roomId).get('messages').push(message);
    socket.to(roomId).broadcast.emit('ROOM:NEW_MESSAGE', message);
  });

  socket.on('disconnect', ({ roomId, userName }) => {
    rooms.forEach((value, roomId) => {
      if (value.get('users').delete(socket.id)) {
        const users = [...value.get('users').values()];
        socket.to(roomId).broadcast.emit('ROOM:SET_USERS', users);
      }
    });
  });

  console.log('user connected', socket.id);
});

http.listen(9999, (error) => {
  if (error) {
    throw Error(error);
  }
  console.log('Server run!', 'Listening on *:9999');
});
