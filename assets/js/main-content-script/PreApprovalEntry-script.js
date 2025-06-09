let currentPage = 1;
let rowsPerPage = 10;
let totalRows = 0;
let allVisitors = [];
let currentFileInputId = '';
let originalVisitorData = null;
let isPersonNameValid = false;

// Define API base URL
const API_BASE_URL = 'https://192.168.1.82:3001';

// Helper function to handle API requests
async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
        if (response.status === 204) {
            return { message: 'Success' };
        }
        const contentType = response.headers.get('content-type');
        if (!response.ok) {
            if (contentType && contentType.includes('application/json')) {
                const error = await response.json();
                throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        }
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        } else {
            return { message: 'Success' };
        }
    } catch (error) {
        console.error(`API request failed (${endpoint}):`, error);
        throw error;
    }
}

async function deleteVisitor(visitorId) {
    if (!confirm("Are you sure you want to delete this visitor entry?")) return;

    try {
        const response = await fetch(`${API_BASE_URL}/appointment/${visitorId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete visitor');
        }

        showMessage('Visitor deleted successfully', 'success');
        await loadVisitorData(); // Refresh table
    } catch (error) {
        console.error('❌ Error deleting visitor:', error);
        showMessage(`Error deleting visitor: ${error.message}`, 'error');
    }
}


// Debounce function to limit API calls
function debounce(func, wait) {
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

// Fetch person name suggestions
async function fetchPersonNameSuggestions(query, isValidationCheck = false) {
    const suggestionsContainer = document.getElementById('edit-personname-suggestions');
    const personnameInput = document.getElementById('edit-personname');
    const errorElement = document.getElementById('error-personname');

    if (!personnameInput || !suggestionsContainer || !errorElement) {
        console.error('Required elements not found:', { personnameInput, suggestionsContainer, errorElement });
        return false;
    }

    if (!query || query.trim() === '') {
        suggestionsContainer.classList.add('hidden');
        isPersonNameValid = false;
        errorElement.textContent = 'Person name must be selected from suggestions';
        return false;
    }

    try {
        const response = await fetch(
            `https://192.168.1.82:3001/users/search?query=${encodeURIComponent(query)}`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }
        );

        if (response.ok) {
            const data = await response.json();
            console.log('Suggestions response:', data);
            const users = data.users || [];

            if (isValidationCheck) {
                const matched = users.some(user => {
                    const displayName = user.userName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
                    return displayName.toLowerCase() === query.toLowerCase();
                });
                if (!matched) {
                    isPersonNameValid = false;
                    errorElement.textContent = 'Selected person is not available in the database';
                    return false;
                }
                isPersonNameValid = true;
                errorElement.textContent = '';
                return true;
            }

            suggestionsContainer.innerHTML = '';
            if (users.length === 0) {
                suggestionsContainer.classList.add('hidden');
                isPersonNameValid = false;
                errorElement.textContent = 'Person name not found in database';
                return false;
            }

            users.forEach(user => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                const nameLine = document.createElement('div');
                const displayName = user.userName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
                nameLine.textContent = displayName;
                const deptDesigLine = document.createElement('div');
                deptDesigLine.textContent = `${user.department || 'N/A'} & ${user.designation || 'N/A'}`;
                deptDesigLine.style.fontSize = '0.85em';
                deptDesigLine.style.color = '#666';
                div.appendChild(nameLine);
                div.appendChild(deptDesigLine);
                div.addEventListener('click', () => {
                    personnameInput.value = `${displayName} (${user.department || 'N/A'} & ${user.designation || 'N/A'})`;
                    suggestionsContainer.classList.add('hidden');
                    document.getElementById('edit-department').value = user.department || '';
                    isPersonNameValid = true;
                    errorElement.textContent = '';
                });
                suggestionsContainer.appendChild(div);
            });

            suggestionsContainer.classList.remove('hidden');
            return true;
        } else {
            console.error('Failed to fetch suggestions:', response.status, response.statusText);
            suggestionsContainer.classList.add('hidden');
            isPersonNameValid = false;
            errorElement.textContent = 'Person name not found in database';
            return false;
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        suggestionsContainer.classList.add('hidden');
        isPersonNameValid = false;
        errorElement.textContent = 'Error fetching person name';
        return false;
    }
}

// Attach person name listeners
function attachPersonNameListeners() {
    const personnameInput = document.getElementById('edit-personname');
    const suggestionsContainer = document.getElementById('edit-personname-suggestions');

    if (personnameInput && suggestionsContainer) {
        const debouncedFetchSuggestions = debounce((e) => {
            fetchPersonNameSuggestions(e.target.value);
        }, 300);

        personnameInput.addEventListener('input', debouncedFetchSuggestions);

        document.addEventListener('click', e => {
            if (
                !personnameInput.contains(e.target) &&
                !suggestionsContainer.contains(e.target)
            ) {
                suggestionsContainer.classList.add('hidden');
            }
        });

        personnameInput.addEventListener('blur', () => {
            if (!isPersonNameValid) {
                document.getElementById('error-personname').textContent = 'Person name must be selected from suggestions';
            }
        });
    } else {
        console.error('Personname input or suggestions container not found');
    }
}

