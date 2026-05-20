// ============================================================
//  ملف: body.js (مُحدّث - كامل)
//  الوظيفة: عرض المقالات والتفاعلات (إعجاب، تعليق، مشاركة،
//         تلخيص، بحث داخل المقال، تمييز، مصادر، وسام، تعديل التعليقات)
//  يعتمد على: firebase-config.js, utils.js, header.js
// ============================================================

let lastVisiblePost = null;
let isLoadingPosts = false;
let allPostsLoaded = false;
let activeCommentPostId = null;
let currentSearchQuery = '';
let currentUtterance = null;
let currentSpeakingPostId = null;

// ---------- تحميل المقالات ----------
async function loadPosts(loadMore = false) {
  if (isLoadingPosts || allPostsLoaded) return;
  isLoadingPosts = true;

  const feed = document.getElementById('posts-feed');
  if (!feed) { isLoadingPosts = false; return; }

  if (!loadMore) {
    feed.innerHTML = '<div class="loading-spinner">⏳ جاري تحميل المقالات...</div>';
    lastVisiblePost = null;
    allPostsLoaded = false;
  }

  try {
    let query = db.collection('posts');
    if (window.currentCategoryId) query = query.where('category', '==', currentCategoryId);
    if (window.currentSubcategoryId) query = query.where('subcategory', '==', currentSubcategoryId);
    if (currentSearchQuery) {
      query = query.where('title', '>=', currentSearchQuery)
                   .where('title', '<=', currentSearchQuery + '\uf8ff');
    }
    query = query.orderBy('date', 'desc').limit(15);
    if (loadMore && lastVisiblePost) query = query.startAfter(lastVisiblePost);

    const snapshot = await query.get();

    if (!loadMore) feed.innerHTML = '';
    if (snapshot.empty && !loadMore) {
      feed.innerHTML = `<div class="no-posts"><div class="no-posts-icon">📝</div><h3>لا توجد مقالات حالياً</h3><p>لم يتم العثور على أي مقال.</p></div>`;
      allPostsLoaded = true; isLoadingPosts = false; return;
    }
    if (snapshot.empty && loadMore) { allPostsLoaded = true; isLoadingPosts = false; return; }

    lastVisiblePost = snapshot.docs[snapshot.docs.length - 1];
    const settings = await getAllSettingsCached();
    const titleFont = settings.titleFont || 'Playfair Display';
    const bodyFont = settings.bodyFont || 'Cairo';

    for (const doc of snapshot.docs) {
      const post = doc.data(); post.id = doc.id;
      const card = await createPostCard(post, titleFont, bodyFont);
      feed.appendChild(card);
    }
    if (snapshot.docs.length < 15) allPostsLoaded = true;
  } catch (error) {
    console.error('خطأ في تحميل المقالات:', error);
    if (!loadMore) feed.innerHTML = '<p class="error-message">⚠️ حدث خطأ أثناء تحميل المقالات.</p>';
  }
  isLoadingPosts = false;
}

