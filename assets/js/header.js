// ============================================================
//  ملف: header.js
//  الوظيفة: بناء الهيدر العلوي للموقع بالكامل
//  يشمل: اسم الموقع، شريط البحث، قائمة التبويبات، الوضع الليلي
//  يعتمد على: firebase-config.js, utils.js
// ============================================================

// ---------- متغيرات عامة ----------
let currentCategoryId = null;       // التبويبة المحددة حالياً (null = الكل)
let currentSubcategoryId = null;    // الفرع المحدد حالياً
let categoriesData = [];            // تخزين بيانات التبويبات محلياً بعد الجلب

// ---------- الدالة الرئيسية: بناء الهيدر ----------

/**
 * بناء الهيدر بالكامل وجلب البيانات من Firestore
 * تستدعى مرة واحدة عند تحميل الصفحة
 */
async function buildHeader() {
    const headerDiv = document.getElementById('site-header');
    
    // جلب الإعدادات من Firestore
    const siteName = await getSetting('siteName', 'ALSHANFRICC');
    const primaryColor = await getSetting('primaryColor', '#c48b4c');
    const logoFont = await getSetting('logoFont', 'Playfair Display');
    const darkMode = await getSetting('darkMode', false);
    
    // جلب التبويبات من مجموعة "categories" (مرتبة)
    const catsSnapshot = await db.collection('categories')
        .orderBy('order', 'asc')
        .get();
    
    // تخزين التبويبات في المصفوفة العامة
    categoriesData = [];
    catsSnapshot.forEach(doc => {
        categoriesData.push({
            id: doc.id,
            ...doc.data()
        });
    });
    
    // بناء HTML التبويبات
    let tabsHTML = '';
    categoriesData.forEach(cat => {
        const hasSub = cat.subcategories && cat.subcategories.length > 0;
        const arrow = hasSub ? ' ▾' : '';
        tabsHTML += `
            <div class="tab-item" 
                 data-id="${cat.id}" 
                 data-has-sub="${hasSub}" 
                 onclick="handleTabClick(event, '${cat.id}')">
                ${cat.icon || '📌'} ${cat.name}${arrow}
            </div>
        `;
    });
    
    // بناء HTML الهيدر كاملاً
    headerDiv.innerHTML = `
        <div class="header-top">
            <div class="logo" 
                 onclick="goHome()" 
                 style="color: ${primaryColor}; font-family: '${logoFont}', serif;">
                ${siteName}
            </div>
            
            <div class="search-box">
                <span class="search-icon">🔍</span>
                <input type="text" 
                       id="searchInput" 
                       placeholder="ابحث في المقالات..." 
                       autocomplete="off">
                <button id="searchClearBtn" style="display:none;" 
                        onclick="clearSearch()">✕</button>
            </div>
            
            <div class="header-actions">
                <button id="darkModeBtn" 
                        class="icon-btn" 
                        onclick="toggleDarkMode()" 
                        title="تغيير الوضع">
                    ${darkMode ? '☀️' : '🌙'}
                </button>
            </div>
        </div>
        
        <div class="nav-container">
            <div class="nav-tabs" id="mainTabs">
                <div class="tab-item ${!currentCategoryId ? 'active' : ''}" 
                     onclick="handleTabClick(event, null)">
                    🏠 الرئيسية
                </div>
                ${tabsHTML}
            </div>
            <!-- شريط الفروع المنسدل (يظهر عند اختيار تبويبة لها فروع) -->
            <div class="subcategory-bar" id="subcategoryBar" style="display:none;"></div>
        </div>
    `;
    
    // ربط الأحداث بعد بناء الهيدر
    attachHeaderEvents();
    
    // تطبيق الوضع الليلي إذا كان مفعلاً
    if (darkMode) {
        document.body.classList.add('dark-mode');
    }
    
    console.log("✅ الهيدر تم بناؤه بنجاح - التبويبات:", categoriesData.length);
}

// ---------- ربط الأحداث ----------

/**
 * ربط جميع أحداث الهيدر (بحث، أزرار، إلخ)
 */
function attachHeaderEvents() {
    const searchInput = document.getElementById('searchInput');
    const searchClearBtn = document.getElementById('searchClearBtn');
    
    // حدث البحث مع debounce
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            const query = this.value.trim();
            // إظهار/إخفاء زر المسح
            if (searchClearBtn) {
                searchClearBtn.style.display = query ? 'inline-block' : 'none';
            }
            // استدعاء دالة البحث في body.js
            if (typeof searchPosts === 'function') {
                searchPosts(query);
            }
        }, 400));
        
        // البحث الفوري عند الضغط على Enter
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim();
                if (typeof searchPosts === 'function') {
                    searchPosts(query);
                }
            }
        });
    }
}

// ---------- دوال التبويبات ----------

