const desiredWidth = 1000;
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const imageContainer = document.querySelector('.image-container');
const fullDocumentTextarea = document.getElementById('fullDocument');
const fullDocumentSection = document.getElementById('fullDocumentSection');
const languageSelect = document.getElementById('id_language');

let fileSelectionAllowed = true;

const LANGUAGES = {
eng: "English",
hin: "Hindi",
};

// Populate the languages select box
while (languageSelect.firstChild) {
languageSelect.removeChild(languageSelect.firstChild);
}

for (const code of Object.values({ ENG: "eng", HIN: "hin" })) {
const name = LANGUAGES[code];
const option = document.createElement('option');
option.value = code;
option.textContent = name;
if (option.value == 'eng') {
option.selected = true;
}
languageSelect.appendChild(option);
}

function showProgressBar() {
const progressBarContainer = document.getElementById('progress-bar-container');
progressBarContainer.style.display = 'block';
updateProgress(0);
}

function hideProgressBar() {
const progressBarContainer = document.getElementById('progress-bar-container');
progressBarContainer.style.display = 'none';
}

function updateProgress(value) {
const progressBar = document.getElementById('progress-bar');
const progressPercentage = document.getElementById('progress-percentage');
progressBar.value = value;
progressPercentage.textContent = `${Math.round(value)}%`;
}

function showFullDocument() {
const populatedTextareas = Array.from(
document.querySelectorAll('.image-container textarea')
).filter(ta => ta.value.trim().length);
if (populatedTextareas.length > 1) {
fullDocumentTextarea.value = populatedTextareas.map(ta => ta.value.trim()).join("\n\n");
fullDocumentSection.style.display = 'block';

const outputDiv = document.getElementById("output");
const links = outputDiv.querySelectorAll("a");
links.forEach(link => link.remove());

const downloadLink = document.createElement("a");
const name = document.getElementById("fileInput").files[0].name.split('.')[0];
downloadLink.textContent = `Download ${name}.txt`;
const blob = new Blob([fullDocumentTextarea.value], { type: "text/plain" });
downloadLink.href = URL.createObjectURL(blob);
downloadLink.download = `${name}.txt`;
fileName = `${name}.txt`;
outputDiv.appendChild(downloadLink);

} else {
fullDocumentTextarea.value = '';
fullDocumentSection.style.display = 'none';
}
}

function setTextarea(ta, text) {
ta.value = text.trim();
ta.style.height = 'auto';
ta.style.height = (ta.scrollHeight + 5) + 'px';
}

dropzone.addEventListener('dragover', handleDragOver);
dropzone.addEventListener('dragleave', handleDragLeave);
dropzone.addEventListener('drop', handleDrop);
dropzone.addEventListener('click', handleClick);

async function handleDragOver(event) {
event.preventDefault();
if (fileSelectionAllowed) {
dropzone.classList.add('drag-over');
}
}

async function handleDragLeave(event) {
event.preventDefault();
if (fileSelectionAllowed) {
dropzone.classList.remove('drag-over');
}
}

async function handleDrop(event) {
event.preventDefault();
if (fileSelectionAllowed) {
dropzone.classList.remove('drag-over');
const file = event.dataTransfer.files[0];
fileInput.files = event.dataTransfer.files;
processFile(file);
}
}

async function handleClick() {
if (fileSelectionAllowed) {
fileInput.click();
}
}

fileInput.addEventListener('change', (event) => {
const file = event.target.files[0];
if (file) {
processFile(file); }
return;
});