// ---------- إنشاء بطاقة المقال ----------
async function createPostCard(post, titleFont = 'Playfair Display', bodyFont = 'Cairo') {
  const card = document.createElement('article');
  card.className = 'post-card';
  card.id = `post-${post.id}`;

  const categoryName = post.categoryName || '';
  const subcategoryName = post.subcategoryName || '';
  const categoryId = post.category || '';
  const subcategoryId = post.subcategory || '';

  let breadcrumbHTML = '';
  if (categoryName) {
    breadcrumbHTML += `<span class="breadcrumb-item" onclick="filterByCategory('${categoryId}')" title="عرض كل مقالات ${categoryName}">${categoryName}</span>`;
    if (subcategoryName) {
      breadcrumbHTML += ` <span class="breadcrumb-sep">›</span> `;
      breadcrumbHTML += `<span class="breadcrumb-item" onclick="filterBySubcategory('${categoryId}', '${subcategoryId}')" title="عرض مقالات ${subcategoryName}">${subcategoryName}</span>`;
    }
  }

  let contentHTML = '';
  if (post.content && Array.isArray(post.content)) {
    post.content.forEach(item => {
      switch (item.type) {
        case 'subtitle': contentHTML += `<h4 class="post-subtitle">${item.value}</h4>`; break;
        case 'images':
          if (item.images) item.images.forEach(img => {
            const src = img.dataUrl || img;
            contentHTML += `<img src="${src}" class="post-image" loading="lazy" onerror="this.style.display='none'">`;
          });
          break;
        case 'code': contentHTML += `<pre class="code-block"><code class="language-${item.language}">${escapeHTML(item.value)}</code></pre>`; break;
        case 'link': contentHTML += `<a href="${item.url}" target="_blank" rel="noopener noreferrer" class="post-link">🔗 ${item.text || item.url}</a>`; break;
        case 'markdown': contentHTML += `<div class="markdown-content">${parseMarkdown(item.value)}</div>`; break;
        case 'html': contentHTML += `<div class="html-content">${item.value}</div>`; break;
        default: contentHTML += `<p>${item.value}</p>`;
      }
    });
  }

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

  card.innerHTML = `
    <div class="post-header">
        ${breadcrumbHTML ? `<div class="post-breadcrumb">${breadcrumbHTML}</div>` : ''}
        <div class="post-options">
            <button class="icon-btn dropdown-btn" onclick="togglePostMenu(event, '${post.id}')">⋯</button>
            <div class="dropdown-menu" id="menu-${post.id}" style="display:none;">
                <div class="dropdown-item" onclick="copyPostLink('${post.id}')">🔗 نسخ الرابط</div>
                <div class="dropdown-item" onclick="saveForLater('${post.id}')">🔖 قراءة لاحقاً</div>
                <div class="dropdown-item ai-summary-btn" onclick="generateSummary('${post.id}')">🤖 تلخيص بالذكاء الاصطناعي</div>
                <div class="dropdown-item search-in-post-btn" onclick="searchInPost('${post.id}')">🔎 بحث داخل المقال</div>
                <div class="dropdown-item highlight-text-btn" onclick="highlightSelection('${post.id}')">🖍️ تمييز النص</div>
                <div class="dropdown-item show-references-btn" onclick="showReferences('${post.id}')">📊 عرض المصادر والمراجع</div>
                <div class="dropdown-item" onclick="reportPost('${post.id}')">🚩 إبلاغ</div>
            </div>
        </div>
    </div>

    <div class="post-body" style="font-family: '${bodyFont}', sans-serif;">
        <h3 class="post-title" style="font-family: '${titleFont}', serif; cursor:pointer;" onclick="expandPost('${post.id}')">${post.title}</h3>
        <div class="post-meta">
            ${authorName !== 'مجهول' ? `<span class="post-author-name">✍️ ${authorName}</span>` : `<span class="post-author">✍️ ${authorName}</span>`}
            <span class="post-date">🕒 ${postDate}</span>
            ${post.views ? `<span class="post-views">👁️ ${post.views} مشاهدة</span>` : ''}
        </div>
        <div class="post-content">${contentHTML}</div>
        <span class="read-more" onclick="expandPost('${post.id}')">... اقرأ المزيد</span>
    </div>

    <div class="ai-summary-box" id="summary-${post.id}" style="display:none;">
        <div class="ai-summary-header"><span>🤖 ملخص الذكاء الاصطناعي</span><button class="ai-summary-close" onclick="closeSummary('${post.id}')">✕</button></div>
        <div class="ai-summary-content" id="summary-content-${post.id}">⏳ جارٍ التوليد...</div>
    </div>

    <div class="search-in-post-box" id="searchBox-${post.id}" style="display:none;">
        <input type="text" class="search-in-post-input" id="searchInput-${post.id}" placeholder="ابحث في المقال..." oninput="highlightInPost('${post.id}')">
        <span class="search-in-post-close" onclick="closeSearchInPost('${post.id}')">✕</span>
        <span class="search-in-post-count" id="searchCount-${post.id}"></span>
    </div>

    <div class="post-actions">
        <span class="action-circle like-btn ${(post.likedBy || []).includes(getVisitorId()) ? 'liked' : ''}" onclick="toggleLike('${post.id}')" title="أعجبني">
            ${(post.likedBy || []).includes(getVisitorId()) ? '❤️' : '🤍'}
            <span class="action-badge">${post.likes || 0}</span>
        </span>
        <span class="action-circle comment-btn" onclick="toggleComments('${post.id}')" title="تعليق">
            💬 <span class="action-badge">${post.comments ? post.comments.length : 0}</span>
        </span>
        <span class="action-circle translate-circle" onclick="translatePost('${post.id}')" title="ترجمة">
            <span class="lang-icon">AR</span><span class="lang-sep">|</span><span class="lang-icon">EN</span>
        </span>
        <span class="action-circle whatsapp-circle" onclick="shareToWhatsApp('${post.id}')" title="واتساب">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </span>
        <span class="action-circle facebook-circle" onclick="shareToFacebook('${post.id}')" title="فيسبوك">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        </span>
        <span class="action-circle copy-circle" onclick="copyPostLink('${post.id}')" title="نسخ الرابط">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
        </span>
        <span class="action-circle save-circle ${isPostSaved(post.id) ? 'saved' : ''}" onclick="toggleSavePost('${post.id}')" title="حفظ">
            ${isPostSaved(post.id) ? '🔖' : '🏷️'}
        </span>
        <span class="action-circle listen-circle" onclick="toggleListen('${post.id}')" title="استماع">🔊</span>
    </div>

    <div class="comments-section" id="comments-${post.id}" style="display:none;">
        <div class="comments-list" id="comments-list-${post.id}">
            ${(post.comments || []).map(comment => renderCommentHTML(comment, post.id)).join('')}
        </div>
        <div class="comment-form">
            <input type="text" class="comment-input" id="comment-input-${post.id}" placeholder="اكتب تعليقاً..." onkeypress="if(event.key==='Enter') addComment('${post.id}')">
            <button class="comment-submit-btn" onclick="addComment('${post.id}')">نشر</button>
        </div>
    </div>
  `;

  return card;
}

