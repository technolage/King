// ============================================================
//  ملف: body.js (مبسّط - إعجابات فقط)
//  الوظيفة: عرض المقالات والإعجابات
//  يعتمد على: github-api.js, utils.js
// ============================================================

let currentSearchQuery = '';
let currentPage = 1;
const postsPerPage = 20;
let allPosts = [];
let totalPostsCount = 0;

// ---------- 1. تحميل جميع المقالات ----------
async function loadPosts(page = 1) {
  currentPage = page;
  const feed = document.getElementById('posts-feed');
  if (!feed) return;

  feed.innerHTML = '<div class="loading-spinner">⏳ جاري تحميل المقالات...</div>';

  try {
    const postsList = await GitHubAPI.getPostsList();
    allPosts = postsList || [];
    
    // فلترة المقالات
    let filteredPosts = allPosts;
    if (window.currentCategoryId) {
      filteredPosts = filteredPosts.filter(p => p.category === window.currentCategoryId);
    }
    if (window.currentSubcategoryId) {
      filteredPosts = filteredPosts.filter(p => p.subcategory === window.currentSubcategoryId);
    }
    if (currentSearchQuery) {
      const q = currentSearchQuery.toLowerCase();
      filteredPosts = filteredPosts.filter(p => 
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q))
      );
    }

    totalPostsCount = filteredPosts.length;
    const totalPages = Math.ceil(totalPostsCount / postsPerPage);

    const start = (page - 1) * postsPerPage;
    const pagePosts = filteredPosts.slice(start, start + postsPerPage);

    feed.innerHTML = '';

    if (pagePosts.length === 0) {
      feed.innerHTML = `<div class="no-posts">
        <div class="no-posts-icon">📝</div>
        <h3>لا توجد مقالات</h3>
        <p>لم يتم العثور على أي مقال${currentSearchQuery ? ' بهذا البحث' : ''}.</p>
      </div>`;
      return;
    }

    const settings = await getAllSettingsCached();
    const titleFont = settings.titleFont || 'Playfair Display';
    const bodyFont = settings.bodyFont || 'Cairo';

    for (const post of pagePosts) {
      const card = await createPostCard(post, titleFont, bodyFont);
      feed.appendChild(card);
    }

    // تحديث إحصائيات الشريط الجانبي
    updateStatsWidget(filteredPosts);

    addPaginationControls(page, totalPages);

  } catch (error) {
    console.error('خطأ في تحميل المقالات:', error);
    feed.innerHTML = '<p class="error-message">⚠️ حدث خطأ أثناء تحميل المقالات.</p>';
  }
}

// ---------- 2. تحديث إحصائيات الشريط الجانبي ----------
function updateStatsWidget(posts) {
  const totalPostsEl = document.getElementById('total-posts');
  if (totalPostsEl) totalPostsEl.textContent = posts.length;
}

