import express from "express";
import { createServer } from "http";

const app = express();
const server = createServer(app);

// Basic middleware
app.use(express.json());

// Basic route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.send('Ultra minimal TaskFlow server running!');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Ultra minimal TaskFlow server running on port ${PORT}`);
});




