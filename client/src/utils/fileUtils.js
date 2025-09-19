/*
 * Copyright 2025 Darcy Davidson
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Utility functions for file operations

/**
 * Converts a document ID to a filename (preferred method for uniqueness)
 * @param {string} id - The document ID (e.g., CAP-001, ENB-001)
 * @param {string} type - The document type (capability, enabler)
 * @returns {string} - The filename with appropriate suffix (e.g., cap-001-capability.md, enb-001-enabler.md)
 */
export function idToFilename(id, type) {
  if (!id) return '';

  const lowerId = id.toLowerCase();

  // Add type suffix for consistency with backend naming
  if (type === 'capability') {
    return `${lowerId}-capability.md`;
  } else if (type === 'enabler') {
    return `${lowerId}-enabler.md`;
  }

  // Fallback for unknown types
  return `${lowerId}.md`;
}

/**
 * Converts a document name to a filename-safe string (legacy method)
 * @param {string} name - The document name
 * @param {string} type - The document type ('capability' or 'enabler')
 * @returns {string} - The filename-safe string
 */
export function nameToFilename(name, type) {
  if (!name || !type) return '';

  // Convert to lowercase, replace spaces and special chars with hyphens
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

  return `${cleanName}-${type}.md`;
}

/**
 * Extracts the document name from a filename
 * @param {string} filename - The filename
 * @returns {string} - The extracted name
 */
export function filenameToName(filename) {
  if (!filename) return '';

  // Remove .md extension first
  const nameWithoutExtension = filename.replace(/\.md$/, '');

  // Check if it's an ID-based filename (starts with CAP- or ENB-)
  if (nameWithoutExtension.match(/^(CAP|ENB)-/i)) {
    // For ID-based filenames, remove type suffix if present and return the ID as-is (uppercase)
    const idWithoutSuffix = nameWithoutExtension.replace(/-capability$|-enabler$/, '');
    return idWithoutSuffix.toUpperCase();
  }

  // For legacy name-based filenames, remove type suffix and format
  return nameWithoutExtension
    .replace(/-capability$|-enabler$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
}

/**
 * Checks if two names would generate different filenames
 * @param {string} oldName - The old name
 * @param {string} newName - The new name  
 * @param {string} type - The document type
 * @returns {boolean} - Whether filenames would be different
 */
export function namesGenerateDifferentFilenames(oldName, newName, type) {
  return nameToFilename(oldName, type) !== nameToFilename(newName, type);
}