-- Step 1: Create new table with nullable workspaceId
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dueDate" DATETIME,
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "parentId" TEXT,
    "orderIndex" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "workspaceId" TEXT,
    CONSTRAINT "Task_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 2: Copy all data and populate workspaceId from List table
INSERT INTO "new_Task" ("id", "listId", "title", "description", "status", "priority", "dueDate", "assignedToId", "createdById", "parentId", "orderIndex", "createdAt", "updatedAt", "workspaceId")
SELECT t."id", t."listId", t."title", t."description", t."status", t."priority", t."dueDate", t."assignedToId", t."createdById", t."parentId", t."orderIndex", t."createdAt", t."updatedAt", l."workspaceId"
FROM "Task" t
INNER JOIN "List" l ON t."listId" = l."id";

-- Step 3: Drop old table
DROP TABLE "Task";

-- Step 4: Rename new table to Task
ALTER TABLE "new_Task" RENAME TO "Task";

-- Step 5: Make workspaceId required by creating final table structure
CREATE TABLE "final_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dueDate" DATETIME,
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "parentId" TEXT,
    "orderIndex" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "workspaceId" TEXT NOT NULL,
    CONSTRAINT "Task_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 6: Copy all data to final table
INSERT INTO "final_Task" SELECT * FROM "Task";

-- Step 7: Drop temporary table
DROP TABLE "Task";

-- Step 8: Rename final table to Task
ALTER TABLE "final_Task" RENAME TO "Task";