// ---------- 3. إنشاء بطاقة المقال ----------
async function createPostCard(post, titleFont = 'Playfair Display', bodyFont = 'Cairo') {
  const card = document.createElement('article');
  card.className = 'post-card';
  card.id = `post-${post.id}`;

  const categoryName = post.categoryName || '';
  const subcategoryName = post.subcategoryName || '';
  const categoryId = post.category || '';
  const subcategoryId = post.subcategory || '';

  // Breadcrumb
  let breadcrumbHTML = '';
  if (categoryName) {
    breadcrumbHTML += `<span class="breadcrumb-item" onclick="filterByCategory('${categoryId}')">${categoryName}</span>`;
    if (subcategoryName) {
      breadcrumbHTML += ` <span class="breadcrumb-sep">›</span> `;
      breadcrumbHTML += `<span class="breadcrumb-item" onclick="filterBySubcategory('${categoryId}', '${subcategoryId}')">${subcategoryName}</span>`;
    }
  }

  // جلب المحتوى الكامل للمقال
  let contentArray = post.content;
  if (!contentArray || contentArray.length === 0) {
    try {
      const fullPost = await GitHubAPI.getPost(post.id);
      if (fullPost) contentArray = fullPost.content || [];
    } catch (e) {
      contentArray = [];
    }
  }

  // بناء HTML المحتوى
  let contentHTML = '';
  if (Array.isArray(contentArray)) {
    contentArray.forEach(item => {
      switch (item.type) {
        case 'subtitle': 
          contentHTML += `<h4 class="post-subtitle">${item.value}</h4>`; 
          break;
        case 'images':
          if (item.images) item.images.forEach(img => {
            const src = img.dataUrl || img.url || img;
            contentHTML += `<img src="${src}" class="post-image" loading="lazy" onerror="this.style.display='none'">`;
          });
          break;
        case 'code': 
          contentHTML += `<pre class="code-block"><code class="language-${item.language || ''}">${escapeHTML(item.value)}</code></pre>`; 
          break;
        case 'link': 
          contentHTML += `<a href="${item.url}" target="_blank" rel="noopener noreferrer" class="post-link">🔗 ${item.text || item.url}</a>`; 
          break;
        case 'markdown': 
          contentHTML += `<div class="markdown-content">${parseMarkdown(item.value)}</div>`; 
          break;
        case 'html': 
          contentHTML += `<div class="html-content">${item.value}</div>`; 
          break;
        case 'quote':
          contentHTML += `<blockquote class="elegant-quote"><div class="quote-icon">❝</div><p>${item.value}</p>${item.author ? `<cite>— ${item.author}</cite>` : ''}</blockquote>`;
          break;
        case 'summary':
          contentHTML += `<div class="article-summary-box"><div class="summary-badge">📋 ملخص المقال</div><p>${item.value}</p></div>`;
          break;
        default: 
          if (item.value) contentHTML += `<p>${item.value}</p>`;
      }
    });
  }

  // معالجة الروابط
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = contentHTML;
  tempDiv.querySelectorAll('a').forEach(link => {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    link.classList.add('post-link');
  });
  contentHTML = tempDiv.innerHTML;

  const authorName = post.author || 'مجهول';
  const postDate = post.date ? timeAgo(post.date) : '';

  // الإعجابات من localStorage
  const savedLikes = JSON.parse(localStorage.getItem('post_likes') || '{}');
  const localLikes = savedLikes[post.id] || 0;
  const totalLikes = (post.likes || 0) + localLikes;
  const hasLiked = localStorage.getItem(`liked_${post.id}`) === 'true';

  card.innerHTML = `
    <div class="post-header">
        ${breadcrumbHTML ? `<div class="post-breadcrumb">${breadcrumbHTML}</div>` : ''}
    </div>

    <div class="reading-progress-container" id="progress-container-${post.id}">
        <div class="reading-progress-bar" id="progress-${post.id}"></div>
    </div>

    <div class="post-body" style="font-family: '${bodyFont}', sans-serif;">
        <h3 class="post-title" style="font-family: '${titleFont}', serif;" onclick="expandPost('${post.id}')">${post.title}</h3>
        <div class="post-meta">
            <span class="post-author">✍️ ${authorName}</span>
            <span class="post-date">🕒 ${postDate}</span>
        </div>
        <div class="post-content">${contentHTML}</div>
        <span class="read-more-btn" onclick="expandPost('${post.id}')">📖 اقرأ المزيد</span>
        <span class="collapse-btn" style="display:none;" onclick="expandPost('${post.id}')">▲ طي المقال</span>
    </div>

    <div class="post-actions">
        <span class="action-circle like-btn ${hasLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')" title="أعجبني">
            ${hasLiked ? '❤️' : '🤍'}
            <span class="action-badge">${totalLikes}</span>
        </span>
        <span class="action-circle share-general-circle" onclick="generalShare('${post.id}')" title="مشاركة">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
        </span>
        <span class="action-circle copy-circle" onclick="copyPostLink('${post.id}')" title="نسخ الرابط">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
        </span>
    </div>
  `;

  return card;
}

