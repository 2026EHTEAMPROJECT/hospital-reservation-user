/**
 * MedicalCare+ Frontend Application Logic
 * 병원 예약 시스템 프론트엔드
 */

// ===============================
// ⚙️ 설정
// ===============================
const API_BASE_URL = 'http://localhost:8081/api';

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
    notificationSource: null
};

// ===============================
// 🌐 DOM
// ===============================
const DOM = {
    // Nav
    navHome: document.getElementById('nav-home'),
    navMypage: document.getElementById('nav-mypage'),
    navLogout: document.getElementById('nav-logout'),

    // Sections
    authSection: document.getElementById('auth-section'),
    dashboardSection: document.getElementById('dashboard-section'),
    mypageSection: document.getElementById('mypage-section'),

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
            // 회원가입은 Keycloak 내장 회원가입 페이지로 이동
            window.location.href =
                'http://localhost:8080/realms/hospital/protocol/openid-connect/registrations' +
                '?client_id=hospital-frontend&response_type=code' +
                '&redirect_uri=http%3A%2F%2Flocalhost%3A8081%2F';
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

    if (state.token) {
        DOM.navHome.classList.remove('hidden');
        DOM.navMypage.classList.remove('hidden');
        DOM.navLogout.classList.remove('hidden');
    } else {
        DOM.navHome.classList.add('hidden');
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
            renderProfile();
            loadMyBookings();
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

            // Keycloak access_token JWT payload에서 사용자 정보 추출
            // (Keycloak 토큰에는 id/email/name/role 최상위 필드가 없으므로 디코드 필요)
            const claims = decodeJwt(data.access_token);
            // NOTE: Keycloak sub(UUID)와 백엔드 patientId(Long) 식별자 매핑은 후속 과제
            saveAuth(data.access_token, {
                id: claims.sub,
                email: claims.email,
                name: claims.name || claims.preferred_username,
                role: (claims.realm_access?.roles || [])[0]
            });

            connectNotification();
            showToast('로그인 성공');
            navigate('dashboard');
        } else {
            // ================= SIGNUP =================
            // 회원가입은 Keycloak 내장 회원가입 페이지를 통해 진행됩니다.
            // toggleAuthMode() 대신 Keycloak registration 페이지로 이동합니다.
            const keycloakRegistrationUrl =
                'http://localhost:8080/realms/hospital/protocol/openid-connect/registrations' +
                '?client_id=hospital-frontend&response_type=code' +
                '&redirect_uri=http%3A%2F%2Flocalhost%3A8081%2F';
            window.location.href = keycloakRegistrationUrl;
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

    state.notificationSource = new EventSource(
        `http://localhost:8084/notifications/stream?patientId=${state.user.id}`
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
function selectDoctor(doctor, element) {
    document.querySelectorAll('.doctor-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');

    state.selectedDoctor = doctor;

    DOM.selectedDoctorDisplay.innerHTML = `
        <h4>선택된 의료진: ${escapeHtml(doctor.name)} (${escapeHtml(doctor.department)})</h4>
        <p>${escapeHtml(doctor.hospitalName || doctor.hospital_name)}</p>
    `;

    DOM.bookingInputs.classList.add('active');

    const today = new Date().toISOString().split('T')[0];
    DOM.bookingDate.setAttribute('min', today);

    DOM.bookingDate.disabled = false;
    DOM.bookingTime.disabled = false;
    DOM.symptoms.disabled = false;
    DOM.btnBook.disabled = false;
}

// ===============================
// 🔄 RESET BOOKING FORM
// ===============================
function resetBookingForm() {
    state.selectedDoctor = null;
    DOM.bookingForm.reset();

    DOM.selectedDoctorDisplay.innerHTML = `
        <p class="placeholder-text">
            먼저 왼쪽 목록에서 의료진을 선택해주세요.
        </p>
    `;

    DOM.bookingInputs.classList.remove('active');

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

    const bookingDateStr = DOM.bookingDate.value;
    const bookingTimeStr = DOM.bookingTime.value;
    const datetimeText = `${bookingDateStr} ${bookingTimeStr}`;

    openPaymentModal(
        `${state.selectedDoctor.name} 전문의 (${state.selectedDoctor.department})`,
        datetimeText,
        async (paymentMethod) => {
            closePaymentModal();
            showLoader();

            const scheduleId = Math.floor(Math.random() * 1000) + 1;
            const bookingData = {
                patient_id: state.user.id,
                doctor_id: state.selectedDoctor.id,
                schedule_id: scheduleId,
                date: bookingDateStr,
                time: bookingTimeStr
            };

            try {
                const payload = {
                    patientId: bookingData.patient_id,
                    doctorId: bookingData.doctor_id,
                    scheduleId: bookingData.schedule_id,
                    amount: 10000
                };

                const res = await apiFetch('/reservations', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    throw new Error('예약 신청에 실패했습니다.');
                }

                const reservationData = await res.json();

                showToast('예약금 10,000원 결제 완료 및 예약 신청이 접수되었습니다.');
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
// 👤 PROFILE
// ===============================
function renderProfile() {
    DOM.profileName.textContent = state.user.name || '-';
    DOM.profileEmail.textContent = state.user.email || '-';
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

        let statusText = '';
        switch (reservation.status) {
            case 'WAITING':
                statusText = '대기중';
                break;
            case 'CONFIRMED':
                statusText = '예약확정';
                break;
            case 'CANCELED':
                statusText = '취소됨';
                break;
            case 'PAYMENT_FAILED':
                statusText = '결제실패';
                break;
            case 'REFUNDED':
                statusText = '환불완료';
                break;
        }

        const div = document.createElement('div');
        div.className = 'list-item booking-item';

        const isAdmin = state.user?.role === 'ADMIN';

        div.innerHTML = `
            <div class="booking-header">
                <strong>${escapeHtml(department)} - ${escapeHtml(doctorName)} 전문의</strong>
                <span class="badge ${escapeHtml(reservation.status)}">${escapeHtml(statusText)}</span>
            </div>

            <div class="booking-details">
                <p>📅 예약번호: ${reservation.id} | ⏰ 스케줄: ${reservation.scheduleId || reservation.schedule_id}</p>
                <p>⏰ 진료시간: ${escapeHtml(reservation.date)} ${escapeHtml(reservation.time)}</p>
                <p>💳 결제정보: 예약금 10,000원 (결제 완료)</p>

                ${
                    isAdmin
                        ? `<p>👤 신청환자: ${escapeHtml(reservation.patientName) || '환자 ID: ' + (reservation.patientId || reservation.patient_id)}</p>`
                        : ''
                }

                <p class="booking-created-at">
                    신청일: ${reservation.createdAt || reservation.created_at
                        ? new Date(reservation.createdAt || reservation.created_at).toLocaleString()
                        : '-'}
                </p>

                ${
                    isAdmin
                        ? `
                        <div style="margin-top:10px; display: flex; gap: 8px;">
                            ${reservation.status === 'WAITING' ? `
                                <button class="btn btn-sm btn-primary" onclick="confirmReservation(${reservation.id})">승인</button>
                                <button class="btn btn-sm btn-danger" onclick="cancelReservation(${reservation.id})">거절 (환불)</button>
                            ` : ''}
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

    // 예약 관련 API는 booking-service (8082)
    if (url.startsWith('/reservations')) {
        baseUrl = 'http://localhost:8082/api';
    }
    // 결제 관련 API는 payment-service (8083)
    else if (url.startsWith('/payments')) {
        baseUrl = 'http://localhost:8083/api';
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
