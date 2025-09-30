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
        const items = event.dataTransfer.items;
        const files = [];

        // Handle both folder drop and file drop
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file') {
                const entry = item.webkitGetAsEntry();
                if (entry && entry.isDirectory) {
                    // For directory drops, traverse the contents but not the folder itself
                    this.traverseFileTree(entry, files, '');
                } else if (entry && entry.isFile) {
                    // For file drops, add the file directly
                    this.traverseFileTree(entry, files, '');
                }
            }
        }

        // Also handle regular files array as fallback (but filter out directories)
        if (files.length === 0 && event.dataTransfer.files.length > 0) {
            const regularFiles = Array.from(event.dataTransfer.files).filter(f => 
                f.type !== '' || f.size > 0 // Only actual files, not directories
            );
            files.push(...regularFiles);
        }

        // Wait a bit for file traversal to complete
        setTimeout(() => {
            if (files.length > 0) {
                this.handleFileSelect(files);
            }
        }, 300);
    }
    
    traverseFileTree(item, files, path = '') {
        if (item.isFile) {
            item.file((file) => {
                // Only add actual files with content or known file types
                // Also filter out hidden files and system files
                if (this.isValidFile(file)) {
                    file.fullPath = path + file.name;
                    files.push(file);
                }
            });
        } else if (item.isDirectory) {
            const dirReader = item.createReader();
            dirReader.readEntries((entries) => {
                for (let i = 0; i < entries.length; i++) {
                    this.traverseFileTree(entries[i], files, path + item.name + '/');
                }
            });
        }
    }
    
    isValidFile(file) {
        // Debug logging
        console.log(`Checking file: "${file.name}", size: ${file.size}, type: "${file.type}", lastModified: ${file.lastModified}`);
        
        // Filter out directories, hidden files, and system files
        if (!file.name || file.name.startsWith('.') || file.name.startsWith('~')) {
            console.log(`  -> Rejected: hidden or system file`);
            return false;
        }
        
        // Must have either a file size > 0 OR a recognizable file type
        const hasContent = file.size > 0;
        const hasFileType = file.type && file.type !== '';
        const hasFileExtension = file.name.includes('.') && file.name.split('.').pop().length > 0;
        
        const isValid = hasContent || hasFileType || hasFileExtension;
        console.log(`  -> ${isValid ? 'ACCEPTED' : 'REJECTED'}: content=${hasContent}, type=${hasFileType}, extension=${hasFileExtension}`);
        
        // Accept files that have content, type, or extension
        return isValid;
    }

    handleFileSelect(files) {
        // Apply additional filtering to remove any directories that got through
        const filteredFiles = Array.from(files).filter(file => this.isValidFile(file));
        
        this.selectedFiles = filteredFiles;
        
        if (this.selectedFiles.length === 0) {
            this.showError('No valid files selected. Please select files to process.');
            return;
        }

        console.log(`Selected ${this.selectedFiles.length} files:`, this.selectedFiles.map(f => f.name));
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
        
        // Add insertion zone drag listeners
        insertionZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (this.draggedElement) {
                insertionZone.classList.add('insertion-zone-active');
                // Remove active class from other insertion zones
                document.querySelectorAll('.insertion-zone').forEach(zone => {
                    if (zone !== insertionZone) {
                        zone.classList.remove('insertion-zone-active');
                    }
                });
            }
        });
        
        insertionZone.addEventListener('dragleave', (e) => {
            // Use a small delay to prevent flickering when cursor moves between child elements
            setTimeout(() => {
                if (!insertionZone.matches(':hover')) {
                    insertionZone.classList.remove('insertion-zone-active');
                }
            }, 10);
        });
        
        insertionZone.addEventListener('drop', (e) => {
            e.preventDefault();
            insertionZone.classList.remove('insertion-zone-active');
            
            if (this.draggedElement) {
                const insertIndex = parseInt(insertionZone.dataset.insertionIndex);
                this.insertFileAtPosition(this.draggedElement, insertIndex);
            }
        });
        
        return insertionZone;
    }
    
    insertFileAtPosition(draggedElement, insertionIndex) {
        const draggedIndex = parseInt(draggedElement.dataset.fileIndex);
        
        // Don't do anything if dropping in the same position
        if (insertionIndex === draggedIndex || insertionIndex === draggedIndex + 1) {
            return;
        }
        
        // Remove the file from its current position
        const draggedFile = this.selectedFiles[draggedIndex];
        this.selectedFiles.splice(draggedIndex, 1);
        
        // Calculate the new insertion index after removal
        let newInsertionIndex = insertionIndex;
        if (draggedIndex < insertionIndex) {
            newInsertionIndex--;
        }
        
        // Insert the file at the new position
        this.selectedFiles.splice(newInsertionIndex, 0, draggedFile);
        
        // Update the file list immediately
        this.displayFileList();
        
        // Add a subtle highlight to the moved item
        setTimeout(() => {
            const fileItems = this.fileItems.querySelectorAll('.file-item-enhanced');
            const movedItem = fileItems[newInsertionIndex];
            if (movedItem) {
                movedItem.style.borderColor = '#a855f7'; // purple-500
                setTimeout(() => {
                    movedItem.style.borderColor = '';
                }, 600);
            }
        }, 50);
    }
    
    replaceFilePosition(draggedElement, targetElement) {
        const draggedIndex = parseInt(draggedElement.dataset.fileIndex);
        const targetIndex = parseInt(targetElement.dataset.fileIndex);
        
        // Swap the files in the array
        const temp = this.selectedFiles[draggedIndex];
        this.selectedFiles[draggedIndex] = this.selectedFiles[targetIndex];
        this.selectedFiles[targetIndex] = temp;
        
        // Update the file list immediately
        this.displayFileList();
        
        // Add subtle highlight to both swapped items
        setTimeout(() => {
            const fileItems = this.fileItems.querySelectorAll('.file-item-enhanced');
            [draggedIndex, targetIndex].forEach(index => {
                const item = fileItems[index];
                if (item) {
                    item.style.borderColor = '#a855f7'; // purple-500
                    setTimeout(() => {
                        item.style.borderColor = '';
                    }, 600);
                }
            });
        }, 50);
    }

    addDragListeners(fileItem) {
        fileItem.addEventListener('dragstart', (e) => {
            this.draggedElement = fileItem;
            
            // Add dragging styles to original element
            fileItem.classList.remove('file-item-enhanced');
            fileItem.classList.add('file-item-dragging');
            this.fileItems.classList.add('dragging');
            
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', fileItem.outerHTML);
            
            // Show insertion zones when dragging starts
            document.querySelectorAll('.insertion-zone').forEach(zone => {
                zone.style.opacity = '0.3';
            });
        });
        
        fileItem.addEventListener('dragend', () => {
            if (this.draggedElement) {
                this.draggedElement.classList.remove('file-item-dragging');
                this.draggedElement.classList.add('file-item-enhanced');
                this.draggedElement = null;
            }
            
            // Clean up all drag states
            this.fileItems.classList.remove('dragging');
            document.querySelectorAll('.insertion-zone').forEach(zone => {
                zone.classList.remove('insertion-zone-active');
                zone.style.opacity = '';
            });
            document.querySelectorAll('.file-item-enhanced').forEach(item => {
                item.classList.remove('file-item-drag-over', 'file-item-dragging');
            });
        });
    }

    addDropListeners(fileItem) {
        let dragCounter = 0;
        
        fileItem.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            
            if (this.draggedElement && this.draggedElement !== fileItem) {
                fileItem.classList.add('file-item-drag-over');
            }
        });
        
        fileItem.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        
        fileItem.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            
            // Only remove drag-over styling if we're truly leaving the element
            if (dragCounter === 0) {
                fileItem.classList.remove('file-item-drag-over');
            }
        });
        
        fileItem.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            fileItem.classList.remove('file-item-drag-over');
            
            if (this.draggedElement && this.draggedElement !== fileItem) {
                this.replaceFilePosition(this.draggedElement, fileItem);
            }
        });
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
        const totalFiles = this.selectedFiles.length;
        let currentFile = 0;
        const progressIncrement = Math.floor(80 / Math.max(totalFiles, 1)); // 80% for file processing, 20% for finalization
        let progress = 10;
        
        const interval = setInterval(() => {
            if (currentFile < totalFiles) {
                currentFile++;
                progress += progressIncrement;
                this.updateProgress(Math.min(progress, 90), `Processing file ${currentFile} of ${totalFiles}: ${this.selectedFiles[currentFile - 1].name}`);
            } else {
                clearInterval(interval);
                this.updateProgress(100, 'Finalizing PDF...');
                setTimeout(() => {
                    // Create basic PDF content
                    this.generateBasicPDF();
                }, 500);
            }
        }, 400);
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
            ctx.font = 'bold 28px Arial';
            ctx.fillText('DEMO: File List Preview', 50, 80);
            
            // Add subtitle
            ctx.font = '18px Arial';
            ctx.fillStyle = '#dc2626'; // red-600
            ctx.fillText('⚠️ This is a placeholder - not actual PDF content', 50, 110);
            
            // Add explanation
            ctx.font = '14px Arial';
            ctx.fillStyle = '#64748b'; // slate-500
            ctx.fillText('Full PDF merging requires PDF-lib integration (coming soon)', 50, 135);
            
            // Add file list header
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = '#475569'; // slate-600
            ctx.fillText(`${this.selectedFiles.length} Files Selected:`, 50, 160);
            
            // Add files with better formatting
            ctx.font = '14px Arial';
            let yPos = 200;
            this.selectedFiles.forEach((file, index) => {
                ctx.fillStyle = '#374151'; // slate-700
                const displayName = file.fullPath || file.name;
                const text = `${index + 1}. ${displayName}`;
                ctx.fillText(text, 70, yPos);
                
                // Add file size on same line
                ctx.fillStyle = '#9ca3af'; // gray-400
                const sizeText = `(${this.formatFileSize(file.size)})`;
                const nameWidth = ctx.measureText(text).width;
                ctx.fillText(sizeText, 70 + nameWidth + 10, yPos);
                
                yPos += 25;
            });
            
            // Add footer
            ctx.fillStyle = '#9333ea'; // purple-600
            ctx.font = '12px Arial';
            ctx.fillText('Generated by File to PDF Merger Extension (Demo Mode)', 50, canvas.height - 60);
            ctx.fillText(`Created: ${new Date().toLocaleString()}`, 50, canvas.height - 40);
            
            ctx.fillStyle = '#64748b'; // slate-500
            ctx.font = '11px Arial';
            ctx.fillText('Note: This is a preview image. Full PDF functionality requires PDF-lib integration.', 50, canvas.height - 20);
            
            // Convert canvas to PDF-like data URL
            const imageData = canvas.toDataURL('image/png');
            
            // For now, we'll use the image data as our "PDF"
            // In a full implementation, you'd use PDF-lib or jsPDF here
            this.currentPDFData = imageData;
            this.currentPDFFilename = `merged-files-${Date.now()}.png`; // Use correct extension for now
            
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