#!/bin/bash

# Database Setup Script for InsightU Platform
# This script helps set up the PostgreSQL database and run migrations

set -e

echo "🚀 InsightU Database Setup"
echo "=========================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please update DATABASE_URL with your PostgreSQL credentials."
    echo ""
    read -p "Press Enter after updating .env file..."
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Generating Prisma Client..."
npm run prisma:generate

echo ""
echo "🗄️  Running database migrations..."
echo "This will create all tables in your database."
echo ""

# Try to run migrations
if npm run prisma:migrate; then
    echo ""
    echo "✅ Migrations completed successfully!"
    echo ""
    
    # Ask if user wants to seed
    read -p "Do you want to seed the database with sample data? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🌱 Seeding database..."
        npm run prisma:seed
        echo ""
        echo "✅ Database seeded successfully!"
        echo ""
        echo "📝 Sample Users Created:"
        echo "   Admin: admin@insightu.edu / admin123"
        echo "   Teacher: john.doe@insightu.edu / teacher123"
        echo "   Student: student0@insightu.edu / student123"
        echo "   Parent: parent1@example.com / parent123"
    fi
    
    echo ""
    echo "🎉 Database setup complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Start the server: npm run dev"
    echo "  2. View database: npx prisma studio"
    
else
    echo ""
    echo "❌ Migration failed. Please check:"
    echo "  1. PostgreSQL is running"
    echo "  2. DATABASE_URL in .env is correct"
    echo "  3. Database user has proper permissions"
    echo ""
    echo "For manual setup, see: prisma/MIGRATION_GUIDE.md"
fi
