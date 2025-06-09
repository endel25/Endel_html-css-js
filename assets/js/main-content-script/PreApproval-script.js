document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('appointmentForm');
    const submitBtn = document.getElementById('submitBtn');
    const errorMessage = document.createElement('div');
    errorMessage.className = 'text-red-500 text-xs mt-2 hidden';
    form.appendChild(errorMessage);

    let loading = false;

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

    function showError(id, msg) {
        const element = document.getElementById(id);
        if (element) element.innerText = msg;
    }

    function clearErrors() {
        document.querySelectorAll(".error").forEach(el => el.innerText = '');
    }

    function showMessage(msg = 'Example notification text.', type = 'success') {
        const toast = window.Swal.mixin({
            toast: true,
            position: 'top-right',
            showConfirmButton: false,
            timer: 2000,
            showCloseButton: true,
            padding: '10px 20px',
        });

        toast.fire({
            icon: type,
            title: msg,
        });
    }

    const validateField = (name, value, formData = {}) => {
        let error = '';
        const requiredFields = ['firstname', 'lastname', 'gender', 'contactnumber', 'email', 'date', 'time'];
        if (requiredFields.includes(name) && !value) {
            error = `${name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1')} is required`;
        }
        switch (name) {
            case 'firstname':
            case 'lastname':
                if (value && !/^[a-zA-Z\s]{2,}$/.test(value)) {
                    error = `${name === 'firstname' ? 'First' : 'Last'} name must be at least 2 characters and contain only letters`;
                }
                break;
            case 'contactnumber':
                if (value && !/^\d+$/.test(value)) {
                    error = 'Phone number must contain only digits';
                }
                break;
            case 'email':
                if (value && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
                    error = 'Please enter a valid email address';
                }
                break;
            case 'gender':
                if (!value) {
                    error = 'Please select a gender';
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
                        if (hours < now.getHours() || (hours === now.getHours() && minutes <= now.getMinutes())) {
                            error = 'Appointment time cannot be in the past for today';
                        }
                    }
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

    async function fetchGender() {
        try {
            const response = await fetch('https://192.168.1.82:3001/gender');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const genders = await response.json();
            if (!Array.isArray(genders)) {
                throw new Error('API response is not an array');
            }
            populateDropdown('gender', genders);
        } catch (error) {
            console.error('Error fetching purpose of genders:', error);
            alert('Failed to load purpose of gender: ' + error.message);
        }
    }

    fetchGender();

    function populateForm(appointment) {
        const fields = ['firstname', 'lastname', 'gender', 'contactnumber', 'email'];
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element && appointment[field]) {
                element.value = appointment[field];
            }
        });
    }

    async function checkContactNumber(contactnumber) {
        if (!contactnumber || !/^\d+$/.test(contactnumber)) {
            form.reset();
            clearErrors();
            errorMessage.classList.add('hidden');
            return;
        }

        try {
            const response = await fetch(`https://192.168.1.82:3001/master-records/by-contact?contactnumber=${encodeURIComponent(contactnumber)}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                const masterRecord = await response.json();
                if (masterRecord) {
                    console.log('Master record data fetched for contactnumber:', masterRecord);
                    populateForm(masterRecord);
                    showMessage('Master record data loaded', 'success');
                } else {
                    console.log('No master record found for contactnumber:', contactnumber);
                    form.reset();
                    document.getElementById('contactnumber').value = contactnumber;
                    showMessage('No existing record found for this contact number', 'info');
                }
            } else {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error checking contactnumber:', error.message);
            showMessage(`Failed to fetch master record: ${error.message}`, 'error');
        }
    }

    const attachLiveValidation = () => {
        document.querySelectorAll("input, select").forEach(input => {
            input.addEventListener("input", () => {
                const formData = {
                    date: document.getElementById("date")?.value,
                    time: document.getElementById("time")?.value,
                };
                const error = validateField(input.id, input.value, formData);
                showError("error-" + input.id, error);
            });
        });
    };

    attachLiveValidation();

    const contactNumberInput = document.getElementById('contactnumber');
    if (contactNumberInput) {
        contactNumberInput.addEventListener('input', debounce((e) => {
            checkContactNumber(e.target.value);
        }, 500));
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (loading) return;

        loading = true;
        submitBtn.innerHTML = `
            <svg style="width: 20px; height: 20px; color: #4361ee; display: inline-block; margin-right: 8px; animation: spin 1s linear infinite;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            Creating...
        `;
        submitBtn.disabled = true;

        clearErrors();
        errorMessage.classList.add('hidden');

        const formData = new FormData();
        const fields = ['firstname', 'lastname', 'gender', 'contactnumber', 'email', 'date', 'time'];
        let hasError = false;

        fields.forEach(field => {
            const input = document.getElementById(field);
            const value = input.value.trim();
            formData.set(field, value);

            const error = validateField(field, value, {
                date: document.getElementById("date")?.value,
                time: document.getElementById("time")?.value,
            });

            if (error) {
                showError(`error-${field}`, error);
                hasError = true;
            }
        });

        if (hasError) {
            loading = false;
            submitBtn.textContent = 'Create';
            submitBtn.disabled = false;
            return;
        }

        console.log('📤 Final form data:', Object.fromEntries(formData));

        // Initiate the POST request and redirect immediately
        fetch('https://192.168.1.82:3001/appointment/create', {
            method: 'POST',
            body: formData,
        })
            .then(response => response.json())
            .then(result => {
                if (!result.ok) {
                    console.error('Failed to create appointment:', result.message);
                } else {
                    console.log('Appointment created successfully');
                }
            })
            .catch(error => {
                console.error('Error creating appointment:', error.message);
            });

        // Store success message and redirect immediately
        localStorage.setItem('appointmentSuccessMessage', 'Appointment created successfully!');
        window.location.href = 'PreApprovalEntry.html';
        form.reset();
    });
});