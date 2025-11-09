#!/bin/bash
# Script to prepare the project for production deployment
# This script switches the Prisma schema from SQLite to PostgreSQL

set -e

echo "🔧 Preparing for production deployment..."

# Check if PostgreSQL schema exists
if [ ! -f "prisma/schema.postgresql.prisma" ]; then
    echo "❌ Error: prisma/schema.postgresql.prisma not found"
    exit 1
fi

# Backup current schema
if [ -f "prisma/schema.prisma" ]; then
    cp prisma/schema.prisma prisma/schema.sqlite.prisma.backup
    echo "✅ Backed up SQLite schema to prisma/schema.sqlite.prisma.backup"
fi

# Copy PostgreSQL schema
cp prisma/schema.postgresql.prisma prisma/schema.prisma
echo "✅ Switched to PostgreSQL schema"

# Generate Prisma client
echo "🔨 Generating Prisma client..."
npx prisma generate

echo "✅ Production preparation complete!"
echo "⚠️  Note: Remember to set DATABASE_URL to your PostgreSQL connection string"