// ---------- دوال التفاعل ----------
function expandPost(postId) {
  const postBody = document.querySelector(`#post-${postId} .post-body`);
  const readMoreBtn = document.querySelector(`#post-${postId} .read-more`);
  if (postBody) {
    postBody.classList.toggle('expanded');
    if (postBody.classList.contains('expanded')) {
      if (readMoreBtn) readMoreBtn.style.display = 'none';
      const card = document.getElementById(`post-${postId}`);
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      if (readMoreBtn) readMoreBtn.style.display = 'inline-block';
    }
  }
}

async function toggleLike(postId) {
  try {
    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) return;
    const post = postDoc.data();
    const userFingerprint = getVisitorId();
    const hasLiked = (post.likedBy || []).includes(userFingerprint);

    if (hasLiked) {
      await postRef.update({
        likes: Math.max(0, (post.likes || 0) - 1),
        likedBy: firebase.firestore.FieldValue.arrayRemove(userFingerprint)
      });
    } else {
      await postRef.update({
        likes: (post.likes || 0) + 1,
        likedBy: firebase.firestore.FieldValue.arrayUnion(userFingerprint)
      });
      addInteraction('like');
    }
    updatePostCardLikes(postId);
  } catch (error) { console.error('خطأ في تحديث الإعجاب:', error); }
}

async function updatePostCardLikes(postId) {
  try {
    const postDoc = await db.collection('posts').doc(postId).get();
    if (!postDoc.exists) return;
    const post = postDoc.data();
    const likeBtn = document.querySelector(`#post-${postId} .like-btn`);
    const badge = document.querySelector(`#post-${postId} .like-btn .action-badge`);
    if (likeBtn) {
      const hasLiked = (post.likedBy || []).includes(getVisitorId());
      likeBtn.classList.toggle('liked', hasLiked);
      likeBtn.innerHTML = (hasLiked ? '❤️' : '🤍') + (badge ? '' : `<span class="action-badge">${post.likes || 0}</span>`);
    }
    if (badge) badge.textContent = post.likes || 0;
  } catch (e) {}
}