// ---------- 4. توسيع/طي المقال ----------
function expandPost(postId) {
  const postBody = document.querySelector(`#post-${postId} .post-body`);
  const readMoreBtn = document.querySelector(`#post-${postId} .read-more-btn`);
  const collapseBtn = document.querySelector(`#post-${postId} .collapse-btn`);
  const card = document.getElementById(`post-${postId}`);

  if (postBody) {
    if (postBody.classList.contains('expanded')) {
      postBody.classList.remove('expanded');
      if (readMoreBtn) readMoreBtn.style.display = 'inline-block';
      if (collapseBtn) collapseBtn.style.display = 'none';
    } else {
      postBody.classList.add('expanded');
      if (readMoreBtn) readMoreBtn.style.display = 'none';
      if (collapseBtn) collapseBtn.style.display = 'inline-flex';
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
}

// ---------- 5. الإعجابات (محلياً) ----------
function toggleLike(postId) {
  const hasLiked = localStorage.getItem(`liked_${postId}`) === 'true';
  const savedLikes = JSON.parse(localStorage.getItem('post_likes') || '{}');
  
  if (hasLiked) {
    localStorage.setItem(`liked_${postId}`, 'false');
    savedLikes[postId] = Math.max(0, (savedLikes[postId] || 0) - 1);
  } else {
    localStorage.setItem(`liked_${postId}`, 'true');
    savedLikes[postId] = (savedLikes[postId] || 0) + 1;
  }
  
  localStorage.setItem('post_likes', JSON.stringify(savedLikes));
  updatePostCardLikes(postId);
}

function updatePostCardLikes(postId) {
  const post = allPosts.find(p => p.id === postId);
  if (!post) return;
  
  const savedLikes = JSON.parse(localStorage.getItem('post_likes') || '{}');
  const localLikes = savedLikes[postId] || 0;
  const totalLikes = (post.likes || 0) + localLikes;
  const hasLiked = localStorage.getItem(`liked_${postId}`) === 'true';
  
  const likeBtn = document.querySelector(`#post-${postId} .like-btn`);
  
  if (likeBtn) {
    likeBtn.classList.toggle('liked', hasLiked);
    likeBtn.innerHTML = (hasLiked ? '❤️' : '🤍') + `<span class="action-badge">${totalLikes}</span>`;
  }
}

// ---------- 6. المشاركة ونسخ الرابط ----------
function copyPostLink(postId) {
  const url = `${window.location.origin}${window.location.pathname}?post=${postId}`;
  navigator.clipboard.writeText(url).then(() => showToast('✅ تم نسخ الرابط'));
}

async function generalShare(postId) {
  const url = `${window.location.origin}${window.location.pathname}?post=${postId}`;
  const post = allPosts.find(p => p.id === postId);
  const title = post?.title || 'مقال من ALSHANFRICC';
  
  if (navigator.share) {
    try { await navigator.share({ title, url }); } catch (err) {}
  } else {
    await navigator.clipboard.writeText(url);
    showToast('✅ تم نسخ الرابط للمشاركة');
  }
}

// ---------- 7. الفلاتر والبحث ----------
function clearFilter() {
  currentSearchQuery = '';
  currentPage = 1;
  window.currentCategoryId = null;
  window.currentSubcategoryId = null;
  loadPosts(1);
}

function filterByCategory(catId) {
  currentPage = 1;
  if (typeof activateTab === 'function') activateTab(catId, null);
  else { window.currentCategoryId = catId; window.currentSubcategoryId = null; loadPosts(1); }
}

function filterBySubcategory(catId, subId) {
  currentPage = 1;
  if (typeof activateTab === 'function') activateTab(catId, subId);
  else { window.currentCategoryId = catId; window.currentSubcategoryId = subId; loadPosts(1); }
}

function searchPosts(query) {
  currentSearchQuery = query.trim();
  currentPage = 1;
  loadPosts(1);
}

// ---------- 8. شريط تقدم القراءة ----------
function updateReadingProgress(postId) {
  const postBody = document.querySelector(`#post-${postId} .post-body`);
  const progressBar = document.getElementById(`progress-${postId}`);
  const container = document.getElementById(`progress-container-${postId}`);
  if (!postBody || !progressBar) return;
  
  const scrollTop = postBody.scrollTop;
  const scrollHeight = postBody.scrollHeight - postBody.clientHeight;
  if (scrollHeight <= 0) { if (container) container.style.display = 'none'; return; }
  if (container) container.style.display = 'block';
  
  const progress = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
  progressBar.style.width = progress + '%';
}

function setupReadingProgressObservers() {
  document.addEventListener('scroll', function(e) {
    const postBody = e.target.closest('.post-body.expanded');
    if (postBody) {
      const postId = postBody.closest('.post-card')?.id?.replace('post-', '');
      if (postId) updateReadingProgress(postId);
    }
  }, true);
}
setupReadingProgressObservers();

// ---------- 9. أزرار التنقل بين الصفحات ----------
function addPaginationControls(page, totalPages) {
  const oldPagination = document.getElementById('pagination-container');
  if (oldPagination) oldPagination.remove();
  if (totalPages <= 1) return;
  
  const feed = document.getElementById('posts-feed');
  const pagination = document.createElement('div');
  pagination.id = 'pagination-container';
  pagination.className = 'pagination-container';
  
  let html = '';
  html += `<button class="pagination-btn" ${page === 1 ? 'disabled' : ''} onclick="loadPosts(${page - 1})">◀ السابق</button>`;
  html += '<div class="pagination-numbers">';
  for (let i = 1; i <= totalPages; i++) {
    if (i === page) html += `<span class="pagination-number active">${i}</span>`;
    else if (Math.abs(i - page) <= 2 || i === 1 || i === totalPages) html += `<span class="pagination-number" onclick="loadPosts(${i})">${i}</span>`;
    else if (Math.abs(i - page) === 3) html += `<span class="pagination-dots">...</span>`;
  }
  html += '</div>';
  html += `<button class="pagination-btn" ${page === totalPages ? 'disabled' : ''} onclick="loadPosts(${page + 1})">التالي ▶</button>`;
  html += `<span class="pagination-info">صفحة ${page} من ${totalPages} (${totalPostsCount} مقال)</span>`;
  pagination.innerHTML = html;
  feed.appendChild(pagination);
}

console.log("✅ body.js تم تحميله بنجاح - إعجابات فقط");
