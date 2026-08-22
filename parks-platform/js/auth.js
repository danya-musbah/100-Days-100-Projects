/* =========================================================
   auth.js — تسجيل الدخول / إنشاء حساب / إدارة الجلسة
   يعتمد على LocalStorage لمحاكاة الجلسة (Session) في هذه النسخة
   ملاحظة أمنية: هذا تحقق واجهة أمامية فقط لأغراض العرض التجريبي.
   عند ربط المشروع بقاعدة بيانات حقيقية، يجب تطبيق التحقق
   والتفويض (Authorization) الفعلي داخل الخادم (Flask) وليس هنا فقط.
   ========================================================= */
'use strict';

function ppRoleHome(role){
  const map = {
    visitor: 'index.html',
    park_admin: 'admin/park-dashboard.html',
    super_admin: 'super-admin/dashboard.html'
  };
  return map[role] || 'index.html';
}

function ppHandleLogin(e){
  e.preventDefault();
  const form = e.target;
  const email = form.email.value.trim().toLowerCase();
  const password = form.password.value;
  let hasError = false;

  clearFieldError(form.email);
  clearFieldError(form.password);

  if (!email){ setFieldError(form.email, 'الرجاء إدخال البريد الإلكتروني'); hasError = true; }
  if (!password){ setFieldError(form.password, 'الرجاء إدخال كلمة المرور'); hasError = true; }
  if (hasError) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'جاري التحقق...';

  setTimeout(() => {
    const admins = PPStorage.getAdmins();
    const superAdmin = admins.super_admins.find(a => a.email === email && a.password === password);
    const parkAdmin = admins.park_admins.find(a => a.email === email && a.password === password);
    const visitor = PPStorage.findUserByEmail(email);

    if (superAdmin){
      PPStorage.setSession({ role: 'super_admin', email, name: superAdmin.name, id: superAdmin.id });
      ppToast('أهلًا بعودتك، تم تسجيل الدخول بنجاح', 'success');
      setTimeout(() => window.location.href = ppRoleHome('super_admin'), 500);
    } else if (parkAdmin){
      PPStorage.setSession({ role: 'park_admin', email, name: parkAdmin.name, id: parkAdmin.id, parkId: parkAdmin.park_id });
      ppToast('أهلًا بعودتك، تم تسجيل الدخول بنجاح', 'success');
      setTimeout(() => window.location.href = ppRoleHome('park_admin'), 500);
    } else if (visitor && visitor.password === password){
      PPStorage.setSession({ role: 'visitor', email, name: visitor.name, id: visitor.id });
      ppToast('أهلًا بعودتك، تم تسجيل الدخول بنجاح', 'success');
      setTimeout(() => window.location.href = ppRoleHome('visitor'), 500);
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = 'تسجيل الدخول';
      ppToast('البريد الإلكتروني أو كلمة المرور غير صحيحة', 'error');
    }
  }, 500);
}

function ppHandleRegister(e){
  e.preventDefault();
  const form = e.target;
  const name = form.name.value.trim();
  const email = form.email.value.trim().toLowerCase();
  const phone = form.phone.value.trim();
  const password = form.password.value;
  const confirm = form.confirm.value;

  ['name','email','phone','password','confirm'].forEach(f => clearFieldError(form[f]));
  let hasError = false;

  if (name.length < 3){ setFieldError(form.name, 'الاسم يجب أن يكون 3 أحرف على الأقل'); hasError = true; }
  if (!/^\S+@\S+\.\S+$/.test(email)){ setFieldError(form.email, 'الرجاء إدخال بريد إلكتروني صحيح'); hasError = true; }
  if (!/^0?9\d{8}$/.test(phone.replace(/\s/g,''))){ setFieldError(form.phone, 'رقم الهاتف غير صحيح'); hasError = true; }
  if (password.length < 6){ setFieldError(form.password, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'); hasError = true; }
  if (password !== confirm){ setFieldError(form.confirm, 'كلمتا المرور غير متطابقتين'); hasError = true; }
  if (hasError) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'جاري إنشاء الحساب...';

  setTimeout(() => {
    const result = PPStorage.registerUser({ name, email, phone, password });
    if (!result.ok){
      submitBtn.disabled = false;
      submitBtn.textContent = 'إنشاء حساب';
      ppToast('هذا البريد الإلكتروني مستخدم بالفعل', 'error');
      return;
    }
    PPStorage.setSession({ role: 'visitor', email, name, id: result.id });
    ppToast('تم إنشاء الحساب بنجاح، أهلًا بك!', 'success');
    setTimeout(() => window.location.href = 'index.html', 500);
  }, 600);
}

function setFieldError(input, message){
  const field = input.closest('.field');
  if (!field) return;
  field.classList.add('error');
  const msg = field.querySelector('.error-msg');
  if (msg) msg.textContent = message;
}
function clearFieldError(input){
  const field = input.closest('.field');
  if (!field) return;
  field.classList.remove('error');
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', ppHandleLogin);

  const registerForm = document.getElementById('registerForm');
  if (registerForm) registerForm.addEventListener('submit', ppHandleRegister);
});