function toggleComments(postId) {
  const section = document.getElementById(`comments-${postId}`);
  if (!section) return;
  const isVisible = section.style.display !== 'none';
  document.querySelectorAll('.comments-section').forEach(s => s.style.display = 'none');
  section.style.display = isVisible ? 'none' : 'block';
  activeCommentPostId = isVisible ? null : postId;
  if (!isVisible) {
    const input = document.getElementById(`comment-input-${postId}`);
    if (input) setTimeout(() => input.focus(), 200);
  }
}

async function addComment(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  try {
    const postRef = db.collection('posts').doc(postId);
    const newComment = {
      id: generateId(),
      author: 'زائر',
      text: sanitizeHTML(text),
      date: new Date().toISOString(),
      visitorId: getVisitorId()
    };
    await postRef.update({ comments: firebase.firestore.FieldValue.arrayUnion(newComment) });
    addInteraction('comment');
    await refreshComments(postId);
    input.value = '';
  } catch (error) { console.error('خطأ في إضافة التعليق:', error); }
}

async function refreshComments(postId) {
  try {
    const postDoc = await db.collection('posts').doc(postId).get();
    if (!postDoc.exists) return;
    const post = postDoc.data();
    const list = document.getElementById(`comments-list-${postId}`);
    if (list) list.innerHTML = (post.comments || []).map(c => renderCommentHTML(c, postId)).join('');
    const count = document.querySelector(`#post-${postId} .comment-btn .action-badge`);
    if (count) count.textContent = (post.comments || []).length;
  } catch (e) {}
}

function renderCommentHTML(comment, postId) {
    const myId = getVisitorId();
    const isMyComment = comment.visitorId && comment.visitorId === myId;
    let actionsHTML = '';
    if (isMyComment) {
        actionsHTML = `
            <span class="comment-actions">
                <button class="comment-edit-btn" onclick="editComment('${postId}', '${comment.id}')" title="تعديل">✏️</button>
                <button class="comment-delete-btn" onclick="deleteComment('${postId}', '${comment.id}')" title="حذف">🗑️</button>
            </span>`;
    }
    return `
        <div class="comment-item">
            <div class="comment-avatar">👤</div>
            <div class="comment-content">
                <span class="comment-author">${comment.author || 'زائر'} ${actionsHTML}</span>
                <span class="comment-date">${timeAgo(comment.date)}</span>
                <p id="comment-text-${comment.id}">${comment.text}</p>
            </div>
        </div>`;
}

async function deleteComment(postId, commentId) {
    if (!confirm('هل أنت متأكد من حذف تعليقك؟')) return;
    const postRef = db.collection('posts').doc(postId);
    const doc = await postRef.get();
    if (!doc.exists) return;
    const post = doc.data();
    const updatedComments = (post.comments || []).filter(c => c.id !== commentId);
    await postRef.update({ comments: updatedComments });
    await refreshComments(postId);
}

async function editComment(postId, commentId) {
    const newText = prompt('عدّل تعليقك:', '');
    if (newText === null || newText.trim() === '') return;
    const postRef = db.collection('posts').doc(postId);
    const doc = await postRef.get();
    if (!doc.exists) return;
    const post = doc.data();
    const updatedComments = (post.comments || []).map(c => {
        if (c.id === commentId) { c.text = newText.trim(); c.edited = true; }
        return c;
    });
    await postRef.update({ comments: updatedComments });
    await refreshComments(postId);
}

// ---------- مساعدة ----------
function getVisitorId() {
  let id = localStorage.getItem('visitorId');
  if (!id) { id = generateId(); localStorage.setItem('visitorId', id); }
  return id;
}

function copyPostLink(postId) {
  const url = `${window.location.origin}${window.location.pathname}?post=${postId}`;
  navigator.clipboard.writeText(url).then(() => alert('✅ تم نسخ الرابط'));
  closeAllMenus();
}

