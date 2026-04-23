#!/bin/bash

# InsightU Platform Startup Script

echo "🚀 Starting InsightU Platform..."
echo ""

# Check if Redis is running
echo "📍 Checking Redis..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running"
else
    echo "❌ Redis is not running"
    echo "   Starting Redis..."
    redis-server --daemonize yes
    sleep 2
    if redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis started successfully"
    else
        echo "❌ Failed to start Redis. Please start it manually: redis-server"
        exit 1
    fi
fi

echo ""

# Check if PostgreSQL is accessible
echo "📍 Checking PostgreSQL..."
if psql -U nishant -d insightu -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ PostgreSQL is accessible"
else
    echo "❌ PostgreSQL is not accessible"
    echo "   Please ensure PostgreSQL is running"
    exit 1
fi

echo ""

# Check if .env is configured
echo "📍 Checking configuration..."
if grep -q "your-google-client-id" backend/.env; then
    echo "⚠️  Google OAuth not configured (optional for email login)"
    echo "   Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env"
else
    echo "✅ Google OAuth configured"
fi

echo ""
echo "🎯 Starting application..."
echo ""
echo "   Backend will start on: http://localhost:3000"
echo "   Frontend will start on: http://localhost:5173"
echo ""
echo "📝 Login credentials:"
echo "   Admin:   admin@srmist.edu.in / admin123"
echo "   Student: nr0070@srmist.edu.in / password123"
echo "   Teacher: teacher1@insightu.edu / password123"
echo "   Parent:  parent1@example.com / password123"
echo ""
echo "Press Ctrl+C to stop the servers"
echo ""

# Start the application
npm run dev
