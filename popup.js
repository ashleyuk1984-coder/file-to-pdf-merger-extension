/**
 * File to PDF Merger Extension - Popup Script
 * Adapted from the original webapp for browser extension environment
 */

class PDFMergerExtension {
    constructor() {
        this.selectedFiles = [];
        this.orderingEnabled = false;
        this.draggedElement = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    initializeElements() {
        // Main sections
        this.dropZone = document.getElementById('dropZone');
        this.fileList = document.getElementById('fileList');
        this.progressSection = document.getElementById('progressSection');
        this.resultSection = document.getElementById('resultSection');
        this.errorSection = document.getElementById('errorSection');
        
        // File handling elements
        this.fileInput = document.getElementById('fileInput');
        this.browseButton = document.getElementById('browseButton');
        this.fileItems = document.getElementById('fileItems');
        
        // Control elements
        this.orderingToggle = document.getElementById('orderingToggle');
        this.orderingHelp = document.getElementById('orderingHelp');
        this.processFilesButton = document.getElementById('processFilesButton');
        
        // Progress elements
        this.progressText = document.getElementById('progressText');
        this.progressFill = document.getElementById('progressFill');
        
        // Action buttons
        this.downloadButton = document.getElementById('downloadButton');
        this.resetButton = document.getElementById('resetButton');
        this.retryButton = document.getElementById('retryButton');
        this.errorMessage = document.getElementById('errorMessage');
    }

    setupEventListeners() {
        // Browse button
        this.browseButton.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });

        // Action buttons
        this.downloadButton.addEventListener('click', () => {
            this.downloadPDF();
        });

        this.resetButton.addEventListener('click', () => {
            this.reset();
        });

        this.retryButton.addEventListener('click', () => {
            this.reset();
        });

        // Ordering toggle
        this.orderingToggle.addEventListener('change', () => {
            this.toggleOrdering();
            this.updateToggleAppearance();
        });

