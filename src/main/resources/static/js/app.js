/**
 * MedicalCare+ Frontend Application Logic
 * 병원 예약 시스템 프론트엔드
 */

// ===============================
// ⚙️ 설정
// ===============================
const API_BASE_URL = '/api';

// ===============================
// 🛡️ XSS 방지 헬퍼
// ===============================
function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
}

// ===============================
// 🗄️ 상태 관리
// ===============================
const state = {
    user: null,
    token: null,
    doctors: [],
    reservations: [],
    selectedDoctor: null,
    availableSlots: [],
    notificationSource: null
};

// ===============================
// 🌐 DOM
// ===============================
const DOM = {
    // Nav
    navHome: document.getElementById('nav-home'),
    navNotifications: document.getElementById('nav-notifications'),
    navMypage: document.getElementById('nav-mypage'),
    navLogout: document.getElementById('nav-logout'),

    // Sections
    authSection: document.getElementById('auth-section'),
    dashboardSection: document.getElementById('dashboard-section'),
    mypageSection: document.getElementById('mypage-section'),
    notificationsSection: document.getElementById('notifications-section'),
    notificationsList: document.getElementById('notifications-list'),

    // Auth
    authTitle: document.getElementById('auth-title'),
    authForm: document.getElementById('auth-form'),
    signupFields: document.getElementById('signup-fields'),
    authSubmitBtn: document.getElementById('auth-submit-btn'),
    toggleAuthBtn: document.getElementById('toggle-auth-btn'),
    authSwitchText: document.getElementById('auth-switch-text'),

    // Dashboard
    userGreeting: document.getElementById('user-greeting'),
    doctorsList: document.getElementById('doctors-list'),
    bookingForm: document.getElementById('booking-form'),
    selectedDoctorDisplay: document.getElementById('selected-doctor-display'),
    bookingInputs: document.getElementById('booking-inputs'),
    bookingDate: document.getElementById('booking-date'),
    bookingTime: document.getElementById('booking-time'),
    symptoms: document.getElementById('symptoms'),
    btnBook: document.getElementById('btn-book'),

    // MyPage
    profileName: document.getElementById('profile-name'),
    profileEmail: document.getElementById('profile-username'),
    profilePhone: document.getElementById('profile-phone'),
    bookingsList: document.getElementById('bookings-list'),

    // MyPage - 프로필 수정
    profileView: document.getElementById('profile-view'),
    profileEditForm: document.getElementById('profile-edit-form'),
    editName: document.getElementById('edit-name'),
    editPhone: document.getElementById('edit-phone'),
    btnEditProfile: document.getElementById('btn-edit-profile'),
    btnCancelEdit: document.getElementById('btn-cancel-edit'),

    // Payment Modal DOM
    paymentModal: document.getElementById('payment-modal'),
    paymentDoctorName: document.getElementById('payment-doctor-name'),
    paymentBookingDatetime: document.getElementById('payment-booking-datetime'),
    btnPaySubmit: document.getElementById('btn-pay-submit'),

    // Utils
    loader: document.getElementById('loader'),
    toast: document.getElementById('toast')
};

let isLoginMode = true;

// ===============================
// 🔑 JWT DECODE HELPER
// ===============================
function decodeJwt(t) {
    try {
        return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    } catch (e) {
        return {};
    }
}

// ===============================
// 🧑 한국식 표시 이름 조합
// ===============================
// JWT 클레임에서 성(family_name/lastName)과 이름(given_name/firstName)을 조합해
// 한국식 "성+이름"(예: 김민준)으로 만든다. 클레임이 없으면 name/preferred_username으로
// graceful fallback 한다.
function buildDisplayName(claims) {
    if (!claims) return '';
    const lastName = claims.family_name || claims.lastName || '';
    const firstName = claims.given_name || claims.firstName || '';
    const combined = `${lastName}${firstName}`.trim();
    if (combined) {
        return combined;
    }
    return claims.name || claims.preferred_username || '';
}

// ===============================
// 🚀 INIT
// ===============================
function init() {
    setupEventListeners();
    checkLoginStatus();
}

