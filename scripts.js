// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.6.172/pdf.worker.min.js';

// Arabic days of the week
const arabicDays = ['ﺍﻻﺣﺪ', 'ﺍﻻﺛﻨﻴﻦ', 'ﺍﻟﺜﻼﺛﺎﺀ', 'ﺍﻻﺭﺑﻌﺎﺀ', 'ﺍﻟﺨﻤﻴﺲ', 'ﺍﻟﺠﻤﻌﺔ', 'ﺍﻟﺴﺒﺖ'];

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

// Handle File Selection
function handleFileSelect() {
    const file = pdfFileInput.files[0];
    if (file && file.type === 'application/pdf') {
        displayButton.disabled = false;
        dropArea.querySelector('p').textContent = file.name;
    } else {
        dropArea.querySelector('p').textContent = 'Invalid file. Please upload a PDF.';
    }
}

// Shrink Drag-and-Drop Box
function shrinkUploadBox() {
    dropArea.classList.add('shrink');
}

// Display PDF Output
displayButton.addEventListener('click', () => {
    const file = pdfFileInput.files[0];
    if (file) {
        extractTextFromPDF(file);
        shrinkUploadBox();
    }
});

// Extract Text from PDF
async function extractTextFromPDF(file) {
    try {
        loadingSpinner.style.display = 'block';
        const pdfData = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

        extractedPages = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            let pageText = content.items.map(item => item.str).join('\n');
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

// Process and Clean Lines
function processLines(text) {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length > 6) {
        const relevantLines = lines.slice(3, -3);
        if (relevantLines.length > 2) {
            relevantLines[2] = `${relevantLines[2].trim()} ${relevantLines[1].trim()}`;
            relevantLines.splice(1, 1);
        }
        const mentionedAboveIndex = relevantLines.findIndex(line =>
            line.includes('ﺍﻟﻤﻨﺎﻗﺼﺔ ﺍﻟﻤﺬﻛﻮﺭﻩ') && line.includes('ﺃﻋﻼﻩ')
        );
        if (mentionedAboveIndex >= 0) {
            relevantLines.splice(mentionedAboveIndex + 1);
            relevantLines.push(formatDateLine(relevantLines[mentionedAboveIndex + 1] || ''));
        }
        return relevantLines.join('\n');
    }
    return '';
}

// Format Date Line
function formatDateLine(line) {
    const dateRegex = /(\d{4}-\d{2}-\d{2})/g;
    const dates = [...line.matchAll(dateRegex)].map(match => match[0]);
    if (dates.length === 2) {
        let [date1, date2] = dates;
        if (new Date(date1) > new Date(date2)) [date1, date2] = [date2, date1];
        const day1 = getArabicDay(date2);
        const day2 = getArabicDay(date1);
        return `ﺇﻟﻲ ﻳﻮﻡ ${day1} ﺍﻟﻤﻮﺍﻓﻖ ${date2} ﺑﺪﻻ ﻣﻦ ﻳﻮﻡ ${day2} ﺍﻟﻤﻮﺍﻓﻖ ${date1}`;
    }
    return line;
}

// Get Arabic Day Name
function getArabicDay(dateString) {
    const date = new Date(dateString);
    return arabicDays[date.getDay()];
}

// Check for Required Arabic Text
function containsRequiredText(text) {
    const requiredPhrase1 = 'ﺇﻋــــــــﻼﻥ';
    const requiredPhrase2 = 'ﺑﺸﺄﻥ ﺍﻟﻤﻨﺎﻗﺼﺔ ﺭﻗﻢ';
    return text.includes(requiredPhrase1) && text.includes(requiredPhrase2);
}

// Exclude Pages with "WWW.CAPT.GOV.KW"
function containsExcludedText(text) {
    return text.includes('WWW.CAPT.GOV.KW');
}

// Display Page
function displayPage(index) {
    currentPageIndex = index; // Update the current index
    const page = extractedPages[index];
    outputText.innerHTML = `<pre class="text-content">${page.text}</pre>`;
    pageIndicator.textContent = `Page ${index + 1} of ${extractedPages.length}`;
    outputBox.style.display = 'block';
}

// Navigation
prevButton.addEventListener('click', () => {
    if (currentPageIndex > 0) displayPage(--currentPageIndex);
});

nextButton.addEventListener('click', () => {
    if (currentPageIndex < extractedPages.length - 1) displayPage(++currentPageIndex);
});

// Copy Text to Clipboard
copyButton.addEventListener('click', () => {
    const htmlContent = `<div style="font-family: 'Times New Roman'; font-size: 20px; font-weight: bold;">${outputText.innerHTML}</div>`;
    navigator.clipboard.writeText(htmlContent).then(() => {
        console.log('Formatted text copied to clipboard!');
    }).catch(err => console.error('Error copying text: ', err));
});