// Function to populate dropdown
function populateDropdown(selectId, data, valueKey = 'name', selectedValue = '') {
    const select = document.getElementById(selectId);
    if (!select) {
        console.error(`Select element with ID '${selectId}' not found`);
        return;
    }
    select.innerHTML = '<option value="">Select ' + selectId.replace('edit-', '') + '</option>';
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[valueKey];
        if (item[valueKey] === selectedValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

// Fetch and populate dropdowns
async function fetchAndPopulateDropdowns(visitor) {
    try {
        const genders = await apiRequest('gender');
        populateDropdown('edit-gender', genders, 'name', visitor.gender || '');

        const purposes = await apiRequest('purpose-of-visit');
        populateDropdown('edit-visit', purposes, 'name', visitor.visit || '');

        const visitorTypes = await apiRequest('visitor-type');
        populateDropdown('edit-visitortype', visitorTypes, 'name', visitor.visitortype || '');

        const timeUnits = await apiRequest('time-duration-unit');
        populateDropdown('edit-durationUnit', timeUnits, 'name', visitor.durationunit || visitor.durationUnit || '');
    } catch (error) {
        console.error('Error fetching dropdown data:', error);
        showMessage('Failed to load dropdown data: ' + error.message, 'error');
    }
}

// Toast message function
const showMessage = (msg = 'Example notification text.', type = 'success', position = 'top-right', showCloseButton = true, duration = 2000) => {
    const toast = window.Swal.mixin({
        toast: true,
        position: position,
        showConfirmButton: false,
        timer: duration,
        showCloseButton: showCloseButton,
        padding: '10px 20px',
    });

    toast.fire({
        icon: type,
        title: msg,
    });
};

// Get permissions from localStorage
function getPermissions() {
    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
    return permissions.find(p => p.name === 'PreApprovalEntry') || {
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true
    };
}

// Initialize page and check for success message
document.addEventListener('DOMContentLoaded', () => {
    const message = localStorage.getItem('appointmentSuccessMessage');
    if (message) {
        showMessage(message);
        localStorage.removeItem('appointmentSuccessMessage');
    }

    const tableBody = document.getElementById('visitorTableBody');
    const errorMessage = document.createElement('div');
    errorMessage.className = 'text-red-500 text-sm mt-2 text-center hidden';
    document.querySelector('.table-container').appendChild(errorMessage);

    const permissions = getPermissions();
    const scheduleBtn = document.querySelector('a[href="PreApproval.html"]');
    if (scheduleBtn && !permissions.canCreate) {
        scheduleBtn.classList.add('disabled');
        scheduleBtn.style.pointerEvents = 'none';
        scheduleBtn.style.opacity = '0.6';
        scheduleBtn.title = 'You do not have permission to create appointments';
    }

    loadVisitorData();
    attachPersonNameListeners();
});

// Modal functions for photo capture
function showModal(fileInputId) {
    currentFileInputId = fileInputId;
    document.getElementById('photoModal').style.display = 'flex';
}

function closeModal1() {
    document.getElementById('photoModal').style.display = 'none';
    stopCamera();
}

function openGallery() {
    const fileInput = document.getElementById(currentFileInputId);
    fileInput.removeAttribute('capture');
    fileInput.click();
    closeModal1();
}

function openCamera() {
    const fileInput = document.getElementById(currentFileInputId);
    if (fileInput) {
        fileInput.setAttribute('capture', 'environment');
        fileInput.click();
    } else {
        console.error(`File input ${currentFileInputId} not found`);
    }
    closeModal();
}

function startCamera(fileInput) {
    const video = document.getElementById('cameraPreview');
    const canvas = document.getElementById('cameraCanvas');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
            video.srcObject = stream;
            video.style.display = 'block';
            video.play();
            const captureBtn = document.createElement('button');
            captureBtn.textContent = 'Capture Photo';
            captureBtn.className = 'btn-outline-primary';
            captureBtn.onclick = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0);
                canvas.toBlob(blob => {
                    const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    fileInput.files = dataTransfer.files;
                    fileInput.dispatchEvent(new Event('change'));
                    stopCamera();
                }, 'image/jpeg');
            };
            document.body.appendChild(captureBtn);
        })
        .catch(err => {
            console.error('Camera access denied:', err);
            showMessage('Failed to access camera', 'error');
        });
}

function stopCamera() {
    const video = document.getElementById('cameraPreview');
    const stream = video.srcObject;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    video.style.display = 'none';
    const captureBtn = document.querySelector('button[onclick*="capture"]');
    if (captureBtn) captureBtn.remove();
}

