#!/bin/bash

# Project Renaming Script (Bash version)
#
# This script renames the project from "Quade" to any custom name throughout the codebase.
#
# Usage:
#   ./scripts/rename-project.sh <new-name> [--dry-run]
#
# Example:
#   ./scripts/rename-project.sh "MyProject"
#   ./scripts/rename-project.sh "MyProject" --dry-run

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Parse arguments
NEW_NAME="$1"
DRY_RUN=false

if [ "$2" == "--dry-run" ] || [ "$1" == "--dry-run" ]; then
    DRY_RUN=true
fi

# Validate arguments
if [ -z "$NEW_NAME" ] || [ "$NEW_NAME" == "--dry-run" ]; then
    echo -e "${RED}Error: Please provide a new project name${NC}"
    echo ""
    echo "Usage: ./scripts/rename-project.sh <new-name> [--dry-run]"
    echo "Example: ./scripts/rename-project.sh \"MyProject\""
    echo ""
    exit 1
fi

# Validate name format
if ! [[ "$NEW_NAME" =~ ^[a-zA-Z][a-zA-Z0-9\ -]*$ ]]; then
    echo -e "${RED}Error: Project name must start with a letter and contain only letters, numbers, spaces, and hyphens${NC}"
    exit 1
fi

CURRENT_NAME="Quade"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BOLD}${BLUE}Project Renaming Script${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""
echo -e "Current name: ${YELLOW}${CURRENT_NAME}${NC}"
echo -e "New name:     ${GREEN}${NEW_NAME}${NC}"
if [ "$DRY_RUN" = true ]; then
    echo -e "Mode:         ${YELLOW}DRY RUN (no changes will be made)${NC}"
else
    echo -e "Mode:         ${GREEN}LIVE${NC}"
fi
echo ""

# Create backup
create_backup() {
    if [ "$DRY_RUN" = true ]; then
        return
    fi

    TIMESTAMP=$(date +%Y-%m-%d)
    BACKUP_DIR="$ROOT_DIR/backup-$TIMESTAMP"

    echo -e "${BLUE}Creating backup in: $BACKUP_DIR${NC}"
    echo ""

    mkdir -p "$BACKUP_DIR"

    # Backup critical files
    for file in "config.json" "client/index.html" "README.md" "client/src/components/Login.tsx" "utils/auth.ts"; do
        if [ -f "$ROOT_DIR/$file" ]; then
            mkdir -p "$BACKUP_DIR/$(dirname "$file")"
            cp "$ROOT_DIR/$file" "$BACKUP_DIR/$file"
        fi
    done

    echo -e "${GREEN}✓ Backup created successfully${NC}"
    echo ""
}

# Process a single file
process_file() {
    local file="$1"
    local full_path="$ROOT_DIR/$file"

    if [ ! -f "$full_path" ]; then
        echo -e "${YELLOW}⚠ Skipping (not found): $file${NC}"
        return
    fi

    # Count replacements
    local count=$(grep -o "$CURRENT_NAME" "$full_path" 2>/dev/null | wc -l | tr -d ' ')

    if [ "$count" -gt 0 ]; then
        echo -e "${GREEN}✓ $file${NC} ($count replacement$([ $count -gt 1 ] && echo "s" || echo ""))"

        if [ "$DRY_RUN" = false ]; then
            # Perform replacements
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' "s/$CURRENT_NAME/$NEW_NAME/g" "$full_path"
                sed -i '' "s/${CURRENT_NAME,,}-auth/${NEW_NAME,,}-auth/g" "$full_path"
                sed -i '' "s/\"$CURRENT_NAME Application\"/\"$NEW_NAME Application\"/g" "$full_path"
                sed -i '' "s/$CURRENT_NAME Core/$NEW_NAME Core/g" "$full_path"
            else
                # Linux
                sed -i "s/$CURRENT_NAME/$NEW_NAME/g" "$full_path"
                sed -i "s/${CURRENT_NAME,,}-auth/${NEW_NAME,,}-auth/g" "$full_path"
                sed -i "s/\"$CURRENT_NAME Application\"/\"$NEW_NAME Application\"/g" "$full_path"
                sed -i "s/$CURRENT_NAME Core/$NEW_NAME Core/g" "$full_path"
            fi
        fi

        ((FILES_MODIFIED++))
        ((TOTAL_REPLACEMENTS+=count))
    else
        echo -e "  $file (no changes needed)"
    fi
}

# Initialize counters
FILES_MODIFIED=0
TOTAL_REPLACEMENTS=0

# Create backup
create_backup

echo -e "${BOLD}Processing files...${NC}"
echo ""

# Files to process
FILES=(
    # Configuration files
    "config.json"
    "client/index.html"
    "README.md"

    # Application code
    "client/src/components/Login.tsx"
    "utils/auth.ts"

    # Specification files - capabilities
    "specifications/832930-capability.md"
    "specifications/725677-capability.md"
    "specifications/900012-capability.md"
    "specifications/800901-capability.md"
    "specifications/700890-capability.md"
    "specifications/600789-capability.md"
    "specifications/500678-capability.md"
    "specifications/400567-capability.md"
    "specifications/300456-capability.md"
    "specifications/200345-capability.md"
    "specifications/100234-capability.md"

    # Design system documentation
    "specifications/DESIGN_SYSTEM_COMPONENTS.md"
    "specifications/DESIGN_SYSTEM_SPACING.md"
    "specifications/DESIGN_SYSTEM_TYPOGRAPHY.md"
    "specifications/DESIGN_SYSTEM_COLOR_PALETTE.md"

    # Other specification files
    "specifications/DISCOVERY_SUMMARY.md"
    "specifications/300100-enabler.md"
    "specifications/300103-enabler.md"
)

# Process all files
for file in "${FILES[@]}"; do
    process_file "$file"
done

# Summary
echo ""
echo -e "${BLUE}==================================================${NC}"
echo -e "${BOLD}Summary:${NC}"
echo "  Files processed: ${#FILES[@]}"
echo -e "  Files modified:  ${GREEN}${FILES_MODIFIED}${NC}"
echo -e "  Total replacements: ${GREEN}${TOTAL_REPLACEMENTS}${NC}"

if [ "$DRY_RUN" = true ]; then
    echo ""
    echo -e "${YELLOW}${BOLD}This was a DRY RUN - no changes were made${NC}"
    echo "Run without --dry-run to apply changes."
else
    echo ""
    echo -e "${GREEN}${BOLD}✓ Project successfully renamed to \"${NEW_NAME}\"${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Review the changes"
    echo "  2. Restart the application: npm run restart"
    echo "  3. Clear your browser cache if needed"
fi

echo ""
