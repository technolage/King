// ============================================================
//  ملف: admin.js (مُحدّث - بدون Firebase)
//  الوظيفة: إدارة لوحة التحكم وعمليات CRUD على جميع الأقسام
//  يعتمد على: github-api.js, utils.js
// ============================================================

let adminCurrentSection = 'posts';
let isAdminLoggedIn = false;

// خاصة بنافذة إضافة المنشور
let postContentItems = [];
let editingPostId = null;
let selectedCategoryId = null;
let selectedSubcategoryId = null;

// ---------- 1. التحقق من الجلسة عند التحميل ----------
document.addEventListener('DOMContentLoaded', () => {
    // التحقق من وجود Token محفوظ
    if (GitHubAPI.isLoggedIn()) {
        showAdminPanel();
    } else {
        showLoginScreen();
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    setupSidebarEvents();
});

// ---------- 2. دوال الجلسة وتسجيل الدخول ----------
function showLoginScreen() {
    const loginScreen = document.getElementById('login-screen');
    const adminScreen = document.getElementById('admin-screen');
    if (loginScreen) loginScreen.style.display = 'flex';
    if (adminScreen) adminScreen.style.display = 'none';
}

function showAdminPanel() {
    const loginScreen = document.getElementById('login-screen');
    const adminScreen = document.getElementById('admin-screen');
    if (loginScreen) loginScreen.style.display = 'none';
    if (adminScreen) adminScreen.style.display = 'block';
    
    isAdminLoggedIn = true;
    console.log('✅ تم تسجيل الدخول للوحة التحكم');
    loadSection(adminCurrentSection);
}

async function handleLogin(e) {
    e.preventDefault();
    const token = document.getElementById('token-input').value.trim();
    const loginBtn = e.target.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('login-error');
    
    if (!token) {
        errorDiv.textContent = '⚠️ أدخل التوكن';
        errorDiv.style.display = 'block';
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'جاري التحقق...';
    errorDiv.style.display = 'none';

    try {
        const result = await GitHubAPI.loginWithToken(token);
        
        if (result.success) {
            showAdminPanel();
            showToast('✅ تم تسجيل الدخول بنجاح', 'success');
        } else {
            errorDiv.textContent = '⚠️ ' + result.error;
            errorDiv.style.display = 'block';
            loginBtn.disabled = false;
            loginBtn.textContent = 'دخول';
        }
    } catch (error) {
        errorDiv.textContent = '⚠️ حدث خطأ في الاتصال';
        errorDiv.style.display = 'block';
        loginBtn.disabled = false;
        loginBtn.textContent = 'دخول';
    }
}

function logoutAdmin() {
    if (!confirm('هل تريد تسجيل الخروج؟')) return;
    GitHubAPI.logout();
    window.location.href = 'index.html';
}

// ---------- 3. الشريط الجانبي ----------
function setupSidebarEvents() {
    document.querySelectorAll('.admin-sidebar ul li[data-section]').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.admin-sidebar ul li').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            loadSection(item.dataset.section);
            // إغلاق الشريط الجانبي على الموبايل
            document.getElementById('sidebar')?.classList.remove('open');
        });
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', logoutAdmin);
}

function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('open');
}

// ---------- 4. تحميل الأقسام ----------
async function loadSection(section) {
    const panel = document.getElementById('content-panel');
    if (!panel) return;
    adminCurrentSection = section;
    panel.innerHTML = '<div class="loading-spinner">⏳ جاري تحميل القسم...</div>';

    try {
        switch (section) {
            case 'posts': await loadPostsSection(panel); break;
            case 'categories': await loadCategoriesSection(panel); break;
            case 'authors': await loadAuthorsSection(panel); break;
            case 'settings': await loadSettingsSection(panel); break;
            case 'staticpages': await loadStaticPagesSection(panel); break;
            default: panel.innerHTML = '<p>القسم غير معروف</p>';
        }
    } catch (error) {
        console.error(`خطأ في تحميل قسم ${section}:`, error);
        panel.innerHTML = '<p class="error-message">⚠️ حدث خطأ أثناء تحميل القسم</p>';
    }
}

// ---------- 5. إدارة المنشورات ----------
async function loadPostsSection(panel) {
    panel.innerHTML = `
        <h2>📝 المنشورات</h2>
        <button class="btn btn-primary" onclick="showAddForm()">➕ إضافة منشور جديد</button>
        <div id="posts-list" class="card" style="margin-top:20px">
            <div class="card-header">المنشورات الحالية</div>
            <div id="posts-container">⏳ جاري التحميل...</div>
        </div>`;
    await renderPosts();
}

