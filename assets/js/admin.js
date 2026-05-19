// ============================================================
//  ملف: admin.js
//  الوظيفة: إدارة لوحة التحكم وعمليات CRUD على جميع المجموعات
//  يعتمد على: firebase-config.js, utils.js
//  ملاحظة: يجب أن يحتوي admin.html على هيكل الشريط الجانبي
//           ومنطقة المحتوى (#content-panel)
// ============================================================

// ---------- 1. المتغيرات العامة ----------
let adminCurrentSection = 'header'; // القسم النشط حالياً
let isAdminLoggedIn = false;       // حالة تسجيل الدخول

// ---------- 2. التحقق من الجلسة عند التحميل ----------
document.addEventListener('DOMContentLoaded', () => {
    // التحقق من وجود جلسة مخزنة
    if (localStorage.getItem('adminSession')) {
        // إذا كانت الجلسة موجودة، نتحقق من صلاحيتها عبر Firebase Auth
        auth.onAuthStateChanged(user => {
            if (user) {
                showAdminPanel(user);
            } else {
                // الجلسة منتهية، نعرض شاشة الدخول
                showLoginScreen();
            }
        });
    } else {
        showLoginScreen();
    }
    
    // ربط زر تسجيل الدخول
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // ربط أحداث الشريط الجانبي
    setupSidebarEvents();
});

// ---------- 3. دوال الجلسة وتسجيل الدخول ----------

/**
 * عرض شاشة تسجيل الدخول وإخفاء لوحة التحكم
 */
function showLoginScreen() {
    const loginScreen = document.getElementById('login-screen');
    const adminScreen = document.getElementById('admin-screen');
    if (loginScreen) loginScreen.style.display = 'flex';
    if (adminScreen) adminScreen.style.display = 'none';
    localStorage.removeItem('adminSession');
}

/**
 * عرض لوحة التحكم وإخفاء شاشة الدخول
 * @param {Object} user - كائن المستخدم من Firebase Auth
 */
function showAdminPanel(user) {
    const loginScreen = document.getElementById('login-screen');
    const adminScreen = document.getElementById('admin-screen');
    if (loginScreen) loginScreen.style.display = 'none';
    if (adminScreen) adminScreen.style.display = 'flex';
    
    // تخزين جلسة
    localStorage.setItem('adminSession', 'true');
    isAdminLoggedIn = true;
    
    console.log(`✅ تم تسجيل الدخول كـ: ${user.email}`);
    
    // تحميل القسم الافتراضي
    loadSection(adminCurrentSection);
}

/**
 * معالجة تسجيل الدخول
 * @param {Event} e - حدث النموذج
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const loginBtn = e.target.querySelector('button[type="submit"]');
    
    if (!email || !password) {
        alert('يرجى إدخال البريد الإلكتروني وكلمة المرور');
        return;
    }
    
    // تعطيل الزر أثناء المحاولة
    loginBtn.disabled = true;
    loginBtn.textContent = 'جاري الدخول...';
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        // سيتم التعامل مع نجاح الدخول في onAuthStateChanged
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        let errorMessage = 'حدث خطأ في تسجيل الدخول';
        
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'صيغة البريد الإلكتروني غير صحيحة';
                break;
            case 'auth/user-not-found':
                errorMessage = 'لا يوجد مستخدم بهذا البريد الإلكتروني';
                break;
            case 'auth/wrong-password':
                errorMessage = 'كلمة المرور غير صحيحة';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'محاولات كثيرة جداً. حاول مرة أخرى لاحقاً';
                break;
        }
        
        alert('❌ ' + errorMessage);
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'دخول';
    }
}

/**
 * تسجيل الخروج
 */
async function logoutAdmin() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('خطأ في تسجيل الخروج:', error);
    }
    localStorage.removeItem('adminSession');
    isAdminLoggedIn = false;
    window.location.href = 'index.html';
}

// ---------- 4. إعداد الشريط الجانبي ----------

/**
 * ربط أحداث النقر على عناصر الشريط الجانبي
 */
function setupSidebarEvents() {
    const sidebarItems = document.querySelectorAll('.admin-sidebar ul li');
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            if (section) {
                // تحديث العنصر النشط
                sidebarItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                // تحميل القسم
                loadSection(section);
            }
        });
    });
    
    // زر تسجيل الخروج
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutAdmin);
    }
}

