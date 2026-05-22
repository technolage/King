// ============================================================
//  ملف: header.js (مُحدّث – هيدر متكيف مع التمرير + تبويبات أصغر)
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
    document.getElementById('searchToggle').addEventListener('click', () => {
        const bar = document.getElementById('searchBar');
        bar.style.display = 'flex';
        document.getElementById('searchInput').focus();
    });
    document.getElementById('searchClose').addEventListener('click', () => {
        document.getElementById('searchBar').style.display = 'none';
        document.getElementById('searchInput').value = '';
        if (typeof searchPosts === 'function') searchPosts('');
    });

    const searchInput = document.getElementById('searchInput');
    const searchLabel = document.getElementById('searchLabel');
    if (searchInput && searchLabel) {
        searchInput.addEventListener('input', function() {
            if (this.value.trim()) {
                searchLabel.style.opacity = '0';
            } else {
                searchLabel.style.opacity = '1';
            }
            if (typeof searchPosts === 'function') searchPosts(this.value);
        });
        searchInput.addEventListener('focus', () => { searchLabel.style.opacity = '0'; });
        searchInput.addEventListener('blur', function() {
            if (!this.value.trim()) searchLabel.style.opacity = '1';
        });
    }

    document.getElementById('searchBtn').addEventListener('click', () => {
        const query = document.getElementById('searchInput').value.trim();
        if (typeof searchPosts === 'function') searchPosts(query);
    });

    document.getElementById('notificationBell').addEventListener('click', (e) => {
        e.stopPropagation();
        const existing = document.getElementById('notifications-dropdown');
        if (existing) { existing.remove(); return; }
        loadNotifications();
    });

    document.getElementById('darkModeBtn').addEventListener('click', toggleDarkMode);

    document.addEventListener('click', (e) => {
        const bar = document.getElementById('searchBar');
        const toggle = document.getElementById('searchToggle');
        if (!bar.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) {
            bar.style.display = 'none';
        }
    });
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