async function renderPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;
    
    try {
        const posts = await GitHubAPI.getPostsList();
        if (!posts || posts.length === 0) {
            container.innerHTML = '<p style="padding:20px;text-align:center;color:#666;">لا توجد منشورات. ابدأ بإضافة أول منشور!</p>';
            return;
        }
        
        container.innerHTML = posts.map(p => `
            <div class="list-item">
                <div class="item-info">
                    <div class="item-title">${p.title}</div>
                    <div class="item-meta">
                        ${p.author || 'مجهول'} · 
                        ${timeAgo(p.date)} · 
                        ${p.categoryName || 'بدون تصنيف'}
                        ${p.views ? ` · 👁️ ${p.views}` : ''}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-sm btn-outline" onclick="editPost('${p.id}')">✏️ تعديل</button>
                    <button class="btn btn-sm btn-danger" onclick="deletePost('${p.id}')">🗑️ حذف</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<p class="error-message">⚠️ خطأ في تحميل المنشورات</p>';
    }
}

async function showAddForm(postData = null) {
    postContentItems = postData ? (postData.content || []) : [];
    
    // جلب التصنيفات
    let categories = [];
    try {
        categories = await GitHubAPI.getCategories() || [];
    } catch (e) {
        categories = [];
    }
    
    let catOpts = '<option value="">-- اختر التصنيف --</option>';
    categories.forEach(cat => {
        catOpts += `<option value="${cat.id}" ${postData?.category === cat.id ? 'selected' : ''}>${cat.icon || '📁'} ${cat.name}</option>`;
    });
    
    // جلب الكتّاب
    let authors = [];
    try {
        authors = await GitHubAPI.getAuthors() || [];
    } catch (e) {
        authors = [];
    }
    
    let authOpts = '<option value="">-- اختر الكاتب (اختياري) --</option>';
    authors.forEach(a => {
        authOpts += `<option value="${a.id}" ${postData?.authorId === a.id ? 'selected' : ''}>${a.name}</option>`;
    });

    const modalHTML = `
    <div id="addModal" class="modal-overlay">
        <div class="modal-content">
            <button class="modal-close" onclick="closeAdd()">✕</button>
            <h2 style="color:#c48b4c;margin-bottom:20px;">${editingPostId ? '✏️ تعديل منشور' : '➕ إضافة منشور'}</h2>
            
            <div class="form-group">
                <label>عنوان المنشور</label>
                <input type="text" id="p-title" class="form-control" value="${postData?.title || ''}" placeholder="أدخل عنوان جذاب">
            </div>
            
            <div class="form-group">
                <label>التصنيف</label>
                <select id="p-cat" class="form-control" onchange="onCatCh()">${catOpts}</select>
            </div>
            
            <div class="form-group" id="subGroup" style="display:none">
                <label>الفرع</label>
                <select id="p-sub" class="form-control">
                    <option value="">الكل</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>الكاتب</label>
                <select id="p-author" class="form-control">${authOpts}</select>
            </div>
            
            <div class="admin-tabs" id="ctabs">
                <button class="admin-tab active" data-type="subtitle">عنوان فرعي</button>
                <button class="admin-tab" data-type="markdown">نص Markdown</button>
                <button class="admin-tab" data-type="images">صور</button>
                <button class="admin-tab" data-type="code">كود</button>
                <button class="admin-tab" data-type="link">رابط</button>
                <button class="admin-tab" data-type="quote">اقتباس</button>
                <button class="admin-tab" data-type="summary">ملخص</button>
            </div>
            
            <div id="inputArea" class="content-input-area"></div>
            <button class="btn btn-primary" id="addItemBtn" style="margin-top:10px;">➕ أضف للمحتوى</button>
            
            <div class="added-items-list" style="margin-top:20px;border-top:1px solid #eee;padding-top:15px;">
                <h4 style="margin-bottom:10px;">عناصر المحتوى:</h4>
                <div id="addedItems"></div>
            </div>
            
            <div style="margin-top:25px;display:flex;gap:10px;justify-content:flex-end;border-top:1px solid #eee;padding-top:15px;">
                <button class="btn btn-primary" onclick="savePost()">${editingPostId ? '💾 تحديث' : '💾 نشر'}</button>
                <button class="btn btn-outline" onclick="closeAdd()">إلغاء</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    if (postData?.subcategory) {
        setTimeout(() => {
            onCatCh().then(() => {
                document.getElementById('p-sub').value = postData.subcategory;
            });
        }, 100);
    }

    renderAddedItems();
    switchType('subtitle');

    document.querySelectorAll('#ctabs .admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#ctabs .admin-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            switchType(tab.dataset.type);
        });
    });

    document.getElementById('addItemBtn').addEventListener('click', () => {
        const act = document.querySelector('#ctabs .admin-tab.active');
        if (act) addItem(act.dataset.type);
    });
}

