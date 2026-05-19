// ============================================================
//  ملف: header.js (محدّث)
//  الوظيفة: بناء الهيدر مع أيقونة بحث، جرس، إضاءة، تبويبات
//           متحركة تختفي تلقائياً وتظهر بزر الهامبرغر
// ============================================================

let headerTimer = null;          // مؤقت إخفاء التبويبات
let tabsVisible = true;         // حالة ظهور التبويبات

// ---------- الدالة الرئيسية ----------
async function buildHeader() {
    const siteName = await getSetting('siteName', 'ALSHANFRICC');
    const primaryColor = await getSetting('primaryColor', '#c48b4c');
    const logoFont = await getSetting('logoFont', 'Playfair Display');
    const darkMode = await getSetting('darkMode', false);

    // جلب التبويبات من Firestore
    const catsSnapshot = await db.collection('categories').orderBy('order').get();
    categoriesData = [];
    catsSnapshot.forEach(doc => categoriesData.push({ id: doc.id, ...doc.data() }));

    const headerDiv = document.getElementById('site-header');
    headerDiv.innerHTML = `
        <div class="header-top">
            <div class="logo" style="color:${primaryColor}; font-family:'${logoFont}', serif;" 
                 onclick="goHome()">${siteName}</div>
            <div class="header-icons">
                <span class="icon-btn" id="searchToggle" title="بحث">🔍</span>
                <span class="icon-btn" id="notificationBell" title="الإشعارات">🔔</span>
                <span class="icon-btn" id="darkModeBtn" title="الوضع الليلي">${darkMode ? '☀️' : '🌙'}</span>
            </div>
        </div>
        <div class="search-bar" id="searchBar" style="display:none;">
            <input type="text" id="searchInput" placeholder="ابحث...">
            <span id="searchClose" style="cursor:pointer;">✕</span>
        </div>
        <div class="nav-container" id="navContainer">
            <div class="nav-tabs-wrapper" id="navTabsWrapper">
                <div class="nav-tabs" id="mainTabs">
                    <div class="tab-item ${!currentCategoryId ? 'active' : ''}" onclick="handleTabClick(event, null)">🏠 الرئيسية</div>
                    ${categoriesData.map(cat => `
                        <div class="tab-item" data-id="${cat.id}" onclick="handleTabClick(event, '${cat.id}')">
                            ${cat.icon || '📌'} ${cat.name} ${cat.subcategories?.length ? '▾' : ''}
                        </div>
                    `).join('')}
                </div>
                <span class="hamburger-btn" id="hamburgerBtn" title="إظهار التبويبات">☰</span>
            </div>
            <div class="subcategory-bar" id="subcategoryBar" style="display:none;"></div>
        </div>
    `;

    attachHeaderEvents();
    if (darkMode) document.body.classList.add('dark-mode');

    // بدء مؤقت الإخفاء التلقائي بعد 5 ثوانٍ من السكون
    resetTabsTimer();
    window.addEventListener('scroll', onWindowScroll);
    window.addEventListener('mousemove', resetTabsTimer);
    window.addEventListener('touchstart', resetTabsTimer, {passive: true});
}

function attachHeaderEvents() {
    // أيقونة البحث
    document.getElementById('searchToggle').addEventListener('click', () => {
        document.getElementById('searchBar').style.display = 'flex';
        document.getElementById('searchInput').focus();
    });
    document.getElementById('searchClose').addEventListener('click', () => {
        document.getElementById('searchBar').style.display = 'none';
        document.getElementById('searchInput').value = '';
        if (typeof searchPosts === 'function') searchPosts('');
    });
    document.getElementById('searchInput').addEventListener('input', debounce(function() {
        if (typeof searchPosts === 'function') searchPosts(this.value);
    }, 400));

    // أيقونة الجرس (مثال: إظهار تنبيه)
    document.getElementById('notificationBell').addEventListener('click', () => {
        alert('🔔 لا توجد إشعارات جديدة حالياً.');
    });

    // أيقونة الوضع الليلي
    document.getElementById('darkModeBtn').addEventListener('click', toggleDarkMode);

    // زر الهامبرغر
    document.getElementById('hamburgerBtn').addEventListener('click', () => {
        tabsVisible = !tabsVisible;
        updateTabsVisibility();
    });

    // إغلاق شريط البحث عند النقر خارجه
    document.addEventListener('click', (e) => {
        const searchBar = document.getElementById('searchBar');
        const searchToggle = document.getElementById('searchToggle');
        if (!searchBar.contains(e.target) && e.target !== searchToggle && !searchToggle.contains(e.target)) {
            searchBar.style.display = 'none';
        }
    });
}

// ---------- إدارة التبويبات (اختفاء/ظهور) ----------
function resetTabsTimer() {
    clearTimeout(headerTimer);
    // إظهار التبويبات فوراً عند الحركة
    if (!tabsVisible) {
        tabsVisible = true;
        updateTabsVisibility();
    }
    headerTimer = setTimeout(() => {
        // بعد 5 ثوانٍ من السكون، نبدأ بإخفاء الفروع ثم التبويبات
        hideSubcategories();
        setTimeout(() => {
            if (tabsVisible) {
                tabsVisible = false;
                updateTabsVisibility();
            }
        }, 500); // تأخير إضافي لإخفاء التبويبات بعد الفروع
    }, 5000);
}

function onWindowScroll() {
    resetTabsTimer();
    // إظهار التبويبات أيضاً عند التمرير للأعلى
    // (اختياري: يمكن اكتشاف الاتجاه)
}

function updateTabsVisibility() {
    const wrapper = document.getElementById('navTabsWrapper');
    wrapper.classList.toggle('tabs-hidden', !tabsVisible);
    document.getElementById('hamburgerBtn').style.display = tabsVisible ? 'none' : 'inline-block';
    if (!tabsVisible) {
        document.getElementById('subcategoryBar').style.display = 'none';
    }
}

// ---------- باقي الدوال (handleTabClick, selectSubcategory, toggleDarkMode...) ----------
// (أعد استخدامها كما في النسخة السابقة مع تعديلات طفيفة)
