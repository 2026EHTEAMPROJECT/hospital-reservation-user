/**
 * MedicalCare+ Frontend Application Logic
 * 병원 예약 시스템 프론트엔드
 */

// ===============================
// ⚙️ 설정
// ===============================
const USE_MOCK = false;
const API_BASE_URL = 'http://localhost:8081/api';

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
// 🧪 MOCK DATA
// ===============================
const MOCK_DATA = {
    token: 'mock-jwt-token.abc.123',

    user: {
        id: 1,
        email: 'test@hospital.com',
        name: '홍길동',
        role: 'PATIENT',
        created_at: new Date().toISOString()
    },

    doctors: [
        {
            id: 101,
            name: '김의사',
            department: '내과',
            hospital_name: '메디컬플러스 서울병원',
            available: true
        },
        {
            id: 102,
            name: '이의사',
            department: '정형외과',
            hospital_name: '메디컬플러스 서울병원',
            available: true
        },
        {
            id: 103,
            name: '박의사',
            department: '이비인후과',
            hospital_name: '메디컬플러스 부산병원',
            available: false
        }
    ],

    reservations: [
        {
            id: 1,
            patient_id: 1,
            doctor_id: 101,
            schedule_id: 10,
            doctor_name: '김의사',
            department: '내과',
            date: '2026-05-20',
            time: '10:00',
            status: 'CONFIRMED',
            reservation_time: new Date().toISOString(),
            created_at: new Date().toISOString()
        }
    ]
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

    // Utils
    loader: document.getElementById('loader'),
    toast: document.getElementById('toast')
};

let isLoginMode = true;

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
        toggleAuthMode();
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
    const phoneInput =
        document.getElementById('phone');

    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            e.target.value =
                formatPhoneNumber(e.target.value);
        });
    }
}

// ===============================
// 🔐 VALIDATION
// ===============================
function validateEmail(email) {

    const regex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return regex.test(email);
}

function validatePassword(password) {

    const regex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

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

            DOM.userGreeting.textContent =
                state.user.name;

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

    const savedToken =
        localStorage.getItem('hospital_token');

    const savedUser =
        localStorage.getItem('hospital_user');

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

        DOM.authSwitchText.textContent =
            '계정이 없으신가요?';

        DOM.toggleAuthBtn.textContent =
            '회원가입하기';

        document.getElementById('name')
            .removeAttribute('required');

        document.getElementById('phone')
            .removeAttribute('required');

    } else {

        DOM.authTitle.textContent = '회원가입';

        DOM.signupFields.classList.remove('hidden');

        DOM.authSubmitBtn.textContent =
            '회원가입 완료';

        DOM.authSwitchText.textContent =
            '이미 계정이 있으신가요?';

        DOM.toggleAuthBtn.textContent =
            '로그인하기';

        document.getElementById('name')
            .setAttribute('required', 'true');

        document.getElementById('phone')
            .setAttribute('required', 'true');
    }
}

// ===============================
// 🔐 AUTH SUBMIT
// ===============================
async function handleAuthSubmit(e) {

    e.preventDefault();

    showLoader();

    const email =
        document.getElementById('username')
            .value
            .trim();

    const password =
        document.getElementById('password')
            .value;

    try {

        // 회원가입 검증
        if (!isLoginMode) {

            const name =
                document.getElementById('name')
                    .value
                    .trim();

            const phone =
                document.getElementById('phone')
                    .value
                    .trim();

            if (!validateEmail(email)) {
                throw new Error(
                    '올바른 이메일 형식을 입력해주세요.'
                );
            }

            if (!validatePassword(password)) {
                throw new Error(
                    '비밀번호는 8자 이상이며 대문자, 소문자, 숫자를 포함해야 합니다.'
                );
            }

            if (name.length < 2) {
                throw new Error(
                    '이름은 2자 이상 입력해주세요.'
                );
            }

            if (phone.length < 13) {
                throw new Error(
                    '전화번호를 정확히 입력해주세요.'
                );
            }
        }

        // ================= MOCK =================
        if (USE_MOCK) {

            await simulateDelay(800);

            const user = {
                ...MOCK_DATA.user,
                email
            };

            if (!isLoginMode) {

                user.name =
                    document.getElementById('name')
                        .value;

                user.phone =
                    document.getElementById('phone')
                        .value;
            }

            saveAuth(MOCK_DATA.token, user);

            showToast(
                isLoginMode
                    ? '로그인 되었습니다.'
                    : '회원가입이 완료되었습니다.'
            );

            DOM.authForm.reset();

            navigate('dashboard');

        } else {

            // ================= LOGIN =================
            if (isLoginMode) {

                const res = await apiFetch(
                    '/users/login',
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            email,
                            password
                        })
                    }
                );

                if (!res.ok) {

                    throw new Error(
                        '이메일 또는 비밀번호가 올바르지 않습니다.'
                    );
                }

                const data = await res.json();

                    saveAuth(data.token, {
                    id: data.id,
                    email: data.email,
                    name: data.name,
                    role: data.role
                });

                connectNotification();

                showToast('로그인 성공');

                navigate('dashboard');

            } else {

                // ================= SIGNUP =================
                const payload = {
                    email,
                    password,
                    name:
                        document.getElementById('name')
                            .value,
                    role: 'PATIENT'
                };

                const res = await apiFetch(
                    '/users/signup',
                    {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    }
                );

                if (!res.ok) {

                    throw new Error(
                        '회원가입 실패'
                    );
                }

                showToast(
                    '회원가입 성공!'
                );

                DOM.authForm.reset();

                toggleAuthMode();
            }
        }

    } catch (error) {

        console.error(error);

        showToast(
            error.message || '오류가 발생했습니다.'
        );

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

    localStorage.setItem(
        'hospital_token',
        token
    );

    localStorage.setItem(
        'hospital_user',
        JSON.stringify(user)
    );
}

