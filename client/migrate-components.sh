#!/bin/bash
# Migration script for remaining JSX components to TypeScript
# This script will help identify files that still need manual migration

echo "====================================="
echo "Component Migration Status Report"
echo "====================================="
echo ""

echo "Files migrated so far:"
ls -1 src/components/*.tsx 2>/dev/null | wc -l | xargs echo "  - Main components:"
ls -1 src/components/forms/*.tsx 2>/dev/null | wc -l | xargs echo "  - Form components:"
ls -1 src/components/ui/*.tsx 2>/dev/null | wc -l | xargs echo "  - UI components:"

echo ""
echo "Files still to migrate:"
find src/components -name "*.jsx" -not -path "*/node_modules/*" | while read file; do
  echo "  - $file"
done

echo ""
echo "====================================="
