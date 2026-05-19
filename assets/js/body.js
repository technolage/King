// ============================================================
//  ملف: body.js
//  الوظيفة: عرض المقالات في الواجهة الرئيسية
//  يشمل: التحميل، البطاقات، التفاعلات (إعجاب، تعليق، مشاركة)
//  يعتمد على: firebase-config.js, utils.js, header.js
// ============================================================

// ---------- متغيرات عامة ----------
let lastVisiblePost = null;         // آخر مستند تم جلبه (للتمرير اللانهائي)
let isLoadingPosts = false;        // لمنع التحميل المتكرر
let allPostsLoaded = false;        // هل تم تحميل كل المقالات؟
let activeCommentPostId = null;    // معرف المقال الذي تظهر تعليقاته حالياً
let currentSearchQuery = '';       // كلمة البحث الحالية

// ---------- الدالة الرئيسية: تحميل المقالات ----------

/**
 * جلب المقالات من Firestore وعرضها
 * @param {boolean} loadMore - هل هذا تحميل إضافي (تمرير لانهائي)؟
 */
async function loadPosts(loadMore = false) {
    // منع التحميل المتكرر
    if (isLoadingPosts || allPostsLoaded) return;
    isLoadingPosts = true;
    
    const feed = document.getElementById('posts-feed');
    if (!feed) {
        isLoadingPosts = false;
        return;
    }
    
    // إذا لم يكن تحميل إضافي، نمسح المحتوى السابق
    if (!loadMore) {
        feed.innerHTML = '<div class="loading-spinner">⏳ جاري تحميل المقالات...</div>';
        lastVisiblePost = null;
        allPostsLoaded = false;
    }
    
    try {
        // بناء الاستعلام الأساسي
        let query = db.collection('posts');
        
        // فلتر التبويبة
        if (window.currentCategoryId) {
            query = query.where('category', '==', currentCategoryId);
        }
        
        // فلتر الفرع
        if (window.currentSubcategoryId) {
            query = query.where('subcategory', '==', currentSubcategoryId);
        }
        
        // فلتر كلمة البحث (نبحث في العنوان والمحتوى النصي)
        // ملاحظة: Firestore لا يدعم البحث النصي الكامل، لذا نستخدم فلتر بسيط
        if (currentSearchQuery) {
            query = query.where('searchKeywords', 'array-contains', currentSearchQuery.toLowerCase());
        }
        
        // ترتيب حسب التاريخ (الأحدث أولاً)
        query = query.orderBy('date', 'desc');
        
        // تحديد عدد المقالات في الدفعة
        query = query.limit(15);
        
        // للتحميل الإضافي، نبدأ بعد آخر مستند
        if (loadMore && lastVisiblePost) {
            query = query.startAfter(lastVisiblePost);
        }
        
        // تنفيذ الاستعلام
        const snapshot = await query.get();
        
        // إزالة رسالة التحميل عند أول تحميل
        if (!loadMore) {
            feed.innerHTML = '';
        }
        
        // إذا لم توجد نتائج
        if (snapshot.empty && !loadMore) {
            feed.innerHTML = `
                <div class="no-posts">
                    <div class="no-posts-icon">📝</div>
                    <h3>لا توجد مقالات حالياً</h3>
                    <p>لم يتم العثور على أي مقال. جرب تغيير الفلتر أو إضافة مقال جديد من لوحة التحكم.</p>
                </div>`;
            allPostsLoaded = true;
            isLoadingPosts = false;
            return;
        }
        
        // إذا لم توجد نتائج إضافية
        if (snapshot.empty && loadMore) {
            allPostsLoaded = true;
            isLoadingPosts = false;
            return;
        }
        
        // حفظ آخر مستند للتحميل التالي
        lastVisiblePost = snapshot.docs[snapshot.docs.length - 1];
        
        // عرض كل مقال
        for (const doc of snapshot.docs) {
            const post = doc.data();
            post.id = doc.id;
            const card = await createPostCard(post);
            feed.appendChild(card);
        }
        
        // إذا كانت الدفعة أقل من 15، فهذا يعني أننا وصلنا للنهاية
        if (snapshot.docs.length < 15) {
            allPostsLoaded = true;
        }
        
    } catch (error) {
        console.error('خطأ في تحميل المقالات:', error);
        if (!loadMore) {
            feed.innerHTML = '<p class="error-message">⚠️ حدث خطأ أثناء تحميل المقالات. حاول مرة أخرى.</p>';
        }
    }
    
    isLoadingPosts = false;
}

// ---------- إنشاء بطاقة المقال ----------

/**
 * إنشاء عنصر HTML لبطاقة مقال واحدة
 * @param {Object} post - بيانات المقال
 * @returns {HTMLElement} عنصر البطاقة
 */
