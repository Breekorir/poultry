const pageContent = document.getElementById('page-content');
const navLinks = document.querySelectorAll('.sidebar-link');
const modal = document.getElementById('notificationModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const sidebar = document.getElementById('sidebar');
const menuButton = document.getElementById('menu-button');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const mobilePageTitle = document.getElementById('mobilePageTitle');
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
    if (event.target == modal) closeModal();
};

async function apiRequest(endpoint, method = 'GET', data = null) {
    const config = { method, headers: {} };
    if (data) {
        config.headers['Content-Type'] = 'application/json';
        config.body = JSON.stringify(data);
    }
    // Add Authorization header with token if available and not for signup/login
    if (endpoint !== '/login' && endpoint !== '/signup') {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
    }
    try {
        const response = await fetch(`/api${endpoint}`, config);
        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.message || 'An unknown network error occurred.');
        }
        return responseData;
    } catch (error) {
        console.error(`API Error on ${method} ${endpoint}:`, error);
        showModal('API Error', error.message, true);
        throw error;
    }
}

// Reusable function to render a page with a form and a list
function renderGenericPage({ pageTitle, addBtnText, formId, formHtml, listId, listTitle, loadListFunc, formSubmitFunc }) {
    pageContent.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="hidden md:block text-3xl font-semibold text-gray-800">${pageTitle}</h2>
            <button id="addBtn" class="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 shadow transition-colors flex items-center w-full md:w-auto justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" /></svg>
                ${addBtnText}
            </button>
        </div>
        <div id="formContainer" class="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-200 mb-8" style="display: none;">
            <h3 class="text-2xl font-semibold text-gray-800 mb-6 border-b pb-4">${addBtnText}</h3>
            ${formHtml}
        </div>
        <div class="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-lg">
            <h3 class="text-xl font-semibold text-gray-700 mb-4">${listTitle}</h3>
            <div id="${listId}" class="overflow-x-auto"><p>Loading...</p></div>
        </div>
    `;

    document.getElementById('addBtn').onclick = () => {
        const formContainer = document.getElementById('formContainer');
        formContainer.style.display = formContainer.style.display === 'none' ? 'block' : 'none';
    };
    
    const formElement = document.getElementById(formId);
    const cancelBtn = formElement.querySelector('.cancel-btn');
    if(cancelBtn) {
       cancelBtn.onclick = () => document.getElementById('formContainer').style.display = 'none';
    }
    
    formElement.addEventListener('submit', async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(this).entries());
        try {
            const result = await formSubmitFunc(data);
            if (result && result.success) {
                showModal('Success', result.message);
                this.reset();
                document.getElementById('formContainer').style.display = 'none';
                loadListFunc();
            }
        } catch (error) {
            // Error is already shown by apiRequest, no need to show another modal
        }
    });
    
    loadListFunc();
}

async function populateFlockDropdown(selectElementId) {
    const selectElement = document.getElementById(selectElementId);
    if (!selectElement) return;
    try {
        const flocks = await apiRequest('/flocks');
        const activeFlocks = flocks.filter(f => f.status === 'active');
        if (activeFlocks && activeFlocks.length > 0) {
            selectElement.innerHTML = '<option value="">Select a Flock</option>';
            activeFlocks.forEach(flock => {
                selectElement.innerHTML += `<option value="${flock.id}">${flock.name} (${flock.breed})</option>`;
            });
        } else {
            selectElement.innerHTML = '<option value="">No active flocks available</option>';
        }
    } catch (error) {
        selectElement.innerHTML = '<option value="">Error loading flocks</option>';
    }
}


// --- Page Specific Implementations ---

function renderDashboard() {
    mobilePageTitle.textContent = 'Dashboard';
    pageContent.innerHTML = `<h2 class="hidden md:block text-3xl font-semibold text-gray-800 mb-6">Dashboard</h2>`;
    apiRequest('/dashboard-stats').then(stats => {
        const dashboardHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="bg-white p-6 rounded-xl shadow-lg"><h3 class="text-lg font-medium text-gray-600">Active Flocks</h3><p class="text-3xl lg:text-4xl font-bold text-green-600">${stats.totalFlocks || 0}</p></div>
                <div class="bg-white p-6 rounded-xl shadow-lg"><h3 class="text-lg font-medium text-gray-600">Total Birds</h3><p class="text-3xl lg:text-4xl font-bold text-green-600">${stats.totalBirds || 0}</p></div>
                <div class="bg-white p-6 rounded-xl shadow-lg"><h3 class="text-lg font-medium text-gray-600">Eggs Today</h3><p class="text-3xl lg:text-4xl font-bold text-green-600">${stats.eggsToday || 0}</p></div>
                <div class="bg-white p-6 rounded-xl shadow-lg"><h3 class="text-lg font-medium text-gray-600">Revenue (30d)</h3><p class="text-3xl lg:text-4xl font-bold text-green-600">Ksh ${parseFloat(stats.revenueLast30Days || 0).toFixed(0)}</p></div>
            </div>
        `;
        pageContent.innerHTML += dashboardHTML;
    }).catch(err => pageContent.innerHTML += `<p class="text-red-500">Error loading dashboard data.</p>`);
}

