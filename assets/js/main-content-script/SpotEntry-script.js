let visitors = [];
let currentFileInputId = '';
let stream = null; // Store the camera stream globally
let currentPage = 1;
let entriesPerPage = 10;
let searchQuery = '';
let isPersonNameValid = false;

// Base URL for the backend API
const API_BASE_URL = 'https://192.168.3.73:3001';

// Function to get SpotEntry permissions from localStorage (aligned with reference script)
function getPermissions() {
    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
    const spotEntry = permissions.find(p => p.name === 'SpotEntry') || {
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true
    };
    console.log('Retrieved SpotEntry permissions from localStorage:', spotEntry);
    return spotEntry;
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
        // Fetch Genders
        const genders = await apiRequest('gender');
        populateDropdown('edit-gender', genders, 'name', visitor.gender || '');

        // Fetch Purpose of Visits
        const purposes = await apiRequest('purpose-of-visit');
        populateDropdown('edit-visit', purposes, 'name', visitor.visit || '');
        // Add 'Others' option for Purpose of Visit
        const visitSelect = document.getElementById('edit-visit');
        const othersOption = document.createElement('option');
        othersOption.value = 'Others';
        othersOption.textContent = 'Others (please specify)';
        if (visitor.visit === 'Others') {
            othersOption.selected = true;
        }
        visitSelect.appendChild(othersOption);

        // Fetch Visitor Types
        const visitorTypes = await apiRequest('visitor-type');
        populateDropdown('edit-visitortype', visitorTypes, 'name', visitor.visitortype || '');

        // Fetch Time Units
        const timeUnits = await apiRequest('time-duration-unit');
        populateDropdown('edit-durationUnit', timeUnits, 'name', visitor.durationunit || visitor.durationUnit || '');
    } catch (error) {
        console.error('Error fetching dropdown data:', error);
        showMessage('Failed to load dropdown data: ' + error.message, 'error');
    }
}

// Handle Purpose of Visit 'Others' option
const visitSelect = document.getElementById('edit-visit');
const customPurposeInput = document.getElementById('custom-purpose');
visitSelect.addEventListener('change', function () {
    if (this.value === 'Others') {
        customPurposeInput.classList.remove('hidden');
    } else {
        customPurposeInput.classList.add('hidden');
        customPurposeInput.value = '';
    }
});

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
            `https://192.168.3.73:3001/users/search?query=${encodeURIComponent(query)}`,
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
                // For validation check, we only care if the person exists
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

            // For suggestion display
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