async function createPostCard(post) {
    const card = document.createElement('article');
    card.className = 'post-card';
    card.id = `post-${post.id}`;
    
    // استخراج أول صورة من المحتوى
    const firstImage = getFirstImage(post.content);
    
    // استخراج نص المحتوى (للمعاينة)
    const textPreview = getTextOnly(post.content);
    const displayText = truncateText(textPreview, 250);
    
    // جلب اسم التبويبة والفرع
    let categoryName = '';
    let subcategoryName = '';
    
    if (post.category) {
        try {
            const catDoc = await db.collection('categories').doc(post.category).get();
            if (catDoc.exists) {
                categoryName = catDoc.data().name;
                
                // البحث عن اسم الفرع
                if (post.subcategory && catDoc.data().subcategories) {
                    const sub = catDoc.data().subcategories.find(s => s.id === post.subcategory);
                    if (sub) subcategoryName = sub.name;
                }
            }
        } catch (e) {}
    }
    
    // بناء HTML البطاقة
    card.innerHTML = `
        <div class="post-header">
            <div class="post-category-badge">
                ${categoryName ? `<span class="category-tag" onclick="handleTabClick(event, '${post.category}')">${categoryName}</span>` : ''}
                ${subcategoryName ? `<span class="subcategory-tag">▸ ${subcategoryName}</span>` : ''}
            </div>
            <div class="post-options">
                <button class="icon-btn dropdown-btn" onclick="togglePostMenu(event, '${post.id}')">⋯</button>
                <div class="dropdown-menu" id="menu-${post.id}" style="display:none;">
                    <div class="dropdown-item" onclick="copyPostLink('${post.id}')">🔗 نسخ الرابط</div>
                    <div class="dropdown-item" onclick="saveForLater('${post.id}')">🔖 قراءة لاحقاً</div>
                    <div class="dropdown-item" onclick="reportPost('${post.id}')">🚩 إبلاغ</div>
                </div>
            </div>
        </div>
        
        ${firstImage ? `
            <div class="post-image-container">
                <img src="${firstImage}" alt="${post.title}" class="post-image" loading="lazy" onerror="this.style.display='none'">
            </div>
        ` : ''}
        
        <div class="post-body">
            <h3 class="post-title">
                <a href="#" onclick="openPost('${post.id}'); return false;">${post.title}</a>
            </h3>
            
            <div class="post-meta">
                <span class="post-author">✍️ ${post.author || 'مجهول'}</span>
                <span class="post-date">🕒 ${timeAgo(post.date)}</span>
                ${post.views ? `<span class="post-views">👁️ ${post.views} مشاهدة</span>` : ''}
            </div>
            
            <div class="post-content">
                <p>${displayText}</p>
                ${textPreview.length > 250 ? '<span class="read-more" onclick="openPost(\'' + post.id + '\')">... اقرأ المزيد</span>' : ''}
            </div>
        </div>
        
        <div class="post-actions">
            <button class="action-btn like-btn ${post.likedByUser ? 'liked' : ''}" 
                    onclick="toggleLike('${post.id}')">
                👍 <span class="like-text">${post.likedByUser ? 'أعجبني' : 'إعجاب'}</span>
                <span class="like-count">(${post.likes || 0})</span>
            </button>
            
            <button class="action-btn comment-btn" 
                    onclick="toggleComments('${post.id}')">
                💬 تعليق
                <span class="comment-count">(${post.comments ? post.comments.length : 0})</span>
            </button>
            
            <button class="action-btn share-btn" 
                    onclick="sharePost('${post.id}')">
                📤 مشاركة
            </button>
            
            <button class="action-btn translate-btn" 
                    onclick="translatePost('${post.id}')">
                🌐 ترجمة
            </button>
        </div>
        
        <!-- قسم التعليقات (مخفي افتراضياً) -->
        <div class="comments-section" id="comments-${post.id}" style="display:none;">
            <div class="comments-list" id="comments-list-${post.id}">
                ${(post.comments || []).map(comment => `
                    <div class="comment-item">
                        <div class="comment-avatar">👤</div>
                        <div class="comment-content">
                            <span class="comment-author">${comment.author || 'زائر'}</span>
                            <span class="comment-date">${timeAgo(comment.date)}</span>
                            <p>${comment.text}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="comment-form">
                <input type="text" 
                       class="comment-input" 
                       id="comment-input-${post.id}" 
                       placeholder="اكتب تعليقاً..." 
                       onkeypress="if(event.key==='Enter') addComment('${post.id}')">
                <button class="comment-submit-btn" 
                        onclick="addComment('${post.id}')">نشر</button>
            </div>
        </div>
    `;
    
    return card;
}

// ---------- دوال التفاعل ----------

/**
 * تبديل حالة الإعجاب على مقال
 * @param {string} postId - معرف المقال
 */
async function toggleLike(postId) {
    try {
        const postRef = db.collection('posts').doc(postId);
        const postDoc = await postRef.get();
        
        if (!postDoc.exists) return;
        
        const post = postDoc.data();
        const currentLikes = post.likes || 0;
        const likedBy = post.likedBy || [];
        
        // التحقق إذا كان المستخدم قد أعجب مسبقاً (باستخدام معرف مؤقت للمتصفح)
        const userFingerprint = getVisitorId();
        const hasLiked = likedBy.includes(userFingerprint);
        
        if (hasLiked) {
            // إلغاء الإعجاب
            await postRef.update({
                likes: Math.max(0, currentLikes - 1),
                likedBy: firebase.firestore.FieldValue.arrayRemove(userFingerprint),
                likedByUser: false
            });
        } else {
            // إعجاب
            await postRef.update({
                likes: currentLikes + 1,
                likedBy: firebase.firestore.FieldValue.arrayUnion(userFingerprint),
                likedByUser: true
            });
        }
        
        // تحديث البطاقة في الواجهة (إعادة تحميل خفيف)
        updatePostCardLikes(postId);
        
    } catch (error) {
        console.error('خطأ في تحديث الإعجاب:', error);
    }
}

/**
 * تحديث عداد الإعجاب في بطاقة المقال دون إعادة تحميل كامل
 * @param {string} postId
 */
async function updatePostCardLikes(postId) {
    try {
        const postDoc = await db.collection('posts').doc(postId).get();
        if (!postDoc.exists) return;
        
        const post = postDoc.data();
        const likeBtn = document.querySelector(`#post-${postId} .like-btn`);
        const likeCount = document.querySelector(`#post-${postId} .like-count`);
        const likeText = document.querySelector(`#post-${postId} .like-text`);
        
        if (likeBtn && likeCount) {
            const hasLiked = (post.likedBy || []).includes(getVisitorId());
            likeBtn.classList.toggle('liked', hasLiked);
            likeCount.textContent = `(${post.likes || 0})`;
            if (likeText) likeText.textContent = hasLiked ? 'أعجبني' : 'إعجاب';
        }
    } catch (e) {}
}

