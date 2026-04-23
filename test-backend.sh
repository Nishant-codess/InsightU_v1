#!/bin/bash

# Test Backend Health and Login
# Run this to verify backend is working correctly

echo "🔍 Testing InsightU Backend..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if backend is running
echo "Test 1: Checking if backend is running..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend is running${NC}"
    echo "Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}✗ Backend is not running${NC}"
    echo "Please start the backend with: npm run dev"
    exit 1
fi
echo ""

# Test 2: Check Redis
echo "Test 2: Checking Redis connection..."
REDIS_RESPONSE=$(redis-cli ping 2>&1)
if [ "$REDIS_RESPONSE" = "PONG" ]; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${RED}✗ Redis is not running${NC}"
    echo "Please start Redis with: redis-server"
fi
echo ""

# Test 3: Test Admin Login
echo "Test 3: Testing admin login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@srmist.edu.in","password":"admin123"}' 2>&1)

if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
    echo -e "${GREEN}✓ Admin login successful${NC}"
    echo "User: $(echo $LOGIN_RESPONSE | grep -o '"email":"[^"]*"' | head -1)"
    echo "Role: $(echo $LOGIN_RESPONSE | grep -o '"role":"[^"]*"' | head -1)"
else
    echo -e "${RED}✗ Admin login failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
fi
echo ""

# Test 4: Test Student Login
echo "Test 4: Testing student login..."
STUDENT_LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nr0070@srmist.edu.in","password":"Nishant@1"}' 2>&1)

if echo "$STUDENT_LOGIN" | grep -q "accessToken"; then
    echo -e "${GREEN}✓ Student login successful${NC}"
    echo "User: $(echo $STUDENT_LOGIN | grep -o '"email":"[^"]*"' | head -1)"
else
    echo -e "${RED}✗ Student login failed${NC}"
    echo "Response: $STUDENT_LOGIN"
fi
echo ""

# Test 5: Check Database
echo "Test 5: Checking database users..."
DB_COUNT=$(psql -U nishant -d insightu -t -c "SELECT COUNT(*) FROM \"User\";" 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database connected${NC}"
    echo "Total users: $DB_COUNT"
else
    echo -e "${RED}✗ Database connection failed${NC}"
    echo "Error: $DB_COUNT"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "If all tests passed:"
echo "  → Backend is working correctly"
echo "  → Login should work in browser"
echo "  → Clear browser cache and try again"
echo ""
echo "If tests failed:"
echo "  → Check which service is down"
echo "  → Start missing services"
echo "  → Check logs for errors"
echo ""
echo "Next steps:"
echo "  1. Clear browser cache (Cmd+Shift+R)"
echo "  2. Go to http://localhost:5173"
echo "  3. Login with: admin@srmist.edu.in / admin123"
echo ""