async function fetchVisitors() {
    try {
        console.log('Fetching visitors from https://192.168.3.73:3001/visitors');
        const response = await fetch(`https://192.168.3.73:3001/visitors?t=${new Date().getTime()}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Fetched visitors:', data);
        visitors = data.map(visitor => ({
            ...visitor,
            date: visitor.date ? visitor.date.split('-').reverse().join('-') : '',
            durationunit: visitor.durationunit || visitor.durationUnit || '',
        }));

        // Sort visitors by id in descending order
        visitors.sort((a, b) => b.id - a.id);
        console.log('Visitors sorted by id in descending order:', visitors);

        if (visitors.length === 0) {
            console.warn('No visitors fetched from the server');
        }

        localStorage.setItem('visitors', JSON.stringify(visitors));
        populateTable();
    } catch (error) {
        console.error('Failed to fetch visitors:', error.message);
        visitors = JSON.parse(localStorage.getItem('visitors')) || [];
        if (visitors.length === 0) {
            console.warn('No cached visitors available either');
        }
        populateTable();
    }
}

function showModal(fileInputId) {
    currentFileInputId = fileInputId;
    const modalId = 'photoModal'; // Single modal for source selection (Gallery/Camera)
    const modal = document.getElementById(modalId);
    console.log(`Attempting to show ${modalId}, element:`, modal);
    if (modal) {
        modal.style.display = 'flex';
    } else {
        console.error(`${modalId} element not found; ensure <div id="${modalId}"> exists in HTML`);
        showMessage('Photo modal not found. Please check page setup.', 'error');
    }
}

function closeModal() {
    const modalIds = ['photoModal'];
    modalIds.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        } else {
            console.warn(`${modalId} element not found`);
        }
    });
}

function closeCameraModal() {
    const modalIds = ['cameraModal', 'driverCameraModal'];
    modalIds.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        } else {
            console.warn(`${modalId} element not found`);
        }
    });
    stopCamera();
}

function openGallery() {
    const fileInput = document.getElementById(currentFileInputId);
    if (fileInput) {
        fileInput.removeAttribute('capture');
        fileInput.accept = 'image/*';
        console.log('Triggering file input click for:', fileInput);
        try {
            fileInput.click();
            setTimeout(() => {
                if (!fileInput.files.length) {
                    console.warn('File input click may not have triggered.');
                }
            }, 1000);
        } catch (error) {
            console.error('Error triggering file input:', error);
            showError('error-' + currentFileInputId, 'Failed to open gallery');
        }
    } else {
        console.error(`File input ${currentFileInputId} not found`);
        showError('error-' + currentFileInputId, 'File input not found');
    }
    closeModal();
}

async function openCamera() {
    console.log('openCamera called with currentFileInputId:', currentFileInputId);
    const fileInput = document.getElementById(currentFileInputId);
    if (fileInput) {
        currentModalId = currentFileInputId === 'edit-photo' ? 'cameraModal' : 'driverCameraModal';
        await startCamera(fileInput);
    } else {
        console.error(`File input ${currentFileInputId} not found`);
        showError('error-' + currentFileInputId, 'File input not found');
    }
    closeModal();
}

async function startCamera(fileInput) {
    const videoId = currentFileInputId === 'edit-photo' ? 'cameraPreview' : 'driverCameraPreview';
    const video = document.getElementById(videoId);
    const cameraModal = document.getElementById(currentModalId);

    // Check if required elements exist
    if (!video || !cameraModal) {
        console.error('Camera modal elements not found');
        showError('error-' + currentFileInputId, 'Camera modal elements not found');
        return;
    }

    // Check browser support for getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia is not supported in this browser');
        showError('error-' + currentFileInputId, 'Camera access not supported in this browser');
        return;
    }

    // Configure video constraints with fallback
    const tryCameraWithConstraints = async (facingMode) => {
        const constraints = {
            video: {
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        console.log(`Attempting to access camera with facingMode: ${facingMode}`);

        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Camera stream successfully obtained');
            video.srcObject = stream;
            cameraModal.style.display = 'flex'; // Show the camera modal
            video.play().catch(err => {
                console.error('Error playing video stream:', err);
                showError('error-' + currentFileInputId, 'Failed to play camera stream');
                stopCamera();
            });
        } catch (err) {
            throw err;
        }
    };

    // Try with 'environment' (rear camera), fall back to 'user' (front camera) if it fails
    try {
        await tryCameraWithConstraints('environment');
    } catch (err) {
        console.error('Failed with facingMode "environment":', err);
        if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
            console.log('Falling back to facingMode "user"');
            try {
                await tryCameraWithConstraints('user');
            } catch (fallbackErr) {
                handleCameraError(fallbackErr);
            }
        } else {
            handleCameraError(err);
        }
    }
}

function handleCameraError(err) {
    console.error('Camera access error:', err);
    let errorMessage = 'Unable to access camera';
    if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied by user';
    } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device';
    } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Camera constraints not supported on this device';
    }
    showError('error-' + currentFileInputId, errorMessage);
    stopCamera();
}

function stopCamera() {
    const videoIds = ['cameraPreview', 'driverCameraPreview'];
    videoIds.forEach(videoId => {
        const video = document.getElementById(videoId);
        if (video) video.srcObject = null;
    });
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

function capturePhoto(fileInputId) {
    const videoId = fileInputId === 'edit-photo' ? 'cameraPreview' : 'driverCameraPreview';
    const video = document.getElementById(videoId);
    const fileInput = document.getElementById(fileInputId);

    if (!video || !fileInput) {
        console.error('Camera elements or file input not found');
        showError('error-' + fileInputId, 'Camera elements not found');
        return;
    }

    // Create a temporary canvas for capturing
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame onto the canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob and create a file
    canvas.toBlob(blob => {
        if (!blob) {
            console.error('Failed to create blob from canvas');
            showError('error-' + fileInputId, 'Failed to capture photo');
            return;
        }

        console.log('Photo captured successfully, creating file');
        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;

        // Trigger preview update
        const previewId = (fileInputId === 'edit-driverphoto') ? 'driverPreview' : 'mainPreview';
        previewImage(fileInput, previewId);

        // Cleanup
        closeCameraModal();
    }, 'image/jpeg', 0.9); // Use 90% quality for JPEG
}

function previewImage(input, id) {
    const file = input?.files[0];
    const img = document.getElementById(id);
    if (file && img) {
        const reader = new FileReader();
        reader.onload = e => {
            img.src = e.target.result;
            img.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else if (img) {
        img.src = '';
        img.style.display = 'none';
    }
}

function toggleDriverDetails() {
    const driverDetails = document.getElementById('driverDetails');
    const driverToggle = document.getElementById('edit-driverToggle');
    if (!driverDetails || !driverToggle) {
        console.error('Driver details or toggle element not found:', { driverDetails, driverToggle });
        return;
    }

    const isHidden = !driverToggle.checked;
    console.log('Toggling driver details, isHidden:', isHidden, 'Current classes:', driverDetails.className);
    driverDetails.classList.toggle('hidden', isHidden);

    driverDetails.style.display = isHidden ? 'none' : 'grid';
    void driverDetails.offsetHeight;

    if (driverToggle.checked) {
        console.log('Showing driver details');
        const visitor = visitors.find(v => v.id == document.getElementById('edit-id').value);
        if (visitor) {
            document.getElementById('edit-drivername').value = visitor.drivername || '';
            document.getElementById('edit-drivermobile').value = visitor.drivermobile || '';
            document.getElementById('edit-drivernationalid').value = visitor.drivernationalid || '';
            const driverPreview = document.getElementById('driverPreview');
            if (visitor.driverphoto) {
                const driverPhotoUrl = `https://192.168.3.73:3001/uploads/${encodeURIComponent(visitor.driverphoto)}?t=${new Date().getTime()}`;
                driverPreview.src = '';
                driverPreview.src = driverPhotoUrl;
                driverPreview.style.display = 'block';
                console.log('Driver photo URL set to:', driverPhotoUrl);
            } else {
                driverPreview.src = '';
                driverPreview.style.display = 'none';
                console.log('No driver photo available for visitor');
            }
        }
    } else {
        console.log('Hiding driver details');
        document.getElementById('edit-drivername').value = '';
        document.getElementById('edit-drivermobile').value = '';
        document.getElementById('edit-drivernationalid').value = '';
        document.getElementById('driverPreview').style.display = 'none';
    }
    console.log('Driver details state after toggle:', {
        className: driverDetails.className,
        style: driverDetails.style.display,
        offsetHeight: driverDetails.offsetHeight
    });
}

