/**
 * term-search.js - המוח של קודקס הרר"פ
 * מכיל את כל הלוגיקה של טעינת הנתונים, אלגוריתם החיפוש ורינדור כרטיסיות.
 */

const HEBREW_DETAILS_MAP = {
    gender: "מין",
    binyan: "בניין",
    root: "שורש",
    inflection: "נטייה",
    verbInflection: "נטיית הפועל"
};

let dictionaryData = [];
const MAX_PREVIEW_LENGTH = 100;
const MAX_VISIBLE_TAGS = 3;

// --- 1. טעינת הנתונים ואתחול ---

async function initApp() {
    try {
        const response = await fetch('terms.json');
        if (!response.ok) throw new Error(`Status: ${response.status}`);
        dictionaryData = await response.json();
        
        initNavbar(); // הפעלת חיפוש בנאב-בר בכל הדפים
        return true;
    } catch (error) {
        console.error("Critical Error: Could not load terms.json.", error);
        return false;
    }
}

// --- 2. אלגוריתם חיפוש מדורג ---

function calculateSearchScore(item, searchTerm) {
    const wordLower = item.word.toLowerCase();
    const sourceEnLower = item.sourceEn.toLowerCase();
    const definitionLower = item.definition.toLowerCase();
    let score = 0;

    // 1. המונח בעברית
    if (wordLower === searchTerm) score = Math.max(score, 100);
    else if (wordLower.startsWith(searchTerm)) score = Math.max(score, 80);
    else if (wordLower.includes(searchTerm)) score = Math.max(score, 60);

    // 2. המונח באנגלית
    if (sourceEnLower === searchTerm) score = Math.max(score, 95);
    else if (sourceEnLower.startsWith(searchTerm)) score = Math.max(score, 75);
    else if (sourceEnLower.includes(searchTerm)) score = Math.max(score, 55);

    // 3. פירוש המילה
    if (definitionLower.includes(searchTerm)) score = Math.max(score, 30);

    // 4. דוגמאות לשימוש
    if (item.usages && item.usages.some(u => u.toLowerCase().includes(searchTerm))) {
        score = Math.max(score, 10);
    }

    return score;
}

function performSearch(term) {
    const searchTerm = term.toLowerCase().trim();
    if (searchTerm.length < 2) return [];

    let results = dictionaryData.map(item => {
        let score = calculateSearchScore(item, searchTerm);
        return { ...item, score };
    }).filter(entry => entry.score > 0);

    results.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.word.localeCompare(b.word, 'he'); 
    });
    
    return results;
}

// --- 3. בניית כרטיסיות ---

function truncateText(text, maxLength = MAX_PREVIEW_LENGTH) {
    return text.length <= maxLength ? text : text.substring(0, maxLength).trim() + '...';
}

function createListCardHtml(item) {
    const definitionPreview = truncateText(item.definition);
    return `
        <a href="term.html#${encodeURIComponent(item.word)}"
            class="p-4 bg-white border-b border-gray-200 last:border-b-0 flex flex-col md:flex-row justify-between items-start transition-all duration-200 hover:bg-amber-100 gap-2">
            <div class="text-right md:w-1/3">
                <h3 class="text-2xl font-extrabold text-amber-900 mb-1">${item.word}</h3>
                <p class="text-sm text-gray-600 font-medium ltr" style="direction: ltr; text-align: left;">${item.sourceEn}</p>
            </div>
            <div class="text-right md:w-2/3 md:pl-2 md:border-r-2 md:border-amber-100 md:pr-4 mt-2 md:mt-0">
                <p class="text-gray-700 text-base leading-snug">${definitionPreview}</p>
            </div>
        </a>
    `;
}

function createDictCardHtml(item) {
    const definitionPreview = truncateText(item.definition);
    const tags = item.tags || [];
    const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);
    const extraTagsCount = tags.length - MAX_VISIBLE_TAGS;

    let tagsHtml = visibleTags.map(tag =>
        `<span class="inline-block bg-red-900/10 text-red-700 text-xs font-medium px-2.5 py-0.5 rounded-sm ml-2 whitespace-nowrap border border-red-900/50">${tag}</span>`
    ).join('');
    if (extraTagsCount > 0) {
        tagsHtml += `<span class="inline-block bg-stone-200 text-gray-700 text-xs font-medium px-2.5 py-0.5 rounded-sm ml-2 whitespace-nowrap border border-stone-300">+${extraTagsCount}</span>`;
    }

    return `
        <a href="term.html#${encodeURIComponent(item.word)}"
            class="block bg-stone-50 p-5 border-2 border-amber-900 rounded-sm shadow-[0_5px_15px_rgba(120,53,15,0.2)] hover:shadow-[0_8px_20px_rgba(120,53,15,0.4)] hover:scale-[1.02] transition transform duration-300">
            <h2 class="text-2xl font-extrabold text-amber-900 mb-2">${item.word}</h2>
            <div class="mb-3 flex flex-wrap gap-y-1">${tagsHtml}</div>
            <p class="text-sm text-gray-600 mb-2 font-medium">מקור (EN): <span class="font-bold ml-1 ltr inline-block" style="direction:ltr;">${item.sourceEn}</span></p>
            <p class="text-base text-gray-800 font-medium leading-snug">${definitionPreview}</p>
        </a>
    `;
}

// --- 4. הגדרת הנאב-בר ---

function initNavbar() {
    const navSearchInput = document.getElementById('nav-search-input');
    const navResultsContainer = document.getElementById('nav-search-results');
    
    if(!navSearchInput) return;

    navSearchInput.addEventListener('input', (e) => {
        const results = performSearch(e.target.value).slice(0, 5);
        if (e.target.value.trim().length < 2) {
            navResultsContainer.classList.add('hidden');
            return;
        }
        if (results.length > 0) {
            navResultsContainer.innerHTML = results.map(r => `
                <a href="term.html#${encodeURIComponent(r.word)}" class="block px-4 py-3 border-b border-amber-100 hover:bg-amber-50 transition-colors">
                    <div class="font-bold text-amber-900">${r.word}</div>
                    <div class="text-xs text-gray-500 ltr" style="direction: ltr; text-align: left;">${r.sourceEn}</div>
                </a>`).join('');
        } else {
            navResultsContainer.innerHTML = '<div class="p-4 text-sm text-gray-500">לא נמצאו תוצאות...</div>';
        }
        navResultsContainer.classList.remove('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!navSearchInput.contains(e.target) && !navResultsContainer.contains(e.target)) {
            navResultsContainer.classList.add('hidden');
        }
    });
}
