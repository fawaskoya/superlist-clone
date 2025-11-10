import { PrismaClient } from '@prisma/client';

// Create a single PrismaClient instance to be shared across the application
// This prevents connection issues in production environments
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
