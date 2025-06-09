
const BASE_URL = 'https://192.168.3.73:3001';
let currentPage = 1;
let entriesPerPage = 10;
let isPaginatedView = false;
let currentEditUserId = null;

function getPermissions() {
    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
    const currentModule = permissions.find(p => p.name === 'UserManagement') || {
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true
    };
    console.log('Retrieved permissions from localStorage:', currentModule);
    return currentModule;
}

function openAddUserModal() {
    document.getElementById('addUserModal').style.display = 'flex';
}

function closeAddUserModal() {
    document.getElementById('addUserModal').style.display = 'none';
    document.getElementById('addUserForm').reset();
    $('.form-group').removeClass('has-error has-success');
    $('.error-message').text('');
}

function openEditUserModal() {
    document.getElementById('editUserModal').style.display = 'flex';
}

function closeEditUserModal() {
    document.getElementById('editUserModal').style.display = 'none';
    document.getElementById('editUserForm').reset();
    $('.form-group').removeClass('has-error has-success');
    $('.error-message').text('');
}

const showMessage = (msg = 'Example notification text.', type = 'success', position = 'top-right', showCloseButton = true, duration = 2000) => {
    const toast = window.Swal.mixin({
        toast: true,
        position: position,
        showConfirmButton: false,
        timer: duration,
        showCloseButton: showCloseButton,
        padding: '10px 20px',
    });
    toast.fire({ icon: type, title: msg });
};

async function checkServerHealth(retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(`${BASE_URL}/health`, { timeout: 3000 });
            if (!response.ok) throw new Error(`Health check failed: Status ${response.status}`);
            const data = await response.text();
            console.log('Server health response:', data);
            try {
                const json = JSON.parse(data);
                return json.status === 'UP';
            } catch (e) {
                if (data === 'Hello World!') {
                    console.error('Received Hello World! from health endpoint');
                    return false;
                }
                throw e;
            }
        } catch (error) {
            console.error(`Health check attempt ${i + 1} failed:`, error);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    return false;
}