// ===============================
// 🎧 EVENT
// ===============================
function setupEventListeners() {
    DOM.navHome.addEventListener('click', (e) => {
        e.preventDefault();
        navigate('dashboard');
    });

    DOM.navNotifications.addEventListener('click', (e) => {
        e.preventDefault();
        navigate('notifications');
    });

    DOM.navMypage.addEventListener('click', (e) => {
        e.preventDefault();
        navigate('mypage');
    });

    DOM.navLogout.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    DOM.toggleAuthBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isLoginMode) {
            // 회원가입은 자체 회원가입 페이지로 이동 (login-service /api/register 호출)
            window.location.href = '/register.html';
        } else {
            toggleAuthMode();
        }
    });

    DOM.authForm.addEventListener(
        'submit',
        handleAuthSubmit
    );

    DOM.bookingForm.addEventListener(
        'submit',
        handleBookingSubmit
    );

    // 전화번호 자동 하이픈
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            e.target.value = formatPhoneNumber(e.target.value);
        });
    }

    // 마이페이지 프로필 수정
    if (DOM.btnEditProfile) {
        DOM.btnEditProfile.addEventListener('click', (e) => {
            e.preventDefault();
            enterProfileEdit();
        });
    }
    if (DOM.btnCancelEdit) {
        DOM.btnCancelEdit.addEventListener('click', (e) => {
            e.preventDefault();
            cancelProfileEdit();
        });
    }
    if (DOM.profileEditForm) {
        DOM.profileEditForm.addEventListener('submit', handleProfileUpdate);
    }
    if (DOM.editPhone) {
        DOM.editPhone.addEventListener('input', (e) => {
            e.target.value = formatPhoneNumber(e.target.value);
        });
    }

    // 결제 수단 선택 시 UI 하이라이트 토글
    const methodItems = document.querySelectorAll('.method-item');
    methodItems.forEach(item => {
        item.addEventListener('click', () => {
            methodItems.forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            const radio = item.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });

    // 결제 모달 닫기 버튼
    const btnClosePayment = document.getElementById('btn-close-payment');
    if (btnClosePayment) {
        btnClosePayment.addEventListener('click', closePaymentModal);
    }
}

// ===============================
// 🔐 VALIDATION
// ===============================
function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function validatePassword(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regex.test(password);
}

function formatPhoneNumber(value) {
    value = value.replace(/[^0-9]/g, '');
    if (value.length < 4) {
        return value;
    }
    if (value.length < 8) {
        return `${value.slice(0,3)}-${value.slice(3)}`;
    }
    return `${value.slice(0,3)}-${value.slice(3,7)}-${value.slice(7,11)}`;
}

// ===============================
// 🔄 NAVIGATION
// ===============================
function navigate(view) {
    DOM.authSection.classList.add('hidden');
    DOM.dashboardSection.classList.add('hidden');
    DOM.mypageSection.classList.add('hidden');
    DOM.notificationsSection.classList.add('hidden');

    if (state.token) {
        DOM.navHome.classList.remove('hidden');
        DOM.navNotifications.classList.remove('hidden');
        DOM.navMypage.classList.remove('hidden');
        DOM.navLogout.classList.remove('hidden');
    } else {
        DOM.navHome.classList.add('hidden');
        DOM.navNotifications.classList.add('hidden');
        DOM.navMypage.classList.add('hidden');
        DOM.navLogout.classList.add('hidden');
    }

    if (!state.token) {
        view = 'auth';
    }

    switch (view) {
        case 'auth':
            DOM.authSection.classList.remove('hidden');
            break;

        case 'dashboard':
            DOM.dashboardSection.classList.remove('hidden');
            DOM.userGreeting.textContent = state.user.name;
            loadDoctors();
            resetBookingForm();
            break;

        case 'mypage':
            DOM.mypageSection.classList.remove('hidden');
            applyMypageRoleLabels();
            cancelProfileEdit();
            renderProfile();
            loadMyBookings();
            break;

        case 'notifications':
            DOM.notificationsSection.classList.remove('hidden');
            loadNotifications();
            break;
    }
}

// ===============================
// 🔐 LOGIN CHECK
// ===============================
function checkLoginStatus() {
    const savedToken = localStorage.getItem('hospital_token');
    const savedUser = localStorage.getItem('hospital_user');

    if (savedToken && savedUser) {
        state.token = savedToken;
        state.user = JSON.parse(savedUser);
        connectNotification();
        navigate('dashboard');
    } else {
        navigate('auth');
    }
}

// ===============================
// 🔄 TOGGLE AUTH
// ===============================
function toggleAuthMode() {
    isLoginMode = !isLoginMode;

    if (isLoginMode) {
        DOM.authTitle.textContent = '로그인';
        DOM.signupFields.classList.add('hidden');
        DOM.authSubmitBtn.textContent = '로그인';
        DOM.authSwitchText.textContent = '계정이 없으신가요?';
        DOM.toggleAuthBtn.textContent = '회원가입하기';

        document.getElementById('name').removeAttribute('required');
        document.getElementById('phone').removeAttribute('required');
    } else {
        DOM.authTitle.textContent = '회원가입';
        DOM.signupFields.classList.remove('hidden');
        DOM.authSubmitBtn.textContent = '회원가입 완료';
        DOM.authSwitchText.textContent = '이미 계정이 있으신가요?';
        DOM.toggleAuthBtn.textContent = '로그인하기';

        document.getElementById('name').setAttribute('required', 'true');
        document.getElementById('phone').setAttribute('required', 'true');
    }
}

// ===============================
// 🔐 AUTH SUBMIT
// ===============================
async function handleAuthSubmit(e) {
    e.preventDefault();
    showLoader();

    const email = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
        // 회원가입 검증
        if (!isLoginMode) {
            const name = document.getElementById('name').value.trim();
            const phone = document.getElementById('phone').value.trim();

            if (!validateEmail(email)) {
                throw new Error('올바른 이메일 형식을 입력해주세요.');
            }

            if (!validatePassword(password)) {
                throw new Error('비밀번호는 8자 이상이며 대문자, 소문자, 숫자를 포함해야 합니다.');
            }

            if (name.length < 2) {
                throw new Error('이름은 2자 이상 입력해주세요.');
            }

            if (phone.length < 13) {
                throw new Error('전화번호를 정확히 입력해주세요.');
            }
        }

        // ================= LOGIN (Keycloak / login-service) =================
        if (isLoginMode) {
            // 게이트웨이가 /api/login 을 login-service로 라우팅한다(상대경로 사용).
            // Keycloak password grant는 username 필드를 받으며, realm에 loginWithEmailAllowed=true라 이메일도 허용된다.
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: email, password })
            });

            if (!res.ok) {
                throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
            }

            const data = await res.json();

            // JWT payload에서 기본 정보 추출
            const claims = decodeJwt(data.access_token);

            // /api/users/me 호출: sub(UUID)→DB 숫자 id 매핑 (JIT 자동 생성)
            state.token = data.access_token;
            const meRes = await apiFetch('/users/me');
            const meData = meRes.ok ? await meRes.json() : null;

            saveAuth(data.access_token, {
                id: meData?.id ?? null,
                email: claims.email,
                // 한국식 성+이름으로 표시. JWT의 family_name/given_name 조합을 우선 사용하고,
                // 클레임이 없으면 DB에 저장된 이름(meData.name) → name/preferred_username 순으로 fallback.
                name: buildDisplayName(claims) || meData?.name || '',
                phoneNumber: meData?.phoneNumber ?? '',
                role: (claims.realm_access?.roles || [])[0]
            });

            connectNotification();
            showToast('로그인 성공');
            navigate('dashboard');
        } else {
            // ================= SIGNUP =================
            // 회원가입은 자체 register.html 폼(login-service /api/register)으로 진행됩니다.
            window.location.href = '/register.html';
        }
    } catch (error) {
        console.error(error);
        showToast(error.message || '오류가 발생했습니다.');
    } finally {
        hideLoader();
    }
}

