/**
 * DSO Progress Demos Application
 * Implements CAP-555521: Demo Record Management
 *
 * Enablers:
 * - ENB-861546: Demo Form Input Handler
 * - ENB-861730: Demo Data Storage
 * - ENB-861715: Demo Records Table Display
 */

// ============================================
// ENB-861730: Demo Data Storage
// ============================================

/**
 * DemoDataStore - Manages demo records storage using localStorage
 */
class DemoDataStore {
    constructor() {
        this.storageKey = 'dsoProgressDemos';
        this.records = this.loadRecords();
    }

    /**
     * Load records from localStorage
     * @returns {Array} Array of demo records
     */
    loadRecords() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const records = JSON.parse(stored);
                // Add sample data if storage is empty
                if (records.length === 0) {
                    return this.getSampleData();
                }
                return records;
            }
            return this.getSampleData();
        } catch (error) {
            console.error('Error loading records:', error);
            return this.getSampleData();
        }
    }

    /**
     * Get sample data for initial population
     * @returns {Array} Sample demo records
     */
    getSampleData() {
        return [
            { id: this.generateId(), date: '2024-01-15', demoName: 'API Integration Demo', demoPerson: 'Sarah Johnson', createdAt: Date.now() },
            { id: this.generateId(), date: '2024-01-22', demoName: 'Dashboard Redesign', demoPerson: 'Michael Chen', createdAt: Date.now() },
            { id: this.generateId(), date: '2024-02-05', demoName: 'Mobile App Prototype', demoPerson: 'Emily Rodriguez', createdAt: Date.now() },
            { id: this.generateId(), date: '2024-02-12', demoName: 'Security Features Update', demoPerson: 'David Kim', createdAt: Date.now() },
            { id: this.generateId(), date: '2024-02-26', demoName: 'Analytics Module', demoPerson: 'Jessica Taylor', createdAt: Date.now() },
            { id: this.generateId(), date: '2024-03-04', demoName: 'User Authentication Flow', demoPerson: 'Robert Martinez', createdAt: Date.now() },
            { id: this.generateId(), date: '2024-03-18', demoName: 'Reporting System', demoPerson: 'Amanda White', createdAt: Date.now() },
            { id: this.generateId(), date: '2024-03-25', demoName: 'Payment Gateway Integration', demoPerson: 'Christopher Lee', createdAt: Date.now() },
            { id: this.generateId(), date: '2024-04-08', demoName: 'Search Optimization', demoPerson: 'Nicole Brown', createdAt: Date.now() },
            { id: this.generateId(), date: '2024-04-15', demoName: 'Notification System', demoPerson: 'James Wilson', createdAt: Date.now() },
            { id: this.generateId(), date: '2024-04-29', demoName: 'Data Export Feature', demoPerson: 'Laura Garcia', createdAt: Date.now() },
            { id: this.generateId(), date: '2024-05-06', demoName: 'Multi-language Support', demoPerson: 'Kevin Anderson', createdAt: Date.now() }
        ];
    }

    /**
     * Save records to localStorage
     */
    saveRecords() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.records));
        } catch (error) {
            console.error('Error saving records:', error);
            throw new Error('Failed to save records. Storage may be full.');
        }
    }

    /**
     * Generate unique ID for records
     * @returns {string} Unique identifier
     */
    generateId() {
        return `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Add a new demo record
     * @param {Object} record - Demo record object
     * @returns {Object} Added record with ID
     */
    addRecord(record) {
        const newRecord = {
            id: this.generateId(),
            date: record.date,
            demoName: record.demoName,
            demoPerson: record.demoPerson,
            createdAt: Date.now()
        };

        this.records.unshift(newRecord); // Add to beginning
        this.saveRecords();
        return newRecord;
    }

    /**
     * Get all records
     * @returns {Array} All demo records
     */
    getAllRecords() {
        return [...this.records]; // Return copy
    }

    /**
     * Get record by ID
     * @param {string} id - Record ID
     * @returns {Object|null} Record or null if not found
     */
    getRecordById(id) {
        return this.records.find(record => record.id === id) || null;
    }

    /**
     * Update a record
     * @param {string} id - Record ID
     * @param {Object} data - Updated data
     * @returns {boolean} Success status
     */
    updateRecord(id, data) {
        const index = this.records.findIndex(record => record.id === id);
        if (index !== -1) {
            this.records[index] = {
                ...this.records[index],
                ...data,
                updatedAt: Date.now()
            };
            this.saveRecords();
            return true;
        }
        return false;
    }

    /**
     * Delete a record
     * @param {string} id - Record ID
     * @returns {boolean} Success status
     */
    deleteRecord(id) {
        const initialLength = this.records.length;
        this.records = this.records.filter(record => record.id !== id);

        if (this.records.length < initialLength) {
            this.saveRecords();
            return true;
        }
        return false;
    }

    /**
     * Clear all records
     */
    clearAllRecords() {
        this.records = [];
        this.saveRecords();
    }

    /**
     * Get total count
     * @returns {number} Total number of records
     */
    getTotalCount() {
        return this.records.length;
    }

    /**
     * Sort records by field
     * @param {string} field - Field to sort by
     * @param {boolean} ascending - Sort direction
     */
    sortRecords(field, ascending = true) {
        this.records.sort((a, b) => {
            const aVal = a[field];
            const bVal = b[field];

            if (aVal < bVal) return ascending ? -1 : 1;
            if (aVal > bVal) return ascending ? 1 : -1;
            return 0;
        });
    }
}

// ============================================
// ENB-861715: Demo Records Table Display
// ============================================

/**
 * DemoTableDisplay - Manages the demo records table UI
 */
class DemoTableDisplay {
    constructor(tableBodyId, emptyStateId, dataStore) {
        this.tbody = document.getElementById(tableBodyId);
        this.emptyState = document.getElementById(emptyStateId);
        this.dataStore = dataStore;
        this.currentSort = { field: 'date', ascending: false };
    }

    /**
     * Render the complete table
     */
    renderTable() {
        const records = this.dataStore.getAllRecords();

        // Show/hide empty state
        if (records.length === 0) {
            this.tbody.style.display = 'none';
            this.emptyState.classList.add('show');
        } else {
            this.tbody.style.display = '';
            this.emptyState.classList.remove('show');
        }

        // Clear existing rows
        this.tbody.innerHTML = '';

        // Render each record
        records.forEach(record => {
            this.addRow(record);
        });

        // Update record count
        this.updateRecordCount(records.length);
    }

    /**
     * Add a single row to the table
     * @param {Object} record - Demo record
     */
    addRow(record) {
        const row = document.createElement('tr');
        row.dataset.id = record.id;

        // Format date for display
        const formattedDate = this.formatDate(record.date);

        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${this.escapeHtml(record.demoName)}</td>
            <td>${this.escapeHtml(record.demoPerson)}</td>
            <td>
                <button class="btn btn-danger btn-small delete-btn" data-id="${record.id}" title="Delete record">
                    Delete
                </button>
            </td>
        `;

        this.tbody.appendChild(row);

        // Add delete event listener
        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleDeleteRecord(record.id);
        });
    }

    /**
     * Format date for display
     * @param {string} dateString - Date in YYYY-MM-DD format
     * @returns {string} Formatted date
     */
    formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Handle record deletion
     * @param {string} id - Record ID
     */
    handleDeleteRecord(id) {
        if (confirm('Are you sure you want to delete this demo record?')) {
            const success = this.dataStore.deleteRecord(id);

            if (success) {
                this.renderTable();
                showAlert('Demo record deleted successfully', 'success');
            } else {
                showAlert('Failed to delete record', 'error');
            }
        }
    }

    /**
     * Update record count display
     * @param {number} count - Number of records
     */
    updateRecordCount(count) {
        const countElement = document.getElementById('recordCount');
        if (countElement) {
            countElement.textContent = `${count} ${count === 1 ? 'record' : 'records'}`;
        }
    }

    /**
     * Sort table by column
     * @param {string} field - Field to sort by
     */
    sortTable(field) {
        // Toggle sort direction if clicking same column
        if (this.currentSort.field === field) {
            this.currentSort.ascending = !this.currentSort.ascending;
        } else {
            this.currentSort.field = field;
            this.currentSort.ascending = true;
        }

        // Sort data
        this.dataStore.sortRecords(field, this.currentSort.ascending);

        // Re-render table
        this.renderTable();

        // Update sort indicators
        this.updateSortIndicators(field, this.currentSort.ascending);
    }

    /**
     * Update visual sort indicators
     * @param {string} field - Sorted field
     * @param {boolean} ascending - Sort direction
     */
    updateSortIndicators(field, ascending) {
        // Remove all existing sort classes
        document.querySelectorAll('th.sortable').forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
        });

        // Add class to current sorted column
        const sortedTh = document.querySelector(`th[data-sort="${field}"]`);
        if (sortedTh) {
            sortedTh.classList.add(ascending ? 'sorted-asc' : 'sorted-desc');
        }
    }

    /**
     * Clear all records with confirmation
     */
    clearAll() {
        if (confirm('Are you sure you want to delete ALL demo records? This action cannot be undone.')) {
            this.dataStore.clearAllRecords();
            this.renderTable();
            showAlert('All records cleared successfully', 'info');
        }
    }
}