function closeAdd() {
    const m = document.getElementById('addModal');
    if (m) m.remove();
    editingPostId = null;
    postContentItems = [];
}

async function onCatCh() {
    const id = document.getElementById('p-cat').value;
    const g = document.getElementById('subGroup');
    const s = document.getElementById('p-sub');
    
    if (!id) {
        g.style.display = 'none';
        return;
    }
    
    const categories = await GitHubAPI.getCategories() || [];
    const cat = categories.find(c => c.id === id);
    
    if (!cat || !cat.subcategories || cat.subcategories.length === 0) {
        g.style.display = 'none';
        return;
    }
    
    s.innerHTML = '<option value="">الكل</option>';
    cat.subcategories.forEach(sub => {
        s.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
    });
    g.style.display = 'block';
}

function switchType(t) {
    const a = document.getElementById('inputArea');
    switch (t) {
        case 'subtitle':
            a.innerHTML = '<input type="text" id="inp" class="form-control" placeholder="عنوان فرعي">';
            break;
        case 'images':
            a.innerHTML = `
                <input type="file" id="imgFiles" class="form-control" multiple accept="image/*" style="display:none" onchange="imgSel(event)">
                <button class="btn btn-outline" onclick="document.getElementById('imgFiles').click()">📷 اختر صوراً</button>
                <small style="color:#666;display:block;margin-top:5px;">الحد الأقصى: 5MB لكل صورة</small>
                <div id="imgPrev" class="file-preview" style="margin-top:10px;"></div>`;
            break;
        case 'code':
            a.innerHTML = `
                <select id="codeLang" class="form-control">
                    <option value="html">HTML</option>
                    <option value="python">Python</option>
                    <option value="php">PHP</option>
                    <option value="javascript">JavaScript</option>
                    <option value="css">CSS</option>
                </select>
                <textarea id="codeVal" class="form-control" style="margin-top:10px;min-height:150px;font-family:monospace;direction:ltr;text-align:left;" placeholder="الكود..."></textarea>`;
            break;
        case 'link':
            a.innerHTML = `
                <input type="text" id="linkUrl" class="form-control" placeholder="الرابط (https://...)">
                <input type="text" id="linkTxt" class="form-control" placeholder="نص الرابط" style="margin-top:10px;">`;
            break;
        case 'markdown':
            a.innerHTML = '<textarea id="mdVal" class="form-control" style="min-height:200px;font-family:monospace;" placeholder="اكتب نص Markdown..."></textarea>';
            break;
        case 'quote':
            a.innerHTML = `
                <textarea id="quoteText" class="form-control" placeholder="نص الاقتباس"></textarea>
                <input type="text" id="quoteAuth" class="form-control" placeholder="صاحب الاقتباس (اختياري)" style="margin-top:10px;">`;
            break;
        case 'summary':
            a.innerHTML = '<textarea id="summaryText" class="form-control" placeholder="ملخص المقال..."></textarea>';
            break;
    }
}

function imgSel(e) {
    const prev = document.getElementById('imgPrev');
    prev.innerHTML = '';
    Array.from(e.target.files).forEach(f => {
        if (f.size > 5 * 1024 * 1024) {
            showToast(`⚠️ الصورة ${f.name} أكبر من 5MB`, 'error');
            return;
        }
        const r = new FileReader();
        r.onload = ev => {
            prev.innerHTML += `<img src="${ev.target.result}" style="width:80px;height:80px;object-fit:cover;margin:4px;border-radius:8px;">`;
        };
        r.readAsDataURL(f);
    });
}