function shareToWhatsApp(postId) {
  const url = encodeURIComponent(`${window.location.origin}${window.location.pathname}?post=${postId}`);
  window.open(`https://wa.me/?text=${url}`, '_blank');
}

function shareToFacebook(postId) {
  const url = encodeURIComponent(`${window.location.origin}${window.location.pathname}?post=${postId}`);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
}

async function sharePost(postId) {
  const url = `${window.location.origin}${window.location.pathname}?post=${postId}`;
  if (navigator.share) { try { await navigator.share({ title: 'مقال من ALSHANFRICC', url }); } catch (e) {} }
  else { copyPostLink(postId); }
}

function openPost(postId) { window.open(`${window.location.origin}${window.location.pathname}?post=${postId}`, '_blank'); }

function saveForLater(postId) {
  let saved = JSON.parse(localStorage.getItem('savedPosts') || '[]');
  if (saved.includes(postId)) { saved = saved.filter(id => id !== postId); }
  else { saved.push(postId); }
  localStorage.setItem('savedPosts', JSON.stringify(saved));
  closeAllMenus();
}

function isPostSaved(postId) {
  const saved = JSON.parse(localStorage.getItem('savedPosts') || '[]');
  return saved.includes(postId);
}

function toggleSavePost(postId) {
  let saved = JSON.parse(localStorage.getItem('savedPosts') || '[]');
  if (saved.includes(postId)) { saved = saved.filter(id => id !== postId); }
  else { saved.push(postId); }
  localStorage.setItem('savedPosts', JSON.stringify(saved));
  const btn = document.querySelector(`#post-${postId} .save-circle`);
  if (btn) {
    btn.classList.toggle('saved', saved.includes(postId));
    btn.innerHTML = saved.includes(postId) ? '🔖' : '🏷️';
  }
}

function toggleListen(postId) {
  if (currentSpeakingPostId === postId && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    currentSpeakingPostId = null;
    updateListenIcon(postId, false);
    return;
  }
  window.speechSynthesis.cancel();
  const postContent = document.querySelector(`#post-${postId} .post-content`);
  if (!postContent) return;
  const text = postContent.innerText.trim();
  if (!text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar-SA'; utterance.rate = 1.0;
  utterance.onstart = () => { currentSpeakingPostId = postId; updateListenIcon(postId, true); };
  utterance.onend = () => { currentSpeakingPostId = null; updateListenIcon(postId, false); };
  utterance.onerror = () => { currentSpeakingPostId = null; updateListenIcon(postId, false); };
  window.speechSynthesis.speak(utterance);
}

function updateListenIcon(postId, isActive) {
  const btn = document.querySelector(`#post-${postId} .listen-circle`);
  if (btn) { btn.classList.toggle('listening', isActive); btn.innerHTML = isActive ? '🔇' : '🔊'; }
}

function translatePost(postId) {
  const url = `${window.location.origin}${window.location.pathname}?post=${postId}`;
  window.open(`https://translate.google.com/translate?sl=ar&tl=en&u=${encodeURIComponent(url)}`, '_blank');
}

function reportPost(postId) { alert('🚩 تم استلام بلاغك وسيتم مراجعته.'); closeAllMenus(); }

function togglePostMenu(event, postId) { event.stopPropagation(); closeAllMenus(); const menu = document.getElementById(`menu-${postId}`); if (menu) menu.style.display = 'block'; }
function closeAllMenus() { document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none'); }
document.addEventListener('click', () => closeAllMenus());

// ---------- البحث داخل المقال ----------
function searchInPost(postId) {
  document.querySelectorAll('.search-in-post-box').forEach(b => b.style.display = 'none');
  clearHighlights(postId);
  const box = document.getElementById(`searchBox-${postId}`);
  if (box) { box.style.display = 'flex'; document.getElementById(`searchInput-${postId}`).focus(); }
}
function closeSearchInPost(postId) {
  const box = document.getElementById(`searchBox-${postId}`);
  if (box) box.style.display = 'none';
  clearHighlights(postId);
}
function highlightInPost(postId) {
  const input = document.getElementById(`searchInput-${postId}`);
  const countSpan = document.getElementById(`searchCount-${postId}`);
  const postBody = document.querySelector(`#post-${postId} .post-content`);
  if (!input || !postBody) return;
  clearHighlights(postId);
  const query = input.value.trim();
  if (!query) { if (countSpan) countSpan.textContent = ''; return; }
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  let matchCount = 0;
  function highlightText(node) {
    if (node.nodeType === 3) {
      const text = node.textContent;
      if (regex.test(text)) {
        const frag = document.createDocumentFragment();
        let lastIndex = 0, match;
        regex.lastIndex = 0;
        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIndex) frag.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
          const mark = document.createElement('mark');
          mark.className = 'search-highlight'; mark.textContent = match[0];
          frag.appendChild(mark); matchCount++;
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.substring(lastIndex)));
        node.parentNode.replaceChild(frag, node);
      }
    } else if (node.nodeType === 1 && !['SCRIPT', 'STYLE', 'MARK'].includes(node.tagName)) {
      node.childNodes.forEach(highlightText);
    }
  }
  highlightText(postBody);
  if (countSpan) countSpan.textContent = matchCount > 0 ? `(${matchCount} تطابق)` : '(لا توجد نتائج)';
}
function clearHighlights(postId) {
  const postBody = document.querySelector(`#post-${postId} .post-content`);
  if (!postBody) return;
  postBody.querySelectorAll('mark.search-highlight').forEach(mark => {
    mark.parentNode.replaceChild(document.createTextNode(mark.textContent), mark);
    mark.parentNode.normalize();
  });
}

