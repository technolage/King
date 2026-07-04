// ============================================================
//  ملف: footer.js (مُحدّث - بدون Firebase)
//  الوظيفة: بناء تذييل الموقع (الفوتر) وإدارته
//  يشمل: تبويبات أفقية، أزرار تمرير، الصفحات الثابتة،
//         السنة التلقائية، بوابة الأدمن الآمنة
//  يعتمد على: github-api.js, utils.js
// ============================================================

let footerActiveTab = 'latest';
let footerClickCount = 0;
let footerClickTimer = null;
let footerScrollPositions = {};
let footerLastVisible = {};

// ---------- 1. بناء الفوتر ----------
async function buildFooter() {
  const footerDiv = document.getElementById('site-footer');
  if (!footerDiv) { console.warn('️ عنصر site-footer غير موجود'); return; }

  const settings = await getAllSettingsCached();
  const primaryColor = settings.primaryColor || '#c48b4c';
  const footerText = settings.footerText || 'جميع الحقوق محفوظة';
  const facebookUrl = settings.facebookUrl || '#';
  const twitterUrl = settings.twitterUrl || '#';
  const instagramUrl = settings.instagramUrl || '#';

  footerDiv.innerHTML = `
    <div class="footer-container">
      <div class="footer-top">
        <div class="footer-tabs">
          <button class="footer-tab ${footerActiveTab === 'latest' ? 'active' : ''}" onclick="switchFooterTab('latest')" style="${footerActiveTab === 'latest' ? 'border-bottom-color: ' + primaryColor : ''}"> أحدث المقالات</button>
          <button class="footer-tab ${footerActiveTab === 'mostViewed' ? 'active' : ''}" onclick="switchFooterTab('mostViewed')" style="${footerActiveTab === 'mostViewed' ? 'border-bottom-color: ' + primaryColor : ''}">🔥 الأكثر مشاهدة</button>
          <button class="footer-tab ${footerActiveTab === 'related' ? 'active' : ''}" onclick="switchFooterTab('related')" style="${footerActiveTab === 'related' ? 'border-bottom-color: ' + primaryColor : ''}">🔗 مقالات ذات صلة</button>
        </div>

        <div class="footer-horizontal-scroll" id="footerHorizontalScroll">
          <div class="horizontal-scroll-wrapper" id="horizontalScrollWrapper"></div>
        </div>
      </div>

      <div class="footer-middle">
        <div class="footer-static-pages" id="footerStaticPages"></div>
        <div class="footer-social">
          ${facebookUrl !== '#' ? `<a href="${facebookUrl}" target="_blank" rel="noopener" class="social-link"> فيسبوك</a>` : ''}
          ${twitterUrl !== '#' ? `<a href="${twitterUrl}" target="_blank" rel="noopener" class="social-link">🐦 تويتر</a>` : ''}
          ${instagramUrl !== '#' ? `<a href="${instagramUrl}" target="_blank" rel="noopener" class="social-link">📷 انستغرام</a>` : ''}
        </div>
      </div>

      <div class="footer-bottom">
        <button id="scrollDownBtn" class="scroll-btn scroll-down-btn" onclick="scrollToBottom()" title="النزول للأسفل" style="background: ${primaryColor}">⬇️</button>
        <button id="backToTopBtn" class="scroll-btn back-to-top-btn" onclick="scrollToTop()" title="العودة للأعلى" style="background: ${primaryColor}">⬆️</button>
        <p class="footer-copyright">© <span id="copyrightYear" class="admin-gate">${new Date().getFullYear()}</span> ${footerText}</p>
      </div>
    </div>
  `;

  attachFooterEvents();
  await loadFooterPosts(footerActiveTab);
  await loadStaticPagesInFooter();
  startYearAutoUpdate();
  console.log("✅ الفوتر تم بناؤه بنجاح");
}

// ---------- 2. ربط الأحداث ----------
function attachFooterEvents() {
  const yearSpan = document.getElementById('copyrightYear');
  if (yearSpan) yearSpan.addEventListener('click', handleYearClick);
  window.addEventListener('scroll', handleScrollVisibility);
  handleScrollVisibility();
}

// ---------- 3. تبديل تبويبات الفوتر ----------
async function switchFooterTab(tab) {
  const container = document.getElementById('footerHorizontalScroll');
  if (container) {
    footerScrollPositions[footerActiveTab] = container.scrollLeft;
  }
  footerActiveTab = tab;
  document.querySelectorAll('.footer-tab').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`.footer-tab[onclick*="${tab}"]`);
  if (activeBtn) activeBtn.classList.add('active');
  await loadFooterPosts(tab);
}