// ===============================
// 💾 SAVE AUTH
// ===============================
function saveAuth(token, user) {
    state.token = token;
    state.user = user;

    localStorage.setItem('hospital_token', token);
    localStorage.setItem('hospital_user', JSON.stringify(user));
}

// ===============================
// 🔔 NOTIFICATION SSE
// ===============================
function connectNotification() {
    if (!state.user?.id) return;

    if (state.notificationSource) {
        state.notificationSource.close();
    }

    // EventSource는 Authorization 헤더 못 실어 인증 보호된 경로면 401 가능(알림은 best-effort)
    state.notificationSource = new EventSource(
        `/notifications/stream?patientId=${state.user.id}`
    );

    state.notificationSource.addEventListener('connect', (event) => {
        console.log('SSE 연결 성공', event.data);
    });

    state.notificationSource.addEventListener('notification', (event) => {
        const notification = JSON.parse(event.data);
        console.log('알림 수신', notification);
        showToast(notification.message);

        // 알림 수신 시 예약 목록 자동 동적 새로고침
        if (DOM.mypageSection && !DOM.mypageSection.classList.contains('hidden')) {
            loadMyBookings();
        }
    });

    state.notificationSource.onerror = (error) => {
        console.error('SSE 연결 실패', error);
    };
}

// ===============================
// 🚪 LOGOUT
// ===============================
function logout() {
    if (state.notificationSource) {
        state.notificationSource.close();
        state.notificationSource = null;
    }

    state.token = null;
    state.user = null;

    localStorage.removeItem('hospital_token');
    localStorage.removeItem('hospital_user');

    showToast('로그아웃 되었습니다.');
    navigate('auth');
}

