#!/bin/bash

# Anvil User Management - List Users Script
# Displays all users in the database

cd "$(dirname "$0")"

npx ts-node scripts/list-users.ts