/**
 * إظهار/إخفاء قسم التعليقات
 * @param {string} postId
 */
function toggleComments(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    if (!commentsSection) return;
    
    const isVisible = commentsSection.style.display !== 'none';
    
    // إخفاء جميع أقسام التعليقات الأخرى أولاً
    document.querySelectorAll('.comments-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // تبديل الحالة
    commentsSection.style.display = isVisible ? 'none' : 'block';
    activeCommentPostId = isVisible ? null : postId;
    
    // تركيز على حقل الإدخال إذا كان ظاهراً
    if (!isVisible) {
        const input = document.getElementById(`comment-input-${postId}`);
        if (input) setTimeout(() => input.focus(), 200);
    }
}

/**
 * إضافة تعليق جديد على مقال
 * @param {string} postId
 */
async function addComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;
    
    try {
        const postRef = db.collection('posts').doc(postId);
        const newComment = {
            id: generateId(),
            author: 'زائر', // يمكن تغييره لاحقاً مع نظام المستخدمين
            text: sanitizeHTML(text),
            date: new Date().toISOString()
        };
        
        await postRef.update({
            comments: firebase.firestore.FieldValue.arrayUnion(newComment)
        });
        
        // إعادة تحميل التعليقات في البطاقة
        await refreshComments(postId);
        
        // مسح حقل الإدخال
        input.value = '';
        
    } catch (error) {
        console.error('خطأ في إضافة التعليق:', error);
        alert('⚠️ حدث خطأ أثناء إضافة التعليق');
    }
}

/**
 * تحديث عرض التعليقات في بطاقة المقال
 * @param {string} postId
 */
async function refreshComments(postId) {
    try {
        const postDoc = await db.collection('posts').doc(postId).get();
        if (!postDoc.exists) return;
        
        const post = postDoc.data();
        const commentsList = document.getElementById(`comments-list-${postId}`);
        const commentCount = document.querySelector(`#post-${postId} .comment-count`);
        
        if (commentsList) {
            commentsList.innerHTML = (post.comments || []).map(comment => `
                <div class="comment-item">
                    <div class="comment-avatar">👤</div>
                    <div class="comment-content">
                        <span class="comment-author">${comment.author || 'زائر'}</span>
                        <span class="comment-date">${timeAgo(comment.date)}</span>
                        <p>${comment.text}</p>
                    </div>
                </div>
            `).join('');
        }
        
        if (commentCount) {
            commentCount.textContent = `(${post.comments ? post.comments.length : 0})`;
        }
    } catch (e) {}
}

