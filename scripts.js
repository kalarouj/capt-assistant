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

// Handle File Selection and Update Upload Box Text
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

// Extract Text from PDF and Process Dates
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

// Function to Process and Clean Lines, and Replace Date Line
function processLines(text) {
    const lines = text.split('\n').filter(line => line.trim() !== '');

    if (lines.length > 6) {
        const relevantLines = lines.slice(3, -3); // Keep middle lines

        // Merge the 2nd line at the END of the 3rd line
        if (relevantLines.length > 2) {
            relevantLines[2] = `${relevantLines[2].trim()} ${relevantLines[1].trim()}`;
            relevantLines.splice(1, 1); // Remove original 2nd line
        }

        // Find and replace lines after the "mentioned above" phrase
        const mentionedAboveIndex = relevantLines.findIndex(line =>
            line.includes('ﺍﻟﻤﻨﺎﻗﺼﺔ ﺍﻟﻤﺬﻛﻮﺭﻩ') && line.includes('ﺃﻋﻼﻩ')
        );

        if (mentionedAboveIndex >= 0) {
            relevantLines.splice(mentionedAboveIndex + 1); // Remove everything after
            const formattedLine = formatDateLine(relevantLines[mentionedAboveIndex + 1] || '');
            relevantLines.push(formattedLine); // Add formatted date line
        }

        return relevantLines.join('\n');
    }

    return '';
}

// Format the dynamic date line using the template
function formatDateLine(line) {
    const dateRegex = /(\d{4}-\d{2}-\d{2})/g;
    const dates = [...line.matchAll(dateRegex)].map(match => match[0]);

    if (dates.length === 2) {
        let [date1, date2] = dates;

        // Ensure date1 is the earlier date
        if (new Date(date1) > new Date(date2)) {
            [date1, date2] = [date2, date1];
        }

        const day1 = getArabicDay(date2); // Future date
        const day2 = getArabicDay(date1); // Past date

        // Format the line using the template
        return `ﺇﻟﻲ ﻳﻮﻡ ${day1} ﺍﻟﻤﻮﺍﻓﻖ ${date2} ﺑﺪﻻ ﻣﻦ ﻳﻮﻡ ${day2} ﺍﻟﻤﻮﺍﻓﻖ ${date1}`;
    }

    return line;
}

// Get the Arabic day name from a given date
function getArabicDay(dateString) {
    const date = new Date(dateString);
    const dayIndex = date.getDay();
    return arabicDays[dayIndex];
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

// Display Current Page
function displayPage(index) {
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
    navigator.clipboard.writeText(outputText.innerText);
});