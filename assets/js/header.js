// ============================================================
//  ملف: header.js (مُحدّث – هيدر متكيف مع التمرير)
// ============================================================

window.currentCategoryId = null;
window.currentSubcategoryId = null;
let categoriesData = [];

async function buildHeader() {
    const settings = await getAllSettingsCached();
    const siteName = settings.siteName || 'ALSHANFRICC';
    const primaryColor = settings.primaryColor || '#c48b4c';
    const titleFont = settings.titleFont || 'Playfair Display';
    const darkMode = settings.darkMode || false;
    const headerBgImage = settings.headerBgImage || '';

    const catsSnapshot = await db.collection('categories').orderBy('order').get();
    categoriesData = [];
    catsSnapshot.forEach(doc => categoriesData.push({ id: doc.id, ...doc.data() }));

    const headerDiv = document.getElementById('site-header');

    // تطبيق الخلفية
    if (headerBgImage) {
        headerDiv.style.backgroundImage = `url('${headerBgImage}')`;
        headerDiv.style.backgroundSize = 'cover';
        headerDiv.style.backgroundPosition = 'center';
        headerDiv.classList.add('has-bg-image');
    } else {
        headerDiv.style.backgroundImage = '';
        headerDiv.classList.remove('has-bg-image');
    }

    // بناء الهيدر الرئيسي (الكامل)
    headerDiv.innerHTML = `
        <div class="header-top">
            <div class="logo" onclick="goHome()">
                ${(() => {
                    const match = siteName.match(/^(.*?)(CC)$/i);
                    if (match) return `<span>${match[1]}</span><span class="logo-cc">${match[2]}</span>`;
                    return siteName;
                })()}
            </div>
            <div class="header-icons">
                <span class="icon-btn" id="searchToggle" title="بحث">🔍</span>
                <span class="icon-btn" id="notificationBell" title="الإشعارات">🔔</span>
                <span class="icon-btn" id="darkModeBtn" title="الوضع الليلي">${darkMode ? '☀️' : '🌙'}</span>
            </div>
        </div>
        <div class="search-bar" id="searchBar" style="display:none;">
            <div class="search-input-wrapper">
                <span class="search-label" id="searchLabel">ابحث...</span>
                <input type="text" id="searchInput" placeholder="">
            </div>
            <button id="searchBtn" class="search-btn">بحث</button>
            <span id="searchClose" style="cursor:pointer; margin-right:8px;">✕</span>
        </div>
        <div class="nav-container" id="navContainer">
            <div class="nav-tabs" id="mainTabs">
                <div class="tab-item ${!window.currentCategoryId ? 'active' : ''}" onclick="handleTabClick(event, null)">🏠 الرئيسية</div>
                ${categoriesData.map(cat => `
                    <div class="tab-item" data-id="${cat.id}" onclick="handleTabClick(event, '${cat.id}')">
                        ${cat.name} ${cat.subcategories && cat.subcategories.length ? '▾' : ''}
                    </div>
                `).join('')}
            </div>
            <div class="subcategory-bar" id="subcategoryBar" style="display:none;"></div>
        </div>
    `;

    // بناء الهيدر المدمج (يظهر عند التمرير للأسفل)
    const compactHeader = document.createElement('div');
    compactHeader.id = 'compact-header';
    compactHeader.className = 'compact-header hidden';
    compactHeader.innerHTML = `
        <div class="compact-logo" onclick="goHome()">
            ${(() => {
                const match = siteName.match(/^(.*?)(CC)$/i);
                if (match) return `<span>${match[1]}</span><span class="logo-cc">${match[2]}</span>`;
                return siteName;
            })()}
        </div>
        <div class="compact-info">
            <span id="compactBreadcrumb"></span>
        </div>
        <div class="compact-icons">
            <span class="icon-btn compact-icon" id="compactSearchToggle" title="بحث">🔍</span>
            <span class="icon-btn compact-icon" id="compactNotificationBell" title="الإشعارات">🔔</span>
            <span class="icon-btn compact-icon" id="compactDarkModeBtn" title="الوضع الليلي">${darkMode ? '☀️' : '🌙'}</span>
        </div>
    `;
    headerDiv.insertAdjacentElement('afterend', compactHeader);

    attachHeaderEvents();
    attachCompactHeaderEvents();
    if (darkMode) document.body.classList.add('dark-mode');

    // تحديث أولي
    updateHeaderOnScroll();
    window.addEventListener('scroll', updateHeaderOnScroll);
}

function attachHeaderEvents() {
    // ... (نفس الأحداث السابقة بدون تغيير) ...
}

function attachCompactHeaderEvents() {
    document.getElementById('compactSearchToggle').addEventListener('click', () => {
        document.getElementById('searchToggle').click();
    });
    document.getElementById('compactNotificationBell').addEventListener('click', () => {
        document.getElementById('notificationBell').click();
    });
    document.getElementById('compactDarkModeBtn').addEventListener('click', () => {
        document.getElementById('darkModeBtn').click();
    });
}

// تحديث رؤية الهيدر بناءً على التمرير
function updateHeaderOnScroll() {
    const scrollY = window.scrollY;
    const header = document.getElementById('site-header');
    const compact = document.getElementById('compact-header');
    const threshold = 100; // بكسل

    if (scrollY > threshold) {
        header.classList.add('header-hidden');
        compact.classList.remove('hidden');
        compact.classList.add('visible');
        updateCompactBreadcrumb();
    } else {
        header.classList.remove('header-hidden');
        compact.classList.remove('visible');
        compact.classList.add('hidden');
    }
}

// تحديث مسار التبويبة في الهيدر المدمج
function updateCompactBreadcrumb() {
    const breadcrumbSpan = document.getElementById('compactBreadcrumb');
    if (!breadcrumbSpan) return;

    let text = 'الرئيسية';
    if (window.currentCategoryId) {
        const cat = categoriesData.find(c => c.id === window.currentCategoryId);
        if (cat) {
            text = cat.name;
            if (window.currentSubcategoryId) {
                const subs = cat.subcategories || [];
                const sub = subs.find(s => s.id === window.currentSubcategoryId);
                if (sub) text += ` > ${sub.name}`;
            }
        }
    }
    breadcrumbSpan.textContent = text;
}

// تعديل showSubcategories و selectSubcategory لتحديث المسار المدمج
const originalShowSubcategories = showSubcategories;
showSubcategories = function(subcategories) {
    originalShowSubcategories(subcategories);
    updateCompactBreadcrumb();
};

const originalSelectSubcategory = selectSubcategory;
selectSubcategory = function(subId) {
    originalSelectSubcategory(subId);
    updateCompactBreadcrumb();
};

// تعديل handleTabClick ليحدث المسار المدمج
const originalHandleTabClick = handleTabClick;
handleTabClick = function(event, catId) {
    originalHandleTabClick(event, catId);
    updateCompactBreadcrumb();
};

// تعديل goHome
const originalGoHome = goHome;
goHome = function() {
    originalGoHome();
    updateCompactBreadcrumb();
};

// باقي الدوال تبقى كما هي (toggleDarkMode, loadNotifications, إلخ)
// ...