function addItem(type) {
    let item = { type };
    
    switch (type) {
        case 'subtitle':
            const sv = document.getElementById('inp')?.value.trim();
            if (!sv) return showToast('أدخل عنواناً', 'error');
            item.value = sv;
            break;
        case 'images':
            const files = document.getElementById('imgFiles')?.files;
            if (!files || files.length === 0) return showToast('اختر صوراً', 'error');
            const proms = Array.from(files).map(f => new Promise(res => {
                const r = new FileReader();
                r.onload = e => res({ dataUrl: e.target.result, name: f.name });
                r.readAsDataURL(f);
            }));
            Promise.all(proms).then(imgs => {
                item.images = imgs;
                postContentItems.push(item);
                renderAddedItems();
                document.getElementById('imgFiles').value = '';
                document.getElementById('imgPrev').innerHTML = '';
            });
            return;
        case 'code':
            const lang = document.getElementById('codeLang')?.value;
            const cv = document.getElementById('codeVal')?.value.trim();
            if (!cv) return showToast('أدخل كوداً', 'error');
            item.language = lang;
            item.value = cv;
            break;
        case 'link':
            const url = document.getElementById('linkUrl')?.value.trim();
            if (!url) return showToast('أدخل رابطاً', 'error');
            item.url = url;
            item.text = document.getElementById('linkTxt')?.value.trim() || url;
            break;
        case 'markdown':
            const mv = document.getElementById('mdVal')?.value.trim();
            if (!mv) return showToast('أدخل نصاً', 'error');
            item.value = mv;
            break;
        case 'quote':
            const qv = document.getElementById('quoteText')?.value.trim();
            if (!qv) return showToast('أدخل الاقتباس', 'error');
            item.value = qv;
            item.author = document.getElementById('quoteAuth')?.value.trim() || '';
            break;
        case 'summary':
            const smv = document.getElementById('summaryText')?.value.trim();
            if (!smv) return showToast('أدخل الملخص', 'error');
            item.value = smv;
            break;
    }
    
    postContentItems.push(item);
    renderAddedItems();
    switchType(type);
    showToast('✅ تمت الإضافة', 'success');
}

function renderAddedItems() {
    const c = document.getElementById('addedItems');
    if (!c) return;
    
    if (postContentItems.length === 0) {
        c.innerHTML = '<p style="color:#999;text-align:center;padding:15px;">لم تضف أي عنصر بعد</p>';
        return;
    }
    
    c.innerHTML = postContentItems.map((it, i) => {
        let d = '';
        switch (it.type) {
            case 'subtitle': d = '📌 عنوان فرعي: ' + it.value; break;
            case 'images': d = '🖼️ ' + (it.images?.length || 0) + ' صورة'; break;
            case 'code': d = '💻 كود ' + it.language; break;
            case 'link': d = '🔗 رابط: ' + it.text; break;
            case 'markdown': d = '📝 نص Markdown'; break;
            case 'quote': d = '💬 اقتباس'; break;
            case 'summary': d = '📋 ملخص'; break;
        }
        return `
            <div class="content-item">
                <div class="content-item-info">${d}</div>
                <button class="btn btn-sm btn-danger" onclick="remItem(${i})">🗑️</button>
            </div>`;
    }).join('');
}

function remItem(i) {
    postContentItems.splice(i, 1);
    renderAddedItems();
}

async function savePost() {
    const title = document.getElementById('p-title')?.value.trim();
    if (!title) return showToast('أدخل العنوان', 'error');
    
    const catId = document.getElementById('p-cat')?.value;
    if (!catId) return showToast('اختر التصنيف', 'error');
    
    const subId = (document.getElementById('subGroup')?.style.display !== 'none') 
        ? (document.getElementById('p-sub')?.value || null) 
        : null;
    
    if (postContentItems.length === 0) return showToast('أضف عنصراً واحداً على الأقل', 'error');

    // جلب أسماء التصنيف والكاتب
    let catName = '', subName = '';
    const categories = await GitHubAPI.getCategories() || [];
    const cat = categories.find(c => c.id === catId);
    if (cat) {
        catName = cat.name;
        if (subId) {
            const s = (cat.subcategories || []).find(x => x.id === subId);
            if (s) subName = s.name;
        }
    }

    let authorName = 'مجهول', authorId = null;
    const authSel = document.getElementById('p-author');
    if (authSel?.value) {
        authorId = authSel.value;
        const authors = await GitHubAPI.getAuthors() || [];
        const author = authors.find(a => a.id === authorId);
        if (author) authorName = author.name;
    }

    const postData = {
        title,
        content: postContentItems,
        author: authorName,
        authorId,
        category: catId,
        subcategory: subId,
        categoryName: catName,
        subcategoryName: subName,
        date: new Date().toISOString()
    };

    try {
        showToast('⏳ جاري الحفظ...', 'info');
        
        if (editingPostId) {
            postData.id = editingPostId;
            postData.date = editingPostDate || new Date().toISOString();
            postData.views = editingPostViews || 0;
            postData.likes = editingPostLikes || 0;
            await GitHubAPI.updatePost(editingPostId, postData);
            showToast('✅ تم تحديث المنشور', 'success');
        } else {
            postData.views = 0;
            postData.likes = 0;
            await GitHubAPI.createPost(postData);
            showToast('✅ تم نشر المنشور', 'success');
        }

        closeAdd();
        await renderPosts();
    } catch (error) {
        console.error('خطأ في حفظ المنشور:', error);
        showToast('⚠️ حدث خطأ في الحفظ', 'error');
    }
}