// ---------- تمييز النص ----------
function getHighlights(postId) { return JSON.parse(localStorage.getItem('highlights') || '{}')[postId] || []; }
function saveHighlights(postId, highlights) {
  const all = JSON.parse(localStorage.getItem('highlights') || '{}');
  all[postId] = highlights;
  localStorage.setItem('highlights', JSON.stringify(all));
}
function highlightSelection(postId) {
  const selection = window.getSelection();
  if (!selection.rangeCount || selection.isCollapsed) return alert('الرجاء تحديد نص أولاً.');
  const range = selection.getRangeAt(0);
  const postBody = document.querySelector(`#post-${postId} .post-content`);
  if (!postBody || !postBody.contains(range.commonAncestorContainer)) return alert('يجب أن يكون النص داخل المقال.');
  const selectedText = range.toString().trim();
  if (!selectedText) return;
  const mark = document.createElement('mark'); mark.className = 'user-highlight';
  mark.style.backgroundColor = '#ffeb3b'; mark.dataset.postId = postId; mark.dataset.highlightText = selectedText;
  try { range.surroundContents(mark); } catch (e) { const span = document.createElement('span'); span.className = 'user-highlight'; span.style.backgroundColor = '#ffeb3b'; range.surroundContents(span); }
  selection.removeAllRanges();
  const highlights = getHighlights(postId);
  highlights.push({ text: selectedText });
  saveHighlights(postId, highlights);
  const newMark = postBody.querySelector(`mark.user-highlight[data-highlight-text="${selectedText}"]`);
  if (newMark) newMark.addEventListener('click', function(e) {
    if (confirm('إلغاء تمييز هذا النص؟')) {
      this.parentNode.replaceChild(document.createTextNode(this.textContent), this);
      this.parentNode.normalize();
      saveHighlights(postId, getHighlights(postId).filter(h => h.text !== selectedText));
    }
  });
}