// ============================================
// ENB-861546: Demo Form Input Handler
// ============================================

/**
 * DemoFormHandler - Manages the demo input form
 */
class DemoFormHandler {
    constructor(formId, dataStore, tableDisplay) {
        this.form = document.getElementById(formId);
        this.dataStore = dataStore;
        this.tableDisplay = tableDisplay;
        this.setupEventListeners();
    }

    /**
     * Setup form event listeners
     */
    setupEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.form.addEventListener('reset', () => this.handleReset());
    }

    /**
     * Handle form submission
     * @param {Event} e - Submit event
     */
    handleSubmit(e) {
        e.preventDefault();

        // Get form data
        const formData = new FormData(this.form);
        const record = {
            date: formData.get('date'),
            demoName: formData.get('demoName').trim(),
            demoPerson: formData.get('demoPerson').trim()
        };

        // Validate
        if (!this.validateRecord(record)) {
            return;
        }

        try {
            // Add record
            this.dataStore.addRecord(record);

            // Refresh table
            this.tableDisplay.renderTable();

            // Clear form
            this.form.reset();

            // Show success message
            showAlert('Demo record added successfully!', 'success');

            // Focus on first input
            this.form.querySelector('#date').focus();

        } catch (error) {
            console.error('Error adding record:', error);
            showAlert('Failed to add record: ' + error.message, 'error');
        }
    }

    /**
     * Validate record data
     * @param {Object} record - Record to validate
     * @returns {boolean} Validation result
     */
    validateRecord(record) {
        // Check date
        if (!record.date) {
            showAlert('Please select a date', 'error');
            return false;
        }

        // Check demo name
        if (!record.demoName || record.demoName.length < 3) {
            showAlert('Demo name must be at least 3 characters', 'error');
            return false;
        }

        // Check demo person
        if (!record.demoPerson || record.demoPerson.length < 2) {
            showAlert('Demo person name must be at least 2 characters', 'error');
            return false;
        }

        // Validate date is not in future
        const selectedDate = new Date(record.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
            if (!confirm('The selected date is in the future. Do you want to continue?')) {
                return false;
            }
        }

        return true;
    }

    /**
     * Handle form reset
     */
    handleReset() {
        // Clear any validation messages
        clearAlerts();

        // Focus on first input
        setTimeout(() => {
            this.form.querySelector('#date').focus();
        }, 0);
    }
}

