let currentFileInputId = '';
let isPersonNameValid = false;
let stream = null;

function showModal(fileInputId) {
    currentFileInputId = fileInputId;
    const modal = document.getElementById('photoModal');
    if (modal) modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('photoModal');
    if (modal) modal.style.display = 'none';
}

function closeCameraModal() {
    const modal = document.getElementById('cameraModal');
    if (modal) modal.style.display = 'none';
    stopCamera();
}

function openGallery() {
    const fileInput = document.getElementById(currentFileInputId);
    if (fileInput) {
        fileInput.removeAttribute('capture');
        fileInput.click();
    }
    closeModal();
}

async function openCamera() {
    const fileInput = document.getElementById(currentFileInputId);
    if (fileInput) {
        await startCamera(fileInput);
    }
    closeModal();
}

async function startCamera(fileInput) {
    const video = document.getElementById('cameraPreview');
    const modal = document.getElementById('cameraModal');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Camera not supported");
        showError('error-' + currentFileInputId, 'Camera not supported');
        return;
    }

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });

        video.srcObject = stream;
        video.play();
        modal.style.display = 'flex';
    } catch (err) {
        console.error("Camera error:", err);
        showError('error-' + currentFileInputId, 'Failed to access camera');
    }
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
        console.error('Capture error');
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(blob => {
        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;

        const previewId = (fileInputId === 'driverphoto') ? 'driverPreview' : 'mainPreview';
        previewImage(fileInput, previewId);
        closeCameraModal();
    }, 'image/jpeg', 0.9);
}

function previewImage(input, id) {
    const file = input.files?.[0];
    const img = document.getElementById(id);
    if (file && img) {
        const reader = new FileReader();
        reader.onload = e => {
            img.src = e.target.result;
            img.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    } else if (img) {
        img.classList.add('hidden');
    }
}

function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
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
    document.querySelectorAll('.error').forEach(el => el.innerText = '');
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

async function fetchPersonNameSuggestions(query, isValidationCheck = false) {
    const suggestionsContainer = document.getElementById('personname-suggestions');
    const personnameInput = document.getElementById('personname');
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
                    document.getElementById('department').value = user.department || '';
                    document.getElementById('personnameid').value = user.id || '';
                    suggestionsContainer.classList.add('hidden');
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
        console.error('Error fetching suggestions:', error.message, error);
        suggestionsContainer.classList.add('hidden');
        isPersonNameValid = false;
        errorElement.textContent = 'Error fetching person name: ' + error.message;
        return false;
    }
}

