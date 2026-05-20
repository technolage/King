// ============================================================
//  ملف: admin.js (مُدمَج - كامل ومُحدّث)
//  الوظيفة: إدارة لوحة التحكم وعمليات CRUD على جميع المجموعات
//  يشمل: الهيدر (مع خلفية)، البدي، الفوتر، التبويبات،
//         المنشورات (مع اختيار التبويبة والفرع والكاتب وأنواع
//         المحتوى: اقتباس وملخص)، الكتّاب (مع صورة ونبذة)، المفاتيح
//  يعتمد على: firebase-config.js, utils.js
// ============================================================

let adminCurrentSection = 'header';
let isAdminLoggedIn = false;
let postContentItems = [];
let selectedCategoryId = null;
let selectedSubcategoryId = null;

// ---------- 1. التحقق من الجلسة ----------
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('adminSession')) {
        auth.onAuthStateChanged(user => {
            if (user) showAdminPanel(user);
            else showLoginScreen();
        });
    } else {
        showLoginScreen();
    }
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    setupSidebarEvents();
});

// ---------- 2. الجلسة وتسجيل الدخول ----------
function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-screen').style.display = 'none';
    localStorage.removeItem('adminSession');
}
function showAdminPanel(user) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-screen').style.display = 'flex';
    localStorage.setItem('adminSession', 'true');
    isAdminLoggedIn = true;
    console.log(`✅ تم تسجيل الدخول كـ: ${user.email}`);
    loadSection(adminCurrentSection);
}
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const btn = e.target.querySelector('button[type="submit"]');
    if (!email || !password) return alert('يرجى إدخال البريد وكلمة المرور');
    btn.disabled = true; btn.textContent = 'جاري الدخول...';
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
        let msg = 'حدث خطأ';
        switch (err.code) {
            case 'auth/invalid-email': msg = 'بريد غير صحيح'; break;
            case 'auth/user-not-found': msg = 'لا يوجد مستخدم'; break;
            case 'auth/wrong-password': msg = 'كلمة مرور خاطئة'; break;
            case 'auth/too-many-requests': msg = 'محاولات كثيرة، حاول لاحقاً'; break;
        }
        alert('❌ ' + msg);
    } finally {
        btn.disabled = false; btn.textContent = 'دخول';
    }
}
async function logoutAdmin() {
    try { await auth.signOut(); } catch (e) {}
    localStorage.removeItem('adminSession');
    window.location.href = 'index.html';
}

// ---------- 3. الشريط الجانبي ----------
function setupSidebarEvents() {
    document.querySelectorAll('.admin-sidebar ul li').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.admin-sidebar ul li').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            loadSection(item.dataset.section);
        });
    });
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', logoutAdmin);
}

// ---------- 4. تحميل الأقسام ----------
async function loadSection(section) {
    const panel = document.getElementById('content-panel');
    if (!panel) return;
    adminCurrentSection = section;
    panel.innerHTML = '<div class="loading-spinner">⏳ جاري تحميل القسم...</div>';
    try {
        switch (section) {
            case 'header': await loadHeaderSection(panel); break;
            case 'body': await loadBodySection(panel); break;
            case 'footer': await loadFooterSection(panel); break;
            case 'categories': await loadCategoriesSection(panel); break;
            case 'posts': await loadPostsSection(panel); break;
            case 'authors': await loadAuthorsSection(panel); break;
            case 'keys': await loadKeysSection(panel); break;
            default: panel.innerHTML = '<p>القسم غير معروف</p>';
        }
    } catch (err) {
        console.error(err);
        panel.innerHTML = '<p class="error-message">⚠️ خطأ في التحميل</p>';
    }
}