        // Process files button
        this.processFilesButton.addEventListener('click', () => {
            this.processFiles();
        });
    }

    setupDragAndDrop() {
        // Drop zone drag and drop
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.classList.add('drop-zone-active');
        });

        this.dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('drop-zone-active');
        });

        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('drop-zone-active');
            this.handleFileDrop(e);
        });

        // Prevent default drag behavior on document
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    }

    handleFileDrop(event) {
        const files = Array.from(event.dataTransfer.files);
        if (files.length > 0) {
            this.handleFileSelect(files);
        }
    }

    handleFileSelect(files) {
        this.selectedFiles = Array.from(files);
        
        if (this.selectedFiles.length === 0) {
            this.showError('No files selected. Please select files to process.');
            return;
        }

        this.displayFileList();
    }

    displayFileList() {
        this.hideAllSections();
        this.fileList.style.display = 'block';
        
        this.fileItems.innerHTML = '';
        this.fileItems.className = 'file-items-container';
        
        this.selectedFiles.forEach((file, index) => {
            // Add insertion drop zone before each file (except the first when not dragging)
            if (index > 0 || this.orderingEnabled) {
                const insertionZone = this.createInsertionZone(index);
                this.fileItems.appendChild(insertionZone);
            }
            
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item-enhanced group';
            fileItem.dataset.fileIndex = index;
            
            if (this.orderingEnabled) {
                fileItem.classList.add('cursor-grab', 'active:cursor-grabbing');
                fileItem.draggable = true;
            }
            
            // Get file extension for icon
            const extension = this.getFileExtension(file.name).toLowerCase();
            const fileIcons = {
                'pdf': '📄', 'txt': '📝', 'eml': '📧', 'msg': '📧',
                'doc': '📄', 'docx': '📄',
                'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️',
                'bmp': '🖼️', 'webp': '🖼️', 'tiff': '🖼️', 'tif': '🖼️'
            };
            const fileIcon = fileIcons[extension] || '📄';
            
            fileItem.innerHTML = `
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg flex items-center justify-center text-sm border border-slate-600 group-hover:border-purple-400 transition-colors">
                        ${fileIcon}
                    </div>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                        <h4 class="font-semibold text-slate-200 truncate group-hover:text-purple-300 transition-colors text-xs flex-1 min-w-0">
                            ${file.name}
                        </h4>
                        <div class="flex items-center gap-1 flex-shrink-0">
                            <span class="text-xs text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded-full">
                                ${this.formatFileSize(file.size)}
                            </span>
                            <span class="text-xs text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded-full uppercase font-medium">
                                ${extension || 'FILE'}
                            </span>
                        </div>
                    </div>
                </div>
                ${this.orderingEnabled ? '<div class="flex-shrink-0 text-slate-500 group-hover:text-purple-400 transition-colors cursor-grab active:cursor-grabbing text-sm leading-none px-1">⋮⋮</div>' : ''}
            `;
            
            // Add drag event listeners if ordering is enabled
            if (this.orderingEnabled) {
                this.addDragListeners(fileItem);
                this.addDropListeners(fileItem);
            }
            
            this.fileItems.appendChild(fileItem);
        });
        
        // Add final insertion zone after all files
        if (this.orderingEnabled && this.selectedFiles.length > 0) {
            const insertionZone = this.createInsertionZone(this.selectedFiles.length);
            this.fileItems.appendChild(insertionZone);
        }
    }

    toggleOrdering() {
        this.orderingEnabled = this.orderingToggle.checked;
        
        // Show/hide the help text
        this.orderingHelp.style.display = this.orderingEnabled ? 'block' : 'none';
        
        // Re-display the file list with updated drag functionality
        this.displayFileList();
    }

    updateToggleAppearance() {
        const toggleContainer = this.orderingToggle.parentElement.querySelector('div');
        const toggleBg = toggleContainer.querySelector('div:first-child');
        const toggleDot = toggleContainer.querySelector('div:last-child');
        
        if (this.orderingEnabled) {
            toggleBg.className = 'w-8 h-4 bg-purple-600 rounded-full transition-all duration-300';
            toggleDot.className = 'absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-all duration-300 transform translate-x-4';
        } else {
            toggleBg.className = 'w-8 h-4 bg-slate-600 rounded-full transition-all duration-300 group-hover:bg-slate-500';
            toggleDot.className = 'absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-all duration-300 transform';
        }
    }

    // TODO: Implement drag and drop reordering (copied from original)
    createInsertionZone(insertionIndex) {
        const insertionZone = document.createElement('div');
        insertionZone.className = 'insertion-zone';
        insertionZone.dataset.insertionIndex = insertionIndex;
        return insertionZone;
    }

    addDragListeners(fileItem) {
        // TODO: Implement from original webapp
    }

    addDropListeners(fileItem) {
        // TODO: Implement from original webapp
    }

    processFiles() {
        this.hideAllSections();
        this.progressSection.style.display = 'block';
        
        // Start processing
        this.updateProgress(0, 'Preparing files...');
        
        // Use setTimeout to allow UI to update
        setTimeout(() => {
            this.createPDF();
        }, 100);
    }

    async createPDF() {
        try {
            this.updateProgress(10, 'Loading PDF library...');
            
            // TODO: Import and use PDF-lib or similar client-side PDF library
            // For now, just simulate the process
            this.simulatePDFCreation();
            
        } catch (error) {
            console.error('PDF creation failed:', error);
            this.showError('Failed to create PDF: ' + error.message);
        }
    }

    // Create a basic PDF using simple text content
    simulatePDFCreation() {
        let progress = 10;
        const interval = setInterval(() => {
            progress += 20;
            if (progress <= 90) {
                this.updateProgress(progress, `Processing file ${Math.floor(progress/20)}...`);
            } else {
                clearInterval(interval);
                this.updateProgress(100, 'Finalizing PDF...');
                setTimeout(() => {
                    // Create basic PDF content
                    this.generateBasicPDF();
                }, 500);
            }
        }, 300);
    }
    
    generateBasicPDF() {
        try {
            // Create basic PDF content using canvas and data URL
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 600;
            canvas.height = 800;
            
            // White background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add title
            ctx.fillStyle = '#1e293b'; // slate-800
            ctx.font = 'bold 24px Arial';
            ctx.fillText('Merged PDF Document', 50, 80);
            
            // Add file list
            ctx.font = '16px Arial';
            ctx.fillStyle = '#475569'; // slate-600
            ctx.fillText('Files processed:', 50, 140);
            
            let yPos = 180;
            this.selectedFiles.forEach((file, index) => {
                ctx.fillText(`${index + 1}. ${file.name} (${this.formatFileSize(file.size)})`, 70, yPos);
                yPos += 30;
            });
            
            // Add footer
            ctx.fillStyle = '#9333ea'; // purple-600
            ctx.font = '14px Arial';
            ctx.fillText('Generated by File to PDF Merger Extension', 50, canvas.height - 50);
            ctx.fillText(`Created on: ${new Date().toLocaleString()}`, 50, canvas.height - 30);
            
            // Convert canvas to PDF-like data URL
            const imageData = canvas.toDataURL('image/png');
            
            // For now, we'll use the image data as our "PDF"
            // In a full implementation, you'd use PDF-lib or jsPDF here
            this.currentPDFData = imageData;
            this.currentPDFFilename = `merged-files-${Date.now()}.png`;
            
            this.showSuccess(this.currentPDFFilename);
            
        } catch (error) {
            console.error('PDF generation failed:', error);
            this.showError('Failed to generate PDF: ' + error.message);
        }
    }

    updateProgress(percentage, message) {
        this.progressFill.style.width = percentage + '%';
        this.progressText.textContent = message;
    }

    showSuccess(filename) {
        this.hideAllSections();
        this.resultSection.style.display = 'block';
        
        // Store the filename for download (if not already set by generateBasicPDF)
        if (filename && !this.currentPDFFilename) {
            this.currentPDFFilename = filename;
        }
        
        // Don't reset PDF data - it should already be set by generateBasicPDF
        // this.currentPDFData should contain the actual PDF data
    }

    showError(message) {
        this.hideAllSections();
        this.errorSection.style.display = 'block';
        this.errorMessage.textContent = message;
    }

    downloadPDF() {
        if (!this.currentPDFData) {
            this.showError('No PDF data available for download');
            return;
        }

        // Send message to background script to handle download
        chrome.runtime.sendMessage({
            action: 'downloadPDF',
            pdfData: this.currentPDFData,
            filename: this.currentPDFFilename || 'merged-files.pdf'
        }, (response) => {
            if (!response.success) {
                this.showError('Failed to download PDF: ' + response.error);
            }
        });
    }

    reset() {
        this.selectedFiles = [];
        this.orderingEnabled = false;
        this.orderingToggle.checked = false;
        this.updateToggleAppearance();
        this.currentPDFData = null;
        this.currentPDFFilename = null;
        
        this.hideAllSections();
        this.dropZone.style.display = 'block';
    }

    hideAllSections() {
        this.dropZone.style.display = 'none';
        this.fileList.style.display = 'none';
        this.progressSection.style.display = 'none';
        this.resultSection.style.display = 'none';
        this.errorSection.style.display = 'none';
    }

    // Utility functions
    getFileExtension(filename) {
        return filename.split('.').pop() || '';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}

// Initialize the extension when the popup loads
document.addEventListener('DOMContentLoaded', () => {
    new PDFMergerExtension();
});