async function editPost(postId) {
    try {
        const post = await GitHubAPI.getPost(postId);
        if (!post) return showToast('المنشور غير موجود', 'error');
        
        editingPostId = postId;
        editingPostDate = post.date;
        editingPostViews = post.views;
        editingPostLikes = post.likes;
        
        await showAddForm(post);
    } catch (error) {
        showToast('⚠️ خطأ في تحميل المنشور', 'error');
    }
}

async function deletePost(postId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنشور؟')) return;
    
    try {
        await GitHubAPI.deletePost(postId);
        showToast('✅ تم حذف المنشور', 'success');
        await renderPosts();
    } catch (error) {
        showToast('⚠️ خطأ في الحذف', 'error');
    }
}

// ---------- 6. إدارة التصنيفات ----------
async function loadCategoriesSection(panel) {
    panel.innerHTML = `
        <h2>📂 التصنيفات</h2>
        <div class="card">
            <div class="card-header">إضافة تصنيف جديد</div>
            <div class="form-group">
                <label>اسم التصنيف</label>
                <input type="text" id="c-name" class="form-control" placeholder="مثال: الهواتف الذكية">
            </div>
            <div class="form-group">
                <label>الأيقونة (إيموجي)</label>
                <input type="text" id="c-icon" class="form-control" placeholder="📱" maxlength="4">
            </div>
            <button class="btn btn-primary" onclick="addCat()">➕ إضافة</button>
        </div>
        <div id="cat-list" class="card">
            <div class="card-header">التصنيفات الحالية</div>
            <div id="cat-container">⏳</div>
        </div>`;
    await renderCats();
}

async function addCat() {
    const n = document.getElementById('c-name').value.trim();
    const ic = document.getElementById('c-icon').value.trim();
    if (!n) return showToast('أدخل اسماً', 'error');
    
    try {
        const categories = await GitHubAPI.getCategories() || [];
        const newCat = {
            id: 'cat-' + Date.now().toString(36),
            name: n,
            icon: ic || '📁',
            order: categories.length,
            subcategories: []
        };
        categories.push(newCat);
        await GitHubAPI.updateCategories(categories);
        
        document.getElementById('c-name').value = '';
        document.getElementById('c-icon').value = '';
        await renderCats();
        showToast('✅ تمت الإضافة', 'success');
    } catch (error) {
        showToast('⚠️ خطأ في الإضافة', 'error');
    }
}

async function deleteCat(id) {
    if (!confirm('حذف التصنيف وجميع فروعه؟')) return;
    
    try {
        let categories = await GitHubAPI.getCategories() || [];
        categories = categories.filter(c => c.id !== id);
        await GitHubAPI.updateCategories(categories);
        await renderCats();
        showToast('✅ تم الحذف', 'success');
    } catch (error) {
        showToast('⚠️ خطأ في الحذف', 'error');
    }
}

async function addSub(catId) {
    const n = prompt('اسم الفرع:');
    if (!n) return;
    
    try {
        let categories = await GitHubAPI.getCategories() || [];
        const cat = categories.find(c => c.id === catId);
        if (!cat) return;
        
        if (!cat.subcategories) cat.subcategories = [];
        cat.subcategories.push({
            id: 'sub-' + Date.now().toString(36),
            name: n
        });
        
        await GitHubAPI.updateCategories(categories);
        await renderCats();
        showToast('✅ تمت الإضافة', 'success');
    } catch (error) {
        showToast('⚠️ خطأ في الإضافة', 'error');
    }
}