function updateHeaderOnScroll() {
    const scrollY = window.scrollY;
    const header = document.getElementById('site-header');
    const compact = document.getElementById('compact-header');
    const threshold = 100;

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

// ---------- التبويبات والفروع ----------
function handleTabClick(event, catId) {
    if (window.currentCategoryId === catId && document.getElementById('subcategoryBar').style.display !== 'none') {
        hideSubcategories();
        window.currentCategoryId = null;
        window.currentSubcategoryId = null;
        document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        const homeTab = document.querySelector('.tab-item[onclick*="null"]');
        if (homeTab) homeTab.classList.add('active');
        if (typeof loadPosts === 'function') loadPosts(1);
        scrollToPosts();
        updateCompactBreadcrumb();
        return;
    }

    document.querySelectorAll('.tab-item').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    window.currentCategoryId = catId;
    window.currentSubcategoryId = null;
    const category = categoriesData.find(c => c.id === catId);
    if (category && category.subcategories && category.subcategories.length > 0) {
        showSubcategories(category.subcategories);
    } else {
        hideSubcategories();
    }
    if (typeof loadPosts === 'function') loadPosts(1);
    scrollToPosts();
    updateCompactBreadcrumb();
}

function showSubcategories(subcategories) {
    const bar = document.getElementById('subcategoryBar');
    let html = '<div class="subcategory-list">';
    html += `<span class="sub-item sub-close-btn" onclick="hideSubcategoriesAndReset()">✕</span>`;
    html += `<span class="sub-item ${!window.currentSubcategoryId ? 'active' : ''}" onclick="selectSubcategory(null)">الكل</span>`;
    subcategories.forEach((sub, index) => {
        const subId = sub.id || `sub-${index}`;
        html += `<span class="sub-item ${window.currentSubcategoryId === subId ? 'active' : ''}" onclick="selectSubcategory('${subId}')">${sub.name || sub}</span>`;
    });
    html += '</div>';
    bar.innerHTML = html;
    bar.style.display = 'block';
    updateCompactBreadcrumb();
}

function hideSubcategories() {
    document.getElementById('subcategoryBar').style.display = 'none';
}

function hideSubcategoriesAndReset() {
    hideSubcategories();
    window.currentSubcategoryId = null;
    if (typeof loadPosts === 'function') loadPosts(1);
    updateCompactBreadcrumb();
}

function selectSubcategory(subId) {
    window.currentSubcategoryId = subId;
    document.querySelectorAll('.sub-item').forEach(item => item.classList.remove('active'));
    if (subId === null) {
        document.querySelector('.sub-item[onclick*="null"]')?.classList.add('active');
    } else {
        document.querySelector(`.sub-item[onclick*="${subId}"]`)?.classList.add('active');
    }
    if (typeof loadPosts === 'function') loadPosts(1);
    scrollToPosts();
    updateCompactBreadcrumb();
}

function activateTab(catId, subId) {
    if (catId) {
        window.currentCategoryId = catId;
        document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        const tab = document.querySelector(`.tab-item[data-id="${catId}"]`);
        if (tab) tab.classList.add('active');
        const category = categoriesData.find(c => c.id === catId);
        if (category && category.subcategories && category.subcategories.length > 0) {
            showSubcategories(category.subcategories);
            if (subId) {
                window.currentSubcategoryId = subId;
                setTimeout(() => {
                    document.querySelectorAll('.sub-item').forEach(s => s.classList.remove('active'));
                    const subItem = document.querySelector(`.sub-item[onclick*="${subId}"]`);
                    if (subItem) subItem.classList.add('active');
                }, 50);
            }
        } else {
            hideSubcategories();
        }
    } else {
        goHome();
    }
    if (typeof loadPosts === 'function') loadPosts(1);
    updateCompactBreadcrumb();
}

function goHome() {
    window.currentCategoryId = null;
    window.currentSubcategoryId = null;
    hideSubcategories();
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    document.querySelector('.tab-item[onclick*="null"]')?.classList.add('active');
    if (typeof loadPosts === 'function') loadPosts(1);
    scrollToPosts();
    updateCompactBreadcrumb();
}

function scrollToPosts() {
    const feed = document.getElementById('posts-feed');
    if (feed) feed.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    document.getElementById('darkModeBtn').textContent = isDark ? '☀️' : '🌙';
    const compactBtn = document.getElementById('compactDarkModeBtn');
    if (compactBtn) compactBtn.textContent = isDark ? '☀️' : '🌙';
    await updateSetting('darkMode', isDark);
}

async function loadNotifications() {
    const existing = document.getElementById('notifications-dropdown');
    if (existing) existing.remove();

    const bell = document.getElementById('notificationBell');
    const rect = bell.getBoundingClientRect();
    const dropdown = document.createElement('div');
    dropdown.id = 'notifications-dropdown';
    dropdown.className = 'notifications-dropdown';
    dropdown.style.top = (rect.bottom + window.scrollY + 8) + 'px';
    dropdown.style.left = (rect.left + window.scrollX - 300 + rect.width) + 'px';
    document.body.appendChild(dropdown);
    dropdown.innerHTML = '<div class="notifications-loading">⏳ جاري تحميل الإشعارات...</div>';

    try {
        const snapshot = await db.collection('notifications').orderBy('date', 'desc').limit(15).get();
        if (snapshot.empty) {
            dropdown.innerHTML = '<div class="notification-item"><span>🔔 لا توجد إشعارات جديدة</span></div>';
        } else {
            let html = '';
            snapshot.forEach(doc => {
                const notif = doc.data();
                const date = notif.date ? timeAgo(notif.date) : '';
                const readClass = notif.read ? 'read' : 'unread';
                html += `<div class="notification-item ${readClass}" data-id="${doc.id}">
                    <div class="notification-text">${notif.message}</div>
                    <div class="notification-time">${date}</div>
                </div>`;
            });
            dropdown.innerHTML = html;
            const items = dropdown.querySelectorAll('.notification-item');
            items.forEach((item, index) => {
                item.style.animationDelay = `${index * 0.08}s`;
                setTimeout(() => item.classList.add('notification-show'), 10);
            });
            dropdown.querySelectorAll('.notification-item.unread').forEach(item => {
                item.addEventListener('click', async function() {
                    const id = this.dataset.id;
                    this.classList.remove('unread');
                    this.classList.add('read');
                    await db.collection('notifications').doc(id).update({ read: true });
                });
            });
        }
    } catch (error) {
        dropdown.innerHTML = '<div class="notification-item">⚠️ خطأ في التحميل</div>';
    }

    setTimeout(() => {
        const closeHandler = (e) => {
            if (!dropdown.contains(e.target) && e.target !== bell) {
                dropdown.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        document.addEventListener('click', closeHandler);
    }, 10);
}

console.log("✅ header.js تم تحميله بنجاح");
