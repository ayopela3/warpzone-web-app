#!/bin/bash

# Pre-deployment Testing Pipeline
# Ensures comprehensive testing before production deployment

set -e  # Exit on any error

echo "🚀 Starting Pre-deployment Testing Pipeline"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "\n${BLUE}🧪 Running: ${test_name}${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: ${test_name}${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAILED: ${test_name}${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Type Checking and Linting
echo -e "\n${YELLOW}📋 Phase 1: Code Quality Checks${NC}"

run_test "TypeScript Type Checking" "npm run type-check" || {
    echo -e "${RED}TypeScript errors found. Fix before deployment.${NC}"
    exit 1
}

run_test "ESLint Linting" "npm run lint" || {
    echo -e "${RED}Linting errors found. Fix before deployment.${NC}"
    exit 1
}

run_test "Prettier Formatting Check" "npm run format:check" || {
    echo -e "${YELLOW}Formatting issues found. Run 'npm run format' to fix.${NC}"
}

# 2. Unit Tests
echo -e "\n${YELLOW}📋 Phase 2: Unit Tests${NC}"

if command_exists jest; then
    run_test "Component Unit Tests" "npm run test:unit" || {
        echo -e "${RED}Unit tests failed. Fix before deployment.${NC}"
        exit 1
    }
else
    echo -e "${YELLOW}⚠️  Jest not found. Skipping unit tests.${NC}"
fi

# 3. Integration Tests
echo -e "\n${YELLOW}📋 Phase 3: Integration Tests${NC}"

run_test "API Integration Tests" "npm run test:integration" || {
    echo -e "${RED}API integration tests failed. Fix before deployment.${NC}"
    exit 1
}

# 4. Build Test
echo -e "\n${YELLOW}📋 Phase 4: Build Validation${NC}"

run_test "Production Build" "npm run build" || {
    echo -e "${RED}Build failed. Fix before deployment.${NC}"
    exit 1
}

# 5. Security Checks
echo -e "\n${YELLOW}📋 Phase 5: Security Validation${NC}"

run_test "Dependency Security Audit" "npm audit --audit-level high" || {
    echo -e "${YELLOW}⚠️  Security vulnerabilities found. Review before deployment.${NC}"
}

# 6. Admin Payments Specific Tests
echo -e "\n${YELLOW}📋 Phase 6: Admin Payments System Tests${NC}"

run_test "Admin Payments API Tests" "node scripts/test-admin-payments.js" || {
    echo -e "${RED}Admin payments API tests failed. Fix before deployment.${NC}"
    exit 1
}

# 7. Database Schema Validation
echo -e "\n${YELLOW}📋 Phase 7: Database Schema Validation${NC}"

run_test "Database Schema Check" "node scripts/validate-database-schema.js" || {
    echo -e "${YELLOW}⚠️  Database schema validation skipped or failed.${NC}"
}

# 8. Performance Checks
echo -e "\n${YELLOW}📋 Phase 8: Performance Validation${NC}"

run_test "Bundle Size Analysis" "npm run analyze" || {
    echo -e "${YELLOW}⚠️  Bundle size analysis skipped.${NC}"
}

# 9. Environment Validation
echo -e "\n${YELLOW}📋 Phase 9: Environment Validation${NC}"

# Check required environment variables
required_vars=("NEXT_PUBLIC_APP_URL" "DATABASE_URL")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing required environment variables: ${missing_vars[*]}${NC}"
    ((TESTS_FAILED++))
else
    echo -e "${GREEN}✅ All required environment variables are set${NC}"
    ((TESTS_PASSED++))
fi

# 10. Final Validation
echo -e "\n${YELLOW}📋 Phase 10: Final Validation${NC}"

# Check if git working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Working directory is not clean. Consider committing changes.${NC}"
else
    echo -e "${GREEN}✅ Working directory is clean${NC}"
    ((TESTS_PASSED++))
fi

# Results Summary
echo -e "\n${BLUE}📊 Test Results Summary${NC}"
echo "=================================="
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo -e "Total Tests:  $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Ready for deployment.${NC}"
    echo -e "${GREEN}✅ Pre-deployment validation successful${NC}"
    exit 0
else
    echo -e "\n${RED}💥 Some tests failed. Fix issues before deployment.${NC}"
    echo -e "${RED}❌ Pre-deployment validation failed${NC}"
    exit 1
fi
