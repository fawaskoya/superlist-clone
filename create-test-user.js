import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('Creating test user...');

    // Hash password
    const passwordHash = await bcrypt.hash('password123', 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash,
        name: 'Test User',
      },
    });

    console.log('User created:', user.id);

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Test Workspace',
        slug: 'test-workspace',
        ownerId: user.id,
      },
    });

    console.log('Workspace created:', workspace.id);

    // Create workspace member
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: 'OWNER',
      },
    });

    console.log('Workspace member created');

    // Create a sample task
    await prisma.task.create({
      data: {
        title: 'Welcome to Superlist!',
        description: 'This is your first task. Try editing it or creating new ones.',
        workspaceId: workspace.id,
        createdById: user.id,
      },
    });

    console.log('Sample task created');

    console.log('\nTest user created successfully!');
    console.log('Email: test@example.com');
    console.log('Password: password123');
    console.log('Workspace: Test Workspace');

  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
