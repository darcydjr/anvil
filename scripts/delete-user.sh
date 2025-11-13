#!/bin/bash

# Anvil User Management - Delete User Script
# Easy wrapper for deleting users from the command line

cd "$(dirname "$0")"

if [ $# -eq 0 ]; then
    # Interactive mode
    npx ts-node scripts/delete-user.ts
elif [ $# -eq 1 ]; then
    # Command line mode
    npx ts-node scripts/delete-user.ts "$1"
elif [ $# -eq 2 ] && { [ "$2" = "--force" ] || [ "$2" = "-f" ]; }; then
    # Command line with force flag
    npx ts-node scripts/delete-user.ts "$1" "$2"
else
    echo "Usage:"
    echo "  Interactive mode:  ./delete-user.sh"
    echo "  Command line:      ./delete-user.sh <username>"
    echo "  Force (no prompt): ./delete-user.sh <username> --force"
    exit 1
fi
