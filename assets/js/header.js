// ============================================================
//  ملف: header.js (مُحدّث - بدون Firebase)
//  الوظيفة: بناء الهيدر وإدارة التبويبات والبحث والوضع الليلي
//  يعتمد على: github-api.js, utils.js
// ============================================================

window.currentCategoryId = null;
window.currentSubcategoryId = null;
let categoriesData = [];

// ---------- مصفوفة التبويبات الافتراضية (للموقع التقني) ----------
const DEFAULT_CATEGORIES = [
    { name: 'أخبار التقنية', icon: '📰', subcategories: ['أخبار آبل', 'أخبار جوجل', 'أخبار سامسونج', 'أخبار هواوي', 'تسريبات', 'إعلانات رسمية'] },
    { name: 'الهواتف الذكية', icon: '📱', subcategories: ['آيفون', 'سامسونج جالاكسي', 'شاومي', 'ون بلس', 'هواوي', 'أوبو', 'ريلمي', 'نوكيا'] },
    { name: 'التابلت والأجهزة اللوحية', icon: '📲', subcategories: ['آيباد', 'جالاكسي تاب', 'شاومي باد', 'هواوي مات باد'] },
    { name: 'السماعات والصوتيات', icon: '', subcategories: ['سماعات لاسلكية', 'سماعات سلكية', 'مكبرات صوت', 'سماعات آبل', 'سماعات سامسونج'] },
    { name: 'الحواسيب واللابتوب', icon: '💻', subcategories: ['لابتوب آبل', 'لابتوب ويندوز', 'لابتوب جيمنج', 'لابتوب طلاب', 'لابتوب أعمال'] },
    { name: 'الساعات الذكية', icon: '⌚', subcategories: ['آبل ووتش', 'جالاكسي ووتش', 'شاومي ووتش', 'هواوي ووتش', 'فيت بيت'] },
    { name: 'التطبيقات', icon: '', subcategories: ['تطبيقات آيفون', 'تطبيقات أندرويد', 'تطبيقات مجانية', 'تطبيقات مدفوعة', 'تطبيقات إنتاجية'] },
    { name: 'الألعاب', icon: '🎮', subcategories: ['ألعاب آيفون', 'ألعاب أندرويد', 'ألعاب PC', 'ألعاب بلايستيشن', 'ألعاب إكس بوكس', 'نينتندو'] },
    { name: 'الذكاء الاصطناعي', icon: '🤖', subcategories: ['ChatGPT', 'أدوات AI', 'روبوتات', 'تعلم آلي', 'رؤية حاسوبية'] },
    { name: 'البرمجة والتطوير', icon: '👨‍💻', subcategories: ['تطوير تطبيقات', 'تطوير ويب', 'لغات برمجة', 'أطر عمل', 'قواعد بيانات'] },
    { name: 'الأمن السيبراني', icon: '🔒', subcategories: ['حماية البيانات', 'اختراق أخلاقي', 'برامج ضارة', 'تشفير', 'خصوصية'] },
    { name: 'الشبكات والإنترنت', icon: '🌐', subcategories: ['5G', 'واي فاي', 'راوترات', 'شبكات منزلية', 'إنترنت الأشياء'] },
    { name: 'التصوير والكاميرات', icon: '📷', subcategories: ['كاميرات احترافية', 'كاميراتMirrorless', 'كاميرات هاتف', 'عدسات', 'إكسسوارات'] },
    { name: 'التلفزيونات والشاشات', icon: '📺', subcategories: ['شاشات OLED', 'شاشات QLED', 'تلفزيونات ذكية', 'شاشات جيمنج', 'بروجيكتور'] },
    { name: 'السيارات التقنية', icon: '🚗', subcategories: ['سيارات كهربائية', 'تسلا', 'قيادة ذاتية', 'تقنيات سيارات'] },
    { name: 'المنازل الذكية', icon: '', subcategories: ['أليكسا', 'جوجل هوم', 'أبل هوم كيت', 'كاميرات مراقبة', 'إضاءة ذكية'] },
    { name: 'الطاقة والبطاريات', icon: '🔋', subcategories: ['شواحن سريعة', 'بنوك طاقة', 'بطاريات', 'طاقة شمسية'] },
    { name: 'المقارنات', icon: '⚖️', subcategories: ['مقارنات هواتف', 'مقارنات لابتوب', 'مقارنات سماعات', 'مقارنات ساعات'] },
    { name: 'المراجعات', icon: '⭐', subcategories: ['مراجعات هواتف', 'مراجعات لابتوب', 'مراجعات سماعات', 'مراجعات تطبيقات'] },
    { name: 'نصائح وحيل', icon: '💡', subcategories: ['نصائح آيفون', 'نصائح أندرويد', 'حيل تقنية', 'اختصارات'] }
];

