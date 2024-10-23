// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.6.172/pdf.worker.min.js';

// Get elements
const pdfFileInput = document.getElementById('pdfFile');
const dropArea = document.getElementById('dropArea');
const displayButton = document.getElementById('displayButton');
const outputBox = document.getElementById('outputBox');
const outputText = document.getElementById('outputText');
const controls = document.getElementById('controls');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const copyButton = document.getElementById('copyButton');
const loadingSpinner = document.getElementById('loadingSpinner');
const pageIndicator = document.getElementById('pageIndicator');

let currentPageIndex = 0;
let extractedPages = [];

// Handle File Selection and Drag & Drop
pdfFileInput.addEventListener('change', handleFileSelect);
dropArea.addEventListener('click', () => pdfFileInput.click());

dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('highlight');
});

dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('highlight');
});

dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length) {
        pdfFileInput.files = files;
        handleFileSelect();
    }
});

// Handle File Selection and Update Upload Box Text
function handleFileSelect() {
    const file = pdfFileInput.files[0];
    if (file && file.type === 'application/pdf') {
        displayButton.disabled = false;
        dropArea.querySelector('p').textContent = file.name; // Update the text with the file name
        console.log(`File selected: ${file.name}`);
    } else {
        dropArea.querySelector('p').textContent = 'Invalid file. Please upload a PDF.'; // Handle invalid file
        console.log('Error: Please select a valid PDF file.');
    }
}

// Display PDF Output
displayButton.addEventListener('click', () => {
    const file = pdfFileInput.files[0];
    if (file) {
        extractTextFromPDF(file);
        document.getElementById('dropArea').classList.add('shrink'); // Shrink the upload box
    }
});

// Extract Text from PDF with Proper Formatting
async function extractTextFromPDF(file) {
    try {
        loadingSpinner.style.display = 'block';
        const pdfData = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

        extractedPages = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            let pageText = content.items.map(item => item.str).join('\n'); // Join with newlines

            // Clean up and process the text
            pageText = processLines(pageText);

            if (containsRequiredText(pageText) && !containsExcludedText(pageText)) {
                extractedPages.push({ index: i, text: pageText });
            }
        }

        if (extractedPages.length > 0) {
            displayPage(0);
            controls.style.display = 'flex';
            copyButton.style.display = 'block';
        } else {
            outputText.innerHTML = '<pre>No matching content found.</pre>';
            outputBox.style.display = 'block';
        }
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

// Function to Trim and Correctly Combine Lines (Reversed)
function processLines(text) {
    const lines = text.split('\n').filter(line => line.trim() !== ''); // Split by lines and remove empty lines

    if (lines.length > 6) {
        // Keep only the middle lines (after removing first 3 and last 3 lines)
        const relevantLines = lines.slice(3, -3);

        // Merge the 2nd line at the END of the 3rd line (correct order)
        if (relevantLines.length > 2) {
            relevantLines[2] = `${relevantLines[2].trim()} ${relevantLines[1].trim()}`; // Append 2nd to 3rd
            relevantLines.splice(1, 1); // Remove the original 2nd line after merging
        }

        return relevantLines.join('\n'); // Join the processed lines back into a string
    }

    return ''; // Return an empty string if there aren't enough lines
}

// Check if the Page Contains the Required Arabic Text
function containsRequiredText(text) {
    const requiredPhrase1 = 'ﺇﻋــــــــﻼﻥ';
    const requiredPhrase2 = 'ﺑﺸﺄﻥ ﺍﻟﻤﻨﺎﻗﺼﺔ ﺭﻗﻢ';

    return text.includes(requiredPhrase1) && text.includes(requiredPhrase2);
}

// Exclude Pages with "WWW.CAPT.GOV.KW"
function containsExcludedText(text) {
    return text.includes('WWW.CAPT.GOV.KW');
}

// Display the Current Page in the Output Box
function displayPage(index) {
    const page = extractedPages[index];
    outputText.innerHTML = `<pre class="text-content">${page.text}</pre>`; // Use <pre> to preserve formatting
    pageIndicator.textContent = `Page ${index + 1} of ${extractedPages.length}`;
    outputBox.style.display = 'block';
}

// Navigation between Pages
prevButton.addEventListener('click', () => {
    if (currentPageIndex > 0) displayPage(--currentPageIndex);
});

nextButton.addEventListener('click', () => {
    if (currentPageIndex < extractedPages.length - 1) displayPage(++currentPageIndex);
});

// Copy Text to Clipboard
copyButton.addEventListener('click', () => {
    navigator.clipboard.writeText(outputText.innerText).then(() => alert('Text copied!'));
});