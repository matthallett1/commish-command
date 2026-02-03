#!/bin/bash

# Commish Command Application Test Suite
# This script tests the application endpoints and verifies expected behavior

set -e

BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass=0
fail=0

echo "============================================"
echo "Commish Command Application Test Suite"
echo "============================================"
echo ""
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""

# Function to test an endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="${3:-200}"
    local check_json="${4:-}"
    
    printf "Testing: %-50s " "$name"
    
    response=$(curl -s -w "\n%{http_code}" --max-time 10 "$url" 2>/dev/null || echo -e "\n000")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_code" ]; then
        if [ -n "$check_json" ]; then
            if echo "$body" | grep -q "$check_json"; then
                echo -e "${GREEN}PASS${NC} (HTTP $http_code, found '$check_json')"
                ((pass++))
            else
                echo -e "${RED}FAIL${NC} (HTTP $http_code, missing '$check_json')"
                ((fail++))
            fi
        else
            echo -e "${GREEN}PASS${NC} (HTTP $http_code)"
            ((pass++))
        fi
    else
        echo -e "${RED}FAIL${NC} (Expected $expected_code, got $http_code)"
        ((fail++))
    fi
}

echo "============================================"
echo "1. Backend API Health Check"
echo "============================================"
test_endpoint "Health endpoint" "$BACKEND_URL/api/health" 200 "healthy"

echo ""
echo "============================================"
echo "2. League Endpoints"
echo "============================================"
test_endpoint "Get league info" "$BACKEND_URL/api/leagues" 200
test_endpoint "Get seasons" "$BACKEND_URL/api/leagues/seasons" 200
test_endpoint "Get standings 2024" "$BACKEND_URL/api/leagues/standings/2024" 200 "standings"
test_endpoint "Get champions" "$BACKEND_URL/api/leagues/champions" 200 "yearly_champions"

echo ""
echo "============================================"
echo "3. Member Endpoints"  
echo "============================================"
test_endpoint "Get all members" "$BACKEND_URL/api/members" 200
test_endpoint "Get member by ID" "$BACKEND_URL/api/members/1" 200 "name"
test_endpoint "Get member H2H" "$BACKEND_URL/api/members/1/head-to-head" 200
test_endpoint "Get member rivalries" "$BACKEND_URL/api/members/1/rivalries" 200
test_endpoint "Get member notable events" "$BACKEND_URL/api/members/1/notable-events" 200 "highest_score"

echo ""
echo "============================================"
echo "4. Records Endpoints"
echo "============================================"
test_endpoint "Get all-time records" "$BACKEND_URL/api/records/all-time" 200
test_endpoint "Get H2H matrix" "$BACKEND_URL/api/records/h2h-matrix" 200
test_endpoint "Get luck analysis" "$BACKEND_URL/api/records/luck-analysis" 200
test_endpoint "Get power rankings" "$BACKEND_URL/api/records/power-rankings" 200
test_endpoint "Get season records 2024" "$BACKEND_URL/api/records/season/2024" 200 "season"

echo ""
echo "============================================"
echo "5. Matchup Endpoints"
echo "============================================"
test_endpoint "Get close games" "$BACKEND_URL/api/matchups/close-games?limit=10" 200
test_endpoint "Get blowouts" "$BACKEND_URL/api/matchups/blowouts?limit=10" 200
test_endpoint "Get highest scores" "$BACKEND_URL/api/matchups/highest-scores?limit=10" 200
test_endpoint "Get lowest scores" "$BACKEND_URL/api/matchups/lowest-scores?limit=10" 200

echo ""
echo "============================================"
echo "6. Frontend Page Tests"
echo "============================================"
test_endpoint "Home page" "$FRONTEND_URL/" 200 "Top Pot"
test_endpoint "Standings page" "$FRONTEND_URL/standings" 200
test_endpoint "Standings with year param" "$FRONTEND_URL/standings?year=2024" 200
test_endpoint "Members page" "$FRONTEND_URL/members" 200
test_endpoint "Member profile page" "$FRONTEND_URL/members/1" 200
test_endpoint "Records page" "$FRONTEND_URL/records" 200
test_endpoint "Matchups page" "$FRONTEND_URL/matchups" 200

echo ""
echo "============================================"
echo "Test Results Summary"
echo "============================================"
echo -e "Passed: ${GREEN}$pass${NC}"
echo -e "Failed: ${RED}$fail${NC}"
total=$((pass + fail))
echo "Total:  $total"
echo ""

if [ $fail -gt 0 ]; then
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
fi
