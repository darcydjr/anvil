#!/bin/bash

# Anvil User Management - Add User Script
# Easy wrapper for adding users from the command line

cd "$(dirname "$0")"

if [ $# -eq 0 ]; then
    # Interactive mode
    npx ts-node scripts/add-user.ts
elif [ $# -eq 2 ]; then
    # Command line mode
    npx ts-node scripts/add-user.ts "$1" "$2"
else
    echo "Usage:"
    echo "  Interactive mode: ./add-user.sh"
    echo "  Command line:     ./add-user.sh <username> <password>"
    exit 1
fi
