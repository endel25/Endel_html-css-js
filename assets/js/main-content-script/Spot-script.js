// Base URL for the backend API
const API_BASE_URL = 'https://192.168.3.73:3001';

let currentFileInputId = '';
let isPersonNameValid = false; // Flag to track if personname is valid
let stream = null; // Store the camera stream globally

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
function populateDropdown(selectId, data, valueKey = 'name') {
    const select = document.getElementById(selectId);
    if (!select) {
        console.error(`Select element with ID '${selectId}' not found`);
        return;
    }
    select.innerHTML = '<option value="">Select ' + selectId + '</option>';
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[valueKey];
        select.appendChild(option);
    });
}

// Fetch and populate dropdowns
async function fetchGenders() {
    try {
        const genders = await apiRequest('gender');
        populateDropdown('gender', genders);
    } catch (error) {
        console.error('Error fetching genders:', error);
        showMessage('Failed to load genders: ' + error.message, 'error');
    }
}

async function fetchPurposeOfVisits() {
    try {
        const purposes = await apiRequest('purpose-of-visit');
        populateDropdown('visit', purposes);
    } catch (error) {
        console.error('Error fetching purpose of visits:', error);
        showMessage('Failed to load purpose of visits: ' + error.message, 'error');
    }
}

async function fetchVisitorTypes() {
    try {
        const visitorTypes = await apiRequest('visitor-type');
        populateDropdown('visitortype', visitorTypes);
    } catch (error) {
        console.error('Error fetching visitor types:', error);
        showMessage('Failed to load visitor types: ' + error.message, 'error');
    }
}

async function fetchTimeUnits() {
    try {
        const timeUnits = await apiRequest('time-duration-unit');
        populateDropdown('durationunit', timeUnits);
    } catch (error) {
        console.error('Error fetching time units:', error);
        showMessage('Failed to load time units: ' + error.message, 'error');
    }
}

const visitSelect = document.getElementById('visit');
const customPurposeInput = document.getElementById('custom-purpose');
if (visitSelect && customPurposeInput) {
    visitSelect.addEventListener('change', function () {
        if (this.value === 'Others') {
            customPurposeInput.classList.remove('hidden');
        } else {
            customPurposeInput.classList.add('hidden');
        }
    });
}

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

function showModal(fileInputId) {
    currentFileInputId = fileInputId;
    const modal = document.getElementById('photoModal');
    console.log('Attempting to show photoModal, element:', modal);
    if (modal) {
        modal.style.display = 'flex';
    } else {
        console.warn('photoModal element not found; ensure <div id="photoModal"> exists in HTML');
    }
}

function closeModal() {
    const modal = document.getElementById('photoModal');
    console.log('Attempting to close photoModal, element:', modal);
    if (modal) {
        modal.style.display = 'none';
    } else {
        console.warn('photoModal element not found');
    }
}

function closeCameraModal() {
    const modal = document.getElementById('cameraModal');
    console.log('Attempting to close cameraModal, element:', modal);
    if (modal) {
        modal.style.display = 'none';
    } else {
        console.warn('cameraModal element not found');
    }
    stopCamera();
}

function openGallery() {
    const fileInput = document.getElementById(currentFileInputId);
    if (fileInput) {
        fileInput.removeAttribute('capture');
        fileInput.click();
    } else {
        console.error(`File input ${currentFileInputId} not found`);
    }
    closeModal();
}

async function openCamera() {
    console.log('openCamera called with currentFileInputId:', currentFileInputId);
    const fileInput = document.getElementById(currentFileInputId);
    if (fileInput) {
        await startCamera(fileInput);
    } else {
        console.error(`File input ${currentFileInputId} not found`);
        showError('error-' + currentFileInputId, 'File input not found');
    }
    closeModal();
}

async function startCamera(fileInput) {
    const video = document.getElementById('cameraPreview');
    const cameraModal = document.getElementById('cameraModal');
    const captureBtn = document.getElementById('captureBtn');

    // Check if required elements exist
    if (!video || !cameraModal || !captureBtn) {
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
    const video = document.getElementById('cameraPreview');
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    if (video) video.srcObject = null;
}

function capturePhoto(fileInputId) {
    const video = document.getElementById('cameraPreview');
    const fileInput = document.getElementById(fileInputId);

    if (!video || !fileInput) {
        console.error('Camera elements or file input not found');
        showError('error-' + fileInputId, 'Camera elements not found');
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
        if (!blob) {
            console.error('Failed to create blob from canvas');
            showError('error-' + fileInputId, 'Failed to capture photo');
            return;
        }

        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;

        // Trigger preview update
        const previewId = (fileInputId === 'driverphoto') ? 'driverPreview' : 'mainPreview';
        previewImage(fileInput, previewId);

        closeCameraModal();
    }, 'image/jpeg', 0.9);
}

