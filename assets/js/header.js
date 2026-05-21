// ============================================================
//  ملف: header.js (مُدمَج - كامل ومُحدّث)
//  الوظيفة: بناء الهيدر وإدارة التبويبات والبحث والوضع الليلي
//  يشمل: خلفية شفافة، شعار CC، شريط أخبار، إشعارات، بروفايل
//  يعتمد على: firebase-config.js, utils.js
// ============================================================

let currentCategoryId = null;
let currentSubcategoryId = null;
let categoriesData = [];

// ---------- الدالة الرئيسية ----------
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

    // بناء HTML الهيدر
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
                <span class="icon-btn profile-btn" id="profileBtn" title="الملف الشخصي">👤</span>
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
                <div class="tab-item ${!currentCategoryId ? 'active' : ''}" onclick="handleTabClick(event, null)">🏠 الرئيسية</div>
                ${categoriesData.map(cat => `
                    <div class="tab-item" data-id="${cat.id}" onclick="handleTabClick(event, '${cat.id}')">
                        ${cat.name} ${cat.subcategories && cat.subcategories.length ? '▾' : ''}
                    </div>
                `).join('')}
            </div>
            <div class="subcategory-bar" id="subcategoryBar" style="display:none;"></div>
        </div>
        <div class="breaking-news-bar" id="breakingNewsBar">
            <div class="breaking-fixed-badge">جديد!</div>
            <div class="breaking-news-content" id="breakingNewsContent">
                <span class="breaking-item">⏳ جاري تحميل المقالات...</span>
            </div>
        </div>
    `;

    attachHeaderEvents();
    if (darkMode) document.body.classList.add('dark-mode');
    loadBreakingNews();
    setInterval(loadBreakingNews, 60000);
}

// ---------- ربط الأحداث ----------
function attachHeaderEvents() {
    // أيقونة البحث
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

    // زر البحث
    document.getElementById('searchBtn').addEventListener('click', () => {
        const query = document.getElementById('searchInput').value.trim();
        if (typeof searchPosts === 'function') searchPosts(query);
    });

    // أيقونة الإشعارات
    document.getElementById('notificationBell').addEventListener('click', (e) => {
        e.stopPropagation();
        const existing = document.getElementById('notifications-dropdown');
        if (existing) { existing.remove(); return; }
        loadNotifications();
    });

    // أيقونة البروفايل
    document.getElementById('profileBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('profile-dropdown');
        if (menu) { menu.remove(); return; }
        const rect = e.target.getBoundingClientRect();
        const dropdown = document.createElement('div');
        dropdown.id = 'profile-dropdown';
        dropdown.className = 'profile-dropdown';
        dropdown.style.top = (rect.bottom + window.scrollY + 8) + 'px';
        dropdown.style.left = (rect.left + window.scrollX - 180) + 'px';
        dropdown.innerHTML = `
            <div class="profile-dropdown-item" onclick="showToast('قيد التطوير', 'info')">👤 الملف الشخصي</div>
            <div class="profile-dropdown-item" onclick="showToast('قيد التطوير', 'info')">⚙️ الإعدادات</div>
            <div class="profile-dropdown-item" onclick="window.location.href='admin.html'">📊 لوحة التحكم</div>
            <div class="profile-dropdown-divider"></div>
            <div class="profile-dropdown-item" onclick="showToast('قيد التطوير', 'info')">🚪 تسجيل الخروج</div>
        `;
        document.body.appendChild(dropdown);
        setTimeout(() => {
            const closeHandler = (ev) => {
                if (!dropdown.contains(ev.target) && ev.target !== document.getElementById('profileBtn')) {
                    dropdown.remove();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 10);
    });

    // الوضع الليلي
    document.getElementById('darkModeBtn').addEventListener('click', toggleDarkMode);

    // إغلاق شريط البحث عند النقر خارجه
    document.addEventListener('click', (e) => {
        const bar = document.getElementById('searchBar');
        const toggle = document.getElementById('searchToggle');
        if (!bar.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) {
            bar.style.display = 'none';
        }
    });
}

// ---------- التبويبات والفروع ----------
function handleTabClick(event, catId) {
    if (currentCategoryId === catId && document.getElementById('subcategoryBar').style.display !== 'none') {
        hideSubcategories();
        currentCategoryId = null;
        currentSubcategoryId = null;
        document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        const homeTab = document.querySelector('.tab-item[onclick*="null"]');
        if (homeTab) homeTab.classList.add('active');
        if (typeof loadPosts === 'function') loadPosts(1);
        scrollToPosts();
        return;
    }

    document.querySelectorAll('.tab-item').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    currentCategoryId = catId;
    currentSubcategoryId = null;
    const category = categoriesData.find(c => c.id === catId);
    if (category && category.subcategories && category.subcategories.length > 0) {
        showSubcategories(category.subcategories);
    } else {
        hideSubcategories();
    }
    if (typeof loadPosts === 'function') loadPosts(1);
    scrollToPosts();
}

function showSubcategories(subcategories) {
    const bar = document.getElementById('subcategoryBar');
    let html = '<div class="subcategory-list">';
    html += `<span class="sub-item sub-close-btn" onclick="hideSubcategoriesAndReset()" title="إغلاق الفروع">✕</span>`;
    html += `<span class="sub-item ${!currentSubcategoryId ? 'active' : ''}" onclick="selectSubcategory(null)">الكل</span>`;
    subcategories.forEach((sub, index) => {
        const subId = sub.id || `sub-${index}`;
        html += `<span class="sub-item ${currentSubcategoryId === subId ? 'active' : ''}" onclick="selectSubcategory('${subId}')">${sub.name || sub}</span>`;
    });
    html += '</div>';
    bar.innerHTML = html;
    bar.style.display = 'block';
}

function hideSubcategories() {
    document.getElementById('subcategoryBar').style.display = 'none';
}

function hideSubcategoriesAndReset() {
    hideSubcategories();
    currentSubcategoryId = null;
    if (typeof loadPosts === 'function') loadPosts(1);
}

function selectSubcategory(subId) {
    currentSubcategoryId = subId;
    document.querySelectorAll('.sub-item').forEach(item => item.classList.remove('active'));
    if (subId === null) {
        document.querySelector('.sub-item[onclick*="null"]')?.classList.add('active');
    } else {
        document.querySelector(`.sub-item[onclick*="${subId}"]`)?.classList.add('active');
    }
    if (typeof loadPosts === 'function') loadPosts(1);
    scrollToPosts();
}

// ---------- البحث والتنقل ----------
function goHome() {
    currentCategoryId = null;
    currentSubcategoryId = null;
    hideSubcategories();
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    document.querySelector('.tab-item[onclick*="null"]')?.classList.add('active');
    if (typeof loadPosts === 'function') loadPosts(1);
    scrollToPosts();
}

function scrollToPosts() {
    const feed = document.getElementById('posts-feed');
    if (feed) feed.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- الوضع الليلي ----------
async function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    document.getElementById('darkModeBtn').textContent = isDark ? '☀️' : '🌙';
    await updateSetting('darkMode', isDark);
}

// ---------- الإشعارات ----------
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

// ---------- شريط الأخبار ----------
async function loadBreakingNews() {
    const bar = document.getElementById('breakingNewsContent');
    if (!bar) return;
    try {
        const snapshot = await db.collection('posts').orderBy('date', 'desc').limit(15).get();
        if (snapshot.empty) {
            bar.innerHTML = '<span class="breaking-item">لا توجد مقالات حديثة</span>';
            return;
        }
        let itemsHTML = '';
        snapshot.forEach((doc, index) => {
            const post = doc.data();
            const title = post.title || 'مقال بدون عنوان';
            itemsHTML += `<span class="breaking-item">${title}</span>`;
            if (index < snapshot.size - 1) itemsHTML += '<span class="breaking-sep">•</span>';
        });
        bar.innerHTML = itemsHTML + '<span class="breaking-sep">•</span>' + itemsHTML;
    } catch (error) {
        bar.innerHTML = '<span class="breaking-item">⚠️ خطأ في تحميل المقالات</span>';
    }
}

console.log("✅ header.js تم تحميله بنجاح");