async function delSub(catId, subId) {
    if (!confirm('حذف الفرع؟')) return;
    
    try {
        let categories = await GitHubAPI.getCategories() || [];
        const cat = categories.find(c => c.id === catId);
        if (!cat) return;
        
        cat.subcategories = (cat.subcategories || []).filter(s => s.id !== subId);
        await GitHubAPI.updateCategories(categories);
        await renderCats();
        showToast('✅ تم الحذف', 'success');
    } catch (error) {
        showToast('⚠️ خطأ في الحذف', 'error');
    }
}

async function renderCats() {
    const c = document.getElementById('cat-container');
    if (!c) return;
    
    try {
        const categories = await GitHubAPI.getCategories() || [];
        
        if (categories.length === 0) {
            c.innerHTML = '<p style="padding:20px;text-align:center;color:#666;">لا توجد تصنيفات</p>';
            return;
        }
        
        let html = '';
        categories.sort((a, b) => (a.order || 0) - (b.order || 0)).forEach(cat => {
            html += `
                <div class="list-item">
                    <div class="item-info">
                        <div class="item-title">${cat.icon || '📁'} ${cat.name}</div>
                        <div class="item-meta">فروع: ${(cat.subcategories || []).map(s => s.name).join('، ') || 'لا يوجد'}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-sm btn-outline" onclick="addSub('${cat.id}')">➕ فرع</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteCat('${cat.id}')">🗑️</button>
                    </div>
                </div>`;
            
            (cat.subcategories || []).forEach(sub => {
                html += `
                    <div class="list-item" style="padding-right:40px;background:#f9f9f9;">
                        <span>↳ ${sub.name}</span>
                        <button class="btn btn-sm btn-danger" onclick="delSub('${cat.id}','${sub.id}')">🗑️</button>
                    </div>`;
            });
        });
        
        c.innerHTML = html;
    } catch (error) {
        c.innerHTML = '<p class="error-message">⚠️ خطأ في التحميل</p>';
    }
}

// ---------- 7. إدارة الكتّاب ----------
async function loadAuthorsSection(panel) {
    panel.innerHTML = `
        <h2>✍️ الكتّاب</h2>
        <div class="card">
            <div class="card-header">إضافة كاتب جديد</div>
            <div class="form-group">
                <label>اسم الكاتب</label>
                <input type="text" id="a-name" class="form-control">
            </div>
            <div class="form-group">
                <label>صورة الكاتب</label>
                <input type="file" id="a-img-file" accept="image/*" style="display:none" onchange="handleAuthorImageSelect(event)">
                <button class="btn btn-outline btn-sm" onclick="document.getElementById('a-img-file').click()">📷 اختر صورة</button>
                <button class="btn btn-outline btn-sm" onclick="clearAuthorImage()">🗑️ إزالة</button>
                <div id="a-img-preview" style="margin-top:10px;"></div>
            </div>
            <div class="form-group">
                <label>نبذة</label>
                <textarea id="a-bio" class="form-control" rows="3"></textarea>
            </div>
            <button class="btn btn-primary" onclick="addAuthor()">➕ إضافة</button>
        </div>
        <div id="auth-list" class="card">
            <div class="card-header">الكتّاب الحاليون</div>
            <div id="auth-container">⏳</div>
        </div>`;
    await renderAuthors();
}

function handleAuthorImageSelect(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
        showToast('⚠️ الصورة أكبر من 2MB', 'error');
        return;
    }
    const r = new FileReader();
    r.onload = ev => {
        document.getElementById('a-img-preview').innerHTML = `<img src="${ev.target.result}" style="max-width:150px;max-height:150px;border-radius:12px;object-fit:cover;">`;
        window._authorImageData = ev.target.result;
    };
    r.readAsDataURL(f);
}

function clearAuthorImage() {
    document.getElementById('a-img-file').value = '';
    document.getElementById('a-img-preview').innerHTML = '';
    window._authorImageData = null;
}

async function addAuthor() {
    const n = document.getElementById('a-name').value.trim();
    if (!n) return showToast('أدخل اسماً', 'error');
    
    try {
        let authors = await GitHubAPI.getAuthors() || [];
        authors.push({
            id: 'auth-' + Date.now().toString(36),
            name: n,
            image: window._authorImageData || '',
            bio: document.getElementById('a-bio').value.trim(),
            createdAt: new Date().toISOString()
        });
        
        await GitHubAPI.updateAuthors(authors);
        document.getElementById('a-name').value = '';
        document.getElementById('a-bio').value = '';
        clearAuthorImage();
        await renderAuthors();
        showToast('✅ تمت الإضافة', 'success');
    } catch (error) {
        showToast('⚠️ خطأ في الإضافة', 'error');
    }
}

