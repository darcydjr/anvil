import { describe, test, expect } from 'vitest';
import { parseTable, createDependencyTable, Dependency } from './markdownUtils';

describe('Dependency Parsing Functions', () => {
  describe('parseTable', () => {
    test('should parse valid 2-column Internal Upstream Dependency table', () => {
      const markdown = `# Test Capability

## Dependencies

### Internal Upstream Dependency

| Capability ID | Description |
|---------------|-------------|
| CAP-0087 | Auto-generated reverse dependency |
| CAP-1234 | Another dependency |

### Internal Downstream Impact

| Capability ID | Description |
|---------------|-------------|
| CAP-5887 | Test downstream |
`;

      const result = parseTable(markdown, 'Internal Upstream Dependency');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'CAP-0087',
        description: 'Auto-generated reverse dependency'
      });
      expect(result[1]).toEqual({
        id: 'CAP-1234',
        description: 'Another dependency'
      });
    });

    test('should parse valid 2-column Internal Downstream Impact table', () => {
      const markdown = `# Test Capability

## Dependencies

### Internal Downstream Impact

| Capability ID | Description |
|---------------|-------------|
| CAP-5887 | Test downstream impact |
`;

      const result = parseTable(markdown, 'Internal Downstream Impact');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'CAP-5887',
        description: 'Test downstream impact'
      });
    });

    test('should handle empty table gracefully', () => {
      const markdown = `# Test Capability

## Dependencies

### Internal Upstream Dependency

| Capability ID | Description |
|---------------|-------------|
| | |
`;

      const result = parseTable(markdown, 'Internal Upstream Dependency');

      expect(result).toHaveLength(0);
    });

    test('should handle missing section gracefully', () => {
      const markdown = `# Test Capability

## Other Section

Some content here.
`;

      const result = parseTable(markdown, 'Internal Upstream Dependency');

      expect(result).toHaveLength(0);
    });

    test('should handle malformed table rows', () => {
      const markdown = `# Test Capability

## Dependencies

### Internal Upstream Dependency

| Capability ID | Description |
|---------------|-------------|
| CAP-0087 | Valid dependency |
| Malformed row without separator |
| CAP-1234 | Another valid one |
`;

      const result = parseTable(markdown, 'Internal Upstream Dependency');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'CAP-0087',
        description: 'Valid dependency'
      });
      expect(result[1]).toEqual({
        id: 'CAP-1234',
        description: 'Another valid one'
      });
    });

    test('should handle extra whitespace in cells', () => {
      const markdown = `# Test Capability

## Dependencies

### Internal Upstream Dependency

| Capability ID | Description |
|---------------|-------------|
|  CAP-0087  |  Auto-generated reverse dependency  |
`;

      const result = parseTable(markdown, 'Internal Upstream Dependency');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'CAP-0087',
        description: 'Auto-generated reverse dependency'
      });
    });

    test('should handle partial empty cells', () => {
      const markdown = `# Test Capability

## Dependencies

### Internal Upstream Dependency

| Capability ID | Description |
|---------------|-------------|
| CAP-0087 | |
| | Some description |
`;

      const result = parseTable(markdown, 'Internal Upstream Dependency');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'CAP-0087',
        description: ''
      });
      expect(result[1]).toEqual({
        id: '',
        description: 'Some description'
      });
    });
  });

  describe('createDependencyTable', () => {
    test('should create valid 2-column table from dependency array', () => {
      const dependencies: Dependency[] = [
        { id: 'CAP-0087', description: 'Auto-generated reverse dependency' },
        { id: 'CAP-1234', description: 'Another dependency' }
      ];

      const result = createDependencyTable(dependencies);

      const expectedTable = `| Capability ID | Description |
|---------------|-------------|
| CAP-0087 | Auto-generated reverse dependency |
| CAP-1234 | Another dependency |`;

      expect(result.trim()).toBe(expectedTable);
    });

    test('should create empty table when no dependencies', () => {
      const dependencies: Dependency[] = [];

      const result = createDependencyTable(dependencies);

      const expectedTable = `| Capability ID | Description |
|---------------|-------------|
| | |`;

      expect(result.trim()).toBe(expectedTable);
    });

    test('should handle dependencies with empty fields', () => {
      const dependencies: Dependency[] = [
        { id: 'CAP-0087', description: '' },
        { id: '', description: 'Some description' }
      ];

      const result = createDependencyTable(dependencies);

      const expectedTable = `| Capability ID | Description |
|---------------|-------------|
| CAP-0087 |  |
|  | Some description |`;

      expect(result.trim()).toBe(expectedTable);
    });
  });

  describe('Round-trip dependency processing', () => {
    test('should maintain data integrity through parse → create cycle', () => {
      const originalMarkdown = `# Test Capability

## Dependencies

### Internal Upstream Dependency

| Capability ID | Description |
|---------------|-------------|
| CAP-0087 | Auto-generated reverse dependency |
| CAP-1234 | Another dependency |

### Internal Downstream Impact

| Capability ID | Description |
|---------------|-------------|
| CAP-5887 | Test downstream |
`;

      // Parse dependencies from markdown
      const upstreamDeps = parseTable(originalMarkdown, 'Internal Upstream Dependency');
      const downstreamDeps = parseTable(originalMarkdown, 'Internal Downstream Impact');

      // Recreate tables from parsed data
      const upstreamTable = createDependencyTable(upstreamDeps);
      const downstreamTable = createDependencyTable(downstreamDeps);

      // Verify upstream dependencies
      expect(upstreamDeps).toHaveLength(2);
      expect(upstreamDeps[0]).toEqual({
        id: 'CAP-0087',
        description: 'Auto-generated reverse dependency'
      });

      // Verify downstream dependencies
      expect(downstreamDeps).toHaveLength(1);
      expect(downstreamDeps[0]).toEqual({
        id: 'CAP-5887',
        description: 'Test downstream'
      });

      // Verify table recreation
      expect(upstreamTable).toContain('CAP-0087');
      expect(upstreamTable).toContain('Auto-generated reverse dependency');
      expect(downstreamTable).toContain('CAP-5887');
      expect(downstreamTable).toContain('Test downstream');
    });
  });
});