// ---------- الدالة الرئيسية ----------
async function buildHeader() {
    const settings = await getAllSettingsCached();
    const siteName = settings.siteName || 'ALSHANFRICC';
    const primaryColor = settings.primaryColor || '#c48b4c';
    const titleFont = settings.titleFont || 'Playfair Display';
    const darkMode = settings.darkMode || false;
    const headerBgImage = settings.headerBgImage || '';

    // جلب التبويبات من GitHub
    try {
        const cats = await GitHubAPI.getCategories();
        if (cats && cats.length > 0) {
            categoriesData = cats;
        } else {
            // أول تشغيل: إنشاء التبويبات الافتراضية
            console.log('📂 إنشاء التبويبات الافتراضية...');
            categoriesData = DEFAULT_CATEGORIES.map((cat, i) => ({
                id: 'cat-' + i,
                name: cat.name,
                icon: cat.icon,
                order: i,
                subcategories: cat.subcategories.map((name, j) => ({
                    id: 'sub-' + i + '-' + j,
                    name: name
                }))
            }));
            await GitHubAPI.updateCategories(categoriesData);
        }
    } catch (error) {
        console.error('خطأ في جلب التصنيفات:', error);
        categoriesData = DEFAULT_CATEGORIES.map((cat, i) => ({
            id: 'cat-' + i,
            name: cat.name,
            icon: cat.icon,
            order: i,
            subcategories: cat.subcategories.map((name, j) => ({
                id: 'sub-' + i + '-' + j,
                name: name
            }))
        }));
    }

    const headerDiv = document.getElementById('site-header');

    if (headerBgImage) {
        headerDiv.style.backgroundImage = `url('${headerBgImage}')`;
        headerDiv.style.backgroundSize = 'cover';
        headerDiv.style.backgroundPosition = 'center';
        headerDiv.classList.add('has-bg-image');
    } else {
        headerDiv.style.backgroundImage = '';
        headerDiv.classList.remove('has-bg-image');
    }

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
                <span class="icon-btn" id="darkModeBtn" title="الوضع الليلي">${darkMode ? '☀️' : ''}</span>
                <span class="icon-btn hamburger-btn" id="hamburgerBtn" title="القائمة">☰</span>
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
                ${categoriesData.map(cat => {
                    const subCount = cat.subcategories ? cat.subcategories.length : 0;
                    return `
                        <div class="tab-item" data-id="${cat.id}" onclick="handleTabClick(event, '${cat.id}')">
                            ${cat.icon} ${cat.name} ${subCount > 0 ? `<span class="tab-count">(${subCount})</span>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="subcategory-bar" id="subcategoryBar" style="display:none;"></div>
        </div>
        <!-- قائمة الهامبرغر الجانبية -->
        <div class="hamburger-menu" id="hamburgerMenu" style="display:none;">
            <div class="hamburger-menu-header">
                <span>القائمة</span>
                <button class="hamburger-close-btn" onclick="closeHamburger()"></button>
            </div>
            <div class="hamburger-tabs">
                <div class="hamburger-tab-item" onclick="handleTabClick(event, null); closeHamburger();">🏠 الرئيسية</div>
                ${categoriesData.map(cat => `
                    <div class="hamburger-tab-item" data-id="${cat.id}" onclick="handleTabClick(event, '${cat.id}'); closeHamburger();">
                        ${cat.icon} ${cat.name} (${cat.subcategories ? cat.subcategories.length : 0})
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    attachHeaderEvents();
    if (darkMode) document.body.classList.add('dark-mode');
}

// ---------- ربط الأحداث ----------
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
            if (this.value.trim()) { searchLabel.style.opacity = '0'; }
            else { searchLabel.style.opacity = '1'; }
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

    document.getElementById('hamburgerBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('hamburgerMenu');
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });

    document.addEventListener('click', (e) => {
        const bar = document.getElementById('searchBar');
        const toggle = document.getElementById('searchToggle');
        if (!bar.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) {
            bar.style.display = 'none';
        }
        const menu = document.getElementById('hamburgerMenu');
        if (menu && menu.style.display === 'block' && !e.target.closest('.hamburger-menu') && e.target !== document.getElementById('hamburgerBtn')) {
            menu.style.display = 'none';
        }
    });
}

function closeHamburger() {
    document.getElementById('hamburgerMenu').style.display = 'none';
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
}

function hideSubcategories() {
    document.getElementById('subcategoryBar').style.display = 'none';
}

function hideSubcategoriesAndReset() {
    hideSubcategories();
    window.currentSubcategoryId = null;
    if (typeof loadPosts === 'function') loadPosts(1);
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
        } else { hideSubcategories(); }
    } else { goHome(); }
    if (typeof loadPosts === 'function') loadPosts(1);
}

function goHome() {
    window.currentCategoryId = null;
    window.currentSubcategoryId = null;
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

// ---------- الإشعارات (من ملف notifications.json) ----------
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
    dropdown.innerHTML = '<div class="notifications-loading"> جاري تحميل الإشعارات...</div>';

    try {
        // جلب الإشعارات من ملف JSON
        const notifications = await fetchRawNotifications();
        
        if (!notifications || notifications.length === 0) {
            dropdown.innerHTML = '<div class="notification-item"><span>🔔 لا توجد إشعارات جديدة</span></div>';
        } else {
            let html = '';
            notifications.slice(0, 15).forEach((notif, index) => {
                const date = notif.date ? timeAgo(notif.date) : '';
                const readClass = notif.read ? 'read' : 'unread';
                html += `<div class="notification-item ${readClass}" data-id="${notif.id || index}" style="animation-delay: ${index * 0.05}s;">
                    <div class="notification-text">${notif.message}</div>
                    <div class="notification-time">${date}</div>
                </div>`;
            });
            dropdown.innerHTML = html;
            
            // إضافة تأثير الظهور
            setTimeout(() => {
                dropdown.querySelectorAll('.notification-item').forEach(item => {
                    item.classList.add('notification-show');
                });
            }, 10);
        }
    } catch (error) {
        dropdown.innerHTML = '<div class="notification-item">️ خطأ في التحميل</div>';
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

// دالة مساعدة لجلب الإشعارات
async function fetchRawNotifications() {
    const cached = CACHE.get('notifications');
    if (cached) return cached;

    try {
        const url = `${GITHUB_CONFIG.rawBaseUrl}/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/notifications.json`;
        const response = await fetch(url);
        
        if (!response.ok) return [];
        
        const data = await response.json();
        CACHE.set('notifications', data);
        return data;
    } catch (error) {
        return [];
    }
}

console.log("✅ header.js تم تحميله بنجاح - بدون Firebase");