// ---------- 5. قسم الهيدر ----------
async function loadHeaderSection(panel) {
    const s = await getAllSettingsCached();
    panel.innerHTML = `
        <h2>إدارة الهيدر</h2>
        <div class="card">
            <div class="form-group"><label>اسم الموقع</label><input type="text" id="h-name" class="form-control" value="${s.siteName||'ALSHANFRICC'}"></div>
            <div class="form-group"><label>خط العنوان</label><select id="h-titlefont" class="form-control">${AVAILABLE_FONTS.map(f=>`<option value="${f.name}" ${s.titleFont===f.name?'selected':''}>${f.name} (${f.type})</option>`).join('')}</select></div>
            <div class="form-group"><label>خط النص</label><select id="h-bodyfont" class="form-control">${AVAILABLE_FONTS.map(f=>`<option value="${f.name}" ${s.bodyFont===f.name?'selected':''}>${f.name} (${f.type})</option>`).join('')}</select></div>
            <div class="form-group"><label>اللون الأساسي</label><input type="color" id="h-color" class="form-control" value="${s.primaryColor||'#c48b4c'}"></div>
            <div class="form-group"><label>خلفية الهيدر (رابط)</label><input type="text" id="h-bg" class="form-control" placeholder="رابط صورة" value="${s.headerBgImage||''}">
                <input type="file" id="h-bg-upload" accept="image/*" style="display:none" onchange="handleHeaderBgUpload(event)">
                <button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="document.getElementById('h-bg-upload').click()">📷 رفع</button>
                <button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="document.getElementById('h-bg').value='';document.getElementById('h-bg-preview').innerHTML=''">🗑️ إزالة</button>
                <div id="h-bg-preview" style="margin-top:10px">${s.headerBgImage?`<img src="${s.headerBgImage}" style="max-width:200px;border-radius:8px">`:''}</div>
            </div>
            <div class="form-group"><label><input type="checkbox" id="h-dark" ${s.darkMode?'checked':''}> الوضع الليلي افتراضي</label></div>
            <button class="btn btn-primary" onclick="saveHeader()">💾 حفظ</button>
        </div>`;
}
function handleHeaderBgUpload(e) {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
        document.getElementById('h-bg').value = ev.target.result;
        document.getElementById('h-bg-preview').innerHTML = `<img src="${ev.target.result}" style="max-width:200px;border-radius:8px">`;
    };
    r.readAsDataURL(f);
}
async function saveHeader() {
    await updateSetting('siteName', document.getElementById('h-name').value);
    await updateSetting('titleFont', document.getElementById('h-titlefont').value);
    await updateSetting('bodyFont', document.getElementById('h-bodyfont').value);
    await updateSetting('primaryColor', document.getElementById('h-color').value);
    await updateSetting('headerBgImage', document.getElementById('h-bg').value);
    await updateSetting('darkMode', document.getElementById('h-dark').checked);
    alert('✅ تم الحفظ');
}

// ---------- 6. البدي والفوتر ----------
async function loadBodySection(panel) {
    const bg = await getSetting('bodyBackground','#f0f2f5');
    panel.innerHTML = `<h2>إدارة البدي</h2><div class="card"><div class="form-group"><label>لون الخلفية</label><input type="color" id="b-bg" class="form-control" value="${bg}"></div><button class="btn btn-primary" onclick="saveBody()">💾 حفظ</button></div>`;
}
async function saveBody() { await updateSetting('bodyBackground', document.getElementById('b-bg').value); alert('✅ تم الحفظ'); }

async function loadFooterSection(panel) {
    const s = await getAllSettingsCached();
    panel.innerHTML = `<h2>إدارة الفوتر</h2><div class="card">
        <div class="form-group"><label>نص الحقوق</label><input type="text" id="f-text" class="form-control" value="${s.footerText||'جميع الحقوق محفوظة'}"></div>
        <div class="form-group"><label>فيسبوك</label><input type="url" id="f-fb" class="form-control" value="${s.facebookUrl||'#'}"></div>
        <div class="form-group"><label>تويتر</label><input type="url" id="f-tw" class="form-control" value="${s.twitterUrl||'#'}"></div>
        <div class="form-group"><label>انستغرام</label><input type="url" id="f-ig" class="form-control" value="${s.instagramUrl||'#'}"></div>
        <button class="btn btn-primary" onclick="saveFooter()">💾 حفظ</button></div>`;
}
async function saveFooter() {
    await updateSetting('footerText', document.getElementById('f-text').value);
    await updateSetting('facebookUrl', document.getElementById('f-fb').value);
    await updateSetting('twitterUrl', document.getElementById('f-tw').value);
    await updateSetting('instagramUrl', document.getElementById('f-ig').value);
    alert('✅ تم الحفظ');
}