// ---------- 4. تحميل مقالات الفوتر ----------
async function loadFooterPosts(type) {
  const wrapper = document.getElementById('horizontalScrollWrapper');
  if (!wrapper) return;
  const container = document.getElementById('footerHorizontalScroll');

  wrapper.innerHTML = '<div class="loading-mini">⏳ جاري التحميل...</div>';
  footerLastVisible[type] = null;

  try {
    const postsList = await GitHubAPI.getPostsList();
    let posts = postsList || [];
    
    // ترتيب حسب النوع
    switch (type) {
      case 'latest':
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case 'mostViewed':
        posts.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'related':
        if (window.currentCategoryId) {
          posts = posts.filter(p => p.category === window.currentCategoryId);
          posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        } else {
          posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        break;
    }
    
    // أخذ أول 20 مقال
    posts = posts.slice(0, 20);

    if (posts.length === 0) {
      wrapper.innerHTML = '<p class="no-footer-posts">لا توجد مقالات.</p>';
      return;
    }

    wrapper.innerHTML = '';
    posts.forEach(post => {
      wrapper.appendChild(createFooterHorizontalCard(post));
    });

    if (container && footerScrollPositions[type]) {
      container.scrollLeft = footerScrollPositions[type];
    }
  } catch (error) {
    console.error('خطأ في تحميل مقالات الفوتر:', error);
    wrapper.innerHTML = '<p class="error-text">⚠️ خطأ في التحميل</p>';
  }
}

// ---------- 5. إنشاء بطاقة أفقية للفوتر ----------
function createFooterHorizontalCard(post) {
  const card = document.createElement('div');
  card.className = 'footer-horizontal-card';
  
  const firstImage = getFirstImage(post.content);
  const url = `${window.location.origin}${window.location.pathname}?post=${post.id}`;

  card.innerHTML = `
    <a href="${url}" target="_blank" onclick="event.preventDefault(); window.open('${url}', '_blank');">
      ${firstImage ? `<img src="${firstImage}" class="footer-card-image" loading="lazy" onerror="this.style.display='none'">` : ''}
      <div class="footer-card-content">
        <h4 class="footer-card-title">${post.title}</h4>
        <p class="footer-card-meta">${timeAgo(post.date)} · ${post.views || 0} 👁️</p>
      </div>
    </a>
  `;
  return card;
}

// ---------- 6. تحميل الصفحات الثابتة ----------
async function loadStaticPagesInFooter() {
  const container = document.getElementById('footerStaticPages');
  if (!container) return;
  
  try {
    const pages = await GitHubAPI.getStaticPages();
    
    if (!pages || pages.length === 0) {
      container.innerHTML = '';
      return;
    }
    
    container.innerHTML = '<h4>صفحات</h4><div class="static-pages-links"></div>';
    const linksContainer = container.querySelector('.static-pages-links');
    
    pages.forEach(page => {
      if (page.link) {
        const link = document.createElement('a');
        link.href = page.link;
        link.target = '_blank';
        link.rel = 'noopener';
        link.className = 'static-page-link';
        link.textContent = page.name;
        linksContainer.appendChild(link);
      } else {
        const span = document.createElement('span');
        span.className = 'static-page-link';
        span.textContent = page.name;
        span.onclick = () => showStaticPagePopup(page.name, page.content);
        linksContainer.appendChild(span);
      }
    });
  } catch (e) {
    console.error('خطأ في تحميل الصفحات الثابتة:', e);
  }
}

// ---------- 7. عرض نافذة الصفحة الثابتة ----------
function showStaticPagePopup(title, content) {
  const existing = document.querySelector('.static-page-popup-overlay');
  if (existing) existing.remove();
  
  const overlay = document.createElement('div');
  overlay.className = 'static-page-popup-overlay';
  overlay.innerHTML = `
    <div class="static-page-popup">
      <div class="static-page-popup-header">
        <h3>${title}</h3>
        <button class="static-page-popup-close" onclick="this.closest('.static-page-popup-overlay').remove()">✕</button>
      </div>
      <div class="static-page-popup-content">${content}</div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
}

// ---------- 8. بوابة الأدمن الآمنة (GitHub Token) ----------
function handleYearClick() {
  footerClickCount++;
  if (footerClickTimer) clearTimeout(footerClickTimer);
  footerClickTimer = setTimeout(() => { footerClickCount = 0; }, 1500);
  
  if (footerClickCount === 3) {
    footerClickCount = 0;
    clearTimeout(footerClickTimer);
    
    // التحقق من تسجيل الدخول
    if (GitHubAPI.isLoggedIn()) {
      window.location.href = 'admin.html';
    } else {
      showLoginModal();
    }
  }
}

// نافذة تسجيل الدخول
function showLoginModal() {
  const existing = document.getElementById('login-modal');
  if (existing) existing.remove();
  
  const modal = document.createElement('div');
  modal.id = 'login-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;justify-content:center;align-items:center;animation:fadeIn 0.3s ease;';
  
  modal.innerHTML = `
    <div style="background:white;border-radius:20px;padding:35px;max-width:420px;width:90%;position:relative;box-shadow:0 20px 50px rgba(0,0,0,0.3);">
      <button onclick="document.getElementById('login-modal').remove()" style="position:absolute;top:15px;left:15px;background:none;border:none;font-size:1.8rem;cursor:pointer;color:#999;">✕</button>
      <h2 style="color:#c48b4c;margin:0 0 10px 0;text-align:center;font-size:1.6rem;">🔐 تسجيل دخول الأدمن</h2>
      <p style="text-align:center;color:#666;margin-bottom:25px;font-size:0.9rem;">ALSHANFRICC - لوحة التحكم</p>
      <div style="margin-bottom:18px;">
        <label style="display:block;margin-bottom:8px;font-weight:700;color:#333;font-size:0.95rem;">GitHub Token</label>
        <input type="password" id="gh-token" style="width:100%;padding:13px;border:2px solid #e4e6eb;border-radius:12px;font-size:1rem;outline:none;transition:border-color 0.3s;box-sizing:border-box;" placeholder="ghp_xxxxxxxxxxxx">
        <small style="color:#999;font-size:0.8rem;margin-top:5px;display:block;">احصل على التوكن من: GitHub → Settings → Developer Settings → Personal Access Tokens</small>
      </div>
      <button onclick="performTokenLogin()" id="login-btn" style="width:100%;padding:14px;background:#c48b4c;color:white;border:none;border-radius:12px;font-size:1.05rem;font-weight:700;cursor:pointer;transition:background 0.3s;">دخول</button>
      <div id="login-error" style="margin-top:15px;color:#e74c3c;text-align:center;display:none;padding:10px;background:#fef2f2;border-radius:8px;font-size:0.9rem;"></div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) modal.remove();
  });
  
  setTimeout(() => {
    const tokenInput = document.getElementById('gh-token');
    if (tokenInput) {
      tokenInput.focus();
      tokenInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') performTokenLogin();
      });
    }
  }, 100);
}