async function fetchAllUsers() {
    try {
        const isServerUp = await checkServerHealth();
        if (!isServerUp) {
            throw new Error('Backend server is not responding correctly. Please check the server configuration at ' + BASE_URL);
        }

        const response = await fetch(`${BASE_URL}/users/all`, { timeout: 5000 });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const text = await response.text();
        console.log('Raw API response (fetchAllUsers):', text);

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Invalid JSON response:', text);
            if (text === 'Hello World!') {
                throw new Error('Backend server is not properly configured. Expected JSON response from NestJS server.');
            }
            throw new Error('Invalid JSON response from server');
        }

        if (!data.users || !Array.isArray(data.users)) {
            throw new Error('Unexpected response format: users array missing');
        }

        data.users.sort((a, b) => a.id - b.id);

        const permissions = getPermissions();
        const canUpdate = permissions.canUpdate;
        const canDelete = permissions.canDelete;
        console.log('Permissions for table rendering:', { canUpdate, canDelete });

        const tbody = document.getElementById('userTableBody');
        tbody.innerHTML = '';

        data.users.forEach(user => {
            console.log(`User ${user.id}: isActive = ${user.isActive}, type = ${typeof user.isActive}`);
            const row = document.createElement('tr');
            row.innerHTML = `
                        <td>${user.firstName} ${user.lastName}</td>
                        <td>${user.userName}</td>
                        <td style="text-align-last: center;">
                            <label class="relative h-6 w-12" for="toggleActive_${user.id}">
                                    <input
                                        type="checkbox"
                                        class="custom_switch peer absolute z-10 h-full w-full cursor-pointer opacity-0"
                                        id="toggleActive_${user.id}"
                                        ${user.isActive === true ? "checked" : ""}
                                        ${canUpdate ? `onclick="toggleUserStatus(${user.id})"` : ''}
                                        ${!canUpdate ? 'disabled="true" title="You do not have permission to update"' : ''}
                                    />
                                <span
                                    class="outline_checkbox bg-icon block h-full rounded-full border-2 border-[#ebedf2] before:absolute before:bottom-1 before:left-1 before:h-4 before:w-4 before:rounded-full before:bg-[#ebedf2] before:bg-[url('../images/close.svg')] before:bg-center before:bg-no-repeat before:transition-all before:duration-300 peer-checked:border-primary peer-checked:before:left-7 peer-checked:before:bg-primary peer-checked:before:bg-[url('../images/checked.svg')] dark:border-white-dark dark:before:bg-white-dark"
                                ></span>
                            </label>
                        </td>
                        <td>
                            <div class="action-icons">
                                <svg class="action-btn" 
                                     ${canUpdate ? `onclick="editUser(${user.id})"` : ''} 
                                     width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                                     ${!canUpdate ? 'style="opacity: 0.6; cursor: not-allowed;" title="You do not have permission to update"' : ''}>
                                    <path d="M11.4001 18.1612L11.4001 18.1612L18.796 10.7653C17.7894 10.3464 16.5972 9.6582 15.4697 8.53068C14.342 7.40298 13.6537 6.21058 13.2348 5.2039L5.83882 12.5999L5.83879 12.5999C5.26166 13.1771 4.97307 13.4657 4.7249 13.7838C4.43213 14.1592 4.18114 14.5653 3.97634 14.995C3.80273 15.3593 3.67368 15.7465 3.41556 16.5208L2.05445 20.6042C1.92743 20.9852 2.0266 21.4053 2.31063 21.6894C2.59466 21.9734 3.01478 22.0726 3.39584 21.9456L7.47918 20.5844C8.25351 20.3263 8.6407 20.1973 9.00498 20.0237C9.43469 19.8189 9.84082 19.5679 10.2162 19.2751C10.5343 19.0269 10.823 18.7383 11.4001 18.1612Z" fill="currentColor"></path>
                                    <path d="M20.8482 8.71306C22.3839 7.17735 22.3839 4.68748 20.8482 3.15178C19.3125 1.61607 16.8226 1.61607 15.2869 3.15178L14.3999 4.03882C14.4121 4.0755 14.4246 4.11268 14.4377 4.15035C14.7628 5.0875 15.3763 6.31601 16.5303 7.47002C17.6843 8.62403 18.9128 9.23749 19.85 9.56262C19.8875 9.57563 19.9245 9.58817 19.961 9.60026L20.8482 8.71306Z" fill="currentColor"></path>
                                </svg>
                                <svg class="action-btn" 
                                     ${canDelete ? `onclick="deleteUser(${user.id})"` : ''} 
                                     width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                                     ${!canDelete ? 'style="opacity: 0.6; cursor: not-allowed;" title="You do not have permission to delete"' : ''}>
                                    <path opacity="0.5" d="M11.5956 22.0001H12.4044C15.1871 22.0001 16.5785 22.0001 17.4831 21.1142C18.3878 20.2283 18.4803 18.7751 18.6654 15.8686L18.9321 11.6807C19.0326 10.1037 19.0828 9.31524 18.6289 8.81558C18.1751 8.31592 17.4087 8.31592 15.876 8.31592H8.12405C6.59127 8.31592 5.82488 8.31592 5.37105 8.81558C4.91722 9.31524 4.96744 10.1037 5.06788 11.6807L5.33459 15.8686C5.5197 18.7751 5.61225 20.2283 6.51689 21.1142C7.42153 22.0001 8.81289 22.0001 11.5956 22.0001Z" fill="currentColor"></path>
                                    <path d="M3 6.38597C3 5.90152 3.34538 5.50879 3.77143 5.50879L6.43567 5.50832C6.96502 5.49306 7.43202 5.11033 7.61214 4.54412C7.61688 4.52923 7.62232 4.51087 7.64185 4.44424L7.75665 4.05256C7.8269 3.81241 7.8881 3.60318 7.97375 3.41617C8.31209 2.67736 8.93808 2.16432 9.66147 2.03297C9.84457 1.99972 10.0385 1.99986 10.2611 2.00002H13.7391C13.9617 1.99986 14.1556 1.99972 14.3387 2.03297C15.0621 2.16432 15.6881 2.67736 16.0264 3.41617C16.1121 3.60318 16.1733 3.81241 16.2435 4.05256L16.3583 4.44424C16.3778 4.51087 16.3833 4.52923 16.388 4.54412C16.5682 5.11033 17.1278 5.49353 17.6571 5.50879H20.2286C20.6546 5.50879 21 5.90152 21 6.38597C21 6.87043 20.6546 7.26316 20.2286 7.26316H3.77143C3.34538 7.26316 3 6.87043 3 6.38597Z" fill="currentColor"></path>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M9.42543 11.4815C9.83759 11.4381 10.2051 11.7547 10.2463 12.1885L10.7463 17.4517C10.7875 17.8855 10.4868 18.2724 10.0747 18.3158C9.66253 18.3592 9.29499 18.0426 9.25378 17.6088L8.75378 12.3456C8.71256 11.9118 9.01327 11.5249 9.42543 11.4815Z" fill="currentColor"></path>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M14.5747 11.4815C14.9868 11.5249 15.2875 11.9118 15.2463 12.3456L14.7463 17.6088C14.7051 18.0426 14.3376 18.3592 13.9254 18.3158C13.5133 18.2724 13.2126 17.8855 13.2538 17.4517L13.7538 12.1885C13.795 11.7547 14.1625 11.4381 14.5747 11.4815Z" fill="currentColor"></path>
                                </svg>
                            </div>
                        </td>
                    `;
            tbody.appendChild(row);
        });

        document.getElementById('panelFooter').textContent = `Showing 1 to ${data.users.length} of ${data.users.length} entries`;
        const paginationControls = document.getElementById('paginationControls');
        if (paginationControls) {
            paginationControls.style.display = 'none';
        }
        isPaginatedView = false;
    } catch (error) {
        console.error('Error fetching all users:', error);
        showMessage(`Error fetching all users: ${error.message}`, 'error');
    }
}