// ============================================
// UI Helper Functions
// ============================================

/**
 * Show alert message
 * @param {string} message - Alert message
 * @param {string} type - Alert type (success, error, info, warning)
 */
function showAlert(message, type = 'info') {
    const container = document.getElementById('alertContainer');
    if (!container) return;

    // Clear existing alerts
    clearAlerts();

    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <strong>${type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info'}:</strong>
        ${message}
    `;

    container.appendChild(alert);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alert.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}

/**
 * Clear all alert messages
 */
function clearAlerts() {
    const container = document.getElementById('alertContainer');
    if (container) {
        container.innerHTML = '';
    }
}

// ============================================
// Application Initialization
// ============================================

/**
 * Initialize the application
 */
function initializeApp() {
    // Initialize data store
    const dataStore = new DemoDataStore();

    // Initialize table display
    const tableDisplay = new DemoTableDisplay('demoTableBody', 'emptyState', dataStore);

    // Initialize form handler
    const formHandler = new DemoFormHandler('demoForm', dataStore, tableDisplay);

    // Render initial table
    tableDisplay.renderTable();

    // Setup sortable columns
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortField = th.dataset.sort;
            tableDisplay.sortTable(sortField);
        });
    });

    // Setup clear all button
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            tableDisplay.clearAll();
        });
    }

    // Setup navigation smooth scrolling
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const targetId = href === '#add-demo' ? 'add-demo-section' : 'demo-records-section';
                const target = document.getElementById(targetId);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });

                    // Update active nav link
                    document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
                    link.classList.add('active');
                }
            }
        });
    });

    // Set default date to today
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }

    console.log('DSO Progress Demos Application initialized successfully');
    console.log(`Loaded ${dataStore.getTotalCount()} demo records`);
}

// ============================================
// Start Application
// ============================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Add slideOut animation for alerts
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-10px);
        }
    }
`;
document.head.appendChild(style);
