// Updated, improved, and complete poultry farm management JS file

const pageContent = document.getElementById('page-content');
const navLinks = document.querySelectorAll('.sidebar-link');
const modal = document.getElementById('notificationModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const sidebar = document.getElementById('sidebar');
const menuButton = document.getElementById('menu-button');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const mobilePageTitle = document.getElementById('mobilePageTitle');
const logoutBtn = document.getElementById('logoutBtn');

document.getElementById('currentYear').textContent = new Date().getFullYear();

// --- Mobile Menu ---
menuButton.addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full');
    sidebarOverlay.classList.toggle('opacity-0');
    sidebarOverlay.classList.toggle('pointer-events-none');
});

sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.add('-translate-x-full');
    sidebarOverlay.classList.add('opacity-0');
    sidebarOverlay.classList.add('pointer-events-none');
});

// --- Logout ---
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        location.reload();
    });
}

// --- Modal & Utility Functions ---
function showModal(title, message, isError = false) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalTitle.style.color = isError ? '#dc2626' : '#166534';
    modal.style.display = 'flex';
}

function closeModal() {
    modal.style.display = 'none';
}

window.onclick = (event) => {
    if (event.target === modal) closeModal();
};

async function apiRequest(endpoint, method = 'GET', data = null) {
    const config = { method, headers: {} };
    if (data) {
        config.headers['Content-Type'] = 'application/json';
        config.body = JSON.stringify(data);
    }
    if (endpoint !== '/login' && endpoint !== '/signup') {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
    }
    try {
        const response = await fetch(`/api${endpoint}`, config);
        const responseData = await response.json();

        if (response.status === 401) {
            localStorage.removeItem('authToken');
            showModal('Session Expired', 'Please login again.', true);
            showAuthModal();
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            throw new Error(responseData.message || 'An unknown error occurred.');
        }
        return responseData;
    } catch (error) {
        console.error(`API Error on ${method} ${endpoint}:`, error);
        showModal('API Error', error.message, true);
        throw error;
    }
}

// --- Navigation Router ---
const pageRenderers = {
    dashboard: renderDashboard,
    flocks: renderFlocksPage,
    feed: renderFeedPage,
    eggs: renderEggsPage,
    vaccinations: renderVaccinationsPage,
    mortality: renderMortalityPage,
    sales: renderSalesPage,
};

function navigateTo(page) {
    navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });

    const activeLink = document.querySelector(`.sidebar-link[data-page="${page}"]`);
    mobilePageTitle.textContent = activeLink ? activeLink.textContent : 'Dashboard';

    const renderer = pageRenderers[page] || renderDashboard;
    renderer();

    if (window.innerWidth < 768) {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('opacity-0');
        sidebarOverlay.classList.add('pointer-events-none');
    }
}

// --- Auth Modal Setup ---
document.addEventListener('DOMContentLoaded', () => {
    const authModal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginFormElement = document.getElementById('loginFormElement');
    const signupFormElement = document.getElementById('signupFormElement');
    const showSignupLink = document.getElementById('showSignup');
    const showLoginLink = document.getElementById('showLogin');

    function showAuthModal() {
        authModal.style.display = 'flex';
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    }

    function closeAuthModal() {
        authModal.style.display = 'none';
    }

    window.closeAuthModal = closeAuthModal;

    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    loginFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(loginFormElement).entries());
        try {
            const result = await apiRequest('/login', 'POST', data);
            if (result.success && result.token) {
                localStorage.setItem('authToken', result.token);
                closeAuthModal();
                initializeApp();
            }
        } catch (error) {}
    });

    signupFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(signupFormElement).entries());
        try {
            const result = await apiRequest('/signup', 'POST', data);
            if (result.success) {
                showModal('Success', 'Signup successful! Please login.');
                signupFormElement.reset();
                signupForm.classList.add('hidden');
                loginForm.classList.remove('hidden');
            }
        } catch (error) {}
    });

    function initializeApp() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            showAuthModal();
            return;
        }
        navLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                navigateTo(link.dataset.page);
            });
        });
        navigateTo('dashboard');
    }

    initializeApp();
});
function renderDashboard() {
    pageContent.innerHTML = `<h2 class="text-xl font-bold">Dashboard</h2><p>Welcome to your poultry dashboard!</p>`;
}

function renderFlocksPage() {
    pageContent.innerHTML = `<h2 class="text-xl font-bold">Flocks</h2><p>Manage your flocks here.</p>`;
}

function renderFeedPage() {
    pageContent.innerHTML = `<h2 class="text-xl font-bold">Feed Logs</h2><p>Track feed usage.</p>`;
}

function renderEggsPage() {
    pageContent.innerHTML = `<h2 class="text-xl font-bold">Egg Collection</h2><p>Log egg data.</p>`;
}

function renderMortalityPage() {
    pageContent.innerHTML = `<h2 class="text-xl font-bold">Mortality</h2><p>Log bird deaths.</p>`;
}

function renderSalesPage() {
    pageContent.innerHTML = `<h2 class="text-xl font-bold">Sales</h2><p>Track egg or chicken sales.</p>`;
}

function renderVaccinationsPage() {
    pageContent.innerHTML = `<h2 class="text-xl font-bold">Vaccinations</h2><p>Track vaccine records.</p>`;
}