function previewImage(input, id) {
    const file = input.files ? input.files[0] : null;
    const img = document.getElementById(id);
    console.log('Previewing image for', id, 'with file:', file);
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            img.src = e.target.result;
            img.style.display = 'block';
            console.log('Image preview updated for', id, 'to', e.target.result);
        };
        reader.onerror = () => console.error('Error reading file for', id);
        reader.readAsDataURL(file);
    } else {
        img.style.display = 'none';
        console.log('No file selected for', id, 'hiding preview');
    }
}

// Fetch visitor data from API
async function fetchVisitorData(page = 1, limit = 10, retries = 3) {
    console.log(`📡 Fetching visitor data: page=${page}, limit=${limit}`);
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const url = `https://192.168.1.82:3001/appointment?page=${page}&limit=${limit}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            console.log('📥 API response:', data);

            if (!data.data || typeof data.total !== 'number') {
                throw new Error('Invalid response format: expected { data, total }');
            }
            return {
                data: (data.data || []).sort((a, b) => b.id - a.id),
                total: data.total || 0,
            };
        } catch (error) {
            console.error(`Attempt ${attempt} failed to fetch visitor data:`, error);
            if (attempt === retries) {
                const errorMessage = document.querySelector('.table-container .text-red-500');
                if (errorMessage) {
                    errorMessage.textContent = `Failed to load visitor data: ${error.message}`;
                    errorMessage.classList.remove('hidden');
                    setTimeout(() => errorMessage.classList.add('hidden'), 5000);
                }
                return { data: [], total: 0 };
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
    }
}

// Update table and pagination
function updatePagination(visitors, total) {
    console.log(`📋 Updating pagination: page=${currentPage}, total=${total}, visitors=`, visitors);
    const tableBody = document.getElementById('visitorTableBody');
    const previousBtn = document.getElementById('previousBtn');
    const nextBtn = document.getElementById('nextBtn');
    const paginationButtons = document.querySelector('.pagination');
    const footerText = document.getElementById('footerText');
    const permissions = getPermissions();

    totalRows = total;

    tableBody.innerHTML = '';
    if (!visitors || visitors.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="no-data">No visitor data available</td></tr>';
        console.log('No data to display for page', currentPage);
    } else {
        visitors.forEach(visitor => {
            const row = document.createElement('tr');
            row.setAttribute('data-id', visitor.id || '');
            row.innerHTML = `
                <td>${visitor.id || '-'}</td>
                <td>${visitor.firstname || '-'}</td>
                <td>${visitor.lastname || '-'}</td>
                <td>${visitor.contactnumber || '-'}</td>
                <td>${visitor.nationalid || '-'}</td>
                <td class="center-checkbox">
                    <input type="checkbox"
                        class="nda-approve ${visitor.ndaApproved == null ? 'unset' : ''}"
                        id="nda-${visitor.id || ''}"
                        ${visitor.ndaApproved === true ? 'checked' : ''}
                        disabled>
                    <label for="nda-${visitor.id || ''}"></label>
                </td>
                <td class="center-checkbox">
                    <input type="checkbox"
                        class="nda-approve ${visitor.SaftyApproval == null ? 'unset' : ''}"
                        id="safety-${visitor.id || ''}"
                        ${visitor.SaftyApproval === true ? 'checked' : ''}
                        disabled>
                    <label for="safety-${visitor.id || ''}"></label>
                </td>
                <td>
    <div class="action-buttons">
        <svg class="action-btn"
            ${permissions.canUpdate ? `onclick="openVisitorModal('${visitor.id}')"` : ''}
            width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
            ${!permissions.canUpdate ? 'style="opacity: 0.6; cursor: not-allowed;" title="You do not have permission to update"' : ''}>
            <path d="M11.4 18.16L18.8 10.77C17.79 10.35 16.6 9.66 15.47 8.53C14.34 7.4 13.65 6.21 13.23 5.2L5.84 12.6C5.26 13.18 4.97 13.47 4.72 13.78C4.43 14.16 4.18 14.57 3.98 15C3.8 15.36 3.67 15.75 3.42 16.52L2.05 20.6C1.93 20.99 2.03 21.41 2.31 21.69C2.59 21.97 3.01 22.07 3.4 21.95L7.48 20.58C8.25 20.33 8.64 20.2 9.00 20.02C9.43 19.82 9.84 19.57 10.22 19.28C10.53 18.74 11.4 18.16Z" fill="currentColor"></path>
            <path d="M20.85 8.71C22.38 7.18 22.38 4.69 20.85 3.15C19.31 1.62 16.82 1.62 15.29 3.15L14.4 4.04C14.41 4.08 14.42 4.11 14.44 4.15C14.76 5.09 15.38 6.32 16.53 7.47C17.68 8.62 18.91 9.24 19.85 9.56C19.89 9.58 19.92 9.59 19.96 9.6L20.85 8.71Z" fill="currentColor"></path>
        </svg>
        <svg class="action-btn"
            ${permissions.canDelete ? `onclick="deleteVisitor('${visitor.id}')"` : ''}
            width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
            ${!permissions.canDelete ? 'style="opacity: 0.6; cursor: not-allowed;" title="You do not have permission to delete"' : ''}>
            <path opacity="0.5" d="M11.6 22H12.4C15.19 22 16.58 22 17.48 21.11C18.39 20.23 18.48 18.78 18.67 15.87L18.93 11.68C19.03 10.1 19.08 9.32 18.63 8.82C18.18 8.32 17.41 8.32 15.88 8.32H8.12C6.59 8.32 5.82 8.32 5.37 8.82C4.92 9.32 4.97 10.1 5.07 11.68L5.33 15.87C5.52 18.78 5.61 20.23 6.52 21.11C7.42 22 8.81 22 11.6 22Z" fill="currentColor"></path>
            <path d="M3 6.39C3 5.9 3.35 5.51 3.77 5.51H6.44C6.97 5.49 7.43 5.11 7.61 4.54L7.76 4.05C7.83 3.81 7.89 3.6 7.97 3.42C8.31 2.68 8.94 2.16 9.66 2.03C9.84 2 10.04 2 10.26 2H13.74C13.96 2 14.16 2 14.34 2.03C15.06 2.16 15.69 2.68 16.03 3.42C16.11 3.6 16.17 3.81 16.24 4.05L16.36 4.44C16.57 5.11 17.13 5.49 17.66 5.51H20.23C20.65 5.51 21 5.9 21 6.39C21 6.87 20.65 7.26 20.23 7.26H3.77C3.35 7.26 3 6.87 3 6.39Z" fill="currentColor"></path>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M9.43 11.48C9.84 11.44 10.21 11.75 10.25 12.19L10.75 17.45C10.79 17.89 10.49 18.27 10.07 18.32C9.66 18.36 9.29 18.04 9.25 17.61L8.75 12.35C8.71 11.91 9.01 11.52 9.43 11.48Z" fill="currentColor"></path>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M14.57 11.48C14.99 11.52 15.29 11.91 15.25 12.35L14.75 17.61C14.71 18.04 14.34 18.36 13.93 18.32C13.51 18.27 13.21 17.89 13.25 17.45L13.75 12.19C13.8 11.75 14.16 11.44 14.57 11.48Z" fill="currentColor"></path>
        </svg>
    </div>
</td>

            `;
            tableBody.appendChild(row);
        });
        console.log('✅ Rendered table with', visitors.length, 'rows');
    }

    const startIndex = totalRows > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0;
    const endIndex = Math.min(currentPage * rowsPerPage, totalRows);
    footerText.textContent = `Showing ${startIndex} to ${endIndex} of ${totalRows} entries`;

    paginationButtons.style.display = totalRows > rowsPerPage ? 'flex' : 'none';
    previousBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage * rowsPerPage >= totalRows;

    document.querySelectorAll('.details-btn').forEach(button => {
        if (!button.disabled) {
            button.addEventListener('click', () => {
                const visitorId = button.getAttribute('data-id');
                openVisitorModal(visitorId);
            });
        }
    });
}

// Load visitor data and set up event listeners
async function loadVisitorData() {
    try {
        const { data: visitors, total } = await fetchVisitorData(currentPage, rowsPerPage);
        allVisitors = visitors;
        updatePagination(visitors, total);

        document.getElementById('entriesPerPage').addEventListener('change', async (e) => {
            rowsPerPage = parseInt(e.target.value) || 10;
            currentPage = 1;
            const { data: visitors, total } = await fetchVisitorData(currentPage, rowsPerPage);
            allVisitors = visitors;
            updatePagination(visitors, total);
        });

        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', async () => {
            const searchTerm = searchInput.value.toLowerCase();
            if (searchTerm) {
                const filteredData = allVisitors.filter(visitor =>
                    (visitor.id && visitor.id.toString().toLowerCase().includes(searchTerm)) ||
                    (visitor.firstname && visitor.firstname.toLowerCase().includes(searchTerm)) ||
                    (visitor.lastname && visitor.lastname.toLowerCase().includes(searchTerm)) ||
                    (visitor.contactnumber && visitor.contactnumber.toLowerCase().includes(searchTerm)) ||
                    (visitor.nationalid && visitor.nationalid.toLowerCase().includes(searchTerm))
                );
                updatePagination(filteredData, filteredData.length);
            } else {
                const { data: visitors, total } = await fetchVisitorData(currentPage, rowsPerPage);
                allVisitors = visitors;
                updatePagination(visitors, total);
            }
        });

        document.getElementById('previousBtn').addEventListener('click', async () => {
            if (currentPage > 1) {
                currentPage--;
                const { data: visitors, total } = await fetchVisitorData(currentPage, rowsPerPage);
                allVisitors = visitors;
                updatePagination(visitors, total);
            }
        });

        document.getElementById('nextBtn').addEventListener('click', async () => {
            const maxPages = Math.ceil(totalRows / rowsPerPage);
            console.log(`🖱️ Next button clicked: currentPage=${currentPage}, maxPages=${maxPages}, totalRows=${totalRows}`);
            if (currentPage < maxPages) {
                currentPage++;
                console.log(`📄 Fetching page ${currentPage}`);
                const { data: visitors, total } = await fetchVisitorData(currentPage, rowsPerPage);
                allVisitors = visitors;
                updatePagination(visitors, total);
            } else {
                console.log('No more pages to fetch');
                showMessage('No more records to display', 'info');
            }
        });
    } catch (error) {
        console.error('Error loading visitor data:', error);
        const tableBody = document.getElementById('visitorTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="9" class="no-data">Error loading data</td></tr>';
        }
        showMessage('Failed to load visitor data', 'error');
    }
}

// Fetch visitor details by ID
async function fetchVisitorById(visitorId, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(`https://192.168.1.82:3001/appointment/${visitorId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch visitor: ${response.statusText}`);
            }
            const visitor = await response.json();
            return visitor;
        } catch (error) {
            console.error(`Attempt ${attempt} failed to fetch visitor ${visitorId}:`, error);
            if (attempt === retries) {
                const errorMessage = document.querySelector('.table-container .text-red-500');
                if (errorMessage) {
                    errorMessage.textContent = `Failed to load visitor ${visitorId} details`;
                    errorMessage.classList.remove('hidden');
                    setTimeout(() => errorMessage.classList.add('hidden'), 5000);
                }
                return null;
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
    }
}

