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
        // Filter out directories, hidden files, and system files
        if (!file.name || file.name.startsWith('.') || file.name.startsWith('~')) {
            return false;
        }
        
        // Must have either a file size > 0 OR a recognizable file type
        const hasContent = file.size > 0;
        const hasFileType = file.type && file.type !== '';
        const hasFileExtension = file.name.includes('.') && file.name.split('.').pop().length > 0;
        
        // Accept files that have content, type, or extension
        return hasContent || hasFileType || hasFileExtension;
    }

    handleFileSelect(files) {
        // Apply additional filtering to remove any directories that got through
        const filteredFiles = Array.from(files).filter(file => this.isValidFile(file));
        
        this.selectedFiles = filteredFiles;
        
        if (this.selectedFiles.length === 0) {
            this.showError('No valid files selected. Please select files to process.');
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
            
            // Check if PDF-lib is available
            if (typeof PDFLib === 'undefined') {
                throw new Error('PDF-lib library not loaded');
            }
            
            this.updateProgress(20, 'Creating PDF document...');
            
            // Create a new PDF document
            const pdfDoc = await PDFLib.PDFDocument.create();
            
            await this.processPDFFiles(pdfDoc);
            
        } catch (error) {
            console.error('PDF creation failed:', error);
            this.showError('Failed to create PDF: ' + error.message);
        }
    }

    async processPDFFiles(pdfDoc) {
        const totalFiles = this.selectedFiles.length;
        let processedFiles = 0;
        
        for (const file of this.selectedFiles) {
            processedFiles++;
            const progressPercent = 20 + Math.floor((processedFiles / totalFiles) * 60); // 20-80%
            this.updateProgress(progressPercent, `Processing ${file.name}...`);
            
            try {
                await this.addFileToPDF(pdfDoc, file);
            } catch (error) {
                console.warn(`Failed to process ${file.name}:`, error);
                // Continue with other files, but add an error page
                await this.addErrorPageToPDF(pdfDoc, file, error.message);
            }
        }
        
        this.updateProgress(90, 'Finalizing PDF...');
        
        // Serialize the PDF
        const pdfBytes = await pdfDoc.save();
        
        // Convert to blob and create download
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        this.currentPDFData = URL.createObjectURL(blob);
        this.currentPDFFilename = `merged-files-${Date.now()}.pdf`;
        
        this.updateProgress(100, 'PDF created successfully!');
        
        setTimeout(() => {
            this.showSuccess(this.currentPDFFilename);
        }, 500);
    }
    
    async addFileToPDF(pdfDoc, file) {
        const extension = this.getFileExtension(file.name).toLowerCase();
        
        switch (extension) {
            case 'pdf':
                await this.addExistingPDFToPDF(pdfDoc, file);
                break;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'bmp':
            case 'webp':
            case 'tiff':
            case 'tif':
                await this.addImageToPDF(pdfDoc, file);
                break;
            case 'txt':
                await this.addTextToPDF(pdfDoc, file);
                break;
            case 'docx':
            case 'doc':
                await this.addWordDocToPDF(pdfDoc, file);
                break;
            case 'eml':
            case 'msg':
                await this.addEmailToPDF(pdfDoc, file);
                break;
            default:
                // For other file types, create an info page
                await this.addInfoPageToPDF(pdfDoc, file);
                break;
        }
    }
    
    async addExistingPDFToPDF(pdfDoc, file) {
        const arrayBuffer = await file.arrayBuffer();
        const existingPdf = await PDFLib.PDFDocument.load(arrayBuffer);
        
        // Copy all pages from the existing PDF
        const pageIndices = existingPdf.getPageIndices();
        const copiedPages = await pdfDoc.copyPages(existingPdf, pageIndices);
        
        copiedPages.forEach((page) => {
            pdfDoc.addPage(page);
        });
    }
    
    async addImageToPDF(pdfDoc, file) {
        const arrayBuffer = await file.arrayBuffer();
        const extension = this.getFileExtension(file.name).toLowerCase();
        
        let image;
        if (extension === 'png') {
            image = await pdfDoc.embedPng(arrayBuffer);
        } else {
            // For JPEG and other formats, try to embed as JPEG
            try {
                image = await pdfDoc.embedJpg(arrayBuffer);
            } catch (error) {
                // If JPEG embedding fails, convert via canvas first
                image = await this.convertImageToPDF(pdfDoc, file);
                return;
            }
        }
        
        const page = pdfDoc.addPage();
        const { width: pageWidth, height: pageHeight } = page.getSize();
        
        // Scale image to fit page while maintaining aspect ratio
        const imageAspectRatio = image.width / image.height;
        const pageAspectRatio = pageWidth / pageHeight;
        
        let drawWidth, drawHeight;
        if (imageAspectRatio > pageAspectRatio) {
            // Image is wider relative to page
            drawWidth = pageWidth - 40; // 20px margin on each side
            drawHeight = drawWidth / imageAspectRatio;
        } else {
            // Image is taller relative to page
            drawHeight = pageHeight - 40; // 20px margin on top/bottom
            drawWidth = drawHeight * imageAspectRatio;
        }
        
        const x = (pageWidth - drawWidth) / 2;
        const y = (pageHeight - drawHeight) / 2;
        
        page.drawImage(image, {
            x: x,
            y: y,
            width: drawWidth,
            height: drawHeight,
        });
    }
    
    async convertImageToPDF(pdfDoc, file) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = async () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                // Convert to PNG data URL then to PDF
                const dataUrl = canvas.toDataURL('image/png');
                const base64 = dataUrl.split(',')[1];
                const arrayBuffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
                
                const image = await pdfDoc.embedPng(arrayBuffer);
                
                const page = pdfDoc.addPage();
                const { width: pageWidth, height: pageHeight } = page.getSize();
                
                const imageAspectRatio = image.width / image.height;
                const pageAspectRatio = pageWidth / pageHeight;
                
                let drawWidth, drawHeight;
                if (imageAspectRatio > pageAspectRatio) {
                    drawWidth = pageWidth - 40;
                    drawHeight = drawWidth / imageAspectRatio;
                } else {
                    drawHeight = pageHeight - 40;
                    drawWidth = drawHeight * imageAspectRatio;
                }
                
                const x = (pageWidth - drawWidth) / 2;
                const y = (pageHeight - drawHeight) / 2;
                
                page.drawImage(image, { x, y, width: drawWidth, height: drawHeight });
                resolve();
            };
            
            img.src = URL.createObjectURL(file);
        });
    }
    
    async addTextToPDF(pdfDoc, file) {
        const text = await file.text();
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        const fontSize = 12;
        const lineHeight = fontSize + 2;
        const margin = 50;
        const maxWidth = width - (margin * 2);
        const maxHeight = height - (margin * 2);
        
        // Add title
        page.drawText(`File: ${file.name}`, {
            x: margin,
            y: height - margin,
            size: 14,
            color: PDFLib.rgb(0, 0, 0),
        });
        
        // Split text into lines that fit within the page width
        const words = text.split(/\s+/);
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            // Rough width estimation (more precise would use font metrics)
            if (testLine.length * (fontSize * 0.6) < maxWidth) {
                currentLine = testLine;
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        }
        if (currentLine) lines.push(currentLine);
        
        // Draw lines
        let y = height - margin - 30; // Start below title
        for (const line of lines) {
            if (y < margin) break; // Stop if we run out of space
            
            page.drawText(line, {
                x: margin,
                y: y,
                size: fontSize,
                color: PDFLib.rgb(0, 0, 0),
            });
            
            y -= lineHeight;
        }
        
        // If text was truncated, add note
        if (y < margin && lines.length > 0) {
            page.drawText('... (text truncated)', {
                x: margin,
                y: margin,
                size: fontSize,
                color: PDFLib.rgb(0.5, 0.5, 0.5),
            });
        }
    }
    
    async addInfoPageToPDF(pdfDoc, file) {
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        
        page.drawText(`File: ${file.name}`, {
            x: 50,
            y: height - 100,
            size: 16,
            color: PDFLib.rgb(0, 0, 0),
        });
        
        page.drawText(`Type: ${file.type || 'Unknown'}`, {
            x: 50,
            y: height - 130,
            size: 12,
            color: PDFLib.rgb(0.3, 0.3, 0.3),
        });
        
        page.drawText(`Size: ${this.formatFileSize(file.size)}`, {
            x: 50,
            y: height - 150,
            size: 12,
            color: PDFLib.rgb(0.3, 0.3, 0.3),
        });
        
        page.drawText(`Last Modified: ${new Date(file.lastModified).toLocaleString()}`, {
            x: 50,
            y: height - 170,
            size: 12,
            color: PDFLib.rgb(0.3, 0.3, 0.3),
        });
        
        page.drawText('This file type is not directly supported for content extraction.', {
            x: 50,
            y: height - 210,
            size: 12,
            color: PDFLib.rgb(0.6, 0.3, 0.3),
        });
        
        page.drawText('File information is shown above.', {
            x: 50,
            y: height - 230,
            size: 12,
            color: PDFLib.rgb(0.6, 0.3, 0.3),
        });
    }
    
    async addWordDocToPDF(pdfDoc, file) {
        try {
            // Check if mammoth is available
            if (typeof mammoth === 'undefined') {
                throw new Error('Mammoth library not loaded');
            }
            
            const arrayBuffer = await file.arrayBuffer();
            
            // Convert Word document to HTML using mammoth
            const result = await mammoth.convertToHtml({ arrayBuffer });
            const html = result.value;
            
            // Create a temporary div to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // Add pages for the Word document content
            await this.addHTMLContentToPDF(pdfDoc, tempDiv, file.name);
            
            // Log any conversion warnings
            if (result.messages.length > 0) {
                console.warn('Word document conversion warnings:', result.messages);
            }
            
        } catch (error) {
            console.error('Error processing Word document:', error);
            // Fallback to info page if conversion fails
            await this.addInfoPageToPDF(pdfDoc, file);
        }
    }
    
    async addHTMLContentToPDF(pdfDoc, htmlElement, filename) {
        let page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        const margin = 50;
        const maxWidth = width - (margin * 2);
        let yPosition = height - margin;
        const lineHeight = 14;
        const fontSize = 12;
        
        // Add document title
        page.drawText(`Document: ${filename}`, {
            x: margin,
            y: yPosition,
            size: 16,
            color: PDFLib.rgb(0, 0, 0),
        });
        yPosition -= 30;
        
        // Process HTML content
        const textContent = this.extractTextFromHTML(htmlElement);
        const lines = this.wrapText(textContent, maxWidth, fontSize);
        
        for (const line of lines) {
            // Check if we need a new page
            if (yPosition < margin + lineHeight) {
                page = pdfDoc.addPage();
                yPosition = height - margin;
            }
            
            page.drawText(line, {
                x: margin,
                y: yPosition,
                size: fontSize,
                color: PDFLib.rgb(0, 0, 0),
            });
            
            yPosition -= lineHeight;
        }
    }
    
    extractTextFromHTML(element) {
        let text = '';
        
        function traverse(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();
                
                // Add line breaks for block elements
                if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br'].includes(tagName)) {
                    if (text && !text.endsWith('\n')) {
                        text += '\n';
                    }
                }
                
                // Process child nodes
                for (const child of node.childNodes) {
                    traverse(child);
                }
                
                // Add line breaks after block elements
                if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                    if (text && !text.endsWith('\n')) {
                        text += '\n';
                    }
                }
            }
        }
        
        traverse(element);
        return text.trim();
    }
    
    wrapText(text, maxWidth, fontSize) {
        const lines = [];
        const paragraphs = text.split('\n');
        
        for (const paragraph of paragraphs) {
            if (!paragraph.trim()) {
                lines.push(''); // Empty line
                continue;
            }
            
            const words = paragraph.split(/\s+/);
            let currentLine = '';
            
            for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                // Rough width estimation
                if (testLine.length * (fontSize * 0.6) < maxWidth) {
                    currentLine = testLine;
                } else {
                    if (currentLine) lines.push(currentLine);
                    currentLine = word;
                }
            }
            
            if (currentLine) lines.push(currentLine);
        }
        
        return lines;
    }
    
    async addEmailToPDF(pdfDoc, file) {
        try {
            const text = await file.text();
            
            // Parse email headers and content
            const emailData = this.parseEmailContent(text);
            
            const page = pdfDoc.addPage();
            const { width, height } = page.getSize();
            const margin = 50;
            const fontSize = 10;
            const lineHeight = fontSize + 2;
            let yPosition = height - margin;
            
            // Email title
            page.drawText(`Email: ${file.name}`, {
                x: margin,
                y: yPosition,
                size: 14,
                color: PDFLib.rgb(0, 0, 0),
            });
            yPosition -= 25;
            
            // Email headers
            const headerFields = ['from', 'to', 'subject', 'date'];
            for (const field of headerFields) {
                if (emailData.headers[field]) {
                    const label = field.charAt(0).toUpperCase() + field.slice(1) + ':';
                    page.drawText(label, {
                        x: margin,
                        y: yPosition,
                        size: fontSize,
                        color: PDFLib.rgb(0.2, 0.2, 0.2),
                    });
                    
                    page.drawText(emailData.headers[field], {
                        x: margin + 60,
                        y: yPosition,
                        size: fontSize,
                        color: PDFLib.rgb(0, 0, 0),
                    });
                    yPosition -= lineHeight;
                }
            }
            
            yPosition -= 10; // Extra space before body
            
            // Email body
            page.drawText('Message:', {
                x: margin,
                y: yPosition,
                size: fontSize,
                color: PDFLib.rgb(0.2, 0.2, 0.2),
            });
            yPosition -= lineHeight + 5;
            
            // Wrap and display email body
            const bodyLines = this.wrapText(emailData.body, width - (margin * 2), fontSize);
            for (const line of bodyLines.slice(0, 60)) { // Limit to 60 lines to fit on page
                if (yPosition < margin) break;
                
                page.drawText(line, {
                    x: margin,
                    y: yPosition,
                    size: fontSize,
                    color: PDFLib.rgb(0, 0, 0),
                });
                yPosition -= lineHeight;
            }
            
            if (bodyLines.length > 60) {
                page.drawText('... (content truncated)', {
                    x: margin,
                    y: yPosition,
                    size: fontSize,
                    color: PDFLib.rgb(0.5, 0.5, 0.5),
                });
            }
            
        } catch (error) {
            console.error('Error processing email:', error);
            // Fallback to info page if parsing fails
            await this.addInfoPageToPDF(pdfDoc, file);
        }
    }
    
    parseEmailContent(emailText) {
        const headers = {};
        let body = '';
        
        try {
            const lines = emailText.split('\n');
            let headersParsed = false;
            let bodyLines = [];
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                if (!headersParsed) {
                    if (line.trim() === '') {
                        headersParsed = true;
                        continue;
                    }
                    
                    // Parse headers
                    const match = line.match(/^([^:]+):\s*(.*)$/);
                    if (match) {
                        const field = match[1].toLowerCase().trim();
                        let value = match[2].trim();
                        
                        // Handle multi-line headers
                        let j = i + 1;
                        while (j < lines.length && lines[j].match(/^\s/)) {
                            value += ' ' + lines[j].trim();
                            j++;
                        }
                        i = j - 1;
                        
                        headers[field] = value;
                    }
                } else {
                    bodyLines.push(line);
                }
            }
            
            body = bodyLines.join('\n').trim();
            
            // Clean up body text (remove quoted-printable, etc.)
            body = body.replace(/=[A-F0-9]{2}/g, '') // Remove quoted-printable
                      .replace(/\s+/g, ' ')        // Normalize whitespace
                      .trim();
            
        } catch (error) {
            console.warn('Email parsing error:', error);
            body = emailText; // Use raw text as fallback
        }
        
        return { headers, body };
    }
    
    async addErrorPageToPDF(pdfDoc, file, errorMessage) {
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        
        page.drawText(`Error processing: ${file.name}`, {
            x: 50,
            y: height - 100,
            size: 16,
            color: PDFLib.rgb(0.8, 0, 0),
        });
        
        page.drawText(`Error: ${errorMessage}`, {
            x: 50,
            y: height - 140,
            size: 12,
            color: PDFLib.rgb(0.6, 0, 0),
        });
        
        page.drawText(`File size: ${this.formatFileSize(file.size)}`, {
            x: 50,
            y: height - 170,
            size: 10,
            color: PDFLib.rgb(0.3, 0.3, 0.3),
        });
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