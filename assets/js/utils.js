// ============================================================
//  ملف: utils.js (مُحدّث)
//  الوظيفة: دوال مساعدة مشتركة لجميع أجزاء الموقع
//  يشمل: إدارة الإعدادات، تنسيق الوقت، معالجة النصوص، الخطوط
//  يعتمد على: firebase-config.js
// ============================================================

// ---------- 1. الإعدادات الافتراضية ----------
const DEFAULT_SETTINGS = {
  siteName: 'ALSHANFRICC',
  subtitle: 'مساحة الأناقة والمعرفة',
  primaryColor: '#c48b4c',
  logoFont: 'Playfair Display',
  bodyFont: 'Cairo',
  darkMode: false,
  footerText: 'جميع الحقوق محفوظة',
  facebookUrl: '#',
  twitterUrl: '#',
  instagramUrl: '#',
  bodyBackground: '#f0f2f5'
};

// ---------- 2. قائمة الخطوط الكاملة (20 عربي + 20 إنجليزي) ----------
const AVAILABLE_FONTS = [
  // خطوط عربية
  { name: 'Cairo', type: 'عربي' },
  { name: 'Tajawal', type: 'عربي' },
  { name: 'Amiri', type: 'عربي' },
  { name: 'El Messiri', type: 'عربي' },
  { name: 'Almarai', type: 'عربي' },
  { name: 'Changa', type: 'عربي' },
  { name: 'Reem Kufi', type: 'عربي' },
  { name: 'Scheherazade New', type: 'عربي' },
  { name: 'Markazi Text', type: 'عربي' },
  { name: 'Harmattan', type: 'عربي' },
  { name: 'Lateef', type: 'عربي' },
  { name: 'Aref Ruqaa', type: 'عربي' },
  { name: 'Rakkas', type: 'عربي' },
  { name: 'Lemonada', type: 'عربي' },
  { name: 'Baloo Bhaijaan 2', type: 'عربي' },
  { name: 'Noto Naskh Arabic', type: 'عربي' },
  { name: 'Noto Kufi Arabic', type: 'عربي' },
  { name: 'Mada', type: 'عربي' },
  { name: 'Zain', type: 'عربي' },
  { name: 'Ibrahim', type: 'عربي' },
  // خطوط إنجليزية
  { name: 'Playfair Display', type: 'إنجليزي' },
  { name: 'Poppins', type: 'إنجليزي' },
  { name: 'Lora', type: 'إنجليزي' },
  { name: 'Montserrat', type: 'إنجليزي' },
  { name: 'Roboto', type: 'إنجليزي' },
  { name: 'Open Sans', type: 'إنجليزي' },
  { name: 'Raleway', type: 'إنجليزي' },
  { name: 'Oswald', type: 'إنجليزي' },
  { name: 'Merriweather', type: 'إنجليزي' },
  { name: 'Pacifico', type: 'إنجليزي' },
  { name: 'Nunito', type: 'إنجليزي' },
  { name: 'Quicksand', type: 'إنجليزي' },
  { name: 'Fira Sans', type: 'إنجليزي' },
  { name: 'Ubuntu', type: 'إنجليزي' },
  { name: 'PT Serif', type: 'إنجليزي' },
  { name: 'Bitter', type: 'إنجليزي' },
  { name: 'Josefin Sans', type: 'إنجليزي' },
  { name: 'Dancing Script', type: 'إنجليزي' },
  { name: 'Cinzel', type: 'إنجليزي' },
  { name: 'Abril Fatface', type: 'إنجليزي' }
];

// ---------- 3. التخزين المؤقت للإعدادات ----------
let cachedSettings = null;
let cacheExpiry = 0;

/**
 * جلب جميع الإعدادات من Firestore مع تخزين مؤقت (5 دقائق)
 * @returns {Object} كائن الإعدادات
 */