function previewImage(input, id) {
    const file = input?.files[0];
    const img = document.getElementById(id);
    if (file && img) {
        const reader = new FileReader();
        reader.onload = e => {
            img.src = e.target.result;
            img.style.display = 'block';
            img.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    } else if (img) {
        img.src = '';
        img.style.display = 'none';
        img.classList.add('hidden');
    }
}

function toggleDriverDetails() {
    const driverDetails = document.getElementById('driverDetails');
    if (driverDetails) driverDetails.classList.toggle('hidden');
}

function showError(id, msg) {
    const element = document.getElementById(id);
    if (element) element.innerText = msg;
}

function clearErrors() {
    document.querySelectorAll('.error').forEach(el => (el.innerText = ''));
}

const validateField = (name, value, formData = {}) => {
    let error = '';
    const requiredFields = [
        'lastname',
        'gender',
        'contactnumber',
        'date',
        'time',
        'nationalid',
        'visit',
        'personname',
        'department',
        'durationunit',
        'durationtime',
        'visitortype',
    ];
    const driverToggle = document.getElementById('driverToggle')?.checked;

    const element = document.getElementById(name);
    if (name === 'firstname' && (!value || value.trim() === '')) {
        error = 'First name is required and cannot be empty';
    }
    if (name === 'email' && (!value || value.trim() === '')) {
        error = 'Email is required and cannot be empty';
    }
    if (
        name === 'photo' &&
        !element?.dataset.existingPhoto &&
        (!value || !element?.files?.length)
    ) {
        error = 'Photo is required';
    }

    if (requiredFields.includes(name) && !value) {
        error = `${name
            .charAt(0)
            .toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1')} is required`;
    } else if (name === 'durationunit' && driverToggle && !value) {
        error = 'Duration unit is required when driver details are included';
    }
    switch (name) {
        case 'firstname':
        case 'lastname':
            if (value && !/^[a-zA-Z\s]{1,}$/.test(value)) {
                error = `${name === 'firstname' ? 'First' : 'Last'} name must be at least 1 characters and contain only letters`;
            }
            break;
        case 'drivername':
            if (value && !/^[a-zA-Z\s]{2,}$/.test(value)) {
                error = 'Driver name must be at least 2 characters and contain only letters';
            }
            break;
        case 'contactnumber':
            if (value && !/^\d+$/.test(value)) {
                error = 'Phone number must contain only digits';
            }
            break;
        case 'drivermobile':
            if (value && !/^\d+$/.test(value)) {
                error = 'Phone number must contain only digits';
            }
            break;
        case 'nationalid':
            if (value && !/^[a-zA-Z0-9]{4,}$/.test(value)) {
                error = 'National ID must be at least 4 characters (letters and numbers allowed)';
            }
            break;
        case 'drivernationalid':
            if (value && !/^[a-zA-Z0-9]{4,}$/.test(value)) {
                error = 'National ID must be at least 4 characters (letters and numbers allowed)';
            }
            break;
        case 'email':
            if (value && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value)) {
                error = 'Please enter a valid email address';
            }
            break;
        case 'gender':
            if (!value) {
                error = 'Please select a gender';
            }
            break;
        case 'visitortype':
            if (!value) {
                error = 'Please select a visitor type';
            }
            break;
        case 'durationunit':
            if (value) {
                // Validate against fetched time units (assuming API returns valid units)
            }
            break;
        case 'time':
            if (value && formData.date) {
                const selectedDate = new Date(formData.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                selectedDate.setHours(0, 0, 0, 0);
                if (selectedDate.getTime() === today.getTime()) {
                    const [hours, minutes] = value.split(':').map(Number);
                    const now = new Date();
                    if (
                        hours < now.getHours() ||
                        (hours === now.getHours() && minutes <= now.getMinutes())
                    ) {
                        error = 'Allocation time cannot be in the past for today';
                    }
                }
            }
            break;
        case 'durationtime':
            if (value && !/^(\d{1,3}|[0-9]{1,2}:[0-5][0-9])$/.test(value)) {
                error = 'Duration must be in minutes (e.g. 90) or HH:MM format (e.g. 01:30)';
            }
            break;
        case 'date':
            if (value) {
                const selectedDate = new Date(value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (selectedDate < today) {
                    error = 'Date must be today or later';
                }
            }
            break;
    }
    return error;
};

function populateForm(formId, visitor) {
    const form = document.getElementById(formId);
    if (!form) {
        console.error(`Form with ID '${formId}' not found`);
        return;
    }

    const fields = ['firstname', 'lastname', 'contactnumber', 'email', 'gender', 'nationalid'];
    fields.forEach(field => {
        const element = form.elements[field];
        if (element && visitor[field] !== undefined) {
            element.value = visitor[field] || '';
            if (element.dataset) element.dataset.populated = 'true';
            console.log(`Populated ${field} with: ${visitor[field] || 'undefined'}`);
        } else if (!element) {
            console.warn(`Element for ${field} not found in form ${formId}`);
        } else {
            console.log(`No data for ${field} in visitor object`);
        }
    });

const mainPreview = document.getElementById('mainPreview');
const photoInput = form.elements['photo'];

if (photoInput && visitor.photo !== undefined) {
    const photoFilename = visitor.photo.split(/[\\/]/).pop(); // Extract just the filename
    const photoUrl = `https://192.168.3.73:3001/uploads/${encodeURIComponent(photoFilename)}?t=${new Date().getTime()}`;

    if (mainPreview) {
        mainPreview.src = photoUrl;
        mainPreview.classList.remove('hidden');
        mainPreview.style.display = 'block';
    }

    if (photoInput.dataset) {
        photoInput.dataset.existingPhoto = photoFilename;
    }

    console.log(`Populated photo with: ${photoFilename}`);
} else if (mainPreview) {
    mainPreview.src = '';
    mainPreview.classList.add('hidden');
    mainPreview.style.display = 'none';

    if (photoInput && photoInput.dataset) {
        delete photoInput.dataset.existingPhoto;
    }
}


    const firstnameElement = form.elements['firstname'];
    if (!firstnameElement.value || firstnameElement.value.trim() === '') {
        console.warn(
            'First name is empty after population. Visitor data may be incomplete:',
            visitor
        );
        showError(
            'error-firstname',
            'First name is required and cannot be empty after loading visitor data'
        );
    }
}

async function checkContactNumber(contactnumber, formId) {
    if (!contactnumber || !/^\d+$/.test(contactnumber)) {
        showError('error-contactnumber', 'Phone number must contain only digits');
        return;
    }

    try {
        const records = await apiRequest('master-records');
        console.log('Fetched master records:', records);
        const matchingRecord = Array.isArray(records) 
            ? records.find(record => record.contactnumber === contactnumber)
            : null;

        if (matchingRecord) {
            console.log('Found matching record for contactnumber:', matchingRecord);
            populateForm(formId, matchingRecord);
            showMessage('Appointment data loaded', 'success');
        } else {
            console.log('No record found for contactnumber:', contactnumber);
            const contactInput = document.getElementById('contactnumber');
            if (contactInput) contactInput.value = contactnumber;
            showError('error-contactnumber', 'No record found for this contact number');
        }
    } catch (error) {
        console.error('Error checking contactnumber:', error.message);
        showError('error-contactnumber', 'Failed to check contact number: ' + error.message);
    }
}

async function fetchPersonNameSuggestions(query) {
    const suggestionsContainer = document.getElementById('personname-suggestions');
    const personnameInput = document.getElementById('personname');
    if (!query || query.trim() === '') {
        suggestionsContainer.classList.add('hidden');
        isPersonNameValid = false;
        showError('error-personname', 'Person name must be selected from suggestions');
        return;
    }

    try {
        const response = await fetch(
            `https://192.168.3.73:3001/users/search?query=${encodeURIComponent(
                query
            )}`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }
        );

        if (response.ok) {
            const { users } = await response.json();
            suggestionsContainer.innerHTML = '';
            if (users.length === 0) {
                suggestionsContainer.classList.add('hidden');
                isPersonNameValid = false;
                showError('error-personname', 'Person name not found in database');
                return;
            }

            users.forEach(user => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                const nameLine = document.createElement('div');
                nameLine.textContent = `${user.firstName} ${user.lastName}`;
                const deptDesigLine = document.createElement('div');
                deptDesigLine.textContent = `${user.department} & ${user.designation}`;
                deptDesigLine.style.fontSize = '0.85em';
                deptDesigLine.style.color = '#666';
                div.appendChild(nameLine);
                div.appendChild(deptDesigLine);
                div.addEventListener('click', () => {
                    personnameInput.value = `${user.firstName} ${user.lastName} (${user.department} & ${user.designation})`;
                    suggestionsContainer.classList.add('hidden');
                    document.getElementById('department').value = user.department || '';
                    document.getElementById('personnameid').value = user.id || '';
                    isPersonNameValid = true;
                    showError('error-personname', '');
                });
                
                suggestionsContainer.appendChild(div);
            });

            suggestionsContainer.classList.remove('hidden');
        } else {
            console.error('Failed to fetch suggestions:', response.status);
            suggestionsContainer.classList.add('hidden');
            isPersonNameValid = false;
            showError('error-personname', 'Person name not found in database');
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        suggestionsContainer.classList.add('hidden');
        isPersonNameValid = false;
        showError('error-personname', 'Error fetching person name');
    }
}


const attachLiveValidation = () => {
    document.querySelectorAll('input, select, textarea').forEach(input => {
        input.addEventListener('input', () => {
            const formData = new {
                date: new document.getElementById('date')?.value,
                time: document.getElementById('time')?.value,
            };
            const error = validateField(input.id, input.value, formData);
            showError('error-' + input.id, error);
        });
    });
};

const showMessage = (
    msg = 'Example notification text.',
    type = 'success',
    position = 'top-right',
    showCloseButton = true,
    duration = 2000
) => {
    const toast = window.Swal.mixin({
        toast: true,
        position: position,
        showConfirmButton: false,
        timer: duration,
        showCloseButton: showCloseButton,
        padding: '5px 10px',
        width: '300px',
        fontSize: '14px',
        customClass: {
            popup: 'medium-toast',
            title: 'medium-toast-title',
        },
    });

    toast.fire({
        icon: type,
        title: msg,
    });
};

document.addEventListener('DOMContentLoaded', () => {
    // Fetch and populate dropdowns
    fetchGenders();
    fetchPurposeOfVisits();
    fetchVisitorTypes();
    fetchTimeUnits();

    attachLiveValidation();

    const nationalIdInput = document.getElementById('nationalid');
    if (nationalIdInput) {
        console.log('Attached national ID input listener');
        nationalIdInput.addEventListener(
            'input',
            debounce(e => {
                checkNationalId(e.target.value, 'visitorForm');
            }, 500)
        );
    } else {
        console.error('National ID input element not found');
    }

    const contactNumberInput = document.getElementById('contactnumber');
    if (contactNumberInput) {
        console.log('Attached contact number input listener');
        contactNumberInput.addEventListener(
            'input',
            debounce(e => {
                checkContactNumber(e.target.value, 'visitorForm');
            }, 500)
        );
    } else {
        console.error('Contact number input element not found');
    }

    const personnameInput = document.getElementById('personname');
    if (personnameInput) {
        console.log('Attached personname input listener');
        personnameInput.addEventListener(
            'input',
            debounce(e => {
                fetchPersonNameSuggestions(e.target.value);
            }, 300)
        );

        document.addEventListener('click', e => {
            const suggestionsContainer = document.getElementById(
                'personname-suggestions'
            );
            if (
                !personnameInput.contains(e.target) &&
                !suggestionsContainer.contains(e.target)
            ) {
                suggestionsContainer.classList.add('hidden');
            }
        });
    } else {
        console.error('Personname input element not found');
    }

    const form = document.getElementById('visitorForm');
    if (!form) {
        console.error("Form with ID 'visitorForm' not found");
        return;
    }

    console.log('Form found, attaching submit listener');

    form.addEventListener('submit', e => {
        e.preventDefault();
        console.log('Form submission triggered');
        clearErrors();
        let valid = true;

        const formData = new FormData();
        const validationFormData = {
            date: form.elements['date']?.value || '',
            time: form.elements['time']?.value || '',
        };

        const fields = [
            'firstname',
            'lastname',
            'gender',
            'contactnumber',
            'email',
            'date',
            'time',
            'nationalid',
            'visit',
            'personname',
            'personnameid',
            'department',
            'durationtime',
            'durationunit',
            'visitortype',
            'vehicletype',
            'vehiclenumber',
            'drivername',
            'drivermobile',
            'drivernationalid',
            'notes',
        ];

        for (const id of fields) {
            const element = form.elements[id];
            const value = element?.value?.trim() || '';
            if (id === 'firstname') {
                console.log(`Appending Firstname: "${value}"`);
                formData.append('Firstname', value);
            } else {
                formData.append(id, value);
            }
            const errorMsg = validateField(id, value, validationFormData);
            if (errorMsg) {
                showError('error-' + id, errorMsg);
                valid = false;
            }
        }

        const firstname = form.elements['firstname']?.value?.trim() || '';
        const email = form.elements['email']?.value?.trim() || '';
        console.log(`Final Firstname value: ${firstname}`);
        if (firstname) {
            formData.set('Firstname', firstname);
        }
        if (email) {
            formData.set('email', email);
        }

        const photoInput = form.elements['photo'];
        const hasNewPhoto = photoInput?.files && photoInput.files.length > 0;
        const hasExistingPhoto = photoInput?.dataset.existingPhoto;
        if (hasNewPhoto) {
            formData.append('photoFile', photoInput.files[0]);
        } else if (hasExistingPhoto) {
            formData.append('photo', hasExistingPhoto);
        } else {
            showError('error-photo', 'Photo is required');
            valid = false;
        }

        if (!firstname) {
            showError('error-firstname', 'First name is required');
            valid = false;
        }
        if (!email) {
            showError('error-email', 'Email is required');
            valid = false;
        }
        if (!document.getElementById('personnameid').value) {
            showError('error-personname', 'Please select a valid person from suggestions');
            valid = false;
        }   

        if (!isPersonNameValid) {
            showError('error-personname', 'Person name must be selected from database suggestions');
            valid = false;
        }

        const driverToggle = form.elements['driverToggle']?.checked;
        formData.append('driverToggle', driverToggle.toString());
        const driverPhoto = form.elements['driverphoto']?.files[0];
        if (driverToggle && driverPhoto) {
            formData.append('driverPhotoFile', driverPhoto);
        }
        if (
            driverToggle &&
            (!driverPhoto || !/\.(jpg|jpeg|png)$/i.test(driverPhoto?.name))
        ) {
            showError('error-driverphoto', 'Upload driver .jpg/.png image');
            valid = false;
        }

        const vehType = form.elements['vehicletype']?.value?.trim();
        const vehNum = form.elements['vehiclenumber']?.value?.trim();
        if (vehType && !/^.{2,20}$/.test(vehType)) {
            showError('error-vehicletype', 'Enter valid vehicle type');
            valid = false;
        }
        if (vehType && !/^[A-Za-z0-9]{6,12}$/.test(vehNum)) {
            showError('error-vehiclenumber', 'Enter valid vehicle number');
            valid = false;
        }

        if (driverToggle) {
            const dName = form.elements['drivername']?.value?.trim();
            const dMob = form.elements['drivermobile']?.value?.trim();
            const dNid = form.elements['drivernationalid']?.value?.trim();
            if (!/^[A-Za-z\s]{2,50}$/.test(dName)) {
                showError('error-drivername', 'Enter valid driver name');
                valid = false;
            }
            if (!/^\d{5,15}$/.test(dMob)) {
                showError('error-drivermobile', 'Enter valid mobile');
                valid = false;
            }
            if (!/^[a-zA-Z0-9]{4,}$/.test(dNid)) {
                showError('error-drivernationalid', 'Enter valid ID');
                valid = false;
            }
        }

        const notes = form.elements['notes']?.value?.trim();
        if (notes?.length > 500 || /<script/i.test(notes)) {
            showError('error-notes', 'Invalid notes content');
            valid = false;
        }

        if (validationFormData.date) {
            const [year, month, day] = validationFormData.date.split('-');
            formData.set('date', `${day}-${month}-${year}`);
        }

        console.log('FormData contents before send:');
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value instanceof File ? value.name : value}`);
        }

        if (valid) {
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `
                    <svg style="width: 20px; height: 20px; color: #4361ee; display: inline-block; margin-right: 8px; animation: spin 1s linear infinite;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    Creating...
                `;
            }

            // Initiate the fetch request and redirect immediately
            fetch('https://192.168.3.73:3001/visitors', {
                method: 'POST',
                body: formData,
            })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(errorData => {
                            throw new Error(errorData.message || `HTTP ${response.status}`);
                        });
                    }
                    return response.json();
                })
                .then(result => {
                    console.log('API response:', result);
                    sessionStorage.setItem('visitorCreated', 'true');
                    showMessage('Visitor created successfully', 'success');
                    form.reset();
                    document.getElementById('mainPreview')?.classList.add('hidden');
                    document.getElementById('driverPreview')?.classList.add('hidden');
                    document.getElementById('driverDetails')?.classList.add('hidden');
                })
                .catch(error => {
                    console.error('Submission error:', error.message);
                    sessionStorage.setItem('visitorError', error.message || 'Failed to submit form');
                    showMessage('Failed to submit form: ' + error.message, 'error');
                })
                .finally(() => {
                    console.log('API call completed');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = 'Create';
                    }
                });

            // Redirect immediately after initiating the fetch
            window.location.href = 'SpotEntry.html';
        } else {
            console.log('Validation failed');
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Create';
            }
        }
    });
});