// ---------- 5. تحميل الأقسام ----------

/**
 * تحميل محتوى قسم معين في لوحة التحكم
 * @param {string} section - اسم القسم (header, body, footer, categories, posts, authors, keys)
 */
async function loadSection(section) {
    const panel = document.getElementById('content-panel');
    if (!panel) return;
    
    adminCurrentSection = section;
    
    // عرض مؤشر التحميل
    panel.innerHTML = '<div class="loading-spinner">⏳ جاري تحميل القسم...</div>';
    
    try {
        switch (section) {
            case 'header':
                await loadHeaderSection(panel);
                break;
            case 'body':
                await loadBodySection(panel);
                break;
            case 'footer':
                await loadFooterSection(panel);
                break;
            case 'categories':
                await loadCategoriesSection(panel);
                break;
            case 'posts':
                await loadPostsSection(panel);
                break;
            case 'authors':
                await loadAuthorsSection(panel);
                break;
            case 'keys':
                await loadKeysSection(panel);
                break;
            default:
                panel.innerHTML = '<p>القسم غير معروف</p>';
        }
    } catch (error) {
        console.error(`خطأ في تحميل قسم ${section}:`, error);
        panel.innerHTML = '<p class="error-message">⚠️ حدث خطأ أثناء تحميل القسم</p>';
    }
}

// ---------- 6. قسم إدارة الهيدر ----------
async function loadHeaderSection(panel) {
    const settings = await getSetting('', null); // نحتاج كل الإعدادات
    const siteName = await getSetting('siteName', 'ALSHANFRICC');
    const logoFont = await getSetting('logoFont', 'Playfair Display');
    const primaryColor = await getSetting('primaryColor', '#c48b4c');
    const darkMode = await getSetting('darkMode', false);
    
    panel.innerHTML = `
        <h2>إدارة الهيدر</h2>
        <div class="card">
            <div class="form-group">
                <label>اسم الموقع</label>
                <input type="text" id="header-site-name" class="form-control" value="${siteName}">
            </div>
            <div class="form-group">
                <label>نوع خط الشعار</label>
                // ... أسطر أخرى
<select id="header-font" class="form-control">
  ${AVAILABLE_FONTS.map(f => 
    `<option value="${f.name}" ${logoFont === f.name ? 'selected' : ''}>
      ${f.name} (${f.type})
    </option>`
  ).join('')}
</select>
// ... أسطر أخرى
            </div>
            <div class="form-group">
                <label>اللون الأساسي</label>
                <input type="color" id="header-color" class="form-control" value="${primaryColor}">
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="header-darkmode" ${darkMode ? 'checked' : ''}> 
                    تفعيل الوضع الليلي افتراضياً
                </label>
            </div>
            <button class="btn btn-primary" onclick="saveHeaderSettings()">💾 حفظ إعدادات الهيدر</button>
        </div>
    `;
}

async function saveHeaderSettings() {
    const siteName = document.getElementById('header-site-name').value;
    const logoFont = document.getElementById('header-font').value;
    const primaryColor = document.getElementById('header-color').value;
    const darkMode = document.getElementById('header-darkmode').checked;
    
    await updateSetting('siteName', siteName);
    await updateSetting('logoFont', logoFont);
    await updateSetting('primaryColor', primaryColor);
    await updateSetting('darkMode', darkMode);
    
    alert('✅ تم حفظ إعدادات الهيدر بنجاح');
}

// ---------- 7. قسم إدارة البدي ----------
async function loadBodySection(panel) {
    const bodyBg = await getSetting('bodyBackground', '#f0f2f5');
    
    panel.innerHTML = `
        <h2>إدارة البدي</h2>
        <div class="card">
            <div class="form-group">
                <label>لون خلفية المحتوى</label>
                <input type="color" id="body-bg" class="form-control" value="${bodyBg}">
            </div>
            <button class="btn btn-primary" onclick="saveBodySettings()">💾 حفظ إعدادات البدي</button>
        </div>
    `;
}

async function saveBodySettings() {
    const bodyBg = document.getElementById('body-bg').value;
    await updateSetting('bodyBackground', bodyBg);
    alert('✅ تم حفظ إعدادات البدي');
}