// ===============================
// 👨‍⚕️ LOAD DOCTORS
// ===============================
async function loadDoctors() {
    showLoader();

    try {
        const res = await apiFetch('/doctors');
        state.doctors = await res.json();
        renderDoctors();
    } catch (error) {
        showToast('의료진 목록을 불러오지 못했습니다.');
    } finally {
        hideLoader();
    }
}

// ===============================
// 👨‍⚕️ RENDER DOCTORS
// ===============================
function renderDoctors() {
    DOM.doctorsList.innerHTML = '';

    if (state.doctors.length === 0) {
        DOM.doctorsList.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                    <path d="M16 3v4M8 3v4M12 12v4M10 14h4"/>
                </svg>
                <p>등록된 의료진이 없습니다.</p>
            </div>
        `;
        return;
    }

    state.doctors.forEach((doctor) => {
        const div = document.createElement('div');
        div.className = `list-item doctor-item ${!doctor.available ? 'disabled-area' : ''}`;
        div.innerHTML = `
            <span class="doctor-dept">${escapeHtml(doctor.department)}</span>
            <div class="doctor-info">
                <h4>${escapeHtml(doctor.name)} 전문의</h4>
                <p class="doctor-desc">
                    ${escapeHtml(doctor.hospitalName || doctor.hospital_name)}
                    ${doctor.available ? '' : '(예약불가)'}
                </p>
            </div>
        `;

        if (doctor.available) {
            div.addEventListener('click', () => selectDoctor(doctor, div));
        }

        DOM.doctorsList.appendChild(div);
    });
}

// ===============================
// 👨‍⚕️ SELECT DOCTOR
// ===============================
async function selectDoctor(doctor, element) {
    document.querySelectorAll('.doctor-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');

    state.selectedDoctor = doctor;
    state.availableSlots = [];

    DOM.selectedDoctorDisplay.innerHTML = `
        <h4>선택된 의료진: ${escapeHtml(doctor.name)} (${escapeHtml(doctor.department)})</h4>
        <p>${escapeHtml(doctor.hospitalName || doctor.hospital_name)}</p>
    `;

    DOM.bookingInputs.classList.add('active');

    // 날짜 입력란은 슬롯에서 자동으로 채우므로 readonly 처리
    DOM.bookingDate.setAttribute('readonly', 'true');
    DOM.bookingDate.style.display = 'none';
    const dateLabel = DOM.bookingDate.closest('.input-group');
    if (dateLabel) dateLabel.style.display = 'none';

    // 슬롯 로딩 중 UI
    DOM.bookingTime.disabled = true;
    DOM.btnBook.disabled = true;
    DOM.symptoms.disabled = true;

    // booking-time select를 슬롯으로 채운다
    DOM.bookingTime.innerHTML = '<option value="">예약 가능 시간 로딩 중...</option>';

    showLoader();
    try {
        const res = await apiFetch(`/doctors/${doctor.id}/schedules`);
        const slots = await res.json();
        state.availableSlots = Array.isArray(slots) ? slots : [];

        DOM.bookingTime.innerHTML = '';

        if (state.availableSlots.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '예약 가능한 시간이 없습니다';
            opt.disabled = true;
            opt.selected = true;
            DOM.bookingTime.appendChild(opt);
            DOM.btnBook.disabled = true;
        } else {
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = '시간 선택';
            placeholder.disabled = true;
            placeholder.selected = true;
            DOM.bookingTime.appendChild(placeholder);

            state.availableSlots.forEach(slot => {
                const opt = document.createElement('option');
                opt.value = slot.id;
                opt.textContent = `${slot.date} ${slot.startTime}~${slot.endTime}`;
                DOM.bookingTime.appendChild(opt);
            });

            DOM.bookingTime.disabled = false;
            DOM.symptoms.disabled = false;
            DOM.btnBook.disabled = false;
        }
    } catch (error) {
        DOM.bookingTime.innerHTML = '<option value="" disabled selected>슬롯 조회 실패. 다시 시도해주세요.</option>';
        DOM.btnBook.disabled = true;
        showToast('예약 가능 시간을 불러오지 못했습니다.');
    } finally {
        hideLoader();
    }

    // 슬롯 선택 시 booking-date를 자동으로 채운다
    DOM.bookingTime.onchange = function () {
        const selectedSlot = state.availableSlots.find(s => s.id === parseInt(this.value));
        if (selectedSlot) {
            DOM.bookingDate.value = selectedSlot.date;
        }
    };
}

// ===============================
// 🔄 RESET BOOKING FORM
// ===============================
function resetBookingForm() {
    state.selectedDoctor = null;
    state.availableSlots = [];
    DOM.bookingForm.reset();

    DOM.selectedDoctorDisplay.innerHTML = `
        <p class="placeholder-text">
            먼저 왼쪽 목록에서 의료진을 선택해주세요.
        </p>
    `;

    DOM.bookingInputs.classList.remove('active');

    // booking-date 숨김 해제 (의사 재선택 시 selectDoctor가 다시 숨길 것임)
    DOM.bookingDate.removeAttribute('readonly');
    DOM.bookingDate.style.display = '';
    const dateLabel = DOM.bookingDate.closest('.input-group');
    if (dateLabel) dateLabel.style.display = '';

    // booking-time select를 기본 상태로 초기화
    DOM.bookingTime.innerHTML = '<option value="">시간 선택</option>';
    DOM.bookingTime.onchange = null;

    DOM.bookingDate.disabled = true;
    DOM.bookingTime.disabled = true;
    DOM.symptoms.disabled = true;
    DOM.btnBook.disabled = true;
}

// ===============================
// 💳 결제 모달 제어
// ===============================
let paymentConfirmCallback = null;

function openPaymentModal(doctorName, datetime, onConfirm) {
    if (DOM.paymentModal) {
        DOM.paymentDoctorName.textContent = doctorName;
        DOM.paymentBookingDatetime.textContent = datetime;
        paymentConfirmCallback = onConfirm;
        DOM.paymentModal.classList.remove('hidden');
    }
}

function closePaymentModal() {
    if (DOM.paymentModal) {
        DOM.paymentModal.classList.add('hidden');
        paymentConfirmCallback = null;
    }
}

// ===============================
// 📅 BOOKING (선결제 모델)
// ===============================
async function handleBookingSubmit(e) {
    e.preventDefault();
    if (!state.selectedDoctor) return;

    // 선택된 슬롯 확인
    const scheduleId = parseInt(DOM.bookingTime.value);
    if (!scheduleId) {
        showToast('예약 시간을 선택해주세요');
        return;
    }

    const slot = state.availableSlots.find(s => s.id === scheduleId);
    if (!slot) {
        showToast('선택한 예약 시간 정보를 찾을 수 없습니다. 다시 선택해주세요.');
        return;
    }

    // 슬롯에서 날짜/시간 파생
    const bookingDateStr = slot.date;
    const bookingTimeStr = slot.startTime;
    const datetimeText = `${slot.date} ${slot.startTime}~${slot.endTime}`;

    openPaymentModal(
        `${state.selectedDoctor.name} 전문의 (${state.selectedDoctor.department})`,
        datetimeText,
        async (paymentMethod) => {
            closePaymentModal();
            showLoader();

            try {
                const payload = {
                    patientId: state.user.id,
                    doctorId: state.selectedDoctor.id,
                    scheduleId: scheduleId,
                    amount: 10000
                };

                const res = await apiFetch('/reservations', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    throw new Error('예약 신청에 실패했습니다.');
                }

                await res.json();

                showToast('예약이 접수되었습니다. 상태: 대기중');
                navigate('mypage');
            } catch (error) {
                showToast(error.message);
            } finally {
                hideLoader();
            }
        }
    );
}

if (DOM.btnPaySubmit) {
    DOM.btnPaySubmit.addEventListener('click', async () => {
        if (paymentConfirmCallback) {
            const selectedRadio = document.querySelector('input[name="payment-method"]:checked');
            const selectedMethod = selectedRadio ? selectedRadio.value : 'CARD';
            await paymentConfirmCallback(selectedMethod);
        }
    });
}

// ===============================
// 🏷️ MYPAGE ROLE LABELS (ADMIN vs 일반)
// ===============================
function applyMypageRoleLabels() {
    const isAdmin = state.user?.role === 'ADMIN';

    const titleEl = document.getElementById('mypage-title');
    const subtitleEl = document.getElementById('mypage-subtitle');
    const bookingsCardTitleEl = document.getElementById('bookings-card-title');

    if (isAdmin) {
        if (titleEl) titleEl.textContent = '예약 관리';
        if (subtitleEl) subtitleEl.textContent = '전체 고객의 예약을 확인하고 승인 또는 거절할 수 있습니다.';
        if (bookingsCardTitleEl) bookingsCardTitleEl.textContent = '예약 관리 (전체 고객)';
    } else {
        if (titleEl) titleEl.textContent = '마이페이지';
        if (subtitleEl) subtitleEl.textContent = '나의 프로필 정보와 예약 상태를 확인하고 관리할 수 있습니다.';
        if (bookingsCardTitleEl) bookingsCardTitleEl.textContent = '내 예약';
    }
}

// ===============================
// 👤 PROFILE
// ===============================
function renderProfile() {
    DOM.profileName.textContent = state.user.name || '-';
    DOM.profileEmail.textContent = state.user.email || '-';
    if (DOM.profilePhone) {
        DOM.profilePhone.textContent = state.user.phoneNumber || '-';
    }
}

// ===============================
// ✏️ PROFILE EDIT (마이페이지 이름·전화번호 수정)
// ===============================
function enterProfileEdit() {
    if (DOM.profileView) DOM.profileView.classList.add('hidden');
    if (DOM.profileEditForm) DOM.profileEditForm.classList.remove('hidden');

    if (DOM.editName) DOM.editName.value = state.user.name || '';
    if (DOM.editPhone) DOM.editPhone.value = state.user.phoneNumber || '';
}

function cancelProfileEdit() {
    if (DOM.profileEditForm) DOM.profileEditForm.classList.add('hidden');
    if (DOM.profileView) DOM.profileView.classList.remove('hidden');
}

async function handleProfileUpdate(e) {
    e.preventDefault();

    const name = DOM.editName ? DOM.editName.value.trim() : '';
    const phoneNumber = DOM.editPhone ? DOM.editPhone.value.trim() : '';

    if (name.length < 2) {
        showToast('이름은 2자 이상 입력해주세요.');
        return;
    }
    if (phoneNumber && !/^010-\d{4}-\d{4}$/.test(phoneNumber)) {
        showToast('전화번호는 010-0000-0000 형식으로 입력해주세요.');
        return;
    }

    showLoader();
    try {
        const res = await apiFetch('/users/me', {
            method: 'PUT',
            body: JSON.stringify({ name, phoneNumber })
        });

        if (!res.ok) {
            throw new Error('프로필 수정에 실패했습니다.');
        }

        const updated = await res.json();

        // 로컬 상태/스토리지 갱신
        state.user.name = updated.name ?? name;
        state.user.phoneNumber = updated.phoneNumber ?? phoneNumber;
        saveAuth(state.token, state.user);

        cancelProfileEdit();
        renderProfile();
        showToast('프로필이 수정되었습니다.');
    } catch (error) {
        showToast(error.message);
    } finally {
        hideLoader();
    }
}

// ===============================
// 📋 MY BOOKINGS
// ===============================
async function loadMyBookings() {
    showLoader();

    try {
        const res = await apiFetch(
            state.user?.role === 'ADMIN'
                ? '/reservations'
                : `/reservations/patient/${state.user.id}`
        );

        const data = await res.json();
        state.reservations = data;
        renderBookings();
    } catch (error) {
        console.error(error);
        showToast('예약 내역을 불러오지 못했습니다.');
    } finally {
        hideLoader();
    }
}

// ===============================
// 📋 RENDER BOOKINGS
// ===============================
function renderBookings() {
    DOM.bookingsList.innerHTML = '';

    if (state.reservations.length === 0) {
        DOM.bookingsList.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                    <rect x="9" y="3" width="6" height="4" rx="1"/>
                    <line x1="9" y1="12" x2="15" y2="12"/>
                    <line x1="9" y1="16" x2="13" y2="16"/>
                </svg>
                <p>예약 내역이 없습니다.</p>
            </div>
        `;
        return;
    }

    state.reservations.forEach(reservation => {
        const doctor = state.doctors.find(
            d => d.id === reservation.doctorId || d.id === reservation.doctor_id
        );

        const doctorName = reservation.doctor_name || doctor?.name || '의사정보없음';
        const department = reservation.department || doctor?.department || '진료과정보없음';

        // 상태 한글 라벨 + 배지 클래스
        const STATUS_MAP = {
            'WAITING':        { label: '대기중',   cls: 'WAITING' },
            'CONFIRMED':      { label: '확정됨',   cls: 'CONFIRMED' },
            'CANCELED':       { label: '취소됨',   cls: 'CANCELED' },
            'PAYMENT_FAILED': { label: '결제실패', cls: 'PAYMENT_FAILED' },
            'REFUNDED':       { label: '환불완료', cls: 'REFUNDED' },
            'PAYMENT_SUCCESS':{ label: '결제완료', cls: 'PAYMENT_SUCCESS' }
        };
        const statusInfo = STATUS_MAP[reservation.status] || { label: reservation.status || '-', cls: '' };

        // ReservationResponse가 반환하는 시간 필드는 reservationTime(예약 신청 시각)뿐이다.
        // 진료 예정 슬롯 시각은 현재 booking 응답에 포함되지 않아 표시할 수 없다(후속 과제).
        // 따라서 신청일시를 한국어 형식으로 표시한다.
        const appliedAt = reservation.reservationTime || reservation.createdAt || '';
        const datetimeDisplay = appliedAt
            ? escapeHtml(new Date(appliedAt).toLocaleString('ko-KR'))
            : '-';

        const div = document.createElement('div');
        div.className = 'list-item booking-item';

        const isAdmin = state.user?.role === 'ADMIN';

        div.innerHTML = `
            <div class="booking-header">
                <strong>${escapeHtml(department)} - ${escapeHtml(doctorName)} 전문의</strong>
                <span class="badge ${escapeHtml(statusInfo.cls)}" aria-label="예약 상태: ${escapeHtml(statusInfo.label)}">${escapeHtml(statusInfo.label)}</span>
            </div>

            <div class="booking-details">
                <p>📋 예약번호: ${reservation.id}</p>
                <p>📅 신청일시: ${datetimeDisplay}</p>
                <p>💳 결제정보: 예약금 10,000원 (결제 완료)</p>

                ${
                    isAdmin
                        ? `<p>👤 신청환자: ${
                            reservation.patientName
                                ? escapeHtml(reservation.patientName)
                                : '환자 ID ' + escapeHtml(reservation.patientId || reservation.patient_id || '-')
                          }</p>`
                        : ''
                }

                <p class="booking-created-at">
                    신청일: ${reservation.createdAt || reservation.created_at
                        ? new Date(reservation.createdAt || reservation.created_at).toLocaleString('ko-KR')
                        : '-'}
                </p>

                ${
                    isAdmin
                        ? `
                        <div class="admin-actions">
                            ${reservation.status === 'WAITING' ? `
                                <button class="btn btn-sm btn-primary" onclick="confirmReservation(${reservation.id})">승인</button>
                                <button class="btn btn-sm btn-danger" onclick="cancelReservation(${reservation.id})">거절 (환불)</button>
                            ` : '<span class="admin-actions-done">처리 완료</span>'}
                        </div>
                        `
                        : `
                        ${(reservation.status === 'WAITING' || reservation.status === 'CONFIRMED') ? `
                            <div class="booking-actions">
                                <button class="btn btn-sm btn-danger" onclick="cancelBooking(${reservation.id})">예약 취소 (환불)</button>
                            </div>
                        ` : ''}
                        `
                }
            </div>
        `;

        DOM.bookingsList.appendChild(div);
    });
}