/**
 * معالجة النقر على تبويبة رئيسية
 * @param {Event} event - حدث النقر
 * @param {string|null} catId - معرف التبويبة (null = الرئيسية)
 */
function handleTabClick(event, catId) {
    // تحديث التبويبة النشطة في الواجهة
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.classList.remove('active');
    });
    
    if (event.target.classList.contains('tab-item')) {
        event.target.classList.add('active');
    } else {
        // إذا نقر على عنصر داخل التبويبة
        event.target.closest('.tab-item')?.classList.add('active');
    }
    
    // تعيين التبويبة الحالية
    currentCategoryId = catId;
    currentSubcategoryId = null; // إعادة تعيين الفرع
    
    // البحث عن التبويبة لمعرفة إذا كان لها فروع
    const category = categoriesData.find(c => c.id === catId);
    
    if (category && category.subcategories && category.subcategories.length > 0) {
        // إظهار شريط الفروع
        showSubcategories(category.subcategories);
    } else {
        // إخفاء شريط الفروع
        hideSubcategories();
    }
    
    // تحديث المقالات المعروضة في البدي
    if (typeof loadPosts === 'function') {
        loadPosts(false); // إعادة تحميل المقالات مع الفلتر الجديد
    }
    
    // تمرير إلى بداية المقالات
    scrollToPosts();
}

/**
 * إظهار شريط الفروع المنسدل
 * @param {Array} subcategories - مصفوفة الفروع
 */
function showSubcategories(subcategories) {
    const bar = document.getElementById('subcategoryBar');
    if (!bar) return;
    
    let html = '<div class="subcategory-list">';
    html += `<span class="sub-item ${!currentSubcategoryId ? 'active' : ''}" 
                   onclick="selectSubcategory(null)">الكل</span>`;
    
    subcategories.forEach((sub, index) => {
        const subId = sub.id || `sub-${index}`;
        const subName = sub.name || sub;
        html += `<span class="sub-item ${currentSubcategoryId === subId ? 'active' : ''}" 
                       onclick="selectSubcategory('${subId}')">${subName}</span>`;
    });
    
    html += '</div>';
    bar.innerHTML = html;
    bar.style.display = 'block';
}

/**
 * إخفاء شريط الفروع
 */
function hideSubcategories() {
    const bar = document.getElementById('subcategoryBar');
    if (bar) bar.style.display = 'none';
}

/**
 * تحديد فرع معين
 * @param {string|null} subId - معرف الفرع (null = الكل)
 */
function selectSubcategory(subId) {
    currentSubcategoryId = subId;
    
    // تحديث النشط في شريط الفروع
    document.querySelectorAll('.sub-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // تنشيط العنصر المناسب
    const activeItem = document.querySelector(`.sub-item[onclick*="${subId}"]`);
    if (activeItem) activeItem.classList.add('active');
    else if (subId === null) {
        // تنشيط "الكل"
        const allItem = document.querySelector('.sub-item[onclick*="null"]');
        if (allItem) allItem.classList.add('active');
    }
    
    // تحديث المقالات
    if (typeof loadPosts === 'function') {
        loadPosts(false);
    }
    
    scrollToPosts();
}

// ---------- دوال البحث ----------

/**
 * مسح حقل البحث والعودة للحالة الطبيعية
 */
function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchClearBtn = document.getElementById('searchClearBtn');
    if (searchInput) {
        searchInput.value = '';
        if (searchClearBtn) searchClearBtn.style.display = 'none';
        // إعادة تحميل المقالات بدون فلتر
        if (typeof searchPosts === 'function') {
            searchPosts('');
        }
    }
}

// ---------- الوضع الليلي ----------

/**
 * تبديل الوضع الليلي
 */
async function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    const btn = document.getElementById('darkModeBtn');
    if (btn) {
        btn.textContent = isDark ? '☀️' : '🌙';
    }
    // حفظ التفضيل في Firestore
    await updateSetting('darkMode', isDark);
}

// ---------- دوال التنقل ----------

/**
 * العودة إلى الصفحة الرئيسية (عرض كل المقالات)
 */
function goHome() {
    currentCategoryId = null;
    currentSubcategoryId = null;
    hideSubcategories();
    
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.classList.remove('active');
    });
    // تنشيط "الرئيسية"
    const homeTab = document.querySelector('.tab-item[onclick*="null"]');
    if (homeTab) homeTab.classList.add('active');
    
    if (typeof loadPosts === 'function') {
        loadPosts(false);
    }
    scrollToPosts();
}

/**
 * التمرير إلى قسم المقالات
 */
function scrollToPosts() {
    const feed = document.getElementById('posts-feed');
    if (feed) {
        feed.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ---------- تأكيد التحميل ----------
console.log("✅ ملف header.js تم تحميله بنجاح");