// ---------- 7. التبويبات ----------
async function loadCategoriesSection(panel) {
    panel.innerHTML = `<h2>التبويبات</h2><div class="card"><input type="text" id="c-name" class="form-control" placeholder="اسم"><input type="text" id="c-icon" class="form-control" placeholder="أيقونة"><button class="btn btn-primary" onclick="addCat()">➕ إضافة</button></div><div id="cat-list" class="card"><div id="cat-container">⏳</div></div>`;
    await renderCats();
}
async function addCat() {
    const n = document.getElementById('c-name').value.trim(), ic = document.getElementById('c-icon').value.trim();
    if (!n) return alert('أدخل اسماً');
    const snap = await db.collection('categories').orderBy('order','desc').limit(1).get();
    let o = 0; snap.forEach(d => o = d.data().order||0);
    await db.collection('categories').add({ name:n, icon:ic||'📌', order:o+1, subcategories:[] });
    document.getElementById('c-name').value = ''; document.getElementById('c-icon').value = '';
    await renderCats();
}
async function deleteCat(id) { if (confirm('حذف؟')) { await db.collection('categories').doc(id).delete(); await renderCats(); } }
async function addSub(catId) {
    const n = prompt('اسم الفرع:'); if (!n) return;
    const ref = db.collection('categories').doc(catId); const d = await ref.get();
    if (d.exists) {
        const subs = d.data().subcategories || [];
        subs.push({ id: generateId(), name: n });
        await ref.update({ subcategories: subs }); await renderCats();
    }
}
async function delSub(catId, subId) {
    if (!confirm('حذف الفرع؟')) return;
    const ref = db.collection('categories').doc(catId); const d = await ref.get();
    if (d.exists) {
        const subs = (d.data().subcategories||[]).filter(s => s.id !== subId);
        await ref.update({ subcategories: subs }); await renderCats();
    }
}
async function renderCats() {
    const c = document.getElementById('cat-container'); if (!c) return;
    const snap = await db.collection('categories').orderBy('order').get();
    if (snap.empty) { c.innerHTML = '<p>لا توجد تبويبات</p>'; return; }
    let h = '';
    snap.forEach(doc => {
        const cat = doc.data();
        h += `<div class="list-item"><div class="item-info"><span class="item-title">${cat.icon} ${cat.name}</span><div class="item-meta">فروع: ${(cat.subcategories||[]).map(s=>s.name).join('، ')||'لا يوجد'}</div></div><div class="item-actions"><button class="btn btn-sm btn-outline" onclick="addSub('${doc.id}')">➕ فرع</button><button class="btn btn-sm btn-danger" onclick="deleteCat('${doc.id}')">🗑️</button></div></div>`;
        (cat.subcategories||[]).forEach(sub => {
            h += `<div class="list-item" style="padding-right:40px;background:#f9f9f9"><span>↳ ${sub.name}</span><button class="btn btn-sm btn-danger" onclick="delSub('${doc.id}','${sub.id}')">🗑️</button></div>`;
        });
    });
    c.innerHTML = h;
}