// Reusable form HTML generator
const createForm = (fields, buttons) => {
    return `<form id="${fields.id}" class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        ${fields.map(f => `<div class="${f.span || ''}">
            <label for="${f.name}" class="block text-sm font-medium text-gray-700">${f.label}</label>
            ${f.type === 'select' ? 
                `<select name="${f.name}" id="${f.id || f.name}" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-600 focus:border-green-600">${f.options}</select>` : 
            f.type === 'textarea' ?
                `<textarea name="${f.name}" id="${f.id || f.name}" rows="3" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-600 focus:border-green-600" placeholder="${f.placeholder || ''}"></textarea>` :
                `<input type="${f.type}" name="${f.name}" id="${f.id || f.name}" ${f.required ? 'required' : ''} class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-600 focus:border-green-600" ${f.extraAttrs || ''}>`
            }
        </div>`).join('')}
        <div class="md:col-span-2 flex justify-end pt-4 border-t border-gray-200 mt-4">
            ${buttons}
        </div>
    </form>`;
};

const formButtons = `
    <button type="button" class="cancel-btn bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors">Cancel</button>
    <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors ml-3">Save</button>`;

// --- FLOCKS ---
function renderFlocksPage() {
    const fields = [
        { name: 'flockName', label: 'Flock Name/ID', type: 'text', required: true },
        { name: 'breed', label: 'Breed', type: 'text', required: true },
        { name: 'initialBirdCount', label: 'Initial Bird Count', type: 'number', required: true },
        { name: 'acquisitionDate', label: 'Acquisition Date', type: 'date', required: true, extraAttrs: `value="${new Date().toISOString().slice(0,10)}"` },
        { name: 'flockStatus', label: 'Status', type: 'select', span: 'md:col-span-2', options: '<option value="active">Active</option><option value="sold">Sold</option><option value="culled">Culled</option>', required: true }
    ];
    fields.id = 'addFlockForm';
    renderGenericPage({
        pageTitle: 'Flock Management', addBtnText: 'Add New Flock', formId: 'addFlockForm',
        formHtml: createForm(fields, formButtons), listId: 'flocksList', listTitle: 'All Flocks', 
        loadListFunc: loadFlocks, formSubmitFunc: (data) => apiRequest('/flocks', 'POST', data)
    });
}
async function loadFlocks() {
    const listDiv = document.getElementById('flocksList');
    try {
        const flocks = await apiRequest('/flocks');
        if (flocks && flocks.length > 0) {
            listDiv.innerHTML = `<div class="responsive-table"><table><thead class="bg-gray-50"><tr>
                <th class="th-cell">Name</th><th class="th-cell">Breed</th><th class="th-cell">Count</th><th class="th-cell">Acquired</th><th class="th-cell">Status</th>
                </tr></thead><tbody class="bg-white divide-y divide-gray-200">
                ${flocks.map(flock => `<tr>
                    <td data-label="Name" class="td-cell font-medium">${flock.name}</td>
                    <td data-label="Breed" class="td-cell">${flock.breed}</td>
                    <td data-label="Count" class="td-cell">${flock.currentBirdCount}</td>
                    <td data-label="Acquired" class="td-cell">${new Date(flock.acquisitionDate).toLocaleDateString()}</td>
                    <td data-label="Status" class="td-cell"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${flock.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">${flock.status}</span></td>
                </tr>`).join('')}
            </tbody></table></div>`;
        } else { listDiv.innerHTML = '<p class="text-gray-500">No flocks found.</p>'; }
    } catch (error) { listDiv.innerHTML = '<p class="text-red-500">Error loading flocks.</p>'; }
}

// --- FEED ---
function renderFeedPage() {
    const fields = [
        { name: 'feedType', label: 'Feed Type', type: 'text', required: true, span: 'md:col-span-2' },
        { name: 'quantityKg', label: 'Quantity (kg)', type: 'number', required: true, extraAttrs: 'step="0.1"' },
        { name: 'purchaseDate', label: 'Purchase Date', type: 'date', required: true, extraAttrs: `value="${new Date().toISOString().slice(0,10)}"` },
        { name: 'supplier', label: 'Supplier (Optional)', type: 'text', span: 'md:col-span-2' },
    ];
    fields.id = 'addFeedForm';
    renderGenericPage({
        pageTitle: 'Feed Stock', addBtnText: 'Log Feed Purchase', formId: 'addFeedForm',
        formHtml: createForm(fields, formButtons), listId: 'feedList', listTitle: 'Purchase History', 
        loadListFunc: loadFeedStock, formSubmitFunc: (data) => apiRequest('/feed', 'POST', data)
    });
}
async function loadFeedStock() {
    const listDiv = document.getElementById('feedList');
    try {
        const feedStock = await apiRequest('/feed');
        if (feedStock && feedStock.length > 0) {
            listDiv.innerHTML = `<div class="responsive-table"><table><thead class="bg-gray-50"><tr>
                <th class="th-cell">Date</th><th class="th-cell">Type</th><th class="th-cell">Quantity (kg)</th><th class="th-cell">Supplier</th>
                </tr></thead><tbody class="bg-white divide-y divide-gray-200">
                ${feedStock.map(feed => `<tr>
                    <td data-label="Date" class="td-cell">${new Date(feed.purchaseDate).toLocaleDateString()}</td>
                    <td data-label="Type" class="td-cell font-medium">${feed.type}</td>
                    <td data-label="Quantity" class="td-cell">${parseFloat(feed.quantityKg).toFixed(1)}</td>
                    <td data-label="Supplier" class="td-cell">${feed.supplier || 'N/A'}</td>
                </tr>`).join('')}
            </tbody></table></div>`;
        } else { listDiv.innerHTML = '<p class="text-gray-500">No feed records found.</p>'; }
    } catch (error) { listDiv.innerHTML = '<p class="text-red-500">Error loading feed stock.</p>'; }
}

// --- EGGS ---
function renderEggsPage() {
    const fields = [
        { name: 'flockId', label: 'Flock', type: 'select', id: 'eggFlockId', span: 'md:col-span-2', options: '<option>Loading...</option>', required: true },
        { name: 'date', label: 'Collection Date', type: 'date', required: true, extraAttrs: `value="${new Date().toISOString().slice(0,10)}"` },
        { name: 'quantity', label: 'Total Eggs Collected', type: 'number', required: true },
        { name: 'gradeA', label: 'Grade A (Optional)', type: 'number' },
        { name: 'gradeB', label: 'Grade B (Optional)', type: 'number' },
    ];
    fields.id = 'addEggForm';
    renderGenericPage({
        pageTitle: 'Egg Log', addBtnText: 'Log Egg Collection', formId: 'addEggForm',
        formHtml: createForm(fields, formButtons), listId: 'eggList', listTitle: 'Collection History', 
        loadListFunc: loadEggLogs, formSubmitFunc: (data) => apiRequest('/eggs', 'POST', data)
    });
    populateFlockDropdown('eggFlockId');
}
async function loadEggLogs() {
    const listDiv = document.getElementById('eggList');
    try {
        const eggLogs = await apiRequest('/eggs');
        if (eggLogs && eggLogs.length > 0) {
            listDiv.innerHTML = `<div class="responsive-table"><table><thead class="bg-gray-50"><tr>
                <th class="th-cell">Date</th><th class="th-cell">Flock</th><th class="th-cell">Total</th><th class="th-cell">Grade A</th><th class="th-cell">Grade B</th>
                </tr></thead><tbody class="bg-white divide-y divide-gray-200">
                ${eggLogs.map(log => `<tr>
                    <td data-label="Date" class="td-cell">${new Date(log.date).toLocaleDateString()}</td>
                    <td data-label="Flock" class="td-cell font-medium">${log.flockName}</td>
                    <td data-label="Total" class="td-cell">${log.quantity}</td>
                    <td data-label="Grade A" class="td-cell">${log.gradeA || 0}</td>
                    <td data-label="Grade B" class="td-cell">${log.gradeB || 0}</td>
                </tr>`).join('')}
            </tbody></table></div>`;
        } else { listDiv.innerHTML = '<p class="text-gray-500">No egg logs found.</p>'; }
    } catch (error) { listDiv.innerHTML = '<p class="text-red-500">Error loading egg logs.</p>'; }
}

// --- MORTALITY ---
function renderMortalityPage() {
    const fields = [
        { name: 'flockId', label: 'Flock', type: 'select', id: 'mortalityFlockId', span: 'md:col-span-2', options: '<option>Loading...</option>', required: true },
        { name: 'date', label: 'Date', type: 'date', required: true, extraAttrs: `value="${new Date().toISOString().slice(0,10)}"` },
        { name: 'count', label: 'Number of Birds', type: 'number', required: true },
        { name: 'cause', label: 'Cause (Optional)', type: 'text', span: 'md:col-span-2' },
    ];
    fields.id = 'addMortalityForm';
    renderGenericPage({
        pageTitle: 'Mortality Log', addBtnText: 'Record Mortality', formId: 'addMortalityForm',
        formHtml: createForm(fields, formButtons), listId: 'mortalityList', listTitle: 'Mortality History', 
        loadListFunc: loadMortalityRecords, formSubmitFunc: (data) => apiRequest('/mortality', 'POST', data)
    });
    populateFlockDropdown('mortalityFlockId');
}
async function loadMortalityRecords() {
    const listDiv = document.getElementById('mortalityList');
    try {
        const records = await apiRequest('/mortality');
        if (records && records.length > 0) {
            listDiv.innerHTML = `<div class="responsive-table"><table><thead class="bg-gray-50"><tr>
                <th class="th-cell">Date</th><th class="th-cell">Flock</th><th class="th-cell">Count</th><th class="th-cell">Cause</th>
                </tr></thead><tbody class="bg-white divide-y divide-gray-200">
                ${records.map(record => `<tr>
                    <td data-label="Date" class="td-cell">${new Date(record.date).toLocaleDateString()}</td>
                    <td data-label="Flock" class="td-cell font-medium">${record.flockName}</td>
                    <td data-label="Count" class="td-cell">${record.count}</td>
                    <td data-label="Cause" class="td-cell">${record.cause || 'N/A'}</td>
                </tr>`).join('')}
            </tbody></table></div>`;
        } else { listDiv.innerHTML = '<p class="text-gray-500">No mortality records found.</p>'; }
    } catch (error) { listDiv.innerHTML = '<p class="text-red-500">Error loading mortality records.</p>'; }
}


// --- SALES ---
function renderSalesPage() {
    const fields = [
        { name: 'item', label: 'Item Sold', type: 'text', required: true },
        { name: 'saleDate', label: 'Date of Sale', type: 'date', required: true, extraAttrs: `value="${new Date().toISOString().slice(0,10)}"` },
        { name: 'quantity', label: 'Quantity', type: 'number', required: true, extraAttrs: 'step="0.01"' },
        { name: 'unitPrice', label: 'Unit Price (Ksh)', type: 'number', required: true, extraAttrs: 'step="0.01"' },
        { name: 'customer', label: 'Customer (Optional)', type: 'text', span: 'md:col-span-2' },
    ];
    fields.id = 'addSaleForm';
    renderGenericPage({
        pageTitle: 'Sales Records', addBtnText: 'Add New Sale', formId: 'addSaleForm',
        formHtml: createForm(fields, formButtons), listId: 'salesList', listTitle: 'Recent Sales', 
        loadListFunc: loadSales, formSubmitFunc: (data) => apiRequest('/sales', 'POST', data)
    });
}
async function loadSales() {
    const listDiv = document.getElementById('salesList');
    try {
        const sales = await apiRequest('/sales');
        if (sales && sales.length > 0) {
            listDiv.innerHTML = `<div class="responsive-table"><table><thead class="bg-gray-50"><tr>
                <th class="th-cell">Date</th><th class="th-cell">Item</th><th class="th-cell text-right">Quantity</th><th class="th-cell text-right">Total Price (Ksh)</th><th class="th-cell">Customer</th>
                </tr></thead><tbody class="bg-white divide-y divide-gray-200">
                ${sales.map(s => `<tr>
                    <td data-label="Date" class="td-cell">${new Date(s.saleDate).toLocaleDateString()}</td>
                    <td data-label="Item" class="td-cell font-medium">${s.item}</td>
                    <td data-label="Quantity" class="td-cell text-right">${s.quantity}</td>
                    <td data-label="Total Price" class="td-cell text-right">${s.formattedTotalPrice}</td>
                    <td data-label="Customer" class="td-cell">${s.customer || 'N/A'}</td>
                </tr>`).join('')}
            </tbody></table></div>`;
        } else { listDiv.innerHTML = '<p class="text-gray-500">No sales records found.</p>'; }
    } catch (error) { listDiv.innerHTML = '<p class="text-red-500">Error loading sales records.</p>'; }
}

// --- VACCINATIONS ---
function renderVaccinationsPage() {
    const fields = [
        { name: 'flockId', label: 'Flock', type: 'select', id: 'vaccinationFlockId', span: 'md:col-span-2', options: '<option>Loading...</option>', required: true },
        { name: 'vaccineName', label: 'Vaccine Name', type: 'text', required: true },
        { name: 'vaccinationDate', label: 'Date', type: 'date', required: true, extraAttrs: `value="${new Date().toISOString().slice(0,10)}"` },
        { name: 'method', label: 'Method', type: 'text', placeholder: 'e.g., Drinking Water', span: 'md:col-span-2' },
        { name: 'notes', label: 'Notes', type: 'textarea', span: 'md:col-span-2' },
    ];
    fields.id = 'addVaccinationForm';
    renderGenericPage({
        pageTitle: 'Vaccination Program', addBtnText: 'Add Vaccination Record', formId: 'addVaccinationForm',
        formHtml: createForm(fields, formButtons), listId: 'vaccinationList', listTitle: 'Vaccination History', 
        loadListFunc: loadVaccinations, formSubmitFunc: (data) => apiRequest('/vaccinations', 'POST', data)
    });
    populateFlockDropdown('vaccinationFlockId');
}
async function loadVaccinations() {
    const listDiv = document.getElementById('vaccinationList');
    try {
        const records = await apiRequest('/vaccinations');
        if (records && records.length > 0) {
            listDiv.innerHTML = `<div class="responsive-table"><table><thead class="bg-gray-50"><tr>
                <th class="th-cell">Date</th><th class="th-cell">Flock</th><th class="th-cell">Vaccine</th><th class="th-cell">Method</th><th class="th-cell">Notes</th>
                </tr></thead><tbody class="bg-white divide-y divide-gray-200">
                ${records.map(v => `<tr>
                    <td data-label="Date" class="td-cell">${new Date(v.vaccinationDate).toLocaleDateString()}</td>
                    <td data-label="Flock" class="td-cell font-medium">${v.flockName}</td>
                    <td data-label="Vaccine" class="td-cell">${v.vaccineName}</td>
                    <td data-label="Method" class="td-cell">${v.method || 'N/A'}</td>
                    <td data-label="Notes" class="td-cell">${v.notes || ''}</td>
                </tr>`).join('')}
            </tbody></table></div>`;
        } else { listDiv.innerHTML = '<p class="text-gray-500">No vaccination records found.</p>'; }
    } catch (error) { listDiv.innerHTML = '<p class="text-red-500">Error loading vaccination records.</p>'; }
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
    // Update active link in sidebar
    navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });
    
    // Update mobile header title
    const activeLink = document.querySelector(`.sidebar-link[data-page="${page}"]`);
    mobilePageTitle.textContent = activeLink ? activeLink.textContent : 'Dashboard';

    // Render the page
    const renderer = pageRenderers[page] || renderDashboard; // Default to dashboard
    renderer();

    // Hide sidebar on navigation for mobile
    if (window.innerWidth < 768) {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('opacity-0');
        sidebarOverlay.classList.add('pointer-events-none');
    }
}

// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    // Authentication modal elements
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

    window.closeAuthModal = closeAuthModal; // expose to global for onclick

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
        const formData = new FormData(loginFormElement);
        const data = Object.fromEntries(formData.entries());
        try {
            const result = await apiRequest('/login', 'POST', data);
            if (result.success && result.token) {
                localStorage.setItem('authToken', result.token);
                closeAuthModal();
                initializeApp();
            }
        } catch (error) {
            // Error shown by apiRequest
        }
    });

    signupFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(signupFormElement);
        const data = Object.fromEntries(formData.entries());
        try {
            const result = await apiRequest('/signup', 'POST', data);
            if (result.success) {
                showModal('Success', 'Signup successful! Please login.');
                signupFormElement.reset();
                signupForm.classList.add('hidden');
                loginForm.classList.remove('hidden');
            }
        } catch (error) {
            // Error shown by apiRequest
        }
    });

    // Check auth token and initialize app or show login
    function initializeApp() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            showAuthModal();
            return;
        }
        // Optionally verify token here or on API calls
        // Show main app UI
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