// ---------- عرض المصادر ----------
function showReferences(postId) {
  document.querySelectorAll('.references-box').forEach(b => b.remove());
  const postBody = document.querySelector(`#post-${postId} .post-body`);
  if (!postBody) return;
  const links = postBody.querySelectorAll('a[href]');
  const urls = Array.from(links).map(l => ({ href: l.href, text: l.textContent.trim() || l.href })).filter(i => i.href && !i.href.startsWith('javascript'));
  if (urls.length === 0) return alert('لا توجد روابط.');
  const unique = [...new Map(urls.map(i => [i.href, i])).values()];
  let html = '<ul class="references-list">';
  unique.forEach(u => html += `<li><a href="${u.href}" target="_blank">🔗 ${u.text}</a></li>`);
  html += '</ul>';
  const box = document.createElement('div'); box.className = 'references-box';
  box.innerHTML = `<div class="references-header"><span>📊 المصادر (${unique.length})</span><button class="references-close" onclick="this.parentElement.parentElement.remove()">✕</button></div>${html}`;
  postBody.appendChild(box);
}

// ---------- وسام + تفاعلات ----------
function getBadgeLevel(interactions) {
  if (interactions >= 100) return { name: 'أسطورة', icon: '👑' };
  if (interactions >= 50) return { name: 'خبير', icon: '⭐' };
  if (interactions >= 20) return { name: 'نشط', icon: '🔥' };
  if (interactions >= 5) return { name: 'مشارك', icon: '💬' };
  return null;
}
function addInteraction(type) {
  const key = `interactions_${getVisitorId()}`;
  let interactions = JSON.parse(localStorage.getItem(key) || '{"comments":0,"likes":0}');
  if (type === 'comment') interactions.comments++;
  else if (type === 'like') interactions.likes++;
  localStorage.setItem(key, JSON.stringify(interactions));
}

// ---------- تلخيص AI ----------
async function generateSummary(postId) {
  const box = document.getElementById(`summary-${postId}`);
  const content = document.getElementById(`summary-content-${postId}`);
  if (!box || !content) return;
  box.style.display = 'block'; content.innerHTML = '⏳ جارٍ التوليد...';
  const postBody = document.querySelector(`#post-${postId} .post-content`);
  if (!postBody) { content.innerHTML = '❌ لم يتم العثور على محتوى.'; return; }
  const fullText = postBody.innerText.trim().substring(0, 3000);
  if (fullText.length < 50) { content.innerHTML = '⚠️ المقال قصير جداً.'; return; }
  const apiKey = await getSetting('openai_api_key', '');
  if (!apiKey) { content.innerHTML = '⚠️ لم يتم تعيين مفتاح API.'; return; }
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-3.5-turbo', messages: [{ role: 'system', content: 'لخّص هذا المقال العربي في 3 جمل فقط.' }, { role: 'user', content: fullText }], max_tokens: 200, temperature: 0.5 })
    });
    const data = await res.json();
    content.innerHTML = data.error ? `❌ ${data.error.message}` : data.choices[0].message.content;
  } catch (e) { content.innerHTML = '❌ فشل الاتصال.'; }
}
function closeSummary(postId) { const box = document.getElementById(`summary-${postId}`); if (box) box.style.display = 'none'; }

// ---------- فلترة ----------
function filterByCategory(catId) { if (typeof handleTabClick === 'function') handleTabClick(new MouseEvent('click'), catId); else { window.currentCategoryId = catId; window.currentSubcategoryId = null; loadPosts(false); } }
function filterBySubcategory(catId, subId) {
  if (typeof handleTabClick === 'function') { handleTabClick(new MouseEvent('click'), catId); setTimeout(() => { if (typeof selectSubcategory === 'function') selectSubcategory(subId); }, 100); }
  else { window.currentCategoryId = catId; window.currentSubcategoryId = subId; loadPosts(false); }
}
function searchPosts(query) { currentSearchQuery = query.trim(); loadPosts(false); }

// ---------- التمرير اللانهائي ----------
function setupInfiniteScroll() {
  const observer = new IntersectionObserver((entries) => { if (entries[0].isIntersecting && !isLoadingPosts && !allPostsLoaded) loadPosts(true); }, { rootMargin: '200px' });
  setInterval(() => { const cards = document.querySelectorAll('.post-card'); if (cards.length) observer.observe(cards[cards.length - 1]); }, 1000);
}
setupInfiniteScroll();

console.log("✅ body.js تم تحميله بنجاح");