// ---------- 8. قسم إدارة الفوتر ----------
async function loadFooterSection(panel) {
    const footerText = await getSetting('footerText', 'جميع الحقوق محفوظة');
    const facebookUrl = await getSetting('facebookUrl', '#');
    const twitterUrl = await getSetting('twitterUrl', '#');
    const instagramUrl = await getSetting('instagramUrl', '#');
    
    panel.innerHTML = `
        <h2>إدارة الفوتر</h2>
        <div class="card">
            <div class="form-group">
                <label>نص حقوق النشر</label>
                <input type="text" id="footer-text" class="form-control" value="${footerText}">
            </div>
            <div class="form-group">
                <label>رابط فيسبوك</label>
                <input type="url" id="footer-facebook" class="form-control" value="${facebookUrl}">
            </div>
            <div class="form-group">
                <label>رابط تويتر</label>
                <input type="url" id="footer-twitter" class="form-control" value="${twitterUrl}">
            </div>
            <div class="form-group">
                <label>رابط انستغرام</label>
                <input type="url" id="footer-instagram" class="form-control" value="${instagramUrl}">
            </div>
            <button class="btn btn-primary" onclick="saveFooterSettings()">💾 حفظ إعدادات الفوتر</button>
        </div>
    `;
}

async function saveFooterSettings() {
    await updateSetting('footerText', document.getElementById('footer-text').value);
    await updateSetting('facebookUrl', document.getElementById('footer-facebook').value);
    await updateSetting('twitterUrl', document.getElementById('footer-twitter').value);
    await updateSetting('instagramUrl', document.getElementById('footer-instagram').value);
    alert('✅ تم حفظ إعدادات الفوتر');
}

// ---------- 9. قسم إدارة التبويبات (الفئات) ----------
async function loadCategoriesSection(panel) {
    panel.innerHTML = `
        <h2>إدارة التبويبات والفروع</h2>
        <div class="card">
            <div class="form-group">
                <label>اسم التبويبة</label>
                <input type="text" id="cat-name" class="form-control" placeholder="مثال: تقنية">
            </div>
            <div class="form-group">
                <label>الأيقونة (إيموجي)</label>
                <input type="text" id="cat-icon" class="form-control" placeholder="📱">
            </div>
            <button class="btn btn-primary" onclick="addCategory()">➕ إضافة تبويبة</button>
        </div>
        <div id="categories-list" class="card">
            <h3>التبويبات الحالية</h3>
            <div id="categories-container">⏳ جاري التحميل...</div>
        </div>
    `;
    
    await renderCategories();
}

async function addCategory() {
    const name = document.getElementById('cat-name').value.trim();
    const icon = document.getElementById('cat-icon').value.trim();
    if (!name) return alert('الرجاء إدخال اسم التبويبة');
    
    // الحصول على أعلى ترتيب
    const snapshot = await db.collection('categories').orderBy('order', 'desc').limit(1).get();
    let maxOrder = 0;
    snapshot.forEach(doc => maxOrder = doc.data().order || 0);
    
    await db.collection('categories').add({
        name,
        icon: icon || '📌',
        order: maxOrder + 1,
        subcategories: []
    });
    
    document.getElementById('cat-name').value = '';
    document.getElementById('cat-icon').value = '';
    await renderCategories();
}

async function deleteCategory(catId) {
    if (!confirm('هل أنت متأكد من حذف هذه التبويبة؟')) return;
    await db.collection('categories').doc(catId).delete();
    await renderCategories();
}

async function addSubcategory(catId) {
    const name = prompt('أدخل اسم الفرع:');
    if (!name) return;
    
    const catRef = db.collection('categories').doc(catId);
    const catDoc = await catRef.get();
    if (catDoc.exists) {
        const cat = catDoc.data();
        const subcategories = cat.subcategories || [];
        subcategories.push({
            id: generateId(),
            name: name
        });
        await catRef.update({ subcategories });
        await renderCategories();
    }
}

async function deleteSubcategory(catId, subId) {
    if (!confirm('حذف هذا الفرع؟')) return;
    const catRef = db.collection('categories').doc(catId);
    const catDoc = await catRef.get();
    if (catDoc.exists) {
        const cat = catDoc.data();
        const subcategories = (cat.subcategories || []).filter(s => s.id !== subId);
        await catRef.update({ subcategories });
        await renderCategories();
    }
}

