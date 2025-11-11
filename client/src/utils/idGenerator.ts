// ID Generation Utility
// Generates semi-unique 9-digit IDs for capabilities and enablers

/**
 * Generates a semi-unique 9-digit number based on current timestamp and random component
 * @returns A 9-digit number string
 */
function generateSemiUniqueNumber(): string {
  // Use current timestamp (last 4 digits) + 5-digit random number
  const now = Date.now()
  const timeComponent = parseInt(now.toString().slice(-4))
  const randomComponent = Math.floor(Math.random() * 100000)

  // Combine and ensure it's 9 digits
  const combined = timeComponent * 100000 + randomComponent

  // Ensure it's exactly 9 digits by padding or truncating
  return combined.toString().padStart(9, '0').slice(-9)
}

/**
 * Checks if an ID already exists in a list of IDs
 * @param id - The ID to check
 * @param existingIds - Array of existing IDs
 * @returns True if ID exists
 */
function idExists(id: string, existingIds: string[]): boolean {
  return existingIds.includes(id)
}

/**
 * Extracts numeric part from capability or enabler IDs
 * @param ids - Array of IDs like ['CAP-123456', 'ENB-654321']
 * @param prefix - The prefix to filter by ('CAP-' or 'ENB-')
 * @returns Array of numeric parts
 */
function extractNumericIds(ids: string[], prefix: string): string[] {
  return ids
    .filter(id => id && id.startsWith(prefix))
    .map(id => {
      const match = id.match(new RegExp(`${prefix.replace('-', '\\-')}(\\d+)`))
      return match ? match[1] : null
    })
    .filter((id): id is string => id !== null)
}

/**
 * Generates a unique capability ID
 * @param existingCapabilityIds - Array of existing capability IDs
 * @returns New capability ID in format CAP-123456789
 */
export function generateCapabilityId(existingCapabilityIds: string[] = []): string {
  const numericIds = extractNumericIds(existingCapabilityIds, 'CAP-')
  let attempts = 0
  const maxAttempts = 100

  while (attempts < maxAttempts) {
    const newNumber = generateSemiUniqueNumber()
    const newId = `CAP-${newNumber}`

    if (!idExists(newId, existingCapabilityIds)) {
      return newId
    }

    attempts++
    // Small delay to ensure different timestamp
    const start = Date.now()
    while (Date.now() - start < 1) { /* wait */ }
  }

  // Fallback to sequential numbering if semi-unique generation fails
  let sequentialNum = 100000000
  while (idExists(`CAP-${sequentialNum}`, existingCapabilityIds)) {
    sequentialNum++
  }

  return `CAP-${sequentialNum}`
}

/**
 * Generates a unique enabler ID
 * @param existingEnablerIds - Array of existing enabler IDs
 * @returns New enabler ID in format ENB-123456789
 */
export function generateEnablerId(existingEnablerIds: string[] = []): string {
  const numericIds = extractNumericIds(existingEnablerIds, 'ENB-')
  let attempts = 0
  const maxAttempts = 100

  while (attempts < maxAttempts) {
    const newNumber = generateSemiUniqueNumber()
    const newId = `ENB-${newNumber}`

    if (!idExists(newId, existingEnablerIds)) {
      return newId
    }

    attempts++
    // Small delay to ensure different timestamp
    const start = Date.now()
    while (Date.now() - start < 1) { /* wait */ }
  }

  // Fallback to sequential numbering if semi-unique generation fails
  let sequentialNum = 100000000
  while (idExists(`ENB-${sequentialNum}`, existingEnablerIds)) {
    sequentialNum++
  }

  return `ENB-${sequentialNum}`
}

/**
 * Generates a unique functional requirement ID
 * @param existingRequirementIds - Array of existing FR IDs
 * @returns New functional requirement ID in format FR-123456789
 */
export function generateFunctionalRequirementId(existingRequirementIds: string[] = []): string {
  const numericIds = extractNumericIds(existingRequirementIds, 'FR-')
  let attempts = 0
  const maxAttempts = 100

  while (attempts < maxAttempts) {
    const newNumber = generateSemiUniqueNumber()
    const newId = `FR-${newNumber}`

    if (!idExists(newId, existingRequirementIds)) {
      return newId
    }

    attempts++
    // Small delay to ensure different timestamp
    const start = Date.now()
    while (Date.now() - start < 1) { /* wait */ }
  }

  // Fallback to sequential numbering if semi-unique generation fails
  let sequentialNum = 100000000
  while (idExists(`FR-${sequentialNum}`, existingRequirementIds)) {
    sequentialNum++
  }

  return `FR-${sequentialNum}`
}

/**
 * Generates a unique non-functional requirement ID
 * @param existingRequirementIds - Array of existing NFR IDs
 * @returns New non-functional requirement ID in format NFR-123456789
 */
export function generateNonFunctionalRequirementId(existingRequirementIds: string[] = []): string {
  const numericIds = extractNumericIds(existingRequirementIds, 'NFR-')
  let attempts = 0
  const maxAttempts = 100

  while (attempts < maxAttempts) {
    const newNumber = generateSemiUniqueNumber()
    const newId = `NFR-${newNumber}`

    if (!idExists(newId, existingRequirementIds)) {
      return newId
    }

    attempts++
    // Small delay to ensure different timestamp
    const start = Date.now()
    while (Date.now() - start < 1) { /* wait */ }
  }

  // Fallback to sequential numbering if semi-unique generation fails
  let sequentialNum = 100000000
  while (idExists(`NFR-${sequentialNum}`, existingRequirementIds)) {
    sequentialNum++
  }

  return `NFR-${sequentialNum}`
}
