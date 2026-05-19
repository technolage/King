// ============================================================
//  ملف: utils.js
//  الوظيفة: دوال مساعدة مشتركة لجميع أجزاء الموقع
//  يشمل: إدارة الإعدادات، تنسيق الوقت، معالجة النصوص، إلخ
// ============================================================

// ---------- 1. دوال الإعدادات (Firestore) ----------

/**
 * جلب قيمة إعداد معين من مجموعة "settings" > وثيقة "site"
 * @param {string} key - اسم الإعداد
 * @param {*} defaultValue - القيمة الافتراضية إذا لم يوجد الإعداد
 * @returns {*} قيمة الإعداد
 */
async function getSetting(key, defaultValue = '') {
    try {
        const doc = await db.collection('settings').doc('site').get();
        if (doc.exists && doc.data()[key] !== undefined) {
            return doc.data()[key];
        }
        return defaultValue;
    } catch (error) {
        console.error(`خطأ في جلب الإعداد (${key}):`, error);
        return defaultValue;
    }
}

/**
 * تحديث أو إنشاء إعداد معين
 * @param {string} key - اسم الإعداد
 * @param {*} value - القيمة الجديدة
 */
async function updateSetting(key, value) {
    try {
        await db.collection('settings').doc('site').set({
            [key]: value
        }, { merge: true });
        console.log(`✅ تم تحديث الإعداد: ${key}`);
    } catch (error) {
        console.error(`خطأ في تحديث الإعداد (${key}):`, error);
    }
}

/**
 * جلب جميع الإعدادات مرة واحدة
 * @returns {Object} كائن يحتوي جميع الإعدادات
 */
async function getAllSettings() {
    try {
        const doc = await db.collection('settings').doc('site').get();
        return doc.exists ? doc.data() : {};
    } catch (error) {
        console.error('خطأ في جلب جميع الإعدادات:', error);
        return {};
    }
}

// ---------- 2. دوال الوقت والتاريخ ----------

/**
 * تحويل التاريخ إلى نص "منذ فترة" بالعربية
 * @param {string|Date} date - التاريخ بصيغة ISO أو كائن Date
 * @returns {string} مثل "الآن"، "قبل 5 دقائق"، "قبل 3 أيام"
 */
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
    
    const years = Math.floor(days / 365);
    return `قبل ${years} سنة`;
}

/**
 * تنسيق التاريخ بالعربية
 * @param {string|Date} date
 * @returns {string} مثال: "15 مايو 2026"
 */
function formatDateArabic(date) {
    return new Date(date).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// ---------- 3. دوال النصوص والمحتوى ----------

/**
 * اقتطاع النص إلى عدد معين من الأحرف (للمعاينة)
 * @param {string} text - النص الكامل
 * @param {number} maxLength - أقصى عدد أحرف
 * @returns {string} النص المقتطع مع "..."
 */
function truncateText(text, maxLength = 200) {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength) + '...';
}

/**
 * استخراج أول رابط صورة من مصفوفة محتوى المقال
 * @param {Array} contentArray - مصفوفة عناصر المحتوى
 * @returns {string|null} رابط الصورة الأولى أو null
 */
function getFirstImage(contentArray) {
    if (!Array.isArray(contentArray)) return null;
    const imageElement = contentArray.find(el => el.type === 'image');
    return imageElement ? imageElement.value : null;
}

/**
 * استخراج نص المحتوى فقط (بدون صور) للمعاينة
 * @param {Array} contentArray
 * @returns {string}
 */
function getTextOnly(contentArray) {
    if (!Array.isArray(contentArray)) return '';
    return contentArray
        .filter(el => el.type === 'text' || el.type === 'quote')
        .map(el => el.value)
        .join(' ')
        .substring(0, 300);
}

// ---------- 4. دوال الأمان والتنظيف ----------

/**
 * تنظيف النص من أكواد HTML ضارة (حماية XSS بسيطة)
 * @param {string} str - النص المدخل
 * @returns {string} النص النظيف
 */
function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

/**
 * إنشاء معرف فريد (UUID مبسط)
 * @returns {string} معرف فريد
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ---------- 5. دوال واجهة المستخدم ----------

/**
 * Debounce لتأخير تنفيذ دالة (مفيدة لحقل البحث)
 * @param {Function} func - الدالة المراد تأخيرها
 * @param {number} wait - وقت الانتظار بالميلي ثانية
 * @returns {Function}
 */
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

/**
 * تمرير سلس إلى عنصر معين
 * @param {string} elementId - معرف العنصر
 */
function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ============================================================
// قائمة الخطوط الكاملة (20 عربي + 20 إنجليزي)
// ============================================================
const AVAILABLE_FONTS = [
  // ---- خطوط عربية ----
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

  // ---- خطوط إنجليزية ----
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

// ---------- 6. تأكيد التحميل ----------
console.log("✅ ملف utils.js تم تحميله بنجاح - جميع الدوال المساعدة جاهزة");