async function fetchUsers() {
    entriesPerPage = document.getElementById('entriesPerPage').value;
    const searchQuery = document.getElementById('searchInput').value;

    try {
        const isServerUp = await checkServerHealth();
        if (!isServerUp) {
            throw new Error('Backend server is not responding correctly. Please check the server configuration at ' + BASE_URL);
        }

        const response = await fetch(`${BASE_URL}/users?page=${currentPage}&limit=${entriesPerPage}&search=${searchQuery}`, { timeout: 5000 });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const text = await response.text();
        console.log('Raw API response (fetchUsers):', text);

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Invalid JSON response:', text);
            if (text === 'Hello World!') {
                throw new Error('Backend server is not properly configured. Expected JSON response from NestJS server.');
            }
            throw new Error('Invalid JSON response from server');
        }

        if (!data.users || !Array.isArray(data.users)) {
            console.error('Unexpected response format:', data);
            throw new Error('Unexpected response format: users array missing');
        }

        data.users.sort((a, b) => a.id - b.id);

        const permissions = getPermissions();
        const canUpdate = permissions.canUpdate;
        const canDelete = permissions.canDelete;
        console.log('Permissions for table rendering:', { canUpdate, canDelete });

        const tbody = document.getElementById('userTableBody');
        tbody.innerHTML = '';

        data.users.forEach(user => {
            console.log(`User ${user.id}: isActive = ${user.isActive}, type = ${typeof user.isActive}`);
            const row = document.createElement('tr');
            row.innerHTML = `
                        <td>${user.firstName} ${user.lastName}</td>
                        <td>${user.userName}</td>
                        <td style="text-align-last: center;">
                            <label class="relative h-6 w-12" for="toggleActive_${user.id}">
                                <input
                                    type="checkbox"
                                    class="custom_switch peer absolute z-10 h-full w-full cursor-pointer opacity-0"
                                    id="toggleActive_${user.id}"
                                    ${user.isActive === true ? "checked" : ""}
                                    ${canUpdate ? `onclick="toggleUserStatus(${user.id})"` : ''}
                                    ${!canUpdate ? 'disabled="true" style="opacity: 0.6; cursor: not-allowed;" title="You do not have permission to update"' : ''}
                                />
                                <span
                                    class="outline_checkbox bg-icon block h-full rounded-full border-2 border-[#ebedf2] before:absolute before:bottom-1 before:left-1 before:h-4 before:w-4 before:rounded-full before:bg-[#ebedf2] before:bg-[url('../images/close.svg')] before:bg-center before:bg-no-repeat before:transition-all before:duration-300 peer-checked:border-primary peer-checked:before:left-7 peer-checked:before:bg-primary peer-checked:before:bg-[url('../images/checked.svg')] dark:border-white-dark dark:before:bg-white-dark"
                                ></span>
                            </label>
                        </td>
                        <td>
                            <div class="action-icons">
                                <svg class="action-btn" 
                                     ${canUpdate ? `onclick="editUser(${user.id})"` : ''} 
                                     width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                                     ${!canUpdate ? 'style="opacity: 0.6; cursor: not-allowed;" title="You do not have permission to update"' : ''}>
                                    <path d="M11.4001 18.1612L11.4001 18.1612L18.796 10.7653C17.7894 10.3464 16.5972 9.6582 15.4697 8.53068C14.342 7.40298 13.6537 6.21058 13.2348 5.2039L5.83882 12.5999L5.83879 12.5999C5.26166 13.1771 4.97307 13.4657 4.7249 13.7838C4.43213 14.1592 4.18114 14.5653 3.97634 14.995C3.80273 15.3593 3.67368 15.7465 3.41556 16.5208L2.05445 20.6042C1.92743 20.9852 2.0266 21.4053 2.31063 21.6894C2.59466 21.9734 3.01478 22.0726 3.39584 21.9456L7.47918 20.5844C8.25351 20.3263 8.6407 20.1973 9.00498 20.0237C9.43469 19.8189 9.84082 19.5679 10.2162 19.2751C10.5343 19.0269 10.823 18.7383 11.4001 18.1612Z" fill="currentColor"></path>
                                    <path d="M20.8482 8.71306C22.3839 7.17735 22.3839 4.68748 20.8482 3.15178C19.3125 1.61607 16.8226 1.61607 15.2869 3.15178L14.3999 4.03882C14.4121 4.0755 14.4246 4.11268 14.4377 4.15035C14.7628 5.0875 15.3763 6.31601 16.5303 7.47002C17.6843 8.62403 18.9128 9.23749 19.85 9.56262C19.8875 9.57563 19.9245 9.58817 19.961 9.60026L20.8482 8.71306Z" fill="currentColor"></path>
                                </svg>
                                <svg class="action-btn" 
                                     ${canDelete ? `onclick="deleteUser(${user.id})"` : ''} 
                                     width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                                     ${!canDelete ? 'style="opacity: 0.6; cursor: not-allowed;" title="You do not have permission to delete"' : ''}>
                                    <path opacity="0.5" d="M11.5956 22.0001H12.4044C15.1871 22.0001 16.5785 22.0001 17.4831 21.1142C18.3878 20.2283 18.4803 18.7751 18.6654 15.8686L18.9321 11.6807C19.0326 10.1037 19.0828 9.31524 18.6289 8.81558C18.1751 8.31592 17.4087 8.31592 15.876 8.31592H8.12405C6.59127 8.31592 5.82488 8.31592 5.37105 8.81558C4.91722 9.31524 4.96744 10.1037 5.06788 11.6807L5.33459 15.8686C5.5197 18.7751 5.61225 20.2283 6.51689 21.1142C7.42153 22.0001 8.81289 22.0001 11.5956 22.0001Z" fill="currentColor"></path>
                                    <path d="M3 6.38597C3 5.90152 3.34538 5.50879 3.77143 5.50879L6.43567 5.50832C6.96502 5.49306 7.43202 5.11033 7.61214 4.54412C7.61688 4.52923 7.62232 4.51087 7.64185 4.44424L7.75665 4.05256C7.8269 3.81241 7.8881 3.60318 7.97375 3.41617C8.31209 2.67736 8.93808 2.16432 9.66147 2.03297C9.84457 1.99972 10.0385 1.99986 10.2611 2.00002H13.7391C13.9617 1.99986 14.1556 1.99972 14.3387 2.03297C15.0621 2.16432 15.6881 2.67736 16.0264 3.41617C16.1121 3.60318 16.1733 3.81241 16.2435 4.05256L16.3583 4.44424C16.3778 4.51087 16.3833 4.52923 16.388 4.54412C16.5682 5.11033 17.1278 5.49353 17.6571 5.50879H20.2286C20.6546 5.50879 21 5.90152 21 6.38597C21 6.87043 20.6546 7.26316 20.2286 7.26316H3.77143C3.34538 7.26316 3 6.87043 3 6.38597Z" fill="currentColor"></path>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M9.42543 11.4815C9.83759 11.4381 10.2051 11.7547 10.2463 12.1885L10.7463 17.4517C10.7875 17.8855 10.4868 18.2724 10.0747 18.3158C9.66253 18.3592 9.29499 18.0426 9.25378 17.6088L8.75378 12.3456C8.71256 11.9118 9.01327 11.5249 9.42543 11.4815Z" fill="currentColor"></path>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M14.5747 11.4815C14.9868 11.5249 15.2875 11.9118 15.2463 12.3456L14.7463 17.6088C14.7051 18.0426 14.3376 18.3592 13.9254 18.3158C13.5133 18.2724 13.2126 17.8855 13.2538 17.4517L13.7538 12.1885C13.795 11.7547 14.1625 11.4381 14.5747 11.4815Z" fill="currentColor"></path>
                                </svg>
                            </div>
                        </td>
                    `;
            tbody.appendChild(row);
        });

        if (typeof data.start !== 'number' || typeof data.end !== 'number' || typeof data.total !== 'number') {
            console.warn('Missing pagination data, using defaults');
            data.start = 1;
            data.end = data.users.length;
            data.total = data.users.length;
        }

        document.getElementById('panelFooter').textContent = `Showing ${data.start} to ${data.end} of ${data.total} entries`;

        const paginationControls = document.getElementById('paginationControls');
        if (paginationControls) {
            if (data.total <= entriesPerPage) {
                paginationControls.style.display = 'none';
            } else {
                paginationControls.style.display = 'flex';
                paginationControls.innerHTML = '';
                const prevButton = document.createElement('button');
                prevButton.className = 'btn btn-outline-primary';
                prevButton.textContent = 'Previous';
                prevButton.disabled = currentPage === 1;
                prevButton.onclick = () => {
                    if (currentPage > 1) {
                        currentPage--;
                        fetchUsers();
                    }
                };
                paginationControls.appendChild(prevButton);
                const nextButton = document.createElement('button');
                nextButton.className = 'btn btn-outline-primary';
                nextButton.textContent = 'Next';
                nextButton.disabled = data.end >= data.total;
                nextButton.onclick = () => {
                    if (data.end < data.total) {
                        currentPage++;
                        fetchUsers();
                    }
                };
                paginationControls.appendChild(nextButton);
            }
        }
        isPaginatedView = true;
    } catch (error) {
        console.error('Error fetching users:', error);
        showMessage(`Error fetching users: ${error.message}`, 'error');
        checkServerHealth().then(isUp => {
            if (isUp) fetchAllUsers();
        });
    }
}