// ---------- 8. المنشورات (مع النافذة الكاملة) ----------
async function loadPostsSection(panel) {
    panel.innerHTML = `<h2>المنشورات</h2><button class="btn btn-primary" onclick="showAddForm()">➕ إضافة</button><div id="posts-list" class="card" style="margin-top:20px"><h3>المنشورات الحالية</h3><div id="posts-container">⏳</div></div>`;
    await renderPosts();
}
async function showAddForm() {
    postContentItems = [];
    const catsSnap = await db.collection('categories').orderBy('order').get();
    let catOpts = '<option value="">-- اختر التبويبة --</option>';
    catsSnap.forEach(d => catOpts += `<option value="${d.id}">${d.data().icon||'📌'} ${d.data().name}</option>`);
    const authSnap = await db.collection('authors').orderBy('name').get();
    let authOpts = '<option value="">-- اختر الكاتب (اختياري) --</option>';
    authSnap.forEach(d => authOpts += `<option value="${d.id}">${d.data().name}</option>`);

    document.body.insertAdjacentHTML('beforeend', `
    <div id="addModal" class="modal-overlay"><div class="modal-content">
        <button class="modal-close" onclick="closeAdd()">✕</button><h3>إضافة منشور</h3>
        <div class="form-group"><label>العنوان</label><input type="text" id="p-title" class="form-control"></div>
        <div class="form-group"><label>التبويبة</label><select id="p-cat" class="form-control" onchange="onCatCh()">${catOpts}</select></div>
        <div class="form-group" id="subGroup" style="display:none"><label>الفرع</label><select id="p-sub" class="form-control"><option value="">الكل</option></select></div>
        <div class="form-group"><label>الكاتب</label><select id="p-author" class="form-control">${authOpts}</select></div>
        <div class="admin-tabs" id="ctabs">
            <button class="admin-tab active" data-type="subtitle">عنوان فرعي</button>
            <button class="admin-tab" data-type="images">صور</button>
            <button class="admin-tab" data-type="code">كود</button>
            <button class="admin-tab" data-type="link">رابط</button>
            <button class="admin-tab" data-type="markdown">Markdown</button>
            <button class="admin-tab" data-type="html">HTML</button>
            <button class="admin-tab" data-type="quote">💬 اقتباس</button>
            <button class="admin-tab" data-type="summary">📋 ملخص</button>
        </div>
        <div id="inputArea" class="content-input-area"></div>
        <button class="btn btn-primary" id="addItemBtn">➕ أضف للمحتوى</button>
        <div class="added-items-list"><h4>العناصر:</h4><div id="addedItems"></div></div>
        <div class="modal-footer"><button class="btn btn-primary" onclick="savePost()">💾 نشر</button><button class="btn btn-outline" onclick="closeAdd()">إلغاء</button></div>
    </div></div>`);
    switchType('subtitle');
    document.querySelectorAll('#ctabs .admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#ctabs .admin-tab').forEach(t=>t.classList.remove('active'));
            tab.classList.add('active'); switchType(tab.dataset.type);
        });
    });
    document.getElementById('addItemBtn').addEventListener('click', () => {
        const act = document.querySelector('#ctabs .admin-tab.active');
        if (act) addItem(act.dataset.type);
    });
}
function closeAdd() { const m = document.getElementById('addModal'); if (m) m.remove(); }
async function onCatCh() {
    const id = document.getElementById('p-cat').value;
    const g = document.getElementById('subGroup'), s = document.getElementById('p-sub');
    if (!id) { g.style.display = 'none'; return; }
    const d = await db.collection('categories').doc(id).get();
    if (!d.exists || !(d.data().subcategories||[]).length) { g.style.display = 'none'; return; }
    s.innerHTML = '<option value="">الكل</option>';
    d.data().subcategories.forEach(sub => s.innerHTML += `<option value="${sub.id}">${sub.name}</option>`);
    g.style.display = 'block';
}
function switchType(t) {
    const a = document.getElementById('inputArea');
    switch (t) {
        case 'subtitle': a.innerHTML = '<input type="text" id="inp" class="form-control" placeholder="عنوان فرعي">'; break;
        case 'images': a.innerHTML = '<input type="file" id="imgFiles" class="form-control" multiple accept="image/*" style="display:none" onchange="imgSel(event)"><button class="btn btn-outline" onclick="document.getElementById(\'imgFiles\').click()">اختر صوراً</button><div id="imgPrev" class="file-preview"></div>'; break;
        case 'code': a.innerHTML = '<select id="codeLang" class="form-control"><option value="html">HTML</option><option value="python">Python</option><option value="php">PHP</option><option value="javascript">JavaScript</option><option value="ruby">Ruby</option><option value="css">CSS</option></select><textarea id="codeVal" class="form-control editor-content" placeholder="الكود..."></textarea>'; break;
        case 'link': a.innerHTML = '<input type="text" id="linkUrl" class="form-control" placeholder="رابط"><input type="text" id="linkTxt" class="form-control" placeholder="نص الرابط">'; break;
        case 'markdown': a.innerHTML = '<textarea id="mdVal" class="form-control editor-content" placeholder="Markdown..."></textarea>'; break;
        case 'html': a.innerHTML = '<textarea id="htmlVal" class="form-control editor-content" placeholder="HTML..."></textarea>'; break;
        case 'quote': a.innerHTML = '<textarea id="quoteText" class="form-control editor-content" placeholder="نص الاقتباس"></textarea><input type="text" id="quoteAuth" class="form-control" placeholder="صاحب الاقتباس (اختياري)" style="margin-top:8px">'; break;
        case 'summary': a.innerHTML = '<textarea id="summaryText" class="form-control editor-content" placeholder="ملخص المقال"></textarea>'; break;
    }
}
function imgSel(e) {
    const prev = document.getElementById('imgPrev'); prev.innerHTML = '';
    Array.from(e.target.files).forEach(f => {
        const r = new FileReader();
        r.onload = ev => prev.innerHTML += `<img src="${ev.target.result}" style="width:80px;height:80px;object-fit:cover;margin:4px">`;
        r.readAsDataURL(f);
    });
}
function addItem(type) {
    let item = { type };
    switch (type) {
        case 'subtitle': const sv = document.getElementById('inp')?.value.trim(); if (!sv) return alert('أدخل عنواناً'); item.value = sv; break;
        case 'images': const files = document.getElementById('imgFiles')?.files; if (!files||!files.length) return alert('اختر صوراً');
            const proms = Array.from(files).map(f => new Promise(res => { const r = new FileReader(); r.onload = e => res({dataUrl:e.target.result,name:f.name}); r.readAsDataURL(f); }));
            Promise.all(proms).then(imgs => { item.images = imgs; postContentItems.push(item); renderAdded(); document.getElementById('imgFiles').value=''; document.getElementById('imgPrev').innerHTML=''; }); return;
        case 'code': const lang = document.getElementById('codeLang')?.value, cv = document.getElementById('codeVal')?.value.trim(); if (!cv) return alert('أدخل كوداً'); item.language=lang; item.value=cv; break;
        case 'link': const url = document.getElementById('linkUrl')?.value.trim(); if (!url) return alert('أدخل رابطاً'); item.url=url; item.text=document.getElementById('linkTxt')?.value.trim()||url; break;
        case 'markdown': const mv = document.getElementById('mdVal')?.value.trim(); if (!mv) return alert('أدخل نصاً'); item.value=mv; break;
        case 'html': const hv = document.getElementById('htmlVal')?.value.trim(); if (!hv) return alert('أدخل HTML'); item.value=hv; break;
        case 'quote': const qv = document.getElementById('quoteText')?.value.trim(); if (!qv) return alert('أدخل الاقتباس'); item.value=qv; item.author=document.getElementById('quoteAuth')?.value.trim()||''; break;
        case 'summary': const smv = document.getElementById('summaryText')?.value.trim(); if (!smv) return alert('أدخل الملخص'); item.value=smv; break;
    }
    postContentItems.push(item); renderAdded(); switchType(type);
}
function renderAdded() {
    const c = document.getElementById('addedItems'); if (!c) return;
    c.innerHTML = postContentItems.map((it,i) => {
        let d = ''; switch(it.type) {
            case 'subtitle': d='عنوان فرعي: '+it.value; break;
            case 'images': d=(it.images?.length||0)+' صورة'; break;
            case 'code': d='كود '+it.language; break;
            case 'link': d='رابط: '+it.text; break;
            case 'markdown': d='Markdown'; break;
            case 'html': d='HTML'; break;
            case 'quote': d='💬 اقتباس'; break;
            case 'summary': d='📋 ملخص'; break;
        }
        return `<div class="list-item"><span>${d}</span><button class="btn btn-sm btn-danger" onclick="remItem(${i})">🗑️</button></div>`;
    }).join('');
}
function remItem(i) { postContentItems.splice(i,1); renderAdded(); }
async function savePost() {
    const title = document.getElementById('p-title')?.value.trim();
    if (!title) return alert('أدخل العنوان');
    const catId = document.getElementById('p-cat')?.value;
    if (!catId) return alert('اختر التبويبة');
    const subId = (document.getElementById('subGroup')?.style.display !== 'none') ? (document.getElementById('p-sub')?.value||null) : null;
    if (!postContentItems.length) return alert('أضف عنصراً واحداً على الأقل');

    let catName='', subName='';
    const catDoc = await db.collection('categories').doc(catId).get();
    if (catDoc.exists) { catName = catDoc.data().name; if (subId) { const s = (catDoc.data().subcategories||[]).find(x=>x.id===subId); if (s) subName=s.name; } }

    let authorName='مجهول', authorId=null;
    const authSel = document.getElementById('p-author');
    if (authSel?.value) {
        authorId = authSel.value;
        const aDoc = await db.collection('authors').doc(authorId).get();
        if (aDoc.exists) authorName = aDoc.data().name;
    }

    await db.collection('posts').add({
        title, content: postContentItems, author: authorName, authorId,
        category: catId, subcategory: subId, categoryName: catName, subcategoryName: subName,
        date: new Date().toISOString(), likes:0, likedBy:[], comments:[], views:0
    });
    closeAdd(); await renderPosts(); alert('✅ تم النشر');
}
async function deletePost(id) { if (confirm('حذف؟')) { await db.collection('posts').doc(id).delete(); await renderPosts(); } }
async function renderPosts() {
    const c = document.getElementById('posts-container'); if (!c) return;
    const snap = await db.collection('posts').orderBy('date','desc').limit(30).get();
    if (snap.empty) { c.innerHTML='<p>لا توجد منشورات</p>'; return; }
    c.innerHTML = snap.docs.map(d => {
        const p = d.data();
        return `<div class="list-item"><div class="item-info"><span class="item-title">${p.title}</span><div class="item-meta">${p.author||'مجهول'} · ${timeAgo(p.date)}</div></div><button class="btn btn-sm btn-danger" onclick="deletePost('${d.id}')">🗑️</button></div>`;
    }).join('');
}

