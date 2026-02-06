import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { Server, ServerResponse } from 'http';
import { Socket } from 'net';
import { v4 as uuid } from 'uuid';
import Keyv from 'keyv';
import KeyvSqlite from '@keyv/sqlite';
import { generateUsername } from 'friendly-username-generator';
import winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'factly.db');

const store = new Keyv({
  store: new KeyvSqlite('sqlite://' + dbPath)
});

store.on('error', (err) => console.error('Keyv connection error:', err));

// Set up Winston logger
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

logger.info(`Using SQLite store at ${dbPath}`);


const app = express();
const port = 3002;

// Add middleware
app.use(bodyParser.json());
app.use(cors());

// Define API endpoints
app.post('/rooms', async (req, res) => {
  const roomId = await createRoom(req.body);
  logger.info(`Created room with ID: ${roomId}`);
  res.send({ roomId });
});

app.get('/rooms/:id', async (req, res) => {
  logger.debug(`Fetched room data for ID: ${req.params.id}`);
  const room = await getRoom(req.params.id);
  res.send(room);
});

app.delete('/rooms/:id', async (req, res) => {
  await stopRoom(req.params.id);
  logger.info(`Stopped room with ID: ${req.params.id}`);
  res.sendStatus(204);
});

app.get('/status', (req, res) => {
  const status = Array.from(subscribers.entries()).reduce((prev: any, [roomId, sockets]) => {
    prev[roomId] = sockets.size;
    return prev;
  }, {});
  logger.debug(`Requested server status: ${JSON.stringify(status)}`);
  res.send(status);
});

app.post('/rooms/:id/update', async (req, res) => {
  const roomId = req.params.id;
  const data = req.body;
  const senderUuid = data.senderUuid;
  const username = data.username;
  const payload = data.payload;

  logger.debug(`Received update for room ${roomId}: ${JSON.stringify({ senderUuid, username, payload })}`);

  await saveRoom(roomId, payload);
  if (senderUuid && subscribers.has(roomId)) {
    logger.info(`Broadcasting update for room ${roomId} from user ${senderUuid}`);
    broadcastUpdate(roomId, payload, senderUuid, username);
  }
  res.sendStatus(204);
});

// Define Server-Sent Events server
interface UserSocket extends Socket {
  uuid?: string;
  username?: string;
  roomId?: string;
}

const subscribers: Map<string, Set<UserSocket>> = new Map();
const users: Map<string, Set<string>> = new Map();

app.get('/events/:roomId', async (req, res) => {
  const roomId = req.params.roomId;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  if (!roomId || !isRoomValid(roomId)) {
    logger.error(`Invalid or missing room ID for SSE: ${roomId}`);
    return res.destroy();
  }
  const uuidParam = req.query.uuid;
  const usernameParam = req.query.username;

  const socket = res as any;
  socket.uuid = uuidParam ?? uuid();
  socket.username = usernameParam ?? generateUsername();
  socket.roomId = roomId;

  if (!subscribers.has(roomId)) {
    subscribers.set(roomId, new Set());
  }
  subscribers.get(roomId)!.add(socket);

  if (!users.has(roomId)) {
    users.set(roomId, new Set());
  }
  users.get(roomId)!.add(socket.username!);

  res.write(`data: {"type": "credentials", "uuid": "${socket.uuid}", "username": "${socket.username}"}\n\n`);

  req.on('close', () => {
    logger.debug(`Client with uuid: ${socket.uuid} and username: ${socket.username} disconnected`);
    if (socket.username && socket.roomId) {
      subscribers.get(socket.roomId)?.delete(socket);
      users.get(socket.roomId)?.delete(socket.username);
    }
  });
}); 


// Implement CRUD operations for data storage
async function createRoom(data: any): Promise<string> {
  // Create a new room with the provided data and store it in the database
  const roomId = uuid();
  logger.debug(`Creating room with ID: ${roomId}`);
  if (!data) throw new Error('No data provided');
  await saveRoom(roomId, data);
  logger.debug(`Created room with ID: ${roomId}`);
  return roomId;
}

async function getRoom(id: string): Promise<any> {
  // Retrieve the current state of a room by ID from the database
  const room = await loadRoom(id);
  logger.debug(`Fetched room data for ID: ${id}`);
  return room;
}

async function saveRoom(id: string, data: any) {
  await store.set(id, data);
  logger.debug(`Saved room data for ID: ${id}`);
}

async function loadRoom(id: string) {
  logger.debug(`Loaded room data for ID: ${id}`);
  return await store.get(id);
}

async function stopRoom(id: string) {
  subscribers.delete(id);
  users.delete(id);
  await store.delete(id);
  logger.debug(`Stopped room with ID: ${id}`);
}


function broadcastUpdate(roomId: string, payload: any, senderUuid: string, username?: string) {
  const sockets = subscribers.get(roomId);
  if (sockets) {
    logger.debug(`Broadcasting update to ${sockets.size} clients in room: ${roomId}`);
    for (const socket of sockets) {
      // Send update to all clients except the one who sent the update
      if (socket.uuid !== senderUuid || !username || socket.username !== username) {
        logger.debug(`Sending update to client with uuid: ${socket.uuid} and username: ${socket.username}`);
        socket.write(`data: ${JSON.stringify({ type: 'update', payload })}\n\n`);
      }
    }
  }
}

const isRoomValid = (roomId: string): boolean => {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(roomId);
};


// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
