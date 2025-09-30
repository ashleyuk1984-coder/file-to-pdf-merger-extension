# File to PDF Merger - Browser Extension

A Microsoft Edge browser extension that transforms your files into beautiful PDFs with drag-and-drop magic. This extension brings the power of the [File to PDF Merger webapp](https://github.com/ashleyuk1984-coder/file-to-pdf-merger) directly to your browser.

## ✨ Features

### Current Features
- 🎯 **Beautiful Dark UI** - Modern purple/indigo theme with glass morphism effects
- 📁 **Drag & Drop Interface** - Intuitive file selection with visual feedback
- 🔄 **File Reordering** - Custom ordering with smooth drag interactions
- 📊 **Progress Tracking** - Real-time progress updates with shimmer animations
- 📱 **Extension Popup** - Compact, optimized interface for browser use

### Planned Features (In Development)
- 📄 **PDF Merging** - Combine multiple PDFs into one
- 🖼️ **Image to PDF** - Convert images (PNG, JPG, GIF, etc.) to PDF
- 📝 **Text to PDF** - Convert text files to formatted PDFs
- 📧 **Email to PDF** - Process .eml and .msg files (client-side parsing)
- 📄 **Word Document Support** - Convert .doc/.docx using mammoth.js
- ⬬ **Automatic Downloads** - Seamless PDF download via browser APIs

## 🏗️ Architecture

This extension uses a **client-side only** architecture, unlike the original webapp:

```
Extension Popup → Browser APIs → Client-side PDF Libraries → Download
```

**Key Components:**
- `manifest.json` - Extension configuration and permissions
- `popup.html` - Main user interface (adapted from webapp)
- `popup.js` - Core logic and file processing
- `popup.css` - Styles (inherited from webapp)
- `background.js` - Service worker for downloads and background tasks
- `icons/` - Extension icons (16px, 32px, 48px, 128px)

## 🚀 Installation & Testing

### Development Installation
1. Clone this repository
2. Open Microsoft Edge
3. Navigate to `edge://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked"
6. Select the extension directory
7. The extension will appear in your toolbar

### Production Installation (Future)
- Will be available on Microsoft Edge Add-ons store

## 🛠️ Development Status

### ✅ Completed
- [x] Basic extension structure (manifest, popup, background)
- [x] UI adaptation from webapp to extension popup format
- [x] File selection and drag-and-drop functionality
- [x] File reordering interface (drag logic needs completion)
- [x] Progress tracking and state management
- [x] Error handling and user feedback

### 🔧 In Progress
- [ ] **PDF Processing Libraries Integration**
  - [ ] PDF-lib for PDF manipulation
  - [ ] jsPDF for PDF creation
  - [ ] Canvas API for image processing
- [ ] **File Type Support**
  - [ ] PDF merging (PDF-lib)
  - [ ] Image to PDF conversion
  - [ ] Text file processing
  - [ ] Word document conversion (mammoth.js)
  - [ ] Email parsing (.eml files with client-side parsers)
- [ ] **Extension Features**
  - [ ] Right-click context menu for files
  - [ ] Options page for settings
  - [ ] Icon design and creation

### 📋 TODO
- [ ] Complete drag-and-drop reordering implementation
- [ ] Implement actual PDF generation instead of simulation
- [ ] Add client-side Word document processing
- [ ] Create extension icons (16px, 32px, 48px, 128px)
- [ ] Add comprehensive error handling for different file types
- [ ] Optimize for extension popup size constraints
- [ ] Add keyboard shortcuts and accessibility features
- [ ] Implement file size limits and validation
- [ ] Add progress persistence across popup close/reopen

## 🎨 Design & UI

The extension maintains the beautiful design language of the original webapp:

- **Color Scheme**: Dark theme with purple/indigo accents
- **Typography**: Clean, modern fonts with proper contrast
- **Animations**: Smooth transitions and micro-interactions
- **Layout**: Responsive design optimized for extension popup dimensions
- **Accessibility**: Proper contrast ratios and semantic HTML

## 🔧 Technical Implementation

### Client-Side PDF Processing
Unlike the server-based webapp, this extension processes files entirely in the browser:

**PDF Libraries Being Evaluated:**
- **PDF-lib** - Comprehensive PDF manipulation
- **jsPDF** - Lightweight PDF creation
- **PDFtk.js** - Browser port of PDFtk

**File Processing Approach:**
- **Images**: Canvas API → PDF-lib conversion
- **Text Files**: File API → Formatted PDF creation
- **PDF Files**: PDF-lib for merging and manipulation
- **Word Documents**: mammoth.js for HTML conversion → PDF rendering

### Extension Architecture
- **Manifest V3** - Latest Chrome Extension standard
- **Service Worker** - Background processing and downloads
- **Popup Interface** - Main user interaction point
- **Storage API** - Settings and temporary data persistence

## 🤝 Contributing

This extension is adapted from the [original webapp](https://github.com/ashleyuk1984-coder/file-to-pdf-merger). 

### Development Workflow
1. Make changes to the extension files
2. Reload the extension in `edge://extensions/`
3. Test functionality in the popup
4. Commit changes with descriptive messages

### Key Areas Needing Help
- Client-side PDF processing implementation
- Extension icon design
- File type validation and error handling
- Performance optimization for large files

## 📝 License

This project maintains the same license as the original webapp.

## 🔗 Related Projects

- [File to PDF Merger (Webapp)](https://github.com/ashleyuk1984-coder/file-to-pdf-merger) - The original server-based version

---

**Note**: This extension is currently in active development. The UI and basic structure are complete, but PDF processing functionality is still being implemented.