// Preview image in modal
function previewImageModal(input, previewId) {
    const preview = document.getElementById(previewId);
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            preview.classList.remove('hidden');
            console.log(`📸 Previewing new ${previewId === 'mainPreview' ? 'visitor' : 'driver'} photo`);
        };
        reader.onerror = () => {
            preview.src = 'https://via.placeholder.com/150';
            preview.classList.add('hidden');
            console.error(`📸 Error loading ${previewId} photo`);
        };
        reader.readAsDataURL(file);
    } else {
        console.log(`📸 No new ${previewId === 'mainPreview' ? 'visitor' : 'driver'} photo selected`);
        preview.src = 'https://via.placeholder.com/150';
        preview.classList.add('hidden');
    }
}

// Open visitor details modal
async function openVisitorModal(visitorId) {
    const visitor = await fetchVisitorById(visitorId);
    if (!visitor) return;

    console.log('Visitor data on modal open:', visitor); // Debug log
    originalVisitorData = { ...visitor };

    const populateField = (id, value, defaultValue = '') => {
        const element = document.getElementById(`edit-${id}`);
        if (element) element.value = value ?? '';
    };

    populateField('firstname', visitor.firstname);
    populateField('lastname', visitor.lastname);
    populateField('gender', visitor.gender);
    populateField('contactnumber', visitor.contactnumber);
    populateField('email', visitor.email);
    populateField('date', visitor.date);
    populateField('time', visitor.time);
    populateField('nationalid', visitor.nationalid);
    populateField('visit', visitor.visit);
    populateField('personname', visitor.personname);
    populateField('department', visitor.department);
    populateField('durationtime', visitor.durationtime);
    populateField('durationUnit', visitor.durationunit);
    populateField('visitortype', visitor.visitortype);
    populateField('vehicletype', visitor.vehicletype);
    populateField('vehiclenumber', visitor.vehiclenumber);
    populateField('drivername', visitor.drivername);
    populateField('drivermobile', visitor.drivermobile);
    populateField('drivernationalid', visitor.drivernationalid);
    populateField('notes', visitor.notes);

    if (visitor.personname) {
        const nameMatch = visitor.personname.match(/^(.+?)\s*\(/);
        const queryName = nameMatch ? nameMatch[1].trim() : visitor.personname;
        await fetchPersonNameSuggestions(queryName, true);
    } else {
        isPersonNameValid = false;
        document.getElementById('error-personname').textContent = 'Person name must be selected from suggestions';
    }

    const driverToggle = document.getElementById('edit-driverToggle');
    const driverDetails = document.getElementById('driverDetails');
    const hasDriverDetails = visitor.drivername || visitor.drivermobile || visitor.drivernationalid || visitor.driverphoto;
    if (driverToggle && driverDetails) {
        driverToggle.checked = hasDriverDetails;
        driverDetails.classList.toggle('hidden', !hasDriverDetails);
    }

    await fetchAndPopulateDropdowns(visitor);

    const setPhotoPreview = async (previewId, path, visitorId, type) => {
        const preview = document.getElementById(previewId);
        if (!preview) return;

        preview.classList.remove('hidden');

        if (path && path.trim() !== '') {
            try {
                const photoUrl = `https://192.168.1.82:3001/appointment/${visitorId}/photo?type=${type}`;
                const response = await fetch(photoUrl, { method: 'GET', mode: 'cors' });
                if (!response.ok) throw new Error('Photo fetch failed');
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => preview.src = reader.result;
                reader.readAsDataURL(blob);
            } catch (error) {
                preview.src = 'https://via.placeholder.com/150';
                console.error(`📸 Failed to fetch ${previewId} photo:`, error);
            }
        } else {
            preview.src = 'https://via.placeholder.com/150';
        }
    };

    await setPhotoPreview('mainPreview', visitor.photo, visitorId, 'photo');
    await setPhotoPreview('driverPreview', visitor.driverphoto, visitorId, 'driverphoto');

    setButtonVisibility(visitorId, visitor);

    document.getElementById('visitorForm').setAttribute('data-id', visitorId);
    document.getElementById('visitorModal').style.display = 'block';
}

// Handle form submission
document.getElementById('visitorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const visitorId = e.target.getAttribute('data-id');

    try {
        if (!originalVisitorData) {
            showMessage('Data not loaded', 'error');
            return;
        }

        const requiredFields = [
            { key: 'firstname', error: 'First name is required' },
            { key: 'gender', error: 'Gender is required' },
            { key: 'email', error: 'Email is required' },
            { key: 'date', error: 'Date is required' },
            { key: 'time', error: 'Time is required' },
            { key: 'nationalid', error: 'National ID is required' },
            { key: 'visit', error: 'Purpose of visit is required' },
            { key: 'personname', error: 'Person name is required' },
            { key: 'department', error: 'Department is required' },
            { key: 'durationtime', error: 'Duration time is required' },
            { key: 'visitortype', error: 'Visitor type is required' },
            { key: 'durationUnit', error: 'Duration unit is required' }
        ];
        const missingFields = requiredFields.filter(field => {
            const element = document.getElementById(`edit-${field.key}`);
            return !element || !element.value.trim();
        });
        if (missingFields.length > 0) {
            showMessage(`Please fill in: ${missingFields.map(f => f.error).join(', ')}`, 'error');
            return;
        }

        if (!isPersonNameValid) {
            showMessage('Person name must be selected from suggestions', 'error');
            document.getElementById('error-personname').textContent = 'Person name must be selected from suggestions';
            return;
        }

        const changedData = {};
        const fields = ['firstname', 'lastname', 'gender', 'contactnumber', 'email', 'date', 'time', 'nationalid', 'visit', 'personname', 'department', 'durationtime', 'durationunit', 'visitortype', 'vehicletype', 'vehiclenumber', 'drivername', 'drivermobile', 'drivernationalid', 'notes'];
        fields.forEach(field => {
            const element = document.getElementById(`edit-${field}`);
            if (!element) {
                console.warn(`Field edit-${field} not found`);
                return;
            }
            const currentValue = element.value;
            const originalValue = originalVisitorData[field] ?? '';
            if (currentValue !== originalValue.toString()) {
                const key = field === 'durationUnit' ? 'durationunit' : field;
                changedData[key] = currentValue;
            }
        });

        const photoFile = document.getElementById('edit-photo')?.files[0];
        const driverPhotoFile = document.getElementById('edit-driverphoto')?.files[0];
        if (photoFile) changedData.photo = photoFile;
        if (driverPhotoFile) changedData.driverphoto = driverPhotoFile;

        if (Object.keys(changedData).length === 0) {
            showMessage('No changes detected', 'info');
            return;
        }

        const hasDriverDetails = ['drivername', 'drivermobile', 'drivernationalid'].some(field => changedData[field] || originalVisitorData[field]);
        if (hasDriverDetails && !changedData.driverphoto && !originalVisitorData.driverphoto) {
            showMessage('Driver photo is required', 'error');
            return;
        }

        let body = new FormData();
        Object.entries(changedData).forEach(([key, value]) => {
            if (key === 'photo' || key === 'driverphoto') {
                body.append(key, value instanceof File ? value : '');
            } else {
                body.append(key, value || '');
            }
        });

        console.log('📤 Submitting FormData:Data');
        for (const [key, value] of body.entries()) {
            console.log(`${key}: ${value instanceof File ? value.name : value}`);
        }

        async function attemptUpdate(attempt = 1, maxAttempts = 3) {
            const submitBtn = document.querySelector('#save-details');
            if (!submitBtn) {
                showMessage('Save button not found', 'error');
                return false;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <svg style="width: 20px; height: 20px; color: #4361ee; display: inline-block; margin-right: 8px; animation: spin 1s linear infinite;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                Saving...
            `;
            try {
                const response = await fetch(`https://192.168.1.82:3001/appointment/${visitorId}`, {
                    method: 'PUT',
                    body,
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Update failed');
                }
                await response.json();
                document.getElementById('visitorModal').style.display = 'none';
                originalVisitorData = null;
                await loadVisitorData();
                showMessage('Appointment Details saved successfully!', 'success');

                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Save Details'; // Restore original button text
                return true;
            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);
                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
                    return attemptUpdate(attempt + 1, maxAttempts);
                } else {
                    showMessage(`Failed to update visitor: ${error.message}`, 'error');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Save Details'; // Restore original button text
                    return false;
                }
            }
        }
        await attemptUpdate();
    } catch (error) {
        console.error('Error submitting form:', error);
        showMessage('An error occurred during submission', 'error');
    }
});