async function toggleUserStatus(userId) {
    try {
        let toggleInput = document.getElementById(`toggleActive_${userId}`);
        let isActive = toggleInput.checked;
        console.log(`Toggling user ${userId}: isActive = ${isActive}`);

        toggleInput.checked = !isActive;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${BASE_URL}/users/${userId}/toggle`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: !isActive }),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        console.log(`API response status: ${response.status}`);
        const text = await response.text();
        console.log(`API response body: ${text}`);

        if (!response.ok) {
            toggleInput.checked = isActive;
            throw new Error(`HTTP error! Status: ${response.status} - ${text}`);
        }

        showMessage(`User ${!isActive ? 'activated' : 'deactivated'} successfully`, 'success');

        if (isPaginatedView) {
            fetchUsers();
        } else {
            fetchAllUsers();
        }
    } catch (error) {
        console.error("Error toggling user status:", error);
        showMessage(`Error toggling user status: ${error.message}`, 'error');
        if (isPaginatedView) fetchUsers();
        else fetchAllUsers();
    }
}

async function editUser(userId) {
    try {
        if (!userId || isNaN(Number(userId))) throw new Error('Invalid user ID');
        const response = await fetch(`${BASE_URL}/users/${userId}`, { timeout: 5000 });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const text = await response.text();
        console.log('Raw API response (editUser):', text);

        let user;
        try {
            user = JSON.parse(text);
        } catch (e) {
            console.error('Invalid JSON response:', text);
            if (text === 'Hello World!') {
                throw new Error('Backend server is not properly configured. Expected JSON response from NestJS server.');
            }
            throw new Error('Invalid JSON response from server');
        }

        const [deptResponse, desigResponse] = await Promise.all([
            fetch(`${BASE_URL}/department`, { timeout: 5000 }),
            fetch(`${BASE_URL}/designation`, { timeout: 5000 })
        ]);

        if (!deptResponse.ok || !desigResponse.ok) {
            throw new Error(`Failed to fetch departments or designations: ${deptResponse.status}, ${desigResponse.status}`);
        }

        const deptText = await deptResponse.text();
        const desigText = await desigResponse.text();
        let departments, designations;

        try {
            departments = JSON.parse(deptText);
            designations = JSON.parse(desigText);
        } catch (e) {
            console.error('Invalid JSON response from department/designation APIs:', deptText, desigText);
            throw new Error('Invalid JSON response from department/designation APIs');
        }

        const department = departments.find(d => d.name === user.department);
        const designation = designations.find(d => d.name === user.designation);

        document.getElementById('editFirstName').value = user.firstName || '';
        document.getElementById('editLastName').value = user.lastName || '';
        document.getElementById('editUserName').value = user.userName || '';
        document.getElementById('editContactNo').value = user.contactNo || '';
        document.getElementById('editEmailId').value = user.emailId || '';
        document.getElementById('editAddress').value = user.address || '';
        document.getElementById('editUserRoleId').value = user.userRoleId || '';
        document.getElementById('editEmployeeNo').value = user.employeeNo || '';
        document.getElementById('editDepartment').value = department ? department.id : '';
        document.getElementById('editDesignation').value = designation ? designation.id : '';
        document.getElementById('editNotes').value = user.notes || '';

        if (jQuery.fn.niceSelect) {
            $("#editUserRoleId").val(user.userRoleId || '').niceSelect('update');
            $("#editDepartment").val(department ? department.id : '').niceSelect('update');
            $("#editDesignation").val(designation ? designation.id : '').niceSelect('update');
        } else {
            console.error('NiceSelect is not loaded');
        }

        document.getElementById('editUserId').value = userId;
        document.getElementById('editUserForm').dataset.userId = userId;
        currentEditUserId = userId;

        openEditUserModal();
    } catch (error) {
        console.error('Error fetching user or dropdown data:', error);
        showMessage(`Error fetching user data: ${error.message}`, 'error');
    }
}

async function deleteUser(userId) {
    const swalWithBootstrapButtons = window.Swal.mixin({
        confirmButtonClass: 'btn btn-secondary',
        cancelButtonClass: 'btn btn-dark ltr:mr-3 rtl:ml-3',
        buttonsStyling: false,
    });

    try {
        const result = await swalWithBootstrapButtons.fire({
            title: 'Are you sure?',
            text: 'You are about to delete this user.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'No, cancel!',
            reverseButtons: true,
            padding: '2em',
        });

        if (result.isConfirmed) {
            const response = await fetch(`${BASE_URL}/users/${userId}`, {
                method: 'DELETE',
                timeout: 5000,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            showMessage('User deleted successfully', 'success');

            if (isPaginatedView) {
                await fetchUsers();
            } else {
                await fetchAllUsers();
            }
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        await swalWithBootstrapButtons.fire('Error', `Failed to delete user: ${error.message}`, 'error');
    }
}

$(document).ready(function () {
    if (jQuery.fn.niceSelect) {
        $("#UserRoleId").niceSelect({ searchable: true });
        $("#editUserRoleId").niceSelect({ searchable: true });
        $("#Department").niceSelect({ searchable: true });
        $("#editDepartment").niceSelect({ searchable: true });
        $("#Designation").niceSelect({ searchable: true });
        $("#editDesignation").niceSelect({ searchable: true });
    } else {
        console.error('NiceSelect library failed to load');
    }

    const permissions = getPermissions();
    const addUserBtn = document.querySelector('button[onclick="openAddUserModal()"]');
    if (addUserBtn) {
        if (!permissions.canCreate) {
            addUserBtn.disabled = true;
            addUserBtn.style.opacity = '0.6';
            addUserBtn.style.cursor = 'not-allowed';
            addUserBtn.title = 'You do not have permission to create users';
            addUserBtn.setAttribute('aria-disabled', 'true');
        } else {
            addUserBtn.disabled = false;
            addUserBtn.style.opacity = '1';
            addUserBtn.style.cursor = 'pointer';
            addUserBtn.title = '';
            addUserBtn.setAttribute('aria-disabled', 'false');
        }
        console.log('Add User button state:', {
            disabled: addUserBtn.disabled,
            opacity: addUserBtn.style.opacity,
            cursor: addUserBtn.style.cursor,
            title: addUserBtn.title,
            ariaDisabled: addUserBtn.getAttribute('aria-disabled')
        });
    }

    const validateField = (name, value, formData = {}) => {
        console.log(`Validating field: ${name}, value: "${value}"`);
        let error = '';

        const requiredFields = [
            'firstName',
            'lastName',
            'userName',
            'password',
            'ConfirmPassword',
            'contactNo',
            'emailId',
            'userRoleId',
            'employeeNo',
            'department',
            'designation'
        ];

        if (requiredFields.includes(name) && (!value || value.trim() === '')) {
            error = `${name === 'firstName' ? 'First Name' :
                name === 'lastName' ? 'Last Name' :
                    name === 'userName' ? 'Username' :
                        name === 'password' ? 'Password' :
                            name === 'ConfirmPassword' ? 'Confirm Password' :
                                name === 'contactNo' ? 'Contact Number' :
                                    name === 'emailId' ? 'Email Address' :
                                        name === 'userRoleId' ? 'User Role' :
                                            name === 'employeeNo' ? 'Employee Number' :
                                                name === 'department' ? 'Department' :
                                                    name === 'designation' ? 'Designation' :
                                                        name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1')
                } is required`;
        }

        switch (name) {
            case 'firstName':
            case 'lastName':
                if (value && !/^[a-zA-Z\s]{2,}$/.test(value)) {
                    error = `${name === 'firstName' ? 'First' : 'Last'} name must be at least 2 characters and contain only letters`;
                }
                break;
            case 'userName':
                if (value && !/^[a-zA-Z0-9]{2,}$/.test(value)) {
                    error = 'Username must be at least 2 characters (letters and numbers allowed)';
                }
                break;
            case 'password':
                if (!value) {
                    error = 'Password is required';
                } else if (value && !/^[a-zA-Z0-9]{4,}$/.test(value)) {
                    error = 'Password must be at least 4 characters (letters and numbers allowed)';
                }
                break;
            case 'confirmPassword':
                if (!value) {
                    error = 'Confirm password is required';
                } else if (value !== formData.password) {
                    error = 'Passwords do not match';
                }
                break;
            case 'contactNo':
                if (!value) {
                    error = 'Contact Number is required';
                }
                break;
            case 'emailId':
                if (value && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
                    error = 'Please enter a valid email address';
                }
                break;
            case 'employeeNo':
                if (!value) {
                    error = 'Employee No is required';
                }
                break;
            case 'notes':
                if (value && value.length > 500) {
                    error = 'Notes cannot exceed 500 characters';
                }
                break;
        }

        console.log(`Validation result for ${name}: ${error || 'No error'}`);
        return error;
    };

    const handleChange = (e, formPrefix = '') => {
        const { name, value } = e.target;
        const error = validateField(name, value);
        const errorElement = document.getElementById(`error-${formPrefix}${name}`);
        const inputElement = document.getElementById(`${formPrefix}${name}`);
        if (error) {
            errorElement.textContent = error;
            inputElement.classList.add('error');
            inputElement.classList.remove('has-success');
        } else {
            errorElement.textContent = '';
            inputElement.classList.remove('error');
            inputElement.classList.add('has-success');
        }
    };

    const validateForm = (formData, formPrefix = '') => {
        const errors = {};
        Object.keys(formData).forEach(key => {
            if (formPrefix === 'edit' && (key === 'password' || key === 'ConfirmPassword') && !formData[key]) {
                return;
            }
            const error = validateField(key, formData[key]);
            if (error) errors[key] = error;
        });
        Object.keys(errors).forEach(key => {
            const errorElement = document.getElementById(`error-${formPrefix}${key}`);
            const inputElement = document.getElementById(`${formPrefix}${key}`);
            if (errorElement) {
                errorElement.textContent = errors[key];
            } else {
                console.warn(`Error element not found: error-${formPrefix}${key}`);
            }
            if (inputElement) {
                inputElement.classList.add('error');
            } else {
                console.warn(`Input element not found: ${formPrefix}${key}`);
            }
        });
        return Object.keys(errors).length === 0;
    };

    $("#addUserForm").submit(async function (event) {
        event.preventDefault();

        const departmentSelect = document.getElementById('Department');
        const designationSelect = document.getElementById('Designation');
        const departmentName = departmentSelect.options[departmentSelect.selectedIndex]?.text || null;
        const designationName = designationSelect.options[designationSelect.selectedIndex]?.text || null;

        const formData = {
            firstName: $("#FirstName").val(),
            lastName: $("#LastName").val(),
            userName: $("#email").val(),
            password: $("#password").val(),
            ConfirmPassword: $("#ConfirmPassword").val(),
            contactNo: $("#ContactNo").val() || null,
            emailId: $("#EmailId").val() || null,
            address: $("#Address").val() || null,
            userRoleId: $("#UserRoleId").val(),
            employeeNo: $("#EmployeeNo").val() || null,
            department: departmentName,
            designation: designationName,
            notes: $("textarea[name='notes']").val() || null,
        };

        if (!validateForm(formData, '')) {
            showMessage('Please fix the errors in the form', 'error');
            return;
        }

        if (formData.password !== formData.ConfirmPassword) {
            document.getElementById('error-ConfirmPassword').textContent = 'Passwords do not match';
            document.getElementById('ConfirmPassword').classList.add('error');
            showMessage('Passwords do not match', 'error');
            return;
        }

        const payload = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            userName: formData.userName,
            password: formData.password,
            contactNo: formData.contactNo,
            emailId: formData.emailId,
            address: formData.address,
            userRoleId: parseInt(formData.userRoleId),
            employeeNo: formData.employeeNo,
            department: formData.department,
            designation: formData.designation,
            notes: formData.notes,
        };

        console.log('Add User Payload:', payload);

        try {
            const response = await fetch(`${BASE_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                timeout: 5000,
            });

            console.log('Response Status:', response.status);
            const text = await response.text();
            console.log('Raw Response:', text);

            if (!response.ok) {
                let errorData;
                try {
                    errorData = JSON.parse(text);
                } catch (e) {
                    throw new Error(`Server error: ${response.status} - ${text}`);
                }
                throw new Error(errorData.message || `Failed to create user: ${response.status}`);
            }

            const data = JSON.parse(text);
            showMessage(data.message || 'User created successfully', 'success');
            closeAddUserModal();
            if (isPaginatedView) fetchUsers();
            else fetchAllUsers();
        } catch (error) {
            console.error('Error creating user:', error);
            showMessage(`Error creating user: ${error.message}`, 'error');
        }
    });

    $("#editUserForm").submit(async function (event) {
        event.preventDefault();

        const userId = Number(document.getElementById('editUserId').value) || currentEditUserId;
        if (isNaN(userId) || !userId) {
            showMessage('Invalid user ID', 'error');
            return;
        }

        const departmentSelect = document.getElementById('editDepartment');
        const designationSelect = document.getElementById('editDesignation');
        const departmentName = departmentSelect.options[departmentSelect.selectedIndex]?.text || null;
        const designationName = designationSelect.options[designationSelect.selectedIndex]?.text || null;

        const formData = {
            firstName: $("#editFirstName").val(),
            lastName: $("#editLastName").val(),
            userName: $("#editUserName").val(),
            password: $("#editPassword").val() || null,
            ConfirmPassword: $("#editConfirmPassword").val() || null,
            contactNo: $("#editContactNo").val() || null,
            emailId: $("#editEmailId").val() || null,
            address: $("#editAddress").val() || null,
            userRoleId: $("#editUserRoleId").val(),
            employeeNo: $("#editEmployeeNo").val() || null,
            department: departmentName,
            designation: designationName,
            notes: $("#editNotes").val() || null,
        };

        if (!validateForm(formData, 'edit')) {
            showMessage('Please fix the errors in the form', 'error');
            return;
        }

        if (formData.password && formData.password !== formData.ConfirmPassword) {
            document.getElementById('error-editConfirmPassword').textContent = 'Passwords do not match';
            document.getElementById('editConfirmPassword').classList.add('error');
            showMessage('Passwords do not match', 'error');
            return;
        }

        const payload = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            userName: formData.userName,
            contactNo: formData.contactNo,
            emailId: formData.emailId,
            address: formData.address,
            userRoleId: parseInt(formData.userRoleId),
            employeeNo: formData.employeeNo,
            department: formData.department,
            designation: formData.designation,
            notes: formData.notes,
        };
        if (formData.password) payload.password = formData.password;

        console.log('Edit User Payload:', payload);

        try {
            const response = await fetch(`${BASE_URL}/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                timeout: 5000,
            });

            console.log('Response Status:', response.status);
            const text = await response.text();
            console.log('Raw Response:', text);

            if (!response.ok) {
                let errorData;
                try {
                    errorData = JSON.parse(text);
                } catch (e) {
                    throw new Error(`Server error: ${response.status} - ${text}`);
                }
                throw new Error(errorData.message || `Failed to update user: ${response.status}`);
            }

            const data = JSON.parse(text);
            showMessage(data.message || 'User updated successfully', 'success');
            closeEditUserModal();
            currentEditUserId = null;
            if (isPaginatedView) fetchUsers();
            else fetchAllUsers();
        } catch (error) {
            console.error('Error updating user:', error);
            showMessage(`Error updating user: ${error.message}`, 'error');
        }
    });

    $("#FirstName, #LastName, #email, #password, #ConfirmPassword, #ContactNo, #EmailId, #Address, #UserRoleId, #EmployeeNo, #Department, #Designation").on("input change", function (e) {
        handleChange(e, '');
    });

    $("#editFirstName, #editLastName, #editUserName, #editPassword, #editConfirmPassword, #editContactNo, #editEmailId, #editAddress, #editUserRoleId, #editEmployeeNo, #editDepartment, #editDesignation").on("input change", function (e) {
        handleChange(e, 'edit');
    });

    $("#email, #editUserName").on("input", function () {
        this.value = this.value.replace(/\s+/g, "").toLowerCase();
    });

    $(document).on('change', 'input[id^="toggleActive_"]', function () {
        const userId = this.id.split('_')[1];
        console.log(`Toggle clicked for user ${userId}`);
        toggleUserStatus(Number(userId));
    });

    $("#entriesPerPage").on("change", function () {
        entriesPerPage = this.value;
        currentPage = 1;
        fetchUsers();
    });

    $("#searchInput").on("input", function () {
        currentPage = 1;
        fetchUsers();
    });
});

(async () => {
    const isServerUp = await checkServerHealth();
    if (isServerUp) {
        fetchAllUsers();
    } else {
        showMessage('Backend server is not responding at ' + BASE_URL + '. Please check the server configuration.', 'error');
    }
})();