async function deleteAuthor(id) {
    if (!confirm('حذف الكاتب؟')) return;
    
    try {
        let authors = await GitHubAPI.getAuthors() || [];
        authors = authors.filter(a => a.id !== id);
        await GitHubAPI.updateAuthors(authors);
        await renderAuthors();
        showToast('✅ تم الحذف', 'success');
    } catch (error) {
        showToast('⚠️ خطأ في الحذف', 'error');
    }
}

async function renderAuthors() {
    const c = document.getElementById('auth-container');
    if (!c) return;
    
    try {
        const authors = await GitHubAPI.getAuthors() || [];
        
        if (authors.length === 0) {
            c.innerHTML = '<p style="padding:20px;text-align:center;color:#666;">لا يوجد كتّاب</p>';
            return;
        }
        
        c.innerHTML = authors.map(a => {
            const imgHTML = a.image 
                ? `<img src="${a.image}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;margin-left:10px;">` 
                : '';
            return `
                <div class="list-item">
                    <div class="item-info" style="display:flex;align-items:center;">
                        ${imgHTML}
                        <div>
                            <div class="item-title">✍️ ${a.name}</div>
                            <div class="item-meta">${a.bio?.substring(0, 50) || 'لا نبذة'}...</div>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="deleteAuthor('${a.id}')">🗑️</button>
                </div>`;
        }).join('');
    } catch (error) {
        c.innerHTML = '<p class="error-message">⚠️ خطأ في التحميل</p>';
    }
}

// ---------- 8. إدارة الإعدادات ----------
async function loadSettingsSection(panel) {
    const settings = await getAllSettingsCached();
    const fontsOptions = AVAILABLE_FONTS.map(f => 
        `<option value="${f.name}" ${settings.titleFont === f.name ? 'selected' : ''}>${f.name} (${f.type})</option>`
    ).join('');
    const bodyFontsOptions = AVAILABLE_FONTS.map(f => 
        `<option value="${f.name}" ${settings.bodyFont === f.name ? 'selected' : ''}>${f.name} (${f.type})</option>`
    ).join('');

    panel.innerHTML = `
        <h2>⚙️ الإعدادات</h2>
        <div class="card">
            <div class="card-header">إعدادات الموقع</div>
            <div class="form-group">
                <label>اسم الموقع</label>
                <input type="text" id="s-name" class="form-control" value="${settings.siteName || 'ALSHANFRICC'}">
            </div>
            <div class="form-group">
                <label>الوصف</label>
                <input type="text" id="s-subtitle" class="form-control" value="${settings.subtitle || ''}">
            </div>
            <div class="form-group">
                <label>اللون الأساسي</label>
                <input type="color" id="s-color" class="form-control" value="${settings.primaryColor || '#c48b4c'}">
            </div>
            <div class="form-group">
                <label>خط العناوين</label>
                <select id="s-titlefont" class="form-control">${fontsOptions}</select>
            </div>
            <div class="form-group">
                <label>خط النصوص</label>
                <select id="s-bodyfont" class="form-control">${bodyFontsOptions}</select>
            </div>
            <div class="form-group">
                <label>نص الفوتر</label>
                <input type="text" id="s-footertext" class="form-control" value="${settings.footerText || 'جميع الحقوق محفوظة'}">
            </div>
            <div class="form-group">
                <label>رابط فيسبوك</label>
                <input type="url" id="s-fb" class="form-control" value="${settings.facebookUrl || '#'}">
            </div>
            <div class="form-group">
                <label>رابط تويتر</label>
                <input type="url" id="s-tw" class="form-control" value="${settings.twitterUrl || '#'}">
            </div>
            <div class="form-group">
                <label>رابط انستغرام</label>
                <input type="url" id="s-ig" class="form-control" value="${settings.instagramUrl || '#'}">
            </div>
            <button class="btn btn-primary" onclick="saveSettings()">💾 حفظ</button>
        </div>`;
}