// Close modal
function closeVisitorModal() {
    document.getElementById('visitorModal').style.display = 'none';
    originalVisitorData = null;
    document.getElementById('visitorForm').reset();
    ['mainPreview', 'driverPreview'].forEach(id => {
        const img = document.getElementById(id);
        if (img) {
            img.src = 'https://via.placeholder.com/150';
            img.classList.add('hidden');
        }
    });
    const suggestionsContainer = document.getElementById('edit-personname-suggestions');
    if (suggestionsContainer) {
        suggestionsContainer.classList.add('hidden');
    }
    isPersonNameValid = false;
}

document.querySelector('.modal .close')?.addEventListener('click', closeVisitorModal);

// Toggle driver details modal
window.toggleDriverDetails = function () {
    const driverDetails = document.getElementById('driverDetails');
    const driverToggle = document.getElementById('edit-driverToggle');
    if (driverDetails && driverToggle) {
        driverDetails.classList.toggle('hidden', !driverToggle.checked);
    }
};

// Save visitor note
async function saveVisitorNote(visitorId, note, maxAttempts = 3) {
    if (!visitorId) {
        showMessage('No visitor ID provided', 'error');
        return false;
    }

    async function attemptUpdate(attempt = 1) {
        try {
            const response = await fetch(`https://192.168.1.82:3001/appointment/${visitorId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: note }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save note');
            }

            await response.json();
            showMessage('Note saved successfully', 'success');
            originalVisitorData.notes = note;
            await loadVisitorData();
            return true;
        } catch (error) {
            console.error(`Attempt ${attempt} failed to save note:`, error);
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
                return attemptUpdate(attempt + 1);
            } else {
                showMessage(`Failed to save note: ${error.message}`, 'error');
                return false;
            }
        }
    }

    return await attemptUpdate();
}

function setButtonVisibility(visitorId, visitor) {
    const buttons = ['approveBtn', 'disapproveBtn', 'completeBtn', 'exitBtn', 'save-details', 'noteBtn'];
    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            // Initially hide all buttons except noteBtn and save-details
            btn.style.display = (btnId === 'noteBtn' || btnId === 'save-details') ? 'inline-block' : 'none';
        }
    });

    // Log visitor state for debugging
    console.log('Visitor state in setButtonVisibility:', {
        isApproved: visitor.isApproved,
        complete: visitor.complete,
        exit: visitor.exit,
        disapprovedFlag: sessionStorage.getItem(`visitor_${visitorId}_disapproved`)
    });

    // Define the initial state: no action has been taken
    const isInitialState = !visitor.isApproved && !visitor.complete && !visitor.exit && !sessionStorage.getItem(`visitor_${visitorId}_disapproved`);

    if (visitor.exit) {
        // Only Note button visible after exit
        const saveDetailsBtn = document.getElementById('save-details');
        if (saveDetailsBtn) saveDetailsBtn.style.display = 'none';
    } else if (visitor.complete) {
        // When complete, show Exit, Save Details, and Note buttons
        const exitBtn = document.getElementById('exitBtn');
        if (exitBtn) exitBtn.style.display = 'inline-block';
    } else if (visitor.isApproved) {
        // When approved (isApproved: true), show Complete, Save Details, and Note buttons
        const completeBtn = document.getElementById('completeBtn');
        if (completeBtn) completeBtn.style.display = 'inline-block';
    } else if (sessionStorage.getItem(`visitor_${visitorId}_disapproved`) === 'true') {
        // Disapproved state: show Save Details, Exit, and Note buttons
        const exitBtn = document.getElementById('exitBtn');
        if (exitBtn) exitBtn.style.display = 'inline-block';
        // Explicitly hide Approve, Disapprove, and Complete buttons
        const approveBtn = document.getElementById('approveBtn');
        const disapproveBtn = document.getElementById('disapproveBtn');
        const completeBtn = document.getElementById('completeBtn');
        if (approveBtn) approveBtn.style.display = 'none';
        if (disapproveBtn) disapproveBtn.style.display = 'none';
        if (completeBtn) completeBtn.style.display = 'none';
    } else if (isInitialState) {
        // Initial state: show Approve, Disapprove, Save Details, and Note buttons
        const approveBtn = document.getElementById('approveBtn');
        const disapproveBtn = document.getElementById('disapproveBtn');
        if (approveBtn) approveBtn.style.display = 'inline-block';
        if (disapproveBtn) disapproveBtn.style.display = 'inline-block';
    }

    const state = visitor.exit
        ? 'none'
        : visitor.complete
        ? 'exit'
        : visitor.isApproved
        ? 'complete'
        : sessionStorage.getItem(`visitor_${visitorId}_disapproved`) === 'true'
        ? 'disapproved'
        : 'approve'; // Default to initial state
    sessionStorage.setItem(`buttonState_${visitorId}`, state);
    console.log(`Button state set to: ${state}`);
}

async function updateVisitorStatus(visitorId, status, resetStatus = {}, maxAttempts = 3) {
    if (!visitorId) {
        showMessage('No visitor ID provided', 'error');
        return false;
    }

    // Ensure isApproved and complete are set appropriately based on status
    const payload = {
        sendEmail: false,
        ...resetStatus,
        ...(status === 'approve' ? { isApproved: true, complete: false } : {}),
        ...(status === 'disapprove' ? { isApproved: false, complete: false } : {}),
        ...(status === 'complete' ? { complete: true } : {}),
        ...(status === 'exit' ? { exit: true } : {}),
    };

    async function attemptUpdate(attempt = 1) {
        try {
            const response = await fetch(`https://192.168.1.82:3001/appointment/${visitorId}/status/${status}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to update status: ${response.statusText}`);
            }

            const updatedVisitor = await response.json();
            console.log(`Visitor status updated to ${status}: | isApproved: ${updatedVisitor.isApproved} | complete: ${updatedVisitor.complete} | exit: ${updatedVisitor.exit}`, updatedVisitor);

            setButtonVisibility(visitorId, updatedVisitor);

            originalVisitorData = null;
            await loadVisitorData();
            return updatedVisitor;
        } catch (error) {
            console.error(`Attempt ${attempt} failed to update status to ${status}:`, error);
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
                return attemptUpdate(attempt + 1);
            } else {
                showMessage(`Failed to update status: ${error.message}`, 'error');
                return false;
            }
        }
    }

    return await attemptUpdate();
}