function attachPersonNameListeners() {
    const personnameInput = document.getElementById('personname');
    const suggestionsContainer = document.getElementById('personname-suggestions');

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

const validateField = (name, value, formData = {}) => {
    let error = '';
    const requiredFields = [
        'firstname', 'lastname', 'gender', 'contactnumber', 'email',
        'date', 'time', 'nationalid', 'photo', 'visit', 'personname', 'personnameid',
        'department', 'durationtime', 'visitortype'
    ];
    if (requiredFields.includes(name) && !value && name !== 'photo') {
        error = `${name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1')} is required`;
    } else if (name === 'photo' && !document.getElementById(name)?.files.length) {
        error = 'Photo is required';
    }
    switch (name) {
        case 'firstname':
        case 'lastname':
            if (value && !/^[a-zA-Z\s]{2,}$/.test(value)) {
                error = `${name === 'firstname' ? 'First' : 'Last'} name must be at least 2 characters and contain only letters`;
            }
            break;
        case 'personnameid':
            if (!value) {
                error = 'Please select a valid person from suggestions';
            }
            break;
        case 'personname':
            if (!isPersonNameValid) {
                error = 'Person name must be selected from suggestions';
            } else if (value && !/^[a-zA-Z\s].*?(\(.*?\))$/.test(value)) {
                error = 'Person name must be selected from suggestions';
            }
            break;
        case 'department':
            if (!value) {
                error = 'Department is required';
            }
            break;
        case 'drivername':
            if (value && !/^[a-zA-Z\s]{2,}$/.test(value)) {
                error = 'Driver name must be at least 2 characters and contain only letters';
            }
            break;
        case 'contactnumber':
        case 'drivermobile':
            if (value && !/^\d+$/.test(value)) {
                error = 'Phone number must contain only digits';
            }
            break;
        case 'nationalid':
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
            if (!value) error = 'Please select a gender';
            break;
        case 'visitortype':
            if (!value) error = 'Please select a visitor type';
            break;
        case 'durationtime':
            if (value && !/^\d+$/.test(value)) {
                error = 'Duration must be a positive number';
            }
            break;
    }
    return error;
};

const attachLiveValidation = () => {
    document.querySelectorAll('input, select, textarea').forEach(input => {
        input.addEventListener('input', () => {
            const formData = {
                date: document.getElementById('date')?.value,
                time: document.getElementById('time')?.value
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

async function fetchPurposeOfVisits() {
    try {
        const response = await fetch('https://192.168.3.73:3001/purpose-of-visit');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
        }
        const purposes = await response.json();
        if (!Array.isArray(purposes)) {
            throw new Error('API response is not an array');
        }
        populateDropdown('visit', purposes);
    } catch (error) {
        console.error('Error fetching purpose of visits:', error.message, error);
        showMessage('Failed to load purpose of visits: ' + error.message, 'error');
    }
}

async function fetchTimeUnits() {
    try {
        const response = await fetch('https://192.168.3.73:3001/time-duration-unit');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
        }
        const timeUnits = await response.json();
        if (!Array.isArray(timeUnits)) {
            throw new Error('API response is not an array');
        }
        populateDropdown('durationUnit', timeUnits); // Fixed ID to match case (durationunit)
    } catch (error) {
        console.error('Error fetching time units:', error.message, error);
        showMessage('Failed to load time units: ' + error.message, 'error');
    }
}

async function fetchVisitorTypes() {
    try {
        const response = await fetch('https://192.168.3.73:3001/visitor-type');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
        }
        const visitorTypes = await response.json();
        if (!Array.isArray(visitorTypes)) {
            throw new Error('API response is not an array');
        }
        populateDropdown('visitortype', visitorTypes);
    } catch (error) {
        console.error('Error fetching visitor types:', error.message, error);
        showMessage('Failed to load visitor types: ' + error.message, 'error');
    }
}

async function checkFormStatus(email, date, time) {
    try {
        const response = await fetch(
            `https://192.168.3.73:3001/appointment/check-status?email=${encodeURIComponent(email)}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }
        );
        if (!response.ok) throw new Error(`Failed to check form status: ${response.status} - ${response.statusText}`);
        const { isFormCompleted } = await response.json();
        console.log('checkFormStatus response:', { email, date, time, isFormCompleted });
        return isFormCompleted;
    } catch (error) {
        console.error('Error checking form status:', error.message, error);
        return false;
    }
}

function storeSubmission(email, date, time, isMessageShown = false) {
    const key = `appointment_${email}_${date}_${time}`;
    localStorage.setItem(key, JSON.stringify({ status: 'submitted', isMessageShown }));
    console.log('Stored submission:', { key, status: 'submitted', isMessageShown });
}

function getSubmissionState(email, date, time) {
    const key = `appointment_${email}_${date}_${time}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    const state = JSON.parse(stored);
    console.log('Checked submission state:', { key, state });
    return state;
}

function markMessageShown(email, date, time) {
    const key = `appointment_${email}_${date}_${time}`;
    const state = getSubmissionState(email, date, time);
    if (state) {
        localStorage.setItem(key, JSON.stringify({ ...state, isMessageShown: true }));
        console.log('Marked message as shown:', { key });
    }
}

function displaySuccessMessage(email, date, time) {
    const state = getSubmissionState(email, date, time);
    const isSubsequentAccess = state && state.isMessageShown;
    const messageTitle = isSubsequentAccess
        ? 'Your Appointment Has Already Been Submitted'
        : 'Your Appointment Scheduled Successfully';
    const messageBody = isSubsequentAccess
        ? 'Please check your email for the QR code and further instructions.'
        : 'Please check your email for the QR code and further instructions.';

    document.body.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #fff;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            z-index: 1000;
        ">
            <div style="
                background: white;
                padding: 2rem;
                border-radius: 15px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                width: 100%;
                max-width: 400px;
                text-align: center;
                border: 1px solid #e0e0e0;
            ">
                <h1 style="
                    color: #3f51b5;
                    margin-bottom: 1rem;
                    font-size: 1.5rem;
                    font-weight: bold;
                    border-bottom: 2px solid #3f51b5;
                    padding-bottom: 0.5rem;
                ">
                    ${messageTitle}
                </h1>
                ${messageBody ? `
                <p style="
                    font-size: 1rem;
                    color: #666;
                ">
                    ${messageBody}
                </p>` : ''}
            </div>
        </div>
    `;

    if (!isSubsequentAccess && email && date && time) {
        markMessageShown(email, date, time);
    }
}

async function initializeForm() {
    await fetchPurposeOfVisits();
    await fetchTimeUnits();
    await fetchVisitorTypes();
    const urlParams = new URLSearchParams(window.location.search);
    const fields = ['firstname', 'lastname', 'gender', 'contactnumber', 'email', 'date', 'time', 'personname', 'department'];
    const cleanedParams = {};
    fields.forEach(field => {
        let value = urlParams.get(field) || '';
        value = decodeURIComponent(value.replace(/^,+/, ''));
        cleanedParams[field] = value;
    });

    const email = cleanedParams.email;
    const date = cleanedParams.date;
    const time = cleanedParams.time;

    if (email && date && time) {
        const state = getSubmissionState(email, date, time);
        const isFormCompleted = await checkFormStatus(email, date, time);
        if (state?.status === 'submitted' || isFormCompleted) {
            console.log('Form already submitted:', { email, date, time, isStored: !!state, isFormCompleted });
            displaySuccessMessage(email, date, time);
            return;
        }
    }

    if (date) {
        const selectedDate = new Date(date);
        const currentDate = new Date();
        selectedDate.setHours(0, 0, 0, 0);
        currentDate.setHours(0, 0, 0, 0);

        if (currentDate > selectedDate) {
            const formContainer = document.querySelector('.absolute.top-1/2');
            if (formContainer) {
                formContainer.innerHTML = `
                    <div class="w-full max-w-5xl bg-white rounded-lg shadow-md p-6 text-center">
                        <h2 class="text-xl font-semibold mb-4" style="font-family: 'Nunito', sans-serif;">Form is Expired</h2>
                        <p class="text-sm text-gray-600">The form has expired as the selected date has passed.</p>
                    </div>
                `;
            }
            return;
        }
    }

    fields.forEach(field => {
        const input = document.getElementById(field);
        if (input) {
            let value = cleanedParams[field];
            if (value) {
                if (field === 'time') {
                    value = value.split(':').slice(0, 2).join(':');
                    if (!/^\d{2}:\d{2}$/.test(value)) value = '';
                }
                if (field === 'gender') {
                    value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
                    if (!['Male', 'Female', 'Other'].includes(value)) value = '';
                }
                input.value = value;
                input.disabled = field !== 'personname' && field !== 'department';
            }
        }
    });

    if (cleanedParams.personname) {
        const nameMatch = cleanedParams.personname.match(/^(.+?)\s*\(/);
        const queryName = nameMatch ? nameMatch[1].trim() : cleanedParams.personname;
        await fetchPersonNameSuggestions(queryName, true);
    } else {
        isPersonNameValid = false;
        document.getElementById('error-personname').textContent = 'Person name must be selected from suggestions';
    }

    const form = document.getElementById('visitorForm');
    const submitBtn = document.getElementById('submitBtn');
    if (!form || !submitBtn) return;

    let loading = false;

    form.addEventListener('submit', async e => {
        e.preventDefault();
        if (loading) return;

        clearErrors();
        let valid = true;

        const get = id => document.getElementById(id)?.value.trim() || '';
        const fieldsToValidate = [
            'firstname', 'lastname', 'gender', 'contactnumber', 'email',
            'date', 'time', 'nationalid', 'photo', 'visit', 'personname',
            'department', 'durationtime', 'durationunit', 'visitortype', 'vehicletype',
            'vehiclenumber', 'drivername', 'drivermobile', 'drivernationalid', 'driverphoto'
        ];

        const formData = { date: get('date'), time: get('time') };

        fieldsToValidate.forEach(id => {
            const value = id === 'photo' || id === 'driverphoto' ? document.getElementById(id)?.files[0] : get(id);
            const errorMsg = validateField(id, value, formData);
            if (errorMsg) {
                showError('error-' + id, errorMsg);
                valid = false;
            }
        });

        if (!isPersonNameValid) {
            showError('error-personname', 'Person name must be selected from suggestions');
            valid = false;
        }

        const photo = document.getElementById('photo')?.files[0];
        if (!photo || !/\.(jpg|jpeg|png)$/i.test(photo.name)) {
            showError('error-photo', 'Upload .jpg/.png image');
            valid = false;
        }

        const driverToggle = document.getElementById('driverToggle')?.checked;
        if (driverToggle) {
            const dName = get('drivername');
            const dMob = get('drivermobile');
            const dNid = get('drivernationalid');
            const dPhoto = document.getElementById('driverphoto')?.files[0];

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
            if (!dPhoto || !/\.(jpg|jpeg|png)$/i.test(dPhoto.name)) {
                showError('error-driverphoto', 'Upload driver image');
                valid = false;
            }
        }

        const notes = get('notes');
        if (notes.length > 500 || /<script/i.test(notes)) {
            showError('error-notes', 'Invalid notes content');
            valid = false;
        }

        if (!valid) {
            showError('error-general', 'Please fix the errors above.');
            return;
        }

        const emailValue = get('email');
        const dateValue = get('date');
        const timeValue = get('time');

        if (emailValue && dateValue && timeValue) {
            const state = getSubmissionState(emailValue, dateValue, timeValue);
            const isFormCompleted = await checkFormStatus(emailValue, dateValue, timeValue);
            if (state?.status === 'submitted' || isFormCompleted) {
                console.log('Blocked duplicate submission:', { emailValue, dateValue, timeValue, isStored: !!state, isFormCompleted });
                displaySuccessMessage(emailValue, dateValue, timeValue);
                return;
            }
        }

        loading = true;
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        const formattedData = new FormData();
        form.querySelectorAll('input:not([type="checkbox"]), select, textarea').forEach(input => {
            if (input.type === 'file' && input.files[0]) {
                formattedData.append(input.name, input.files[0]);
            } else if (!input.disabled) {
                formattedData.append(input.name, input.value || '');
            }
        });

        // Ensure personnameid is included
        const personnameid = document.getElementById('personnameid')?.value;
        if (personnameid) {
            formattedData.append('personnameid', personnameid);
        }

        fields.forEach(field => {
            const input = document.getElementById(field);
            if (input) formattedData.append(field, input.value || '');
        });

        const durationunit = get('durationunit');
        if (durationunit) {
            formattedData.append('durationunit', durationunit);
        }

        console.log('📤 Submitting FormData:');
        for (const [key, value] of formattedData.entries()) {
            console.log(`  ${key}: ${value instanceof File ? value.name : value}`);
        }

        try {
            const response = await fetch('https://192.168.3.73:3001/appointment/create', {
                method: 'POST',
                body: formattedData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to submit form: ${response.status} - ${response.statusText}`);
            }

            if (emailValue && dateValue && timeValue) {
                storeSubmission(emailValue, dateValue, timeValue, false);
                history.pushState(null, '', `?email=${encodeURIComponent(emailValue)}&date=${encodeURIComponent(dateValue)}&time=${encodeURIComponent(timeValue)}`);
                displaySuccessMessage(emailValue, dateValue, timeValue);
            }
        } catch (error) {
            console.error('Error submitting form:', error.message, error);
            showError('error-general', 'Failed to submit form: ' + error.message);
        } finally {
            loading = false;
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });

    attachPersonNameListeners();
    attachLiveValidation();
}

document.addEventListener('alpine:init', () => {
    Alpine.data('scrollToTop', () => ({
        showTopButton: false,
        init() {
            window.onscroll = () => {
                this.scrollFunction();
            };
        },
        scrollFunction() {
            if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
                this.showTopButton = true;
            } else {
                this.showTopButton = false;
            }
        },
        goToTop() {
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
        }
    }));

    Alpine.data('customizer', () => ({
        showCustomizer: false
    }));

    Alpine.data('sidebar', () => ({
        init() {
            const selector = document.querySelector('.sidebar ul a[href="' + window.location.pathname + '"]');
            if (selector) {
                selector.classList.add('active');
                const ul = selector.closest('ul.sub-menu');
                if (ul) {
                    let ele = ul.closest('li.menu').querySelectorAll('.nav-link');
                    if (ele) {
                        ele = ele[0];
                        setTimeout(() => {
                            ele.click();
                        });
                    }
                }
            }
        }
    }));

    Alpine.data('header', () => ({
        init() {
            const selector = document.querySelector('ul.horizontal-menu a[href="' + window.location.pathname + '"]');
            if (selector) {
                selector.classList.add('active');
                const ul = selector.closest('ul.sub-menu');
                if (ul) {
                    let ele = ul.closest('li.menu').querySelectorAll('.nav-link');
                    if (ele) {
                        ele = ele[0];
                        setTimeout(() => {
                            ele.classList.add('active');
                        });
                    }
                }
            }
        },
        notifications: [
            { id: 1, profile: 'user-profile.jpeg', message: '<strong class="text-sm mr-1">John Doe</strong>invite you to <strong>Prototyping</strong>', time: '45 min ago' },
            { id: 2, profile: 'profile-34.jpeg', message: '<strong class="text-sm mr-1">Adam Nolan</strong>mentioned you to <strong>UX Basics</strong>', time: '9h Ago' },
            { id: 3, profile: 'profile-16.jpeg', message: '<strong class="text-sm mr-1">Anna Morgan</strong>Upload a file', time: '9h Ago' }
        ],
        messages: [
            {
                id: 1,
                image: '<span class="grid place-content-center w-9 h-9 rounded-full bg-success-light dark:bg-success text-success dark:text-success-light"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></span>',
                title: 'Congratulations!',
                message: 'Your OS has been updated.',
                time: '1hr'
            },
            {
                id: 2,
                image: '<span class="grid place-content-center w-9 h-9 rounded-full bg-info-light dark:bg-info text-info dark:text-info-light"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span>',
                title: 'Did you know?',
                message: 'You can switch between artboards.',
                time: '2hr'
            },
            {
                id: 3,
                image: '<span class="grid place-content-center w-9 h-9 rounded-full bg-danger-light dark:bg-danger text-danger dark:text-danger-light"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>',
                title: 'Something went wrong!',
                message: 'Send Reposrt',
                time: '2days'
            },
            {
                id: 4,
                image: '<span class="grid place-content-center w-9 h-9 rounded-full bg-warning-light dark:bg-warning text-warning dark:text-warning-light"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">    <circle cx="12" cy="12" r="10"></circle>    <line x1="12" y1="8" x2="12" y2="12"></line>    <line x1="12" y1="16" x2="12.01" y2="16"></line></svg></span>',
                title: 'Warning',
                message: 'Your password strength is low.',
                time: '5days'
            }
        ],
        languages: [
            { id: 1, key: 'Chinese', value: 'zh' },
            { id: 2, key: 'Danish', value: 'da' },
            { id: 3, key: 'English', value: 'en' },
            { id: 4, key: 'French', value: 'fr' },
            { id: 5, key: 'German', value: 'de' },
            { id: 6, key: 'Greek', value: 'el' },
            { id: 7, key: 'Hungarian', value: 'hu' },
            { id: 8, key: 'Italian', value: 'it' },
            { id: 9, key: 'Japanese', value: 'ja' },
            { id: 10, key: 'Polish', value: 'pl' },
            { id: 11, key: 'Portuguese', value: 'pt' },
            { id: 12, key: 'Russian', value: 'ru' },
            { id: 13, key: 'Spanish', value: 'es' },
            { id: 14, key: 'Swedish', value: 'sv' },
            { id: 15, key: 'Turkish', value: 'tr' },
            { id: 16, key: 'Arabic', value: 'ae' }
        ],
        removeNotification(value) {
            this.notifications = this.notifications.filter(d => d.id !== value);
        },
        removeMessage(value) {
            this.messages = this.messages.filter(d => d.id !== value);
        }
    }));
});

document.addEventListener('DOMContentLoaded', initializeForm);