async function processFile(file) {
const worker = await Tesseract.createWorker(languageSelect.value, 1, {
workerPath: '../tesseract.js/worker.min.js',
langPath: '../langData',
corePath: '../tesseract.jscore/',
logger: m => {
if (m.status === 'recognizing text' && m.progress) {
updateProgress(m.progress * 100);
}
}
});

fullDocumentTextarea.value = '';
fullDocumentSection.style.display = 'none';
imageContainer.innerHTML = '';
const originalText = dropzone.innerText;
dropzone.innerText = 'Processing file...';
dropzone.classList.add('disabled');
fileSelectionAllowed = false;
showProgressBar();

if (file.type === 'application/pdf') {
const { numPages, imageIterator } = await convertPDFToImages(file);
let done = 0;
dropzone.innerText = `Processing ${numPages} page${numPages > 1 ? 's': ''}`;
for await (const { imageURL } of imageIterator) {
const ta = await displayImage(imageURL);
const { text } = await ocrImage(worker, imageURL);
setTextarea(ta, text);
showFullDocument();
done += 1;
updateProgress((done / numPages) * 100);
dropzone.innerText = `Done ${done} of ${numPages}`;
}
} else {
const imageURL = URL.createObjectURL(file);
const ta = await displayImage(imageURL);
const { text } = await ocrImage(worker, imageURL);
setTextarea(ta, text);
showFullDocument();
updateProgress(100);
}

await worker.terminate();
hideProgressBar();
dropzone.innerText = originalText;
dropzone.classList.remove('disabled');
fileSelectionAllowed = true;
}

async function displayImage(imageURL) {
const imgElement = document.createElement('img');
imgElement.src = imageURL;
imageContainer.appendChild(imgElement);

const altTextarea = document.createElement('textarea');
altTextarea.classList.add('textarea-alt');
altTextarea.placeholder = 'OCRing image...';
imageContainer.appendChild(altTextarea);

return altTextarea;
}

async function rerunOCR() {
const textareas = document.querySelectorAll('.image-container textarea');
const images = document.querySelectorAll('.image-container img');

if (!textareas.length) return;

Array.from(textareas).forEach(ta => (ta.value = ''));
showFullDocument();

const numImages = images.length;
let done = 0;
showProgressBar();
dropzone.innerText = `Processing ${numImages} image${numImages > 1 ? 's': ''}`;

const worker = await Tesseract.createWorker(languageSelect.value, 1, {
workerPath: '../tesseract.js/worker.min.js',
langPath: '../langData',
corePath: '../tesseract.jscore/',
logger: m => {
if (m.status === 'recognizing text' && m.progress) {
const progress = ((done + m.progress) / numImages) * 100;
updateProgress(progress);
}
}
});

for (let i = 0; i < numImages; i++) {
const imageURL = images[i].src;
const ta = textareas[i];
ta.placeholder = 'OCRing image...';
const { text } = await ocrImage(worker, imageURL);
setTextarea(ta, text);
showFullDocument();
done += 1;
updateProgress((done / numImages) * 100);
dropzone.innerText = `Done ${done} of ${numImages}`;
}

await worker.terminate();
hideProgressBar();
}

document.addEventListener('paste', (event) => {
const items = (event.clipboardData || event.originalEvent.clipboardData).items;
const images = Array.from(items).filter(item => item.type.indexOf('image') !== -1);
if (images.length) {
processFile(images[0].getAsFile());
}
});

async function convertPDFToImages(file) {
const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
const numPages = pdf.numPages;
async function* images() {
for (let i = 1; i <= numPages; i++) {
try {
const page = await pdf.getPage(i);
const viewport = page.getViewport({ scale: 1 });
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');
canvas.width = desiredWidth;
canvas.height = (desiredWidth / viewport.width) * viewport.height;
const renderContext = {
canvasContext: context,
viewport: page.getViewport({ scale: desiredWidth / viewport.width }),
};
await page.render(renderContext).promise;
const imageURL = canvas.toDataURL('image/jpeg', 0.8);
yield { imageURL };
} catch (error) {
console.error(`Error rendering page ${i}:`, error);
}
}
}
return { numPages: numPages, imageIterator: images() };
}

async function ocrImage(worker, imageUrl) {
const { data: { text } } = await worker.recognize(imageUrl);
return { text };
}

languageSelect.addEventListener('change', async (event) => {
let newUrl = window.location.pathname;
let language = event.target.value;
if (language != 'eng') {
newUrl += '?language=' + language;
}
window.history.pushState({ path: newUrl }, '', newUrl);
await rerunOCR();
});

function setLanguageFromQueryString() {
const params = new URLSearchParams(window.location.search);
let value = params.get('language');
if (!value) {
value = 'eng';
}
languageSelect.value = value;
}

window.addEventListener('load', setLanguageFromQueryString);

window.addEventListener('popstate', (event) => {
setLanguageFromQueryString();
});