async function renderCategories() {
    const container = document.getElementById('categories-container');
    if (!container) return;
    
    const snapshot = await db.collection('categories').orderBy('order').get();
    if (snapshot.empty) {
        container.innerHTML = '<p>لا توجد تبويبات بعد</p>';
        return;
    }
    
    let html = '';
    snapshot.forEach(doc => {
        const cat = doc.data();
        html += `
            <div class="list-item">
                <div class="item-info">
                    <span class="item-title">${cat.icon || '📌'} ${cat.name}</span>
                    <div class="item-meta">
                        الفروع: ${(cat.subcategories || []).map(s => s.name).join('، ') || 'لا يوجد'}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-sm btn-outline" onclick="addSubcategory('${doc.id}')">➕ فرع</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCategory('${doc.id}')">🗑️ حذف</button>
                </div>
            </div>
        `;
        
        // عرض الفروع مع أزرار حذف
        if (cat.subcategories && cat.subcategories.length > 0) {
            cat.subcategories.forEach(sub => {
                html += `
                    <div class="list-item" style="padding-right: 40px; background: #f9f9f9;">
                        <span>↳ ${sub.name}</span>
                        <button class="btn btn-sm btn-danger" onclick="deleteSubcategory('${doc.id}', '${sub.id}')">🗑️</button>
                    </div>
                `;
            });
        }
    });
    
    container.innerHTML = html;
}

// ---------- 10. قسم إدارة المنشورات (المقالات) ----------
async function loadPostsSection(panel) {
    panel.innerHTML = `
        <h2>إدارة المنشورات</h2>
        <button class="btn btn-primary" onclick="showAddPostForm()">➕ إضافة منشور جديد</button>
        <div id="posts-list" class="card" style="margin-top:20px;">
            <h3>المنشورات الحالية</h3>
            <div id="posts-container">⏳ جاري التحميل...</div>
        </div>
    `;
    await renderPostsList();
}

function showAddPostForm() {
    // تبسيط: نعرض نموذج إضافة سريع
    const title = prompt('عنوان المنشور:');
    if (!title) return;
    const content = prompt('محتوى المنشور (Markdown):');
    if (content === null) return;
    
    // إضافة منشور جديد
    addNewPost(title, content, 'مجهول', null, null);
}

async function addNewPost(title, content, author, categoryId, subcategoryId) {
    const postData = {
        title,
        content: [{ type: 'text', value: content }],
        author: author || 'مجهول',
        category: categoryId || null,
        subcategory: subcategoryId || null,
        date: new Date().toISOString(),
        likes: 0,
        likedBy: [],
        comments: [],
        views: 0
    };
    
    await db.collection('posts').add(postData);
    await renderPostsList();
    alert('✅ تم إضافة المنشور بنجاح');
}

async function deletePost(postId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنشور؟')) return;
    await db.collection('posts').doc(postId).delete();
    await renderPostsList();
}