function setButtonVisibility(visitorId, state) {
    const buttons = ['approveBtn', 'disapproveBtn', 'completeBtn', 'exitBtn'];
    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.style.display = 'none';
        }
    });

    const updateBtn = document.getElementById('updateBtn');
    if (updateBtn) {
        updateBtn.style.display = state === 'none' ? 'none' : 'inline-block';
    }

    if (state === 'approve') {
        document.getElementById('approveBtn').style.display = 'inline-block';
        document.getElementById('disapproveBtn').style.display = 'inline-block';
    } else if (state === 'complete') {
        document.getElementById('completeBtn').style.display = 'inline-block';
    } else if (state === 'exit') {
        document.getElementById('exitBtn').style.display = 'inline-block';
    }

    sessionStorage.setItem(`buttonState_${visitorId}`, state);
}

function populateTable() {
    const tableBody = document.getElementById('visitorTableBody');
    if (!tableBody) {
        console.error('Table body not found');
        return;
    }
    tableBody.innerHTML = '';

    const permissions = getPermissions(); // Fetch permissions for rendering
    const canUpdate = permissions.canUpdate;
    const canDelete = permissions.canDelete;
    console.log('Permissions for table rendering:', { canUpdate, canDelete });

    const filteredVisitors = visitors.filter(
        visitor =>
            visitor.firstname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            visitor.lastname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            visitor.contactnumber?.includes(searchQuery) ||
            visitor.nationalid?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const start = (currentPage - 1) * entriesPerPage;
    const end = start + entriesPerPage;
    const paginatedVisitors = filteredVisitors.slice(start, end);

    if (paginatedVisitors.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8">No visitors found</td></tr>';
    } else {
        paginatedVisitors.forEach(visitor => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${visitor.id}</td>
                <td>${visitor.firstname || ''}</td>
                <td>${visitor.lastname || ''}</td>
                <td>${visitor.contactnumber || ''}</td>
                <td>${visitor.date || ''}</td>
                <td>${visitor.time || ''}</td>
                <td>${visitor.nationalid || ''}</td>
                <td>
                    <div class="action-buttons">
                        <svg class="action-btn" 
                             ${canUpdate ? `onclick="openEditModal('${visitor.id}')"` : ''} 
                             width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                             ${!canUpdate ? 'style="opacity: 0.6; cursor: not-allowed;" title="You do not have permission to update"' : ''}>
                            <path d="M11.4001 18.1612L11.4001 18.1612L18.796 10.7653C17.7894 10.3464 16.5972 9.6582 15.4697 8.53068C14.342 7.40298 13.6537 6.21058 13.2348 5.2039L5.83882 12.5999L5.83879 12.5999C5.26166 13.1771 4.97307 13.4657 4.7249 13.7838C4.43213 14.1592 4.18114 14.5653 3.97634 14.995C3.80273 15.3593 3.67368 15.7465 3.41556 16.5208L2.05445 20.6042C1.92743 20.9852 2.0266 21.4053 2.31063 21.6894C2.59466 21.9734 3.01478 22.0726 3.39584 21.9456L7.47918 20.5844C8.25351 20.3263 8.6407 20.1973 9.00498 20.0237C9.43469 19.8189 9.84082 19.5679 10.2162 19.2751C10.5343 18.7383 11.4001 18.1612Z" fill="currentColor"></path>
                            <path d="M20.8482 8.71306C22.3839 7.17735 22.3839 4.68748 20.8482 3.15178C19.3125 1.61607 16.8226 1.61607 15.2869 3.15178L14.3999 4.03882C14.4121 4.0755 14.4246 4.11268 14.4377 4.15035C14.7628 5.0875 15.3763 6.31601 16.5303 7.47002C17.6843 8.62403 18.9128 9.23749 19.85 9.56262C19.8875 9.57563 19.9245 9.58817 19.961 9.60026L20.8482 8.71306Z" fill="currentColor"></path>
                        </svg>
                        <svg class="action-btn" 
                             ${canDelete ? `onclick="deleteVisitor('${visitor.id}')"` : ''} 
                             width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                             ${!canDelete ? 'style="opacity: 0.6; cursor: not-allowed;" title="You do not have permission to delete"' : ''}>
                            <path opacity="0.5" d="M11.5956 22.0001H12.4044C15.1871 22.0001 16.5785 22.0001 17.4831 21.1142C18.3878 20.2283 18.4803 18.7751 18.6654 15.8686L18.9321 11.6807C19.0326 10.1037 19.0828 9.31524 18.6289 8.81558C18.1751 8.31592 17.4087 8.31592 15.876 8.31592H8.12405C6.59127 8.31592 5.82488 8.31592 5.37105 8.81558C4.91722 9.31524 4.96744 10.1037 5.06788 11.6807L5.33459 15.8686C5.5197 18.7751 5.61225 20.2283 6.51689 21.1142C7.42153 22.0001 8.81289 22.0001 11.5956 22.0001Z" fill="currentColor"></path>
                            <path d="M3 6.38597C3 5.90152 3.34538 5.50879 3.77143 5.50879L6.43567 5.50832C6.96502 5.49306 7.43202 5.11033 7.61214 4.54412C7.61688 4.52923 7.62232 4.51087 7.64185 4.44424L7.75665 4.05256C7.8269 3.81241 7.8881 3.60318 7.97375 3.41617C8.31209 2.67736 8.93808 2.16432 9.66147 2.03297C9.84457 1.99972 10.0385 1.99986 10.2611 2.00002H13.7391C13.9617 1.99986 14.1556 1.99972 14.3387 2.03297C15.0621 2.16432 15.6881 2.67736 16.0264 3.41617C16.1121 3.60318 16.1733 3.81241 16.2435 4.05256L16.3583 4.44424C16.3778 4.51087 16.3833 4.52923 16.388 4.54412C16.5682 5.11033 17.1278 5.49353 17.6571 5.50879H20.2286C20.6546 5.50879 21 5.90152 21 6.38597C21 6.87043 20.6546 7.26316 20.2286 7.26316H3.77143C3.34538 7.26316 3 6.87043 3 6.38597Z" fill="currentColor"></path>
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M9.42543 11.4815C9.83759 11.4381 10.2051 11.7547 10.2463 12.1885L10.7463 17.4517C10.7875 17.8855 10.4868 18.2724 10.0747 18.3158C9.66253 18.3592 9.29499 18.0426 9.25378 17.6088L8.75378 12.3456C8.71256 11.9118 9.01327 11.5249 9.42543 11.4815Z" fill="currentColor"></path>
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M14.5747 11.4815C14.9868 11.5249 15.2875 11.9118 15.2463 12.3456L14.7463 17.6088C14.7051 18.0426 14.3376 18.3592 13.9254 18.3158C13.5133 18.2724 13.2126 17.8855 13.2538 17.4517L13.7538 12.1885C13.795 11.7547 14.1625 11.4381 14.5747 11.4815Z" fill="currentColor"></path>
                        </svg>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);

            // Additional logging for button states
            console.log(`Edit button for visitor ${visitor.id} state:`, {
                hasOnClick: !!row.querySelector('.action-btn:nth-child(1)').getAttribute('onclick'),
                style: row.querySelector('.action-btn:nth-child(1)').style.cssText
            });
            console.log(`Delete button for visitor ${visitor.id} state:`, {
                hasOnClick: !!row.querySelector('.action-btn:nth-child(2)').getAttribute('onclick'),
                style: row.querySelector('.action-btn:nth-child(2)').style.cssText
            });
        });
    }

    const totalEntries = filteredVisitors.length;
    const totalPages = Math.ceil(totalEntries / entriesPerPage);
    const showingStart = totalEntries === 0 ? 0 : start + 1;
    const showingEnd = Math.min(end, totalEntries);
    document.getElementById('paginationInfo').textContent = `Showing ${showingStart} to ${showingEnd} of ${totalEntries} entries`;

    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    const paginationDiv = document.querySelector('.pagination');
    if (totalEntries > entriesPerPage) {
        paginationDiv.style.display = 'flex';
        prevButton.disabled = currentPage === 1;
        nextButton.disabled = currentPage === totalPages || totalEntries === 0;
    } else {
        paginationDiv.style.display = 'none';
    }
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        populateTable();
    }
}