// تنفيذ تسجيل الدخول
async function performTokenLogin() {
  const token = document.getElementById('gh-token').value.trim();
  const errorDiv = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');
  
  if (!token) {
    errorDiv.textContent = '⚠️ أدخل التوكن';
    errorDiv.style.display = 'block';
    return;
  }
  
  loginBtn.disabled = true;
  loginBtn.textContent = 'جاري التحقق...';
  loginBtn.style.opacity = '0.7';
  errorDiv.style.display = 'none';
  
  try {
    const result = await GitHubAPI.loginWithToken(token);
    
    if (result.success) {
      const modal = document.getElementById('login-modal');
      if (modal) modal.remove();
      
      if (typeof showToast === 'function') {
        showToast('✅ تم تسجيل الدخول بنجاح', 'success');
      }
      
      setTimeout(() => {
        window.location.href = 'admin.html';
      }, 500);
    } else {
      errorDiv.textContent = '⚠️ ' + result.error;
      errorDiv.style.display = 'block';
      loginBtn.disabled = false;
      loginBtn.textContent = 'دخول';
      loginBtn.style.opacity = '1';
    }
  } catch (error) {
    errorDiv.textContent = '⚠️ حدث خطأ في الاتصال';
    errorDiv.style.display = 'block';
    loginBtn.disabled = false;
    loginBtn.textContent = 'دخول';
    loginBtn.style.opacity = '1';
  }
}

// ---------- 9. أزرار التمرير ----------
function handleScrollVisibility() {
  const downBtn = document.getElementById('scrollDownBtn');
  const upBtn = document.getElementById('backToTopBtn');
  if (!downBtn || !upBtn) return;
  
  const scrollY = window.scrollY;
  const pageHeight = document.body.scrollHeight - window.innerHeight;
  
  if (scrollY < 200) {
    downBtn.classList.add('show');
    upBtn.classList.remove('show');
  } else if (scrollY > pageHeight - 200) {
    downBtn.classList.remove('show');
    upBtn.classList.add('show');
  } else {
    downBtn.classList.remove('show');
    upBtn.classList.add('show');
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToBottom() {
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

// ---------- 10. تحديث السنة تلقائياً ----------
function startYearAutoUpdate() {
  const yearSpan = document.getElementById('copyrightYear');
  if (!yearSpan) return;
  setInterval(() => {
    const currentYear = new Date().getFullYear();
    if (yearSpan.textContent != currentYear) {
      yearSpan.textContent = currentYear;
    }
  }, 60000);
}

console.log("✅ footer.js تم تحميله بنجاح - بدون Firebase");