// ---------- دوال مساعدة للتفاعلات ----------

/**
 * الحصول على معرف فريد للزائر (بصمة المتصفح)
 * @returns {string}
 */
function getVisitorId() {
    let visitorId = localStorage.getItem('visitorId');
    if (!visitorId) {
        visitorId = generateId();
        localStorage.setItem('visitorId', visitorId);
    }
    return visitorId;
}

/**
 * نسخ رابط المقال
 * @param {string} postId
 */
function copyPostLink(postId) {
    const url = `${window.location.origin}${window.location.pathname}?post=${postId}`;
    navigator.clipboard.writeText(url).then(() => {
        alert('✅ تم نسخ الرابط');
    });
    closeAllMenus();
}

/**
 * مشاركة المقال (Web Share API)
 * @param {string} postId
 */
async function sharePost(postId) {
    const url = `${window.location.origin}${window.location.pathname}?post=${postId}`;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'مقال من ALSHANFRICC',
                url: url
            });
        } catch (e) {}
    } else {
        copyPostLink(postId);
    }
}

/**
 * فتح مقال كامل (للقراءة الموسعة) - سيتم تطويره لاحقاً
 * @param {string} postId
 */
function openPost(postId) {
    // يمكن فتح المقال في صفحة منفصلة أو نافذة منبثقة
    const url = `${window.location.origin}${window.location.pathname}?post=${postId}`;
    window.open(url, '_blank');
}

/**
 * حفظ المقال للقراءة لاحقاً
 * @param {string} postId
 */
function saveForLater(postId) {
    let saved = JSON.parse(localStorage.getItem('savedPosts') || '[]');
    if (saved.includes(postId)) {
        saved = saved.filter(id => id !== postId);
        alert('🔖 تمت إزالة المقال من المحفوظات');
    } else {
        saved.push(postId);
        alert('🔖 تم حفظ المقال للقراءة لاحقاً');
    }
    localStorage.setItem('savedPosts', JSON.stringify(saved));
    closeAllMenus();
}

/**
 * إبلاغ عن مقال
 * @param {string} postId
 */
function reportPost(postId) {
    alert('🚩 تم استلام بلاغك وسيتم مراجعته.');
    closeAllMenus();
}

/**
 * ترجمة المقال (استخدام Google Translate)
 * @param {string} postId
 */
function translatePost(postId) {
    const card = document.getElementById(`post-${postId}`);
    if (!card) return;
    
    const content = card.querySelector('.post-content');
    if (!content) return;
    
    // فتح المقال في Google Translate
    const postUrl = `${window.location.origin}${window.location.pathname}?post=${postId}`;
    const translateUrl = `https://translate.google.com/translate?sl=ar&tl=en&u=${encodeURIComponent(postUrl)}`;
    window.open(translateUrl, '_blank');
}

// ---------- دوال القائمة المنسدلة ----------

/**
 * إظهار/إخفاء قائمة الخيارات للبطاقة
 * @param {Event} event
 * @param {string} postId
 */
function togglePostMenu(event, postId) {
    event.stopPropagation();
    closeAllMenus();
    const menu = document.getElementById(`menu-${postId}`);
    if (menu) menu.style.display = 'block';
}

/**
 * إغلاق جميع القوائم المنسدلة
 */
function closeAllMenus() {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.style.display = 'none';
    });
}

// إغلاق القوائم عند النقر خارجها
document.addEventListener('click', () => closeAllMenus());

// ---------- البحث في المقالات ----------

/**
 * البحث في المقالات (تستدعى من header.js)
 * @param {string} query - كلمة البحث
 */
function searchPosts(query) {
    currentSearchQuery = query.trim();
    loadPosts(false);
}

// ---------- التمرير اللانهائي ----------

/**
 * مراقبة التمرير لتحميل المزيد من المقالات
 */
function setupInfiniteScroll() {
    const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isLoadingPosts && !allPostsLoaded) {
                loadPosts(true);
            }
        });
    }, options);
    
    // مراقبة آخر بطاقة (سيتم تحديثها باستمرار)
    setInterval(() => {
        const cards = document.querySelectorAll('.post-card');
        if (cards.length > 0) {
            const lastCard = cards[cards.length - 1];
            observer.observe(lastCard);
        }
    }, 1000);
}

// تهيئة التمرير اللانهائي
setupInfiniteScroll();

// ---------- تأكيد التحميل ----------
console.log("✅ ملف body.js تم تحميله بنجاح");