function nextPage() {
    const filteredVisitors = visitors.filter(
        visitor =>
            visitor.firstname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            visitor.lastname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            visitor.contactnumber?.includes(searchQuery) ||
            visitor.nationalid?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const totalPages = Math.ceil(filteredVisitors.length / entriesPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        populateTable();
    }
}

async function openEditModal(id) {
    const visitor = visitors.find(v => v.id == id);
    if (!visitor) {
        console.error('Visitor not found for id:', id);
        return;
    }

    console.log('Opening edit modal for visitor:', JSON.stringify(visitor, null, 2));

    // Wait for dropdowns to be populated before setting values
    await fetchAndPopulateDropdowns(visitor);

    // Define field mappings to handle discrepancies between visitor object and form field names
    const fieldMappings = {
        'edit-id': 'id',
        'edit-firstname': 'firstname',
        'edit-lastname': 'lastname',
        'edit-contactnumber': 'contactnumber',
        'edit-nationalid': 'nationalid',
        'edit-email': 'email',
        'edit-date': 'date',
        'edit-time': 'time',
        'edit-personname': 'personname',
        'edit-department': 'department',
        'edit-durationtime': 'durationtime',
        'edit-vehicletype': 'vehicletype',
        'edit-vehiclenumber': 'vehiclenumber',
        'edit-notes': 'notes',
        'edit-drivername': 'drivername',
        'edit-drivermobile': 'drivermobile',
        'edit-drivernationalid': 'drivernationalid',
        'edit-gender': 'gender',
        'edit-visit': 'visit',
        'edit-visitortype': 'visitortype',
        'edit-durationUnit': 'durationunit',
    };

    // Populate form fields
    Object.entries(fieldMappings).forEach(([fieldId, visitorKey]) => {
        const element = document.getElementById(fieldId);
        if (!element) {
            console.error(`Element not found for ID: ${fieldId}`);
            return;
        }

        let value = visitor[visitorKey] || visitor[visitorKey.toLowerCase()] || '';
        if (element.type === 'checkbox') {
            element.checked = !!value;
        } else if (fieldId === 'edit-date' && value) {
            // Handle date format
            if (value.match(/^\d{2}-\d{2}-\d{4}$/)) {
                const [day, month, year] = value.split('-');
                element.value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            } else if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                element.value = value;
            } else {
                element.value = '';
            }
        } else if (element.tagName.toLowerCase() === 'select') {
            // Skip select elements as they are handled by fetchAndPopulateDropdowns
            return;
        } else {
            element.value = value;
        }
    });

    // Validate personname on modal open without showing suggestions
    if (visitor.personname) {
        const nameMatch = visitor.personname.match(/^(.+?)\s*\(/);
        const queryName = nameMatch ? nameMatch[1].trim() : visitor.personname;
        await fetchPersonNameSuggestions(queryName, true); // Validation check only
    } else {
        isPersonNameValid = false;
        document.getElementById('error-personname').textContent = 'Person name must be selected from suggestions';
    }

    // Handle custom purpose for 'Others'
    if (visitor.visit === 'Others' && visitor.customPurpose) {
        customPurposeInput.value = visitor.customPurpose || '';
        customPurposeInput.classList.remove('hidden');
    } else {
        customPurposeInput.value = '';
        customPurposeInput.classList.add('hidden');
    }

    const driverToggle = document.getElementById('edit-driverToggle');
    if (driverToggle) {
        driverToggle.checked = !!visitor.drivername;
        toggleDriverDetails();
    }

    const mainPreview = document.getElementById('mainPreview');
    if (visitor.photo) {
        const photoUrl = `https://192.168.3.73:3001/uploads/${encodeURIComponent(visitor.photo)}?t=${new Date().getTime()}`;
        console.log('Setting mainPreview URL:', photoUrl);
        mainPreview.src = '';
        mainPreview.src = photoUrl;
        mainPreview.style.display = 'block';
        const imgTest = new Image();
        imgTest.src = photoUrl;
        imgTest.onload = () => {
            console.log('Main photo loaded successfully:', photoUrl);
            mainPreview.style.display = 'block';
        };
        imgTest.onerror = () => {
            console.error('Main photo failed to load at:', photoUrl);
            mainPreview.src = '';
            mainPreview.style.display = 'none';
        };
    } else {
        console.log('No main photo available for visitor:', visitor.id);
        mainPreview.src = '';
        mainPreview.style.display = 'none';
    }

    const driverPreview = document.getElementById('driverPreview');
    if (visitor.driverphoto) {
        const driverPhotoUrl = `https://192.168.3.73:3001/uploads/${encodeURIComponent(visitor.driverphoto)}?t=${new Date().getTime()}`;
        console.log('Setting driverPreview URL:', driverPhotoUrl);
        driverPreview.src = '';
        driverPreview.src = driverPhotoUrl;
        driverPreview.style.display = 'block';
        const driverImgTest = new Image();
        driverImgTest.src = driverPhotoUrl;
        driverImgTest.onload = () => {
            console.log('Driver photo loaded successfully:', driverPhotoUrl);
            driverPreview.style.display = 'block';
        };
        driverImgTest.onerror = () => {
            console.error('Driver photo failed to load at:', driverPhotoUrl);
            driverPreview.src = '';
            driverPreview.style.display = 'none';
        };
    } else {
        console.log('No driver photo available for visitor:', visitor.id);
        driverPreview.src = '';
        driverPreview.style.display = 'none';
    }

    // Display current status
    const statusDisplay = document.getElementById('statusDisplay');
    if (statusDisplay) {
        if (visitor.isApproved) {
            statusDisplay.textContent = 'Status: Approved';
        } else if (visitor.isApproved === false) {
            statusDisplay.textContent = 'Status: Disapproved';
        } else if (visitor.complete) {
            statusDisplay.textContent = 'Status: Complete';
        } else if (visitor.exit) {
            statusDisplay.textContent = 'Status: Exited';
        } else {
            statusDisplay.textContent = 'Status: Pending';
        }
    }

    const buttonState = sessionStorage.getItem(`buttonState_${id}`) || 'approve';
    setButtonVisibility(id, buttonState);

    document.getElementById('editModal').style.display = 'flex';
    console.log('Edit modal opened successfully');
}

function closeEditModal() {
    console.log('Closing edit modal');
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    const mainPreview = document.getElementById('mainPreview');
    const driverPreview = document.getElementById('driverPreview');
    const suggestionsContainer = document.getElementById('edit-personname-suggestions');

    if (editModal) {
        editModal.style.display = 'none';
    }
    if (editForm) {
        editForm.reset();
    }
    if (mainPreview) {
        mainPreview.src = '';
        mainPreview.style.display = 'none';
        console.log('Main preview reset');
    }
    if (driverPreview) {
        driverPreview.src = '';
        driverPreview.style.display = 'none';
        console.log('Driver preview reset');
    }
    if (suggestionsContainer) {
        suggestionsContainer.classList.add('hidden');
    }
    isPersonNameValid = false;
    clearErrors();
    const driverToggle = document.getElementById('edit-driverToggle');
    if (driverToggle) {
        driverToggle.checked = false;
        toggleDriverDetails();
    }
}

function clearErrors() {
    document.querySelectorAll('.error').forEach(error => error.textContent = '');
}

function validateForm(visitor) {
    let isValid = true;
    clearErrors();
    console.log('Validating form:', visitor);

    const requiredFields = [
        { key: 'firstname', regex: /^[a-zA-Z\s]+$/, error: 'First name is required and must contain only letters' },
        { key: 'lastname', regex: /^[a-zA-Z\s]+$/, error: 'Last name is required and must contain only letters' },
        { key: 'email', regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, error: 'Valid email is required' },
        { key: 'contactnumber', error: 'Contact number is required' },
        { key: 'nationalid', error: 'National ID is required' },
        { key: 'gender', error: 'Gender is required' },
        { key: 'date', error: 'Date is required' },
        { key: 'time', error: 'Time is required' },
        { key: 'visit', error: 'Purpose of visit is required' },
        { key: 'personname', error: 'Person name is required' },
        { key: 'department', error: 'Department is required' },
        { key: 'durationUnit', error: 'Duration unit is required' },
        { key: 'durationtime', check: value => parseFloat(value) > 0, error: 'Duration time is required and must be greater than 0' },
        { key: 'visitortype', error: 'Visitor type is required' },
    ];

    requiredFields.forEach(field => {
        const value = visitor[field.key];
        if (!value || value === '') {
            document.getElementById(`error-${field.key}`).textContent = field.error;
            isValid = false;
        } else if (field.regex && !field.regex.test(value)) {
            document.getElementById(`error-${field.key}`).textContent = field.error;
            isValid = false;
        } else if (field.check && !field.check(value)) {
            document.getElementById(`error-${field.key}`).textContent = field.error;
            isValid = false;
        }
    });

    // Validate personname
    if (!isPersonNameValid) {
        document.getElementById('error-personname').textContent = 'Person name must be selected from suggestions';
        isValid = false;
    }

    if (visitor.date) {
        let formattedDate = visitor.date;
        if (visitor.date.match(/^\d{2}-\d{2}-\d{4}$/)) {
            const [day, month, year] = visitor.date.split('-');
            formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        const today = new Date().toISOString().split('T')[0];
        if (formattedDate < today) {
            document.getElementById('error-date').textContent = 'Date cannot be in the past';
            isValid = false;
        }
    }

    if (visitor.driverToggle) {
        const driverFields = [
            { key: 'drivername', regex: /^[a-zA-Z\s]+$/, error: 'Driver name is required and must contain only letters' },
            { key: 'drivermobile', error: 'Driver mobile is required' },
            { key: 'drivernationalid', error: 'Driver national ID is required' },
        ];
        driverFields.forEach(field => {
            const value = visitor[field.key];
            if (!value || value === '') {
                document.getElementById(`error-${field.key}`).textContent = field.error;
                isValid = false;
            } else if (field.regex && !field.regex.test(value)) {
                document.getElementById(`error-${field.key}`).textContent = field.error;
                isValid = false;
            }
        });
    }

    if (!isValid) {
        console.log('Validation failed for:', visitor);
        showMessage('Please fix the errors in the form', 'error');
    }
    return isValid;
}

async function updateVisitorStatus(visitorId, status) {
    if (!visitorId) {
        showMessage('No visitor ID provided', 'error');
        return;
    }

    try {
        const response = await fetch(`https://192.168.3.73:3001/visitors/${visitorId}/status/${status}?sendEmail=false`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to update status: ${response.statusText}`);
        }

        const updatedVisitor = await response.json();
        console.log(`Visitor status updated to ${status}: | isApproved: ${updatedVisitor.isApproved} | complete: ${updatedVisitor.complete} | exit: ${updatedVisitor.exit}`, updatedVisitor);

        // Update local visitors array
        const index = visitors.findIndex(v => v.id == visitorId);
        if (index !== -1) {
            visitors[index] = {
                ...visitors[index],
                ...updatedVisitor,
                date: updatedVisitor.date ? updatedVisitor.date.split('-').reverse().join('-') : visitors[index].date,
            };
            localStorage.setItem('visitors', JSON.stringify(visitors));
        }

        showMessage(`Visitor status updated to ${status}`, 'success');
    } catch (error) {
        console.error('Error updating status:', error);
        showMessage(`Failed to update status: ${error.message}`, 'error');
    }
}

// Function to handle the background update process
async function updateVisitorInBackground(updatedVisitor, apiFormData, originalVisitor) {
    try {
        const response = await fetch(`https://192.168.3.73:3001/visitors/${updatedVisitor.id}`, {
            method: 'PATCH',
            body: apiFormData,
        });

        const responseData = await response.json();
        console.log('PATCH response status:', response.status, 'data:', JSON.stringify(responseData, null, 2));

        if (!response.ok) {
            throw new Error(responseData.message || `HTTP ${response.status}`);
        }

        // Update local visitors array with the actual backend response
        const index = visitors.findIndex(v => v.id == updatedVisitor.id);
        if (index !== -1) {
            visitors[index] = {
                ...visitors[index],
                ...responseData,
                date: responseData.date ? responseData.date.split('-').reverse().join('-') : visitors[index].date,
                photo: responseData.photo || visitors[index].photo || null,
                driverphoto: responseData.driverphoto || visitors[index].driverphoto || null,
            };
            console.log('Updated visitor in array with backend data:', JSON.stringify(visitors[index], null, 2));
            localStorage.setItem('visitors', JSON.stringify(visitors));
        } else {
            console.warn('Visitor not found in array for id:', updatedVisitor.id);
        }

        await fetchVisitors();
    } catch (error) {
        console.error('Failed to update visitor:', error.message);
        showMessage(`Failed to update visitor: ${error.message}`, 'error');

        // Revert the optimistic update
        const index = visitors.findIndex(v => v.id == updatedVisitor.id);
        if (index !== -1) {
            visitors[index] = { ...originalVisitor };
            localStorage.setItem('visitors', JSON.stringify(visitors));
            populateTable();
            console.log('Reverted visitor due to backend failure:', JSON.stringify(visitors[index], null, 2));
        }
    }
}

document.getElementById('editForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    clearErrors();
    console.log('Edit form submitted');

    const formData = new FormData(this);
    const updatedVisitor = {
        id: formData.get('id'),
        firstname: formData.get('firstname')?.trim(),
        lastname: formData.get('lastname')?.trim(),
        contactnumber: formData.get('contactnumber')?.trim(),
        nationalid: formData.get('nationalid')?.trim(),
        gender: formData.get('gender'),
        email: formData.get('email')?.trim(),
        date: formData.get('date'),
        time: formData.get('time'),
        visit: formData.get('visit')?.trim(),
        customPurpose: formData.get('customPurpose')?.trim(),
        personname: formData.get('personname')?.trim(),
        department: formData.get('department')?.trim(),
        durationUnit: formData.get('durationUnit'),
        durationtime: formData.get('durationtime'),
        visitortype: formData.get('visitortype'),
        vehicletype: formData.get('vehicletype')?.trim(),
        vehiclenumber: formData.get('vehiclenumber')?.trim(),
        drivername: formData.get('drivername')?.trim(),
        drivermobile: formData.get('drivermobile')?.trim(),
        drivernationalid: formData.get('drivernationalid')?.trim(),
        notes: formData.get('notes')?.trim(),
        driverToggle: document.getElementById('edit-driverToggle').checked,
        photo: formData.get('photo'),
        driverphoto: formData.get('driverphoto'),
    };

    if (validateForm(updatedVisitor)) {
        const submitBtn = document.getElementById('updateBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg style="width: 20px; height: 20px; color: #4361ee; display: inline-block; margin-right: 8px; animation: spin 1s linear infinite;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            Updating...
        `;

        // Store the original visitor data for potential rollback
        const originalVisitor = { ...visitors.find(v => v.id == updatedVisitor.id) };

        // Optimistically update the local visitors array
        const index = visitors.findIndex(v => v.id == updatedVisitor.id);
        if (index !== -1) {
            visitors[index] = {
                ...visitors[index],
                ...updatedVisitor,
                date: updatedVisitor.date,
                photo: updatedVisitor.photo && updatedVisitor.photo.size > 0 ? URL.createObjectURL(updatedVisitor.photo) : visitors[index].photo,
                driverphoto: updatedVisitor.driverToggle && updatedVisitor.driverphoto && updatedVisitor.driverphoto.size > 0 ? URL.createObjectURL(updatedVisitor.driverphoto) : visitors[index].driverphoto,
            };
            console.log('Optimistically updated visitor:', JSON.stringify(visitors[index], null, 2));
            localStorage.setItem('visitors', JSON.stringify(visitors));
            populateTable();
        }

        // Prepare FormData for the API
        const apiFormData = new FormData();
        Object.keys(updatedVisitor).forEach(key => {
            if (key !== 'photo' && key !== 'driverphoto' && key !== 'driverToggle' && key !== 'id' && updatedVisitor[key] !== null && updatedVisitor[key] !== undefined) {
                apiFormData.append(key, updatedVisitor[key]);
            }
        });
        apiFormData.append('driverToggle', updatedVisitor.driverToggle.toString());

        const hasPhoto = updatedVisitor.photo && updatedVisitor.photo.size > 0;
        const hasDriverPhoto = updatedVisitor.driverToggle && updatedVisitor.driverphoto && updatedVisitor.driverphoto.size > 0;
        const existingVisitor = visitors.find(v => v.id == updatedVisitor.id);

        if (hasPhoto) {
            apiFormData.append('photoFile', updatedVisitor.photo);
        } else if (existingVisitor?.photo) {
            apiFormData.append('photo', existingVisitor.photo);
        }

        if (hasDriverPhoto) {
            apiFormData.append('driverPhotoFile', updatedVisitor.driverphoto);
        } else if (updatedVisitor.driverToggle && existingVisitor?.driverphoto) {
            apiFormData.append('driverphoto', existingVisitor.driverphoto);
        }

        // Log FormData for debugging
        console.log('Preparing to send PATCH with FormData for id:', updatedVisitor.id);
        for (const [key, value] of apiFormData.entries()) {
            console.log(`${key}:`, value instanceof File ? value.name : value);
        }

        // Close modal immediately and show optimistic success toast
        closeEditModal();
        showMessage('Visitor updated successfully', 'success');

        // Perform the update in the background
        updateVisitorInBackground(updatedVisitor, apiFormData, originalVisitor);

        // Reset button state
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Update';
    }
});

async function deleteVisitor(id) {
    const swalWithBootstrapButtons = window.Swal.mixin({
        customClass: {
            confirmButton: 'btn btn-secondary',
            cancelButton: 'btn btn-dark ltr:mr-3 rtl:ml-3',
        },
        buttonsStyling: false,
    });

    swalWithBootstrapButtons
        .fire({
            title: 'Are you sure?',
            text: 'This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'No, cancel!',
            reverseButtons: true,
            padding: '2em',
        })
        .then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await fetch(`https://192.168.3.73:3001/visitors/${id}`, {
                        method: 'DELETE',
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || `HTTP ${response.status}`);
                    }

                    visitors = visitors.filter(v => v.id != id);
                    localStorage.setItem('visitors', JSON.stringify(visitors));
                    populateTable();
                    showMessage('Visitor deleted successfully', 'success');
                } catch (error) {
                    console.error('Failed to delete visitor:', error.message);
                    document.getElementById('error-notes').textContent = error.message || 'Failed to update visitor';
                    swalWithBootstrapButtons.fire('Error', 'Failed to delete visitor', 'error');
                }
            }
        });
}

