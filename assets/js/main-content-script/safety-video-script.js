
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('safetyForm');
    const submitBtn = document.getElementById('submitBtn');
    const formError = document.getElementById('formError');

    // Get query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    const date = urlParams.get('date');
    const time = urlParams.get('time');

    console.log('📋 Safety Video Page Loaded with params:', { email, date, time });

    function showError(id, msg) {
        const element = document.getElementById(id);
        if (element) element.innerText = msg;
    }

    function clearErrors() {
        document.querySelectorAll('.text-red-500').forEach(el => el.innerText = '');
        formError.classList.add('hidden');
    }

    function showMessage(msg, type = 'success') {
        const toast = Swal.mixin({
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

    function storeSubmission(email, date, time, isMessageShown = false) {
        const key = `safety_${email}_${date}_${time}`;
        localStorage.setItem(key, JSON.stringify({ status: 'submitted', isMessageShown }));
        console.log('Stored submission:', { key, status: 'submitted', isMessageShown });
    }

    function getSubmissionState(email, date, time) {
        const key = `safety_${email}_${date}_${time}`;
        const stored = localStorage.getItem(key);
        if (!stored) return null;
        const state = JSON.parse(stored);
        console.log('Checked submission state:', { key, state });
        return state;
    }

    function markMessageShown(email, date, time) {
        const key = `safety_${email}_${date}_${time}`;
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
            ? 'Safety Acknowledgment Already Submitted'
            : 'Safety Acknowledgment Submitted Successfully';
        const messageBody = isSubsequentAccess
            ? 'Your safety video acknowledgment has already been submitted.'
            : 'Your safety video acknowledgment has been successfully submitted.';

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
                  <p style="
                      font-size: 1rem;
                      color: #666;
                  ">
                      ${messageBody}
                  </p>
              </div>
          </div>
        `;

        if (!isSubsequentAccess && email && date && time) {
            markMessageShown(email, date, time);
        }
    }

    async function checkFormStatus(email, date, time) {
        try {
            const response = await fetch(
                `https://192.168.3.73:3001/appointment/safety-status?email=${encodeURIComponent(email)}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`,
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                }
            );
            if (!response.ok) throw new Error(`Failed to check safety status: ${response.statusText}`);
            const { isSafetyCompleted } = await response.json();
            console.log('checkFormStatus response:', { email, date, time, isSafetyCompleted });
            return isSafetyCompleted;
        } catch (error) {
            console.error('Error checking safety status:', error);
            return false;
        }
    }

    async function initializeForm() {
        if (date) {
            const scheduledDate = new Date(date);
            const today = new Date();
            scheduledDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            if (today.getTime() > scheduledDate.getTime()) {
                document.body.innerHTML = `
              <div style="
                  position: fixed;
                  top: 0; left: 0; width: 100%; height: 100%;
                  background: #fff; display: flex; justify-content: center; align-items: center; padding: 20px; z-index: 1000;">
                  <div style="
                      background: white; padding: 2rem; border-radius: 15px;
                      box-shadow: 0 4px 8px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center; border: 1px solid #e0e0e0;">
                      <h1 style="color: #b71c1c; margin-bottom: 1rem; font-size: 1.5rem; font-weight: bold;">
                          Form Link Expired
                      </h1>
                      <p style="font-size: 1rem; color: #666;">
                          This form can only be accessed on or before the scheduled date.<br>
                          Please contact the administrator for a new link.
                      </p>
                  </div>
              </div>
            `;
                return;
            }
        }

        if (email && date && time) {
            const state = getSubmissionState(email, date, time);
            const isFormCompleted = await checkFormStatus(email, date, time);
            if (state?.status === 'submitted' || isFormCompleted) {
                console.log('Safety acknowledgment already submitted:', { email, date, time, isStored: !!state, isFormCompleted });
                displaySuccessMessage(email, date, time);
                return;
            }
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors();

            const validationError = validateForm();
            if (validationError && !document.getElementById('error-safety-agreement').innerText) {
                formError.textContent = validationError;
                formError.classList.remove('hidden');
                console.log('❌ Validation error:', validationError);
                return;
            }

            if (document.getElementById('error-safety-agreement').innerText) {
                console.log('❌ Form submission blocked due to safety agreement error');
                return;
            }

            // Check submission status before proceeding
            if (email && date && time) {
                const state = getSubmissionState(email, date, time);
                const isFormCompleted = await checkFormStatus(email, date, time);
                if (state?.status === 'submitted' || isFormCompleted) {
                    console.log('Blocked duplicate submission:', { email, date, time, isStored: !!state, isFormCompleted });
                    displaySuccessMessage(email, date, time);
                    return;
                }
            }

            submitBtn.innerHTML = `
            <svg style="width: 20px; height: 20px; color: white; display: inline-block; margin-right: 8px; animation: spin 1s linear infinite;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            Submitting...
          `;
            submitBtn.disabled = true;

            try {
                const payload = {
                    email,
                    date,
                    time,
                    SaftyApproval: document.getElementById('safety-agreement').checked,
                };
                console.log('📤 Sending safety acknowledgment:', JSON.stringify(payload, null, 2));

                const response = await fetch('https://192.168.3.73:3001/appointment/safety', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to submit safety acknowledgment.');
                }

                const result = await response.json();
                console.log('✅ Safety acknowledgment response:', JSON.stringify(result, null, 2));

                if (email && date && time) {
                    storeSubmission(email, date, time, false);
                    history.pushState(null, '', `?email=${encodeURIComponent(email)}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`);
                    displaySuccessMessage(email, date, time);
                }
            } catch (error) {
                console.error('❌ Error submitting safety acknowledgment:', error);
                formError.textContent = error.message;
                formError.classList.remove('hidden');
            } finally {
                submitBtn.innerHTML = 'Submit';
                submitBtn.disabled = false;
            }
        });
    }

    const validateForm = () => {
        let error = '';
        if (!email || !date || !time) {
            error = 'Missing required query parameters: email, date, or time';
        }
        const safetyAgreement = document.getElementById('safety-agreement').checked;
        if (!safetyAgreement) {
            error = 'You must acknowledge the safety video terms';
            showError('error-safety-agreement', error);
        }
        return error;
    };

    initializeForm();
});

