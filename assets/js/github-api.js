// ============================================================
//  ملف: github-api.js (مُحدّث - قراءات غير محدودة)
//  الوظيفة: بديل Firebase - التعامل مع GitHub
//  يشمل: قراءة عبر Raw (غير محدود)، كتابة عبر API
//  البديل عن: firebase-config.js
// ============================================================

// ---------- 1. إعدادات GitHub ----------
const GITHUB_CONFIG = {
    owner: 'kings591998',
    repo: 'King',
    branch: 'main',
    rawBaseUrl: 'https://raw.githubusercontent.com',
    apiBaseUrl: 'https://api.github.com'
};

// ---------- 2. إدارة التخزين المؤقت (Cache) ----------
const CACHE = {
    prefix: 'gh_cache_',
    duration: 10 * 60 * 1000, // 10 دقائق

    get(key) {
        try {
            const raw = localStorage.getItem(this.prefix + key);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (Date.now() - data.timestamp > this.duration) {
                localStorage.removeItem(this.prefix + key);
                return null;
            }
            return data.value;
        } catch (e) {
            return null;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify({
                value: value,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('⚠️ فشل حفظ في Cache:', e);
        }
    },

    clear() {
        Object.keys(localStorage)
            .filter(k => k.startsWith(this.prefix))
            .forEach(k => localStorage.removeItem(k));
    }
};

// ---------- 3. إدارة Token الأدمن ----------
const AUTH = {
    tokenKey: 'gh_admin_token',

    getToken() {
        return localStorage.getItem(this.tokenKey) || '';
    },

    setToken(token) {
        localStorage.setItem(this.tokenKey, token);
    },

    removeToken() {
        localStorage.removeItem(this.tokenKey);
    },

    isLoggedIn() {
        return !!this.getToken();
    },

    getHeaders() {
        const headers = {
            'Accept': 'application/vnd.github.v3+json'
        };
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `token ${token}`;
        }
        return headers;
    }
};

// ---------- 4. دوال القراءة (عبر Raw - غير محدود!) ----------

/**
 * جلب ملف JSON عبر Raw URL (غير محدود)
 */
async function fetchRawJSON(filePath) {
    // محاولة من الكاش أولاً
    const cached = CACHE.get(filePath);
    if (cached) return cached;

    try {
        const url = `${GITHUB_CONFIG.rawBaseUrl}/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${filePath}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        CACHE.set(filePath, data);
        return data;
    } catch (error) {
        console.error(`خطأ في جلب ${filePath}:`, error);
        return null;
    }
}

/**
 * جلب قائمة جميع المقالات (الفهرس)
 */
async function getPostsList() {
    return await fetchRawJSON('posts-list.json');
}

/**
 * جلب مقال واحد بالتفصيل
 */
async function getPost(postId) {
    return await fetchRawJSON(`posts/${postId}.json`);
}

/**
 * جلب التصنيفات
 */
async function getCategories() {
    return await fetchRawJSON('categories.json');
}

/**
 * جلب إعدادات الموقع
 */
async function getSettings() {
    const settings = await fetchRawJSON('settings.json');
    return settings || getDefaultSettings();
}

/**
 * جلب الصفحات الثابتة
 */
async function getStaticPages() {
    return await fetchRawJSON('static-pages.json');
}

/**
 * جلب الكتّاب
 */
async function getAuthors() {
    return await fetchRawJSON('authors.json');
}

// ---------- 5. دوال الكتابة (للأدمن فقط - عبر API) ----------

/**
 * إنشاء أو تحديث ملف في GitHub (عبر API)
 */
async function createOrUpdateFile(path, content, message) {
    if (!AUTH.isLoggedIn()) {
        throw new Error('⚠️ يجب تسجيل الدخول أولاً');
    }

    try {
        // محاولة جلب الملف الحالي للحصول على SHA
        let sha = null;
        try {
            const existing = await githubApiRequest(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}?ref=${GITHUB_CONFIG.branch}`);
            sha = existing.sha;
        } catch (e) {
            // الملف غير موجود - إنشاء جديد
        }

        const encodedContent = btoa(unescape(encodeURIComponent(content)));
        const body = {
            message: message,
            content: encodedContent,
            branch: GITHUB_CONFIG.branch
        };
        if (sha) body.sha = sha;

        await githubApiRequest(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`, {
            method: 'PUT',
            headers: AUTH.getHeaders(),
            body: JSON.stringify(body)
        });

        // مسح الكاش بعد التحديث
        CACHE.clear();
        
        return true;
    } catch (error) {
        console.error('خطأ في حفظ الملف:', error);
        throw error;
    }
}

/**
 * حذف ملف من GitHub
 */
async function deleteFile(path, message) {
    if (!AUTH.isLoggedIn()) {
        throw new Error('⚠️ يجب تسجيل الدخول أولاً');
    }

    try {
        const existing = await githubApiRequest(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}?ref=${GITHUB_CONFIG.branch}`);
        
        await githubApiRequest(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`, {
            method: 'DELETE',
            headers: AUTH.getHeaders(),
            body: JSON.stringify({
                message: message,
                sha: existing.sha,
                branch: GITHUB_CONFIG.branch
            })
        });

        CACHE.clear();
        return true;
    } catch (error) {
        console.error('خطأ في حذف الملف:', error);
        throw error;
    }
}

/**
 * طلب API (للكتابة فقط)
 */
async function githubApiRequest(endpoint, options = {}) {
    const url = `${GITHUB_CONFIG.apiBaseUrl}${endpoint}`;
    const defaultOptions = {
        headers: AUTH.getHeaders(),
        ...options
    };

    try {
        const response = await fetch(url, defaultOptions);
        
        if (response.status === 403) {
            const data = await response.json();
            if (data.message.includes('rate limit')) {
                throw new Error('⚠️ تجاوزت حد الطلبات. انتظر ساعة.');
            }
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (options.method === 'HEAD' || options.method === 'DELETE') {
            return true;
        }

        return await response.json();
    } catch (error) {
        console.error('❌ GitHub API Error:', error);
        throw error;
    }
}

/**
 * إنشاء مقال جديد
 */
async function createPost(postData) {
    const postId = 'post-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const content = JSON.stringify(postData, null, 2);
    
    await createOrUpdateFile(
        `posts/${postId}.json`,
        content,
        `إضافة مقال جديد: ${postData.title}`
    );

    // تحديث الفهرس
    await updatePostsIndex(postId, postData);
    
    return postId;
}

/**
 * تعديل مقال موجود
 */
async function updatePost(postId, postData) {
    const content = JSON.stringify(postData, null, 2);
    
    await createOrUpdateFile(
        `posts/${postId}.json`,
        content,
        `تعديل مقال: ${postData.title}`
    );

    // تحديث الفهرس
    await updatePostsIndex(postId, postData);
    
    return true;
}

/**
 * حذف مقال
 */
async function deletePost(postId) {
    await deleteFile(
        `posts/${postId}.json`,
        `حذف مقال: ${postId}`
    );

    // تحديث الفهرس
    await removeFromPostsIndex(postId);
    
    return true;
}

/**
 * تحديث فهرس المقالات (posts-list.json)
 */
async function updatePostsIndex(postId, postData) {
    let postsList = await getPostsList() || [];
    
    // إزالة المقال القديم إن وجد
    postsList = postsList.filter(p => p.id !== postId);
    
    // إضافة البيانات الأساسية للفهرس
    const indexEntry = {
        id: postId,
        title: postData.title,
        author: postData.author || 'مجهول',
        authorId: postData.authorId || null,
        category: postData.category || null,
        categoryName: postData.categoryName || '',
        subcategory: postData.subcategory || null,
        subcategoryName: postData.subcategoryName || '',
        date: postData.date || new Date().toISOString(),
        views: postData.views || 0,
        likes: postData.likes || 0,
        commentsCount: postData.comments ? postData.comments.length : 0,
        // أول صورة للمعاينة
        thumbnail: getFirstImage(postData.content || [])
    };
    
    postsList.unshift(indexEntry);
    
    // ترتيب حسب التاريخ
    postsList.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    await createOrUpdateFile(
        'posts-list.json',
        JSON.stringify(postsList, null, 2),
        'تحديث فهرس المقالات'
    );
}

/**
 * إزالة مقال من الفهرس
 */
async function removeFromPostsIndex(postId) {
    let postsList = await getPostsList() || [];
    postsList = postsList.filter(p => p.id !== postId);
    
    await createOrUpdateFile(
        'posts-list.json',
        JSON.stringify(postsList, null, 2),
        'تحديث فهرس المقالات - حذف'
    );
}

/**
 * تحديث إعدادات الموقع
 */
async function updateSettings(settingsData) {
    await createOrUpdateFile(
        'settings.json',
        JSON.stringify(settingsData, null, 2),
        'تحديث إعدادات الموقع'
    );
}

/**
 * تحديث التصنيفات
 */
async function updateCategories(categoriesData) {
    await createOrUpdateFile(
        'categories.json',
        JSON.stringify(categoriesData, null, 2),
        'تحديث التصنيفات'
    );
}

/**
 * تحديث الكتّاب
 */
async function updateAuthors(authorsData) {
    await createOrUpdateFile(
        'authors.json',
        JSON.stringify(authorsData, null, 2),
        'تحديث الكتّاب'
    );
}

/**
 * تحديث الصفحات الثابتة
 */
async function updateStaticPages(pagesData) {
    await createOrUpdateFile(
        'static-pages.json',
        JSON.stringify(pagesData, null, 2),
        'تحديث الصفحات الثابتة'
    );
}

// ---------- 6. الإعدادات الافتراضية ----------
function getDefaultSettings() {
    return {
        siteName: 'ALSHANFRICC',
        subtitle: 'التقنية والهواتف الذكية',
        primaryColor: '#c48b4c',
        titleFont: 'Playfair Display',
        bodyFont: 'Cairo',
        darkMode: false,
        footerText: 'جميع الحقوق محفوظة',
        facebookUrl: '#',
        twitterUrl: '#',
        instagramUrl: '#',
        bodyBackground: '#f0f2f5',
        headerBgImage: '',
        backgroundImages: [],
        backgroundInterval: 60
    };
}

// ---------- 7. دوال مساعدة للصور ----------
function getFirstImage(contentArray) {
    if (!Array.isArray(contentArray)) return null;
    for (let item of contentArray) {
        if (item.type === 'images' && item.images && item.images.length > 0) {
            const first = item.images[0];
            return first.dataUrl || first.url || first;
        }
    }
    return null;
}

// ---------- 8. تسجيل دخول الأدمن عبر GitHub Token ----------
async function loginWithToken(token) {
    try {
        // التحقق من صحة التوكن
        const user = await githubApiRequest('/user', {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${token}`
            }
        });
        
        AUTH.setToken(token);
        CACHE.clear();
        
        return {
            success: true,
            user: user.login,
            avatar: user.avatar_url
        };
    } catch (error) {
        AUTH.removeToken();
        return {
            success: false,
            error: 'توكن غير صالح'
        };
    }
}

function logout() {
    AUTH.removeToken();
    CACHE.clear();
}

// ---------- 9. تصدير الدوال (للاستخدام في الملفات الأخرى) ----------
window.GitHubAPI = {
    // قراءة (عبر Raw - غير محدود)
    getPostsList,
    getPost,
    getCategories,
    getSettings,
    getStaticPages,
    getAuthors,
    
    // كتابة (عبر API - للأدمن فقط)
    createPost,
    updatePost,
    deletePost,
    updateSettings,
    updateCategories,
    updateAuthors,
    updateStaticPages,
    
    // مصادقة
    loginWithToken,
    logout,
    isLoggedIn: () => AUTH.isLoggedIn(),
    
    // Cache
    clearCache: () => CACHE.clear()
};

console.log("✅ GitHub API جاهز - قراءات غير محدودة عبر Raw!");
