import express from 'express';
import { createServer } from 'http';

const app = express();
const server = createServer(app);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on port ${PORT}`);
});