async function renderPostsList() {
    const container = document.getElementById('posts-container');
    if (!container) return;
    
    const snapshot = await db.collection('posts').orderBy('date', 'desc').limit(50).get();
    if (snapshot.empty) {
        container.innerHTML = '<p>لا توجد منشورات بعد</p>';
        return;
    }
    
    let html = '';
    snapshot.forEach(doc => {
        const post = doc.data();
        html += `
            <div class="list-item">
                <div class="item-info">
                    <span class="item-title">${post.title}</span>
                    <div class="item-meta">${post.author || 'مجهول'} · ${timeAgo(post.date)}</div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-sm btn-danger" onclick="deletePost('${doc.id}')">🗑️ حذف</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ---------- 11. قسم إدارة الكتّاب ----------
async function loadAuthorsSection(panel) {
    panel.innerHTML = `
        <h2>إدارة الكتّاب</h2>
        <div class="card">
            <div class="form-group">
                <label>اسم الكاتب</label>
                <input type="text" id="author-name" class="form-control" placeholder="أدخل اسم الكاتب">
            </div>
            <button class="btn btn-primary" onclick="addAuthor()">➕ إضافة كاتب</button>
        </div>
        <div id="authors-list" class="card" style="margin-top:20px;">
            <h3>الكتّاب الحاليون</h3>
            <div id="authors-container">⏳ جاري التحميل...</div>
        </div>
    `;
    await renderAuthors();
}

async function addAuthor() {
    const name = document.getElementById('author-name').value.trim();
    if (!name) return alert('الرجاء إدخال اسم الكاتب');
    
    await db.collection('authors').add({
        name,
        createdAt: new Date().toISOString()
    });
    
    document.getElementById('author-name').value = '';
    await renderAuthors();
}

async function deleteAuthor(authorId) {
    if (!confirm('حذف هذا الكاتب؟')) return;
    await db.collection('authors').doc(authorId).delete();
    await renderAuthors();
}

async function renderAuthors() {
    const container = document.getElementById('authors-container');
    if (!container) return;
    
    const snapshot = await db.collection('authors').orderBy('createdAt', 'desc').get();
    if (snapshot.empty) {
        container.innerHTML = '<p>لا يوجد كتّاب بعد</p>';
        return;
    }
    
    let html = '';
    snapshot.forEach(doc => {
        const author = doc.data();
        html += `
            <div class="list-item">
                <span>✍️ ${author.name}</span>
                <button class="btn btn-sm btn-danger" onclick="deleteAuthor('${doc.id}')">🗑️ حذف</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ---------- 12. قسم إدارة المفاتيح ----------
async function loadKeysSection(panel) {
    panel.innerHTML = `
        <h2>إدارة المفاتيح (API Keys)</h2>
        <div class="card">
            <div class="form-group">
                <label>اسم المفتاح</label>
                <input type="text" id="key-name" class="form-control" placeholder="مثال: OpenAI">
            </div>
            <div class="form-group">
                <label>نوع المفتاح</label>
                <select id="key-type" class="form-control">
                    <option value="ai">ذكاء اصطناعي</option>
                    <option value="database">قاعدة بيانات</option>
                    <option value="other">أخرى</option>
                </select>
            </div>
            <div class="form-group">
                <label>المفتاح</label>
                <input type="text" id="key-value" class="form-control" placeholder="sk-...">
            </div>
            <div class="form-group">
                <label>التعليمات (اختياري)</label>
                <textarea id="key-instructions" class="form-control" rows="3" placeholder="تعليمات للنموذج..."></textarea>
            </div>
            <button class="btn btn-primary" onclick="addKey()">➕ إضافة مفتاح</button>
        </div>
        <div id="keys-list" class="card" style="margin-top:20px;">
            <h3>المفاتيح المخزنة</h3>
            <div id="keys-container">⏳ جاري التحميل...</div>
        </div>
    `;
    await renderKeys();
}

async function addKey() {
    const name = document.getElementById('key-name').value.trim();
    const type = document.getElementById('key-type').value;
    const value = document.getElementById('key-value').value.trim();
    const instructions = document.getElementById('key-instructions').value.trim();
    
    if (!name || !value) return alert('الرجاء إدخال الاسم والمفتاح');
    
    await db.collection('api_keys').add({
        name,
        type,
        value,
        instructions,
        createdAt: new Date().toISOString()
    });
    
    document.getElementById('key-name').value = '';
    document.getElementById('key-value').value = '';
    document.getElementById('key-instructions').value = '';
    await renderKeys();
}

async function deleteKey(keyId) {
    if (!confirm('حذف هذا المفتاح؟')) return;
    await db.collection('api_keys').doc(keyId).delete();
    await renderKeys();
}

async function renderKeys() {
    const container = document.getElementById('keys-container');
    if (!container) return;
    
    const snapshot = await db.collection('api_keys').orderBy('createdAt', 'desc').get();
    if (snapshot.empty) {
        container.innerHTML = '<p>لا توجد مفاتيح بعد</p>';
        return;
    }
    
    let html = '';
    snapshot.forEach(doc => {
        const key = doc.data();
        html += `
            <div class="list-item">
                <div class="item-info">
                    <span class="item-title">🔑 ${key.name}</span>
                    <div class="item-meta">النوع: ${key.type} · ${key.value.substring(0, 10)}...</div>
                </div>
                <button class="btn btn-sm btn-danger" onclick="deleteKey('${doc.id}')">🗑️ حذف</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ---------- 13. تأكيد التحميل ----------
console.log("✅ ملف admin.js تم تحميله بنجاح - جميع دوال الإدارة جاهزة");