// Append event listeners to DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('approveBtn')?.addEventListener('click', async () => {
        const visitorId = document.getElementById('visitorForm').getAttribute('data-id');
        // Remove disapproval flag when approving
        sessionStorage.removeItem(`visitor_${visitorId}_disapproved`);
        if (await updateVisitorStatus(visitorId, 'approve')) {
            const visitor = await fetchVisitorById(visitorId);
            if (visitor) {
                setButtonVisibility(visitorId, visitor);
                // Set success message before redirect
                sessionStorage.setItem('successMessage', 'Visitor status approved successfully');
                window.location.href = 'PreApprovalEntry.html';
            }
        }
    });

    const message = sessionStorage.getItem('successMessage');
    if (message) {
        showMessage(message, 'success');
        sessionStorage.removeItem('successMessage'); // Clear after showing
    }

    document.getElementById('disapproveBtn')?.addEventListener('click', async () => {
        const visitorId = document.getElementById('visitorForm').getAttribute('data-id');
        let visitor = await updateVisitorStatus(visitorId, 'disapprove', { complete: false });
        if (visitor) {
            // Set a flag in sessionStorage to indicate this visitor has been disapproved
            sessionStorage.setItem(`visitor_${visitorId}_disapproved`, 'true');
            setButtonVisibility(visitorId, visitor);
            // Close the modal after disapproving
            document.getElementById('visitorModal').style.display = 'none';
            originalVisitorData = null;
            await loadVisitorData();
            showMessage('Visitor status disapproved successfully', 'success');
        }
    });

    const message1 = sessionStorage.getItem('successMessage');
    if (message1) {
        showMessage(message1, 'success');
        sessionStorage.removeItem('successMessage'); // Clear after showing
    }

    document.getElementById('completeBtn')?.addEventListener('click', async () => {
        const visitorId = document.getElementById('visitorForm').getAttribute('data-id');
        // Remove disapproval flag when completing
        sessionStorage.removeItem(`visitor_${visitorId}_disapproved`);
        if (await updateVisitorStatus(visitorId, 'complete')) {
            const visitor = await fetchVisitorById(visitorId);
            if (visitor) {
                setButtonVisibility(visitorId, visitor);
                // Set success message before redirect
                sessionStorage.setItem('successMessage', 'Visitor status marked as complete successfully');
                window.location.href = 'PreApprovalEntry.html';
            }
        }
    });

    const message2 = sessionStorage.getItem('successMessage');
    if (message2) {
        showMessage(message2, 'success');
        sessionStorage.removeItem('successMessage');
    }

    document.getElementById('exitBtn')?.addEventListener('click', async () => {
        const visitorId = document.getElementById('visitorForm').getAttribute('data-id');
        if (await updateVisitorStatus(visitorId, 'exit')) {
            const visitor = await fetchVisitorById(visitorId);
            if (visitor) {
                setButtonVisibility(visitorId, visitor);
                // Set success message before redirect
                sessionStorage.setItem('successMessage', 'Visitor has exited successfully');
                window.location.href = 'PreApprovalEntry.html';
            }
        }
    });

    const message3 = sessionStorage.getItem('successMessage');
    if (message3) {
        showMessage(message3, 'success');
        sessionStorage.removeItem('successMessage'); // Clear after showing
    }

    document.getElementById('noteBtn')?.addEventListener('click', async () => {
        const visitorId = document.getElementById('visitorForm').getAttribute('data-id');
        const noteInput = document.getElementById('edit-notes');
        if (!noteInput) {
            showMessage('Note input field not found', 'error');
            return;
        }
        const note = noteInput.value.trim();
        if (!note) {
            showMessage('Please enter a note', 'error');
            return;
        }
        await saveVisitorNote(visitorId, note);
    });
});