async function getAllSettingsCached() {
  const now = Date.now();
  if (cachedSettings && now < cacheExpiry) {
    return cachedSettings;
  }
  try {
    const doc = await db.collection('settings').doc('site').get();
    if (doc.exists) {
      cachedSettings = { ...DEFAULT_SETTINGS, ...doc.data() };
    } else {
      cachedSettings = { ...DEFAULT_SETTINGS };
    }
    cacheExpiry = now + 300000; // 5 دقائق
    return cachedSettings;
  } catch (error) {
    console.error('خطأ في جلب الإعدادات:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * جلب قيمة إعداد واحد (يستخدم التخزين المؤقت)
 * @param {string} key
 * @param {*} defaultValue
 * @returns {*}
 */
async function getSetting(key, defaultValue = '') {
  const settings = await getAllSettingsCached();
  return settings[key] !== undefined ? settings[key] : defaultValue;
}

/**
 * تحديث إعداد معين في Firestore وإبطال التخزين المؤقت
 * @param {string} key
 * @param {*} value
 */
async function updateSetting(key, value) {
  try {
    await db.collection('settings').doc('site').set({ [key]: value }, { merge: true });
    // إبطال التخزين المؤقت ليعكس التغييرات فوراً
    cachedSettings = null;
    cacheExpiry = 0;
    console.log(`✅ تم تحديث الإعداد: ${key}`);
  } catch (error) {
    console.error(`خطأ في تحديث الإعداد (${key}):`, error);
  }
}

// ---------- 4. دوال الوقت والتاريخ ----------
function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 0) return 'الآن';
  if (seconds < 60) return 'الآن';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `قبل ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `قبل ${days} يوم`;
  const months = Math.floor(days / 30);
  if (months < 12) return `قبل ${months} شهر`;
  return `قبل ${Math.floor(days / 365)} سنة`;
}

function formatDateArabic(date) {
  return new Date(date).toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

// ---------- 5. دوال النصوص والمحتوى ----------
function truncateText(text, maxLength = 200) {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength) + '...';
}

function getFirstImage(contentArray) {
  if (!Array.isArray(contentArray)) return null;
  // يبحث عن أول صورة (قد تكون عنصر type=images أو type=image)
  const img = contentArray.find(el => el.type === 'image' || el.type === 'images');
  if (!img) return null;
  if (img.type === 'image') return img.value; // رابط مباشر
  if (img.images && img.images.length > 0) return img.images[0].dataUrl || img.images[0];
  return null;
}

function getTextOnly(contentArray) {
  if (!Array.isArray(contentArray)) return '';
  return contentArray
    .filter(el => el.type === 'text' || el.type === 'subtitle' || el.type === 'markdown' || el.type === 'html')
    .map(el => el.value || '')
    .join(' ')
    .substring(0, 300);
}

function escapeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

// ---------- 6. دوال عامة ----------
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function scrollToElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ---------- 7. تطبيق خط ديناميكي (للواجهة الأمامية) ----------
function applyFont(fontFamily, target = 'body') {
  if (target === 'body') {
    document.body.style.fontFamily = fontFamily + ', sans-serif';
  } else if (target === 'title') {
    const titles = document.querySelectorAll('.site-title, .post-title, .logo');
    titles.forEach(el => el.style.fontFamily = fontFamily + ', serif');
  }
  // تحديث رابط Google Fonts إذا لزم الأمر
  const link = document.getElementById('dynamic-font-link');
  if (link) {
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;700&display=swap`;
  }

  function parseMarkdown(text) {
  if (!text) return '';
  let html = text;
  // عناوين
  html = html.replace(/^### (.+)$/gm, '<h4 class="md-h4">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2 class="md-h2">$1</h2>');
  // خط عريض ومائل
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // روابط
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  // صور Markdown
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">');
  // قوائم
  html = html.replace(/^\- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  // أسطر جديدة
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');
  // خط أفقي
  html = html.replace(/^---$/gm, '<hr>');
  // جداول بسيطة (اختياري)
  return html;
  }
}

// ---------- 8. تأكيد التحميل ----------
console.log("✅ ملف utils.js تم تحميله بنجاح - جميع الدوال المساعدة جاهزة");