// ===============================
// 🔔 NOTIFICATION SSE
// ===============================
function connectNotification() {

    if (!state.user?.id) return;

    if (state.notificationSource) {

        state.notificationSource.close();
    }

    state.notificationSource =
    new EventSource(
        `http://localhost:8084/notifications/stream?patientId=${state.user.id}`
    );

state.notificationSource.addEventListener(
    'connect',
    (event) => {
        console.log('SSE 연결 성공', event.data);
    }
);

state.notificationSource.addEventListener(
    'notification',
    (event) => {

        const notification =
            JSON.parse(event.data);

        console.log(
            '알림 수신',
            notification
        );

        showToast(
            notification.message
        );
    }
);

    state.notificationSource.onerror =
        (error) => {

            console.error(
                'SSE 연결 실패',
                error
            );
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

    localStorage.removeItem(
        'hospital_token'
    );

    localStorage.removeItem(
        'hospital_user'
    );

    showToast('로그아웃 되었습니다.');

    navigate('auth');
}

// ===============================
// 👨‍⚕️ LOAD DOCTORS
// ===============================
async function loadDoctors() {

    showLoader();

    try {

        if (USE_MOCK) {

            await simulateDelay(500);

            state.doctors =
                MOCK_DATA.doctors;

            renderDoctors();

        } else {

            const res =
                await apiFetch('/doctors');

            state.doctors =
                await res.json();

            renderDoctors();
        }

    } catch (error) {

        showToast(
            '의료진 목록을 불러오지 못했습니다.'
        );

    } finally {

        hideLoader();
    }
}

// ===============================
// 👨‍⚕️ RENDER DOCTORS
// ===============================
function renderDoctors() {

    DOM.doctorsList.innerHTML = '';

    state.doctors.forEach((doctor) => {

        const div =
            document.createElement('div');

        div.className =
            `list-item doctor-item ${
                !doctor.available
                    ? 'disabled-area'
                    : ''
            }`;

        div.innerHTML = `
            <span class="doctor-dept">
                ${doctor.department}
            </span>

            <div class="doctor-info">
                <h4>
                    ${doctor.name} 전문의
                </h4>

                <p class="doctor-desc">
                    ${doctor.hospitalName}
                    ${doctor.available ? '' : '(예약불가)'}
                </p>
            </div>
        `;

        if (doctor.available) {

            div.addEventListener(
                'click',
                () => selectDoctor(doctor, div)
            );
        }

        DOM.doctorsList.appendChild(div);
    });
}

// ===============================
// 👨‍⚕️ SELECT DOCTOR
// ===============================
function selectDoctor(doctor, element) {

    document.querySelectorAll('.doctor-item')
        .forEach(el =>
            el.classList.remove('selected')
        );

    element.classList.add('selected');

    state.selectedDoctor = doctor;

    DOM.selectedDoctorDisplay.innerHTML = `
        <h4 style="color:var(--primary-dark); margin-bottom:0.2rem;">
            선택된 의료진:
            ${doctor.name}
            (${doctor.department})
        </h4>

        <p style="font-size:0.9rem;">
            ${doctor.hospitalName}
        </p>
    `;

    DOM.bookingInputs.classList.add('active');

    const today =
        new Date()
            .toISOString()
            .split('T')[0];

    DOM.bookingDate.setAttribute(
        'min',
        today
    );

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

    DOM.selectedDoctorDisplay.innerHTML =
        `
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
// 📅 BOOKING
// ===============================
async function handleBookingSubmit(e) {

    e.preventDefault();

    if (!state.selectedDoctor) return;

    showLoader();

    const scheduleId =
        Math.floor(Math.random() * 1000) + 1;

    const bookingData = {
        patient_id: state.user.id,
        doctor_id: state.selectedDoctor.id,
        schedule_id: scheduleId,
        date: DOM.bookingDate.value,
        time: DOM.bookingTime.value
    };

    try {

        if (USE_MOCK) {

            await simulateDelay(1000);

            const duplicate =
                MOCK_DATA.reservations.find(
                    r =>
                        r.doctor_id === bookingData.doctor_id &&
                        r.date === bookingData.date &&
                        r.time === bookingData.time &&
                        r.status !== 'CANCELED'
                );

            if (duplicate) {

                throw new Error(
                    '이미 예약된 시간입니다.'
                );
            }

            const newReservation = {

                id: Date.now(),

                patient_id: state.user.id,

                doctor_id:
                    state.selectedDoctor.id,

                schedule_id: scheduleId,

                doctor_name:
                    state.selectedDoctor.name,

                department:
                    state.selectedDoctor.department,

                date: bookingData.date,

                time: bookingData.time,

                status: 'WAITING',

                reservation_time:
                    new Date().toISOString(),

                created_at:
                    new Date().toISOString()
            };

            MOCK_DATA.reservations.push(
                newReservation
            );

            showToast(
                '예약 신청이 완료되었습니다.'
            );

            navigate('mypage');

        } else {

            const payload = {

                patientId:
                    bookingData.patient_id,

                doctorId:
                    bookingData.doctor_id,

                scheduleId:
                    bookingData.schedule_id
            };

            const res =
                await apiFetch(
                    '/reservations',
                    {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    }
                );

            if (!res.ok) {

                throw new Error(
                    '예약 실패'
                );
            }

            showToast(
                '예약 완료'
            );

            navigate('mypage');
        }

    } catch (error) {

        showToast(error.message);

    } finally {

        hideLoader();
    }
}

// ===============================
// 👤 PROFILE
// ===============================
function renderProfile() {

    DOM.profileName.textContent =
        state.user.name || '-';

    DOM.profileEmail.textContent =
        state.user.email || '-';
}

// ===============================
// 📋 MY BOOKINGS
// ===============================
async function loadMyBookings() {

    showLoader();

    try {

        if (USE_MOCK) {

            await simulateDelay(500);

            state.reservations =
                [...MOCK_DATA.reservations]
                    .reverse();

            renderBookings();

        } else {

            const res =
    await apiFetch(
        state.user?.role === 'ADMIN'
            ? '/reservations'
            : `/reservations/patient/${state.user.id}`
    );

console.log('status=', res.status);

const data = await res.json();

console.log('data=', data);

state.reservations = data;

renderBookings();
        }

    } catch (error) {

    console.error(error);

    showToast(
        '예약 내역을 불러오지 못했습니다.'
    );
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
            <p class="placeholder-text"
               style="padding:2rem;">
                예약 내역이 없습니다.
            </p>
        `;

        return;
    }

    state.reservations.forEach(reservation => {

        const doctor =
            state.doctors.find(
                d => d.id === reservation.doctorId
        );

        const doctorName =
            doctor?.name || '의사정보없음';

        const department =
            doctor?.department || '진료과정보없음';

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
        }

        const div =
            document.createElement('div');

        div.className =
            'list-item booking-item';

        div.innerHTML = `
            <div class="booking-header">

                <strong>
                    ${department}
                    -
                    ${doctorName}
                    전문의
                </strong>

                <span class="badge ${reservation.status}">
                    ${statusText}
                </span>
            </div>

            <div class="booking-details">

                <p>
                    📅 예약번호:${reservation.id}
                    ⏰ 스케줄:${reservation.scheduleId}
                </p>

                <p style="
                    font-size:0.8rem;
                    color:var(--text-muted);
                ">
                    신청일:
                    ${reservation.createdAt
                        ? new Date(reservation.createdAt).toLocaleString()
                        : '-'}
                </p>
                ${
        state.user?.role === 'ADMIN'
            ? `
                <div style="margin-top:10px;">
                    <button
                        onclick="confirmReservation(${reservation.id})">
                        승인
                    </button>

                    <button
                        onclick="cancelReservation(${reservation.id})">
                        취소
                    </button>
                </div>
                `
                : ''
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

function simulateDelay(ms) {

    return new Promise(resolve =>
        setTimeout(resolve, ms)
    );
}

async function apiFetch(url, options = {}) {

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (state.token) {

        headers['Authorization'] =
            `Bearer ${state.token}`;
    }

    let baseUrl = API_BASE_URL;

    // 예약 관련 API는 booking-service(8082)
    if (
        url.startsWith('/reservations')
    ) {

        baseUrl =
            'http://localhost:8082/api';
    }

    return fetch(
        `${baseUrl}${url}`,
        {
            ...options,
            headers
        }
    );
}

async function confirmReservation(id) {

    try {

        const res = await apiFetch(
            `/reservations/${id}/confirm`,
            {
                method: 'PUT'
            }
        );

        if (!res.ok) {

            throw new Error(
                '예약 승인 실패'
            );
        }

        showToast('예약 승인 완료');

        loadMyBookings();

    } catch (error) {

        showToast(
            error.message
        );
    }
}

async function cancelReservation(id) {

    try {

        const res = await apiFetch(
            `/reservations/${id}/cancel`,
            {
                method: 'PUT'
            }
        );

        if (!res.ok) {

            throw new Error(
                '예약 취소 실패'
            );
        }

        showToast('예약 취소 완료');

        loadMyBookings();

    } catch (error) {

        showToast(
            error.message
        );
    }
}
// ===============================
// 🚀 START
// ===============================
init();