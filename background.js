/**
 * Background script for the File to PDF Merger extension
 */

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('File to PDF Merger extension installed');
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'downloadPDF') {
    // Handle PDF download
    const { pdfData, filename } = message;
    
    chrome.downloads.download({
      url: pdfData,
      filename: filename,
      saveAs: false  // Automatically download without save dialog
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError });
      } else {
        sendResponse({ success: true, downloadId });
      }
    });
    
    return true; // Required for async response
  }
});