// ===============================
// 🔔 LOAD NOTIFICATIONS
// ===============================
async function loadNotifications() {
    if (!state.user?.id) {
        renderNotifications([]);
        return;
    }

    showLoader();

    try {
        const res = await apiFetch(`/notifications?patientId=${state.user.id}`);
        if (!res.ok) {
            throw new Error('알림을 불러오지 못했습니다.');
        }
        const data = await res.json();
        renderNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
        console.error(error);
        renderNotifications([]);
        showToast('알림을 불러오지 못했습니다.');
    } finally {
        hideLoader();
    }
}

// ===============================
// 🔔 RENDER NOTIFICATIONS
// ===============================
const NOTIFICATION_TYPE_MAP = {
    'BOOKING':  { label: '예약',   icon: '📅', cls: 'BOOKING' },
    'PAYMENT':  { label: '결제',   icon: '💳', cls: 'PAYMENT' },
    'REFUND':   { label: '환불',   icon: '💰', cls: 'REFUND' },
    'CANCEL':   { label: '취소',   icon: '🚫', cls: 'CANCEL' }
};

function renderNotifications(notifications) {
    DOM.notificationsList.innerHTML = '';

    if (!notifications || notifications.length === 0) {
        DOM.notificationsList.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <p>받은 알림이 없습니다.</p>
            </div>
        `;
        return;
    }

    notifications.forEach((n) => {
        const typeInfo = NOTIFICATION_TYPE_MAP[n.type] || { label: n.type || '알림', icon: '🔔', cls: '' };
        const receivedAt = n.receivedAt
            ? escapeHtml(new Date(n.receivedAt).toLocaleString('ko-KR'))
            : '-';

        const div = document.createElement('div');
        div.className = 'list-item notification-item';
        div.innerHTML = `
            <div class="booking-header">
                <strong><span class="notification-icon" aria-hidden="true">${typeInfo.icon}</span> ${escapeHtml(n.message)}</strong>
                <span class="badge ${escapeHtml(typeInfo.cls)}" aria-label="알림 유형: ${escapeHtml(typeInfo.label)}">${escapeHtml(typeInfo.label)}</span>
            </div>
            <div class="booking-details">
                <p class="notification-time">🕒 ${receivedAt}</p>
            </div>
        `;

        DOM.notificationsList.appendChild(div);
    });
}

// ===============================
// 🛠️ UTIL
// ===============================
function showLoader() {
    DOM.loader.classList.remove('hidden');
}

function hideLoader() {
    DOM.loader.classList.add('hidden');
}

let toastTimeout;

function showToast(message) {
    DOM.toast.textContent = message;
    DOM.toast.classList.remove('hidden');

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        DOM.toast.classList.add('hidden');
    }, 3000);
}

// ===============================
// 🌐 MSA API FETCH 라우팅
// ===============================
async function apiFetch(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }

    let baseUrl = API_BASE_URL;

    // 예약 관련 API → 게이트웨이 /api/reservations
    if (url.startsWith('/reservations')) {
        baseUrl = '/api';
    }
    // 결제 관련 API → 게이트웨이 /payments (컨트롤러 경로 그대로)
    else if (url.startsWith('/payments')) {
        baseUrl = '';
    }
    // 알림 관련 API → 게이트웨이 /notifications (SSE /notifications/stream과 동일 베이스)
    else if (url.startsWith('/notifications')) {
        baseUrl = '';
    }

    return fetch(`${baseUrl}${url}`, {
        ...options,
        headers
    });
}

// ===============================
// 🛡️ 환자 예약 취소 & 자동 환불
// ===============================
window.cancelBooking = async function(reservationId) {
    if (!confirm('정말 이 예약을 취소하시겠습니까?\n예약금 10,000원이 전액 자동 환불됩니다.')) return;

    showLoader();
    try {
        const res = await apiFetch(`/reservations/${reservationId}/cancel`, {
            method: 'PUT'
        });

        if (!res.ok) {
            throw new Error('예약 취소 실패');
        }

        const refundPayload = {
            reservationId: reservationId,
            amount: 10000
        };

        const refundRes = await apiFetch('/payments/refund', {
            method: 'POST',
            body: JSON.stringify(refundPayload)
        });

        if (!refundRes.ok) {
            console.warn('환불 처리 API 실패');
        }

        showToast('예약이 취소되었으며 예약금이 자동 환불되었습니다.');
        loadMyBookings();
    } catch (error) {
        showToast(error.message);
    } finally {
        hideLoader();
    }
};

// ===============================
// 👑 관리자 승인 (CONFIRMED)
// ===============================
async function confirmReservation(id) {
    showLoader();
    try {
        const res = await apiFetch(`/reservations/${id}/confirm`, {
            method: 'PUT'
        });

        if (!res.ok) {
            throw new Error('예약 승인 실패');
        }

        showToast('예약 승인 완료');
        loadMyBookings();
    } catch (error) {
        showToast(error.message);
    } finally {
        hideLoader();
    }
}

// ===============================
// 👑 관리자 거절/취소 & 자동 환불
// ===============================
async function cancelReservation(id) {
    if (!confirm('정말 이 예약을 거절/취소하시겠습니까?\n예약금 10,000원이 전액 자동 환불됩니다.')) return;

    showLoader();
    try {
        const res = await apiFetch(`/reservations/${id}/cancel`, {
            method: 'PUT'
        });

        if (!res.ok) {
            throw new Error('예약 취소 실패');
        }

        const refundPayload = {
            reservationId: id,
            amount: 10000
        };

        const refundRes = await apiFetch('/payments/refund', {
            method: 'POST',
            body: JSON.stringify(refundPayload)
        });

        if (!refundRes.ok) {
            console.warn('관리자 거절에 따른 환불 처리 API 실패');
        }

        showToast('예약 거절 및 예약금 자동 환불 완료');
        loadMyBookings();
    } catch (error) {
        showToast(error.message);
    } finally {
        hideLoader();
    }
}

// 전역 함수 등록
window.confirmReservation = confirmReservation;
window.cancelReservation = cancelReservation;

// ===============================
// 🚀 START
// ===============================
init();