// ---------- 9. الكتّاب (مع صورة ونبذة) ----------
async function loadAuthorsSection(panel) {
    panel.innerHTML = `<h2>الكتّاب</h2>
    <div class="card">
        <div class="form-group"><label>الاسم</label><input type="text" id="a-name" class="form-control"></div>
        <div class="form-group"><label>صورة (رابط)</label><input type="text" id="a-img" class="form-control" placeholder="رابط الصورة"></div>
        <div class="form-group"><label>نبذة</label><textarea id="a-bio" class="form-control" rows="3"></textarea></div>
        <button class="btn btn-primary" onclick="addAuthor()">➕ إضافة</button>
    </div>
    <div id="auth-list" class="card"><div id="auth-container">⏳</div></div>`;
    await renderAuthors();
}
async function addAuthor() {
    const n = document.getElementById('a-name').value.trim();
    if (!n) return alert('أدخل اسماً');
    await db.collection('authors').add({
        name: n,
        image: document.getElementById('a-img').value.trim(),
        bio: document.getElementById('a-bio').value.trim(),
        createdAt: new Date().toISOString()
    });
    document.getElementById('a-name').value=''; document.getElementById('a-img').value=''; document.getElementById('a-bio').value='';
    await renderAuthors();
}
async function deleteAuthor(id) { if (confirm('حذف؟')) { await db.collection('authors').doc(id).delete(); await renderAuthors(); } }
async function renderAuthors() {
    const c = document.getElementById('auth-container'); if (!c) return;
    const snap = await db.collection('authors').orderBy('createdAt').get();
    if (snap.empty) { c.innerHTML='<p>لا يوجد كتّاب</p>'; return; }
    c.innerHTML = snap.docs.map(d => {
        const a = d.data();
        return `<div class="list-item"><div class="item-info"><span class="item-title">✍️ ${a.name}</span><div class="item-meta">${a.bio?.substring(0,50)||'لا نبذة'}</div></div><button class="btn btn-sm btn-danger" onclick="deleteAuthor('${d.id}')">🗑️</button></div>`;
    }).join('');
}