async function saveSettings() {
    try {
        const settings = {
            siteName: document.getElementById('s-name').value,
            subtitle: document.getElementById('s-subtitle').value,
            primaryColor: document.getElementById('s-color').value,
            titleFont: document.getElementById('s-titlefont').value,
            bodyFont: document.getElementById('s-bodyfont').value,
            footerText: document.getElementById('s-footertext').value,
            facebookUrl: document.getElementById('s-fb').value,
            twitterUrl: document.getElementById('s-tw').value,
            instagramUrl: document.getElementById('s-ig').value
        };
        
        await GitHubAPI.updateSettings(settings);
        showToast('✅ تم حفظ الإعدادات', 'success');
    } catch (error) {
        showToast('⚠️ خطأ في الحفظ', 'error');
    }
}

// ---------- 9. إدارة الصفحات الثابتة ----------
async function loadStaticPagesSection(panel) {
    panel.innerHTML = `
        <h2>📄 الصفحات الثابتة</h2>
        <div class="card" id="sp-form-card">
            <div class="card-header">إضافة صفحة ثابتة</div>
            <div class="form-group">
                <label>اسم الصفحة</label>
                <input type="text" id="sp-name" class="form-control" placeholder="مثال: من نحن">
            </div>
            <div class="form-group">
                <label>المحتوى (HTML)</label>
                <textarea id="sp-content" class="form-control" rows="5" placeholder="<p>محتوى الصفحة...</p>"></textarea>
            </div>
            <div class="form-group">
                <label>رابط خارجي (اختياري)</label>
                <input type="text" id="sp-link" class="form-control" placeholder="https://example.com">
            </div>
            <button class="btn btn-primary" onclick="addStaticPage()">➕ إضافة</button>
        </div>
        <div class="card">
            <div class="card-header">الصفحات الحالية</div>
            <div id="sp-container">⏳</div>
        </div>`;
    await renderStaticPages();
}

async function addStaticPage() {
    const name = document.getElementById('sp-name').value.trim();
    const content = document.getElementById('sp-content').value.trim();
    const link = document.getElementById('sp-link')?.value.trim() || '';
    
    if (!name) return showToast('أدخل الاسم', 'error');
    if (!content && !link) return showToast('أدخل محتوى أو رابط', 'error');
    
    try {
        let pages = await GitHubAPI.getStaticPages() || [];
        pages.push({
            id: 'page-' + Date.now().toString(36),
            name,
            content,
            link,
            visible: true,
            createdAt: new Date().toISOString()
        });
        
        await GitHubAPI.updateStaticPages(pages);
        document.getElementById('sp-name').value = '';
        document.getElementById('sp-content').value = '';
        if (document.getElementById('sp-link')) document.getElementById('sp-link').value = '';
        await renderStaticPages();
        showToast('✅ تمت الإضافة', 'success');
    } catch (error) {
        showToast('⚠️ خطأ في الإضافة', 'error');
    }
}

async function deleteStaticPage(id) {
    if (!confirm('حذف الصفحة؟')) return;
    
    try {
        let pages = await GitHubAPI.getStaticPages() || [];
        pages = pages.filter(p => p.id !== id);
        await GitHubAPI.updateStaticPages(pages);
        await renderStaticPages();
        showToast('✅ تم الحذف', 'success');
    } catch (error) {
        showToast('⚠️ خطأ في الحذف', 'error');
    }
}

async function renderStaticPages() {
    const c = document.getElementById('sp-container');
    if (!c) return;
    
    try {
        const pages = await GitHubAPI.getStaticPages() || [];
        
        if (pages.length === 0) {
            c.innerHTML = '<p style="padding:20px;text-align:center;color:#666;">لا توجد صفحات</p>';
            return;
        }
        
        c.innerHTML = pages.map(p => `
            <div class="list-item">
                <div class="item-info">
                    <div class="item-title">${p.name}</div>
                    <div class="item-meta">${p.content ? p.content.substring(0, 60) + '...' : '🔗 رابط خارجي'}</div>
                </div>
                <button class="btn btn-sm btn-danger" onclick="deleteStaticPage('${p.id}')">🗑️</button>
            </div>
        `).join('');
    } catch (error) {
        c.innerHTML = '<p class="error-message">⚠️ خطأ في التحميل</p>';
    }
}

// ---------- 10. نظام Toast ----------
function showToast(message, type = 'success', duration = 3000) {
    const existing = document.querySelector('.toast-container');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.className = 'toast-container';
    container.innerHTML = `
        <div class="toast toast-${type}">
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(container);

    setTimeout(() => container.classList.add('show'), 10);

    const timer = setTimeout(() => {
        container.classList.remove('show');
        setTimeout(() => container.remove(), 400);
    }, duration);
}

console.log("✅ admin.js جاهز - بدون Firebase");