document.addEventListener('DOMContentLoaded', () => {
    const selector = document.querySelector('.dataTable-selector');
    if (selector) selector.id = 'entriesPerPage';
    const input = document.querySelector('.dataTable-input');
    if (input) input.id = 'searchInput';

    // Apply permissions to "Schedule Appointment" button (aligned with reference script)
    const permissions = getPermissions();
    const scheduleBtn = document.querySelector('a[href="spot.html"]');
    if (scheduleBtn) {
        if (!permissions.canCreate) {
            scheduleBtn.classList.add('disabled');
            scheduleBtn.style.pointerEvents = 'none';
            scheduleBtn.style.opacity = '0.6';
            scheduleBtn.title = 'You do not have permission to create appointments';
            scheduleBtn.setAttribute('aria-disabled', 'true');
        } else {
            scheduleBtn.classList.remove('disabled');
            scheduleBtn.style.pointerEvents = 'auto';
            scheduleBtn.style.opacity = '1';
            scheduleBtn.title = '';
            scheduleBtn.setAttribute('aria-disabled', 'false');
        }
        console.log('Schedule Appointment button state:', {
            classList: scheduleBtn.classList.toString(),
            pointerEvents: scheduleBtn.style.pointerEvents,
            opacity: scheduleBtn.style.opacity,
            ariaDisabled: scheduleBtn.getAttribute('aria-disabled')
        });
    }

    document.getElementById('entriesPerPage')?.addEventListener('change', function () {
        entriesPerPage = parseInt(this.value);
        currentPage = 1;
        populateTable();
    });

    document.getElementById('searchInput')?.addEventListener('input', function () {
        searchQuery = this.value;
        currentPage = 1;
        populateTable();
    });

    document.getElementById('edit-photo')?.addEventListener('change', function (e) {
        previewImage(e.target, 'mainPreview');
    });
    document.getElementById('edit-driverphoto')?.addEventListener('change', function (e) {
        previewImage(e.target, 'driverPreview');
    });

    document.getElementById('approveBtn')?.addEventListener('click', async function () {
        const visitorId = document.getElementById('edit-id').value;
        await updateVisitorStatus(visitorId, 'approve');
        setButtonVisibility(visitorId, 'complete');
        closeEditModal();
        await fetchVisitors();
    });

    document.getElementById('disapproveBtn')?.addEventListener('click', async function () {
        const visitorId = document.getElementById('edit-id').value;
        await updateVisitorStatus(visitorId, 'disapprove');
        setButtonVisibility(visitorId, 'exit');
        closeEditModal();
        await fetchVisitors();
    });

    document.getElementById('completeBtn')?.addEventListener('click', async function () {
        const visitorId = document.getElementById('edit-id').value;
        await updateVisitorStatus(visitorId, 'complete');
        setButtonVisibility(visitorId, 'exit');
        closeEditModal();
        await fetchVisitors();
    });

    document.getElementById('exitBtn')?.addEventListener('click', async function () {
        const visitorId = document.getElementById('edit-id').value;
        await updateVisitorStatus(visitorId, 'exit');
        setButtonVisibility(visitorId, 'none');
        closeEditModal();
        await fetchVisitors();
    });

    // Attach personname listeners
    attachPersonNameListeners();

    // Fetch visitors on load
    fetchVisitors();

    // Show success message if visitor was created
    if (sessionStorage.getItem('visitorCreated') === 'true') {
        showMessage('Visitor created successfully', 'success', 'top-right', true, 3000);
        sessionStorage.removeItem('visitorCreated');
    }
});