// ---------- 10. المفاتيح ----------
async function loadKeysSection(panel) {
    panel.innerHTML = `<h2>المفاتيح</h2>
    <div class="card">
        <input type="text" id="k-name" class="form-control" placeholder="الاسم">
        <select id="k-type" class="form-control"><option value="ai">ذكاء اصطناعي</option><option value="database">قاعدة بيانات</option></select>
        <input type="text" id="k-val" class="form-control" placeholder="المفتاح">
        <textarea id="k-inst" class="form-control" placeholder="تعليمات"></textarea>
        <button class="btn btn-primary" onclick="addKey()">➕ إضافة</button>
    </div>
    <div id="keys-list" class="card"><div id="keys-container">⏳</div></div>`;
    await renderKeys();
}
async function addKey() {
    const n = document.getElementById('k-name').value.trim(), v = document.getElementById('k-val').value.trim();
    if (!n||!v) return alert('أدخل الاسم والمفتاح');
    await db.collection('api_keys').add({
        name:n, type:document.getElementById('k-type').value, value:v,
        instructions:document.getElementById('k-inst').value.trim(), createdAt:new Date().toISOString()
    });
    document.getElementById('k-name').value=''; document.getElementById('k-val').value=''; document.getElementById('k-inst').value='';
    await renderKeys();
}
async function deleteKey(id) { if (confirm('حذف؟')) { await db.collection('api_keys').doc(id).delete(); await renderKeys(); } }
async function renderKeys() {
    const c = document.getElementById('keys-container'); if (!c) return;
    const snap = await db.collection('api_keys').orderBy('createdAt','desc').get();
    if (snap.empty) { c.innerHTML='<p>لا مفاتيح</p>'; return; }
    c.innerHTML = snap.docs.map(d => {
        const k = d.data();
        return `<div class="list-item"><span>🔑 ${k.name} (${k.type})</span><button class="btn btn-sm btn-danger" onclick="deleteKey('${d.id}')">🗑️</button></div>`;
    }).join('');
}

console.log("✅ admin.js جاهز");
