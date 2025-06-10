document.addEventListener('alpine:init', () => {
    Alpine.store('app', {
        animation: 'animate__fadeIn'
    });
});

const API_BASE_URL = 'https://192.168.1.57:3001';
let currentPage = 1;
let entriesPerPage = 10;
let isEditMode = false;
let currentRoleId = null;

// Retrieve permissions from localStorage with the correct module name
function getPermissions() {
    try {
        const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
        if (!Array.isArray(permissions)) {
            console.error('Permissions in localStorage is not an array. Using defaults.');
            return { canRead: true, canCreate: true, canUpdate: true, canDelete: true };
        }

        // Changed 'UserRoleManagement' to 'UserRole' to match localStorage
        const currentModule = permissions.find(p => p.name === 'UserRole') || {
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true
        };
        const validatedPermissions = {
            canRead: currentModule.canRead === true,
            canCreate: currentModule.canCreate === true,
            canUpdate: currentModule.canUpdate === true,
            canDelete: currentModule.canDelete === true
        };
        console.log('Validated permissions for UserRole:', validatedPermissions);
        return validatedPermissions;
    } catch (error) {
        console.error('Error parsing permissions from localStorage:', error);
        return { canRead: true, canCreate: true, canUpdate: true, canDelete: true };
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

// Check server health
async function checkServerHealth(retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(`${API_BASE_URL}/health`, { timeout: 3000 });
            if (!response.ok) throw new Error(`Health check failed: Status ${response.status}`);
            const text = await response.text();
            console.log('Server health response:', text);
            try {
                const json = JSON.parse(text);
                return json.status === 'UP';
            } catch (e) {
                if (text === 'Hello World!') {
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

// Fetch and display roles with pagination and search
async function loadRoles() {
    const searchInput = document.getElementById('searchInput');
    const searchQuery = searchInput ? searchInput.value : '';
    try {
        const isServerUp = await checkServerHealth();
        if (!isServerUp) {
            throw new Error('Backend server is not responding correctly. Please check the server configuration at ' + API_BASE_URL);
        }

        const response = await fetch(`${API_BASE_URL}/userroles?page=${currentPage}&limit=${entriesPerPage}&search=${encodeURIComponent(searchQuery)}&sortBy=userRoleName&sortOrder=asc`, {
            method: 'GET',
            timeout: 5000
        });
        if (!response.ok) {
            const text = await response.text();
            try {
                const error = JSON.parse(text);
                throw new Error(error.message || 'Failed to fetch roles');
            } catch (e) {
                if (text === 'Hello World!') {
                    throw new Error('Backend server is not properly configured. Expected JSON response from NestJS server.');
                }
                throw new Error(`Failed to fetch roles: ${text}`);
            }
        }
        const data = await response.json();
        const tbody = document.getElementById('rolesTableBody');
        if (!tbody) {
            throw new Error('Roles table body not found');
        }
        tbody.innerHTML = '';
        if (!data.roles || !Array.isArray(data.roles)) {
            throw new Error('Unexpected response format: roles array missing');
        }

        // Get permissions for rendering
        const permissions = getPermissions();
        const canUpdate = permissions.canUpdate;
        const canDelete = permissions.canDelete;
        console.log('Permissions for table rendering:', { canUpdate, canDelete });

        data.roles.forEach(role => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 text-sm text-gray-900">${role.userRoleName}</td>
                <td class="text-center">
                    <label class="relative h-6 w-12">
                        <input
                            type="checkbox"
                            class="custom_switch peer absolute z-10 h-full w-full cursor-pointer opacity-0"
                            id="custom_switch_checkbox_${role.id}"
                            ${role.active ? 'checked' : ''}
                            ${canUpdate ? `onclick="toggleActive(${role.id}, this.checked)"` : ''}
                            ${!canUpdate ? 'disabled="true"  title="You do not have permission to update"' : ''}
                        />
                        <span
                            class="outline_checkbox bg-icon block h-full rounded-full border-2 border-[#ebedf2] before:absolute before:bottom-1 before:left-1 before:h-4 before:w-4 before:rounded-full before:bg-[#ebedf2] before:bg-[url('../images/close.svg')] before:bg-center before:bg-no-repeat before:transition-all before:duration-300 peer-checked:border-primary peer-checked:before:left-7 peer-checked:before:bg-primary peer-checked:before:bg-[url('../images/checked.svg')] dark:border-white-dark dark:before:bg-white-dark"
                        ></span>
                    </label>
                </td>
                <td>
                    <div class="action-icons">
                        <svg class="edit-icon" 
                            ${canUpdate ? `onclick="editRole(${role.id})"` : ''} 
                            width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                            ${!canUpdate ? 'style="opacity: 0.6; cursor: not-allowed;" title="You do not have permission to update"' : ''}>
                            <path d="M11.4001 18.1612L11.4001 18.1612L18.796 10.7653C17.7894 10.3464 16.5972 9.6582 15.4697 8.53068C14.342 7.40298 13.6537 6.21058 13.2348 5.2039L5.83882 12.5999L5.83879 12.5999C5.26166 13.1771 4.97307 13.4657 4.7249 13.7838C4.43213 14.1592 4.18114 14.5653 3.97634 14.995C3.80273 15.3593 3.67368 15.7465 3.41556 16.5208L2.05445 20.6042C1.92743 20.9852 2.0266 21.4053 2.31063 21.6894C2.59466 21.9734 3.01478 22.0726 3.39584 21.9456L7.47918 20.5844C8.25351 20.3263 8.6407 20.1973 9.00498 20.0237C9.43469 19.8189 9.84082 19.5679 10.2162 19.2751C10.5343 19.0269 10.823 18.7383 11.4001 18.1612Z" fill="currentColor"></path>
                            <path d="M20.8482 8.71306C22.3839 7.17735 22.3839 4.68748 20.8482 3.15178C19.3125 1.61607 16.8226 1.61607 15.2869 3.15178L14.3999 4.03882C14.4121 4.0755 14.4246 4.11268 14.4377 4.15035C14.7628 5.0875 15.3763 6.31601 16.5303 7.47002C17.6843 8.62403 18.9128 9.23749 19.85 9.56262C19.8875 9.57563 19.9245 9.58817 19.961 9.60026L20.8482 8.71306Z" fill="currentColor"></path>
                        </svg>
                        <svg class="delete-icon" 
                            ${canDelete ? `onclick="deleteRole(${role.id})"` : ''} 
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
            tbody.appendChild(tr);
        });

        const panelFooter = document.getElementById('panelFooter');
        if (panelFooter) {
            panelFooter.textContent = `Showing ${data.start} to ${data.end} of ${data.total} entries`;
        }

        const paginationControls = document.getElementById('paginationControls');
        if (paginationControls) {
            paginationControls.style.display = data.total > entriesPerPage ? 'flex' : 'none';
            paginationControls.innerHTML = '';

            const prevButton = document.createElement('button');
            prevButton.className = 'btn btn-outline-primary';
            prevButton.textContent = 'Previous';
            prevButton.disabled = currentPage === 1;
            prevButton.onclick = () => {
                if (currentPage > 1) {
                    currentPage--;
                    loadRoles();
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
                    loadRoles();
                }
            };
            paginationControls.appendChild(nextButton);
        }
    } catch (error) {
        console.error('Error loading roles:', error);
        showMessage(`Error: ${error.message}`, 'error');
        const paginationControls = document.getElementById('paginationControls');
        if (paginationControls) {
            paginationControls.style.display = 'none';
        }
        const rolesTableBody = document.getElementById('rolesTableBody');
        if (rolesTableBody) {
            rolesTableBody.innerHTML = '<tr><td colspan="3" class="text-center">Failed to load roles</td></tr>';
        }
    }
}

// Toggle the active status of a role
async function toggleActive(roleId, isChecked) {
    const permissions = getPermissions();
    if (!permissions.canUpdate) {
        showMessage('You do not have permission to update roles', 'error');
        return;
    }

    try {
        const checkbox = document.getElementById(`custom_switch_checkbox_${roleId}`);
        if (checkbox) {
            checkbox.disabled = true;
        }

        const roleResponse = await fetch(`${API_BASE_URL}/userroles/${roleId}`, { method: 'GET', timeout: 5000 });
        if (!roleResponse.ok) {
            const text = await roleResponse.text();
            try {
                const error = JSON.parse(text);
                throw new Error(error.message || 'Failed to fetch role');
            } catch (e) {
                throw new Error(`Failed to fetch role: ${text}`);
            }
        }
        const role = await roleResponse.json();

        const formattedPermissions = role.permissions.map(perm => ({
            id: perm.permissionId,
            IsRead: perm.isRead,
            IsCreate: perm.isCreate,
            IsUpdate: perm.isUpdate,
            IsDelete: perm.isDelete,
            IsExecute: perm.isExecute,
        }));

        const payload = {
            UserRoleName: role.userRoleName,
            Active: isChecked,
            permissions: formattedPermissions,
        };

        const response = await fetch(`${API_BASE_URL}/userroles/${roleId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            timeout: 5000,
        });

        if (!response.ok) {
            const text = await response.text();
            try {
                const error = JSON.parse(text);
                throw new Error(error.message || 'Failed to update active status');
            } catch (e) {
                throw new Error(`Failed to update active status: ${text}`);
            }
        }

        if (checkbox) {
            checkbox.checked = isChecked;
            checkbox.disabled = false;
        }

        showMessage(`Role ${isChecked ? 'activated' : 'deactivated'} successfully`, 'success');
    } catch (error) {
        console.error('Error updating active status:', error);
        showMessage(`Error: ${error.message}`, 'error');
        const checkbox = document.getElementById(`custom_switch_checkbox_${roleId}`);
        if (checkbox) {
            checkbox.checked = !isChecked;
            checkbox.disabled = false;
        }
    }
}

// Handle Read checkbox change
function handleReadChange(permissionId, checked) {
    const row = document.querySelector(`#permissionsTable tr input[name="IsRead${permissionId}"]`).closest('tr');
    if (row) {
        const checkboxes = [
            row.querySelector(`input[name="IsCreate${permissionId}"]`),
            row.querySelector(`input[name="IsUpdate${permissionId}"]`),
            row.querySelector(`input[name="IsDelete${permissionId}"]`),
            row.querySelector(`input[name="IsExecute${permissionId}"]`),
        ];
        checkboxes.forEach(checkbox => {
            if (checkbox && !checkbox.disabled) {
                checkbox.checked = checked;
            }
        });
    }
}

// Fetch permissions and populate the table
async function loadPermissions(permissionsData = []) {
    try {
        const response = await fetch(`${API_BASE_URL}/userroles/permissions/all`, { method: 'GET', timeout: 5000 });
        if (!response.ok) {
            const text = await response.text();
            try {
                const error = JSON.parse(text);
                throw new Error(error.message || `Failed to fetch permissions: ${response.status}`);
            } catch (e) {
                throw new Error(`Failed to fetch permissions: ${text}`);
            }
        }
        const permissions = await response.json();
        console.log('Permissions fetched from backend:', permissions);

        const tbody = document.getElementById('permissionsTable');
        if (!tbody) {
            throw new Error('Permissions table body not found');
        }
        tbody.innerHTML = '';
        if (permissions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-2 text-center text-gray-500">No permissions available</td></tr>';
            return;
        }

        permissions.forEach(perm => {
            const existingPerm = permissionsData.length > 0 ? permissionsData.find(p => p.id === perm.id) || {} : {
                IsRead: false,
                IsCreate: false,
                IsUpdate: false,
                IsDelete: false,
                IsExecute: false,
            };

            console.log(`Rendering permission: ${perm.permissionName}`, {
                isReadDisplay: perm.isReadDisplay,
                isCreateDisplay: perm.isCreateDisplay,
                isUpdateDisplay: perm.isUpdateDisplay,
                isDeleteDisplay: perm.isDeleteDisplay,
                isExecuteDisplay: perm.isExecuteDisplay,
                existingPerm
            });

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-4 py-2 text-sm text-gray-900 ${perm.isMaster ? 'font-bold' : ''}">${perm.permissionName}</td>
                <td class="px-4 py-2 text-center">
                    <input type="checkbox" name="IsRead${perm.id}" ${existingPerm.IsRead ? 'checked' : ''} ${perm.isReadDisplay ? '' : 'disabled'} onchange="handleReadChange(${perm.id}, this.checked)">
                </td>
                <td class="px-4 py-2 text-center">
                    <input type="checkbox" name="IsCreate${perm.id}" ${existingPerm.IsCreate ? 'checked' : ''} ${perm.isCreateDisplay ? '' : 'disabled'}>
                </td>
                <td class="px-4 py-2 text-center">
                    <input type="checkbox" name="IsUpdate${perm.id}" ${existingPerm.IsUpdate ? 'checked' : ''} ${perm.isUpdateDisplay ? '' : 'disabled'}>
                </td>
                <td class="px-4 py-2 text-center">
                    <input type="checkbox" name="IsDelete${perm.id}" ${existingPerm.IsDelete ? 'checked' : ''} ${perm.isDeleteDisplay ? '' : 'disabled'}>
                </td>
                <td class="px-4 py-2 text-center">
                    <input type="checkbox" name="IsExecute${perm.id}" ${existingPerm.IsExecute ? 'checked' : ''} ${perm.isExecuteDisplay ? '' : 'disabled'}>
                </td>
            `;
            tbody.appendChild(tr);
        });

        console.log('Total permissions rendered:', permissions.length);
    } catch (error) {
        console.error('Error loading permissions:', error);
        const formError = document.getElementById('formError');
        if (formError) {
            formError.textContent = error.message;
        }
        showMessage(`Error: ${error.message}`, 'error');
    }
}

// Open modal for adding a role
document.getElementById('addRoleBtn')?.addEventListener('click', () => {
    const permissions = getPermissions();
    if (!permissions.canCreate) {
        showMessage('You do not have permission to create roles', 'error');
        return;
    }

    isEditMode = false;
    currentRoleId = null;
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
        modalTitle.textContent = 'Add User Role';
    }
    const roleName = document.getElementById('roleName');
    if (roleName) {
        roleName.value = '';
    }
    const formError = document.getElementById('formError');
    if (formError) {
        formError.textContent = '';
    }
    loadPermissions();
    const roleModal = document.getElementById('roleModal');
    if (roleModal) {
        roleModal.style.display = 'flex';
    }
});

// Open modal for editing a role
async function editRole(id) {
    const permissions = getPermissions();
    if (!permissions.canUpdate) {
        showMessage('You do not have permission to update roles', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/userroles/${id}`, { method: 'GET', timeout: 5000 });
        if (!response.ok) {
            const text = await response.text();
            try {
                const error = JSON.parse(text);
                throw new Error(error.message || 'Failed to fetch role');
            } catch (e) {
                throw new Error(`Failed to fetch role: ${text}`);
            }
        }
        const role = await response.json();
        isEditMode = true;
        currentRoleId = id;
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) {
            modalTitle.textContent = 'Edit User Role';
        }
        const roleName = document.getElementById('roleName');
        if (roleName) {
            roleName.value = role.userRoleName;
        }
        const formError = document.getElementById('formError');
        if (formError) {
            formError.textContent = '';
        }
        const formattedPermissions = role.permissions.map(perm => ({
            id: perm.permissionId,
            IsRead: perm.isRead,
            IsCreate: perm.isCreate,
            IsUpdate: perm.isUpdate,
            IsDelete: perm.isDelete,
            IsExecute: perm.isExecute,
        }));
        loadPermissions(formattedPermissions);
        const roleModal = document.getElementById('roleModal');
        if (roleModal) {
            roleModal.style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading role:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
}

// Close modal
function closeModal() {
    const roleModal = document.getElementById('roleModal');
    if (roleModal) {
        roleModal.style.display = 'none';
    }
    const formError = document.getElementById('formError');
    if (formError) {
        formError.textContent = '';
    }
}

// Collect permissions from the table
function collectPermissions() {
    const permissions = [];
    document.querySelectorAll('#permissionsTable tr').forEach(row => {
        const input = row.querySelector('input');
        if (!input) return;
        const id = parseInt(input.name.replace('IsRead', ''));
        permissions.push({
            id,
            IsRead: row.querySelector(`input[name="IsRead${id}"]`)?.checked || false,
            IsCreate: row.querySelector(`input[name="IsCreate${id}"]`)?.checked || false,
            IsUpdate: row.querySelector(`input[name="IsUpdate${id}"]`)?.checked || false,
            IsDelete: row.querySelector(`input[name="IsDelete${id}"]`)?.checked || false,
            IsExecute: row.querySelector(`input[name="IsExecute${id}"]`)?.checked || false,
        });
    });
    return permissions;
}

// Form submission
document.getElementById('roleForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const permissions = getPermissions();
    if (isEditMode && !permissions.canUpdate) {
        showMessage('You do not have permission to update roles', 'error');
        return;
    }
    if (!isEditMode && !permissions.canCreate) {
        showMessage('You do not have permission to create roles', 'error');
        return;
    }

    const roleNameInput = document.getElementById('roleName');
    if (!roleNameInput) {
        showMessage('Role name input not found', 'error');
        return;
    }
    const roleName = roleNameInput.value;
    const formPermissions = collectPermissions();

    if (!roleName) {
        const formError = document.getElementById('formError');
        if (formError) {
            formError.textContent = 'Role name is required';
        }
        showMessage('Role name is required', 'error');
        return;
    }

    let data;
    if (isEditMode) {
        try {
            const response = await fetch(`${API_BASE_URL}/userroles/${currentRoleId}`, { method: 'GET', timeout: 5000 });
            if (!response.ok) {
                const text = await response.text();
                try {
                    const error = JSON.parse(text);
                    throw new Error(error.message || 'Failed to fetch role');
                } catch (e) {
                    throw new Error(`Failed to fetch role: ${text}`);
                }
            }
            const role = await response.json();
            data = {
                UserRoleName: roleName,
                Active: role.active,
                permissions: formPermissions,
            };
        } catch (error) {
            console.error('Error fetching role for active status:', error);
            const formError = document.getElementById('formError');
            if (formError) {
                formError.textContent = error.message;
            }
            showMessage(`Error: ${error.message}`, 'error');
            return;
        }
    } else {
        data = {
            UserRoleName: roleName,
            permissions: formPermissions,
        };
    }

    const url = isEditMode ? `${API_BASE_URL}/userroles/${currentRoleId}` : `${API_BASE_URL}/userroles`;
    const method = isEditMode ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            timeout: 5000,
        });
        if (!response.ok) {
            const text = await response.text();
            try {
                const error = JSON.parse(text);
                throw new Error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} role`);
            } catch (e) {
                throw new Error(`Failed to ${isEditMode ? 'update' : 'create'} role: ${text}`);
            }
        }
        closeModal();
        loadRoles();
        showMessage(`Role ${isEditMode ? 'updated' : 'created'} successfully`, 'success');
    } catch (error) {
        console.error(`Error ${isEditMode ? 'updating' : 'creating'} role:`, error);
        const formError = document.getElementById('formError');
        if (formError) {
            formError.textContent = error.message;
        }
        showMessage(`Error: ${error.message}`, 'error');
    }
});

// Delete role
async function deleteRole(id) {
    const permissions = getPermissions();
    if (!permissions.canDelete) {
        showMessage('You do not have permission to delete roles', 'error');
        return;
    }

    const swalWithBootstrapButtons = window.Swal.mixin({
        confirmButtonClass: 'btn btn-secondary',
        cancelButtonClass: 'btn btn-dark ltr:mr-3 rtl:ml-3',
        buttonsStyling: false,
    });

    try {
        const result = await swalWithBootstrapButtons.fire({
            title: 'Are you sure?',
            text: 'You are about to delete this role.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'No, cancel!',
            reverseButtons: true,
            padding: '2em',
        });

        if (result.isConfirmed) {
            const response = await fetch(`${API_BASE_URL}/userroles/${id}`, {
                method: 'DELETE',
                timeout: 5000,
            });

            if (!response.ok) {
                const text = await response.text();
                try {
                    const error = JSON.parse(text);
                    throw new Error(error.message || 'Failed to delete role');
                } catch (e) {
                    throw new Error(`Failed to delete role: ${text}`);
                }
            }

            await loadRoles();
            showMessage('Role deleted successfully', 'success');
        }
    } catch (error) {
        console.error('Error deleting role:', error);
        await swalWithBootstrapButtons.fire('Error', `Failed to delete role: ${error.message}`, 'error');
    }
}

// Handle pagination and search
document.addEventListener('DOMContentLoaded', () => {
    const permissions = getPermissions();
    const addRoleBtn = document.getElementById('addRoleBtn');
    if (addRoleBtn) {
        if (!permissions.canCreate) {
            addRoleBtn.disabled = true;
            addRoleBtn.style.opacity = '0.6';
            addRoleBtn.style.cursor = 'not-allowed';
            addRoleBtn.title = 'You do not have permission to create roles';
            addRoleBtn.setAttribute('aria-disabled', 'true');
        } else {
            addRoleBtn.disabled = false;
            addRoleBtn.style.opacity = '1';
            addRoleBtn.style.cursor = 'pointer';
            addRoleBtn.title = '';
            addRoleBtn.setAttribute('aria-disabled', 'false');
        }
        console.log('Add Role button state:', {
            disabled: addRoleBtn.disabled,
            opacity: addRoleBtn.style.opacity,
            cursor: addRoleBtn.style.cursor,
            title: addRoleBtn.title,
            ariaDisabled: addRoleBtn.getAttribute('aria-disabled')
        });
    } else {
        console.warn('Add Role button not found');
    }

    const entriesSelect = document.querySelector('.dataTable-selector');
    if (entriesSelect) {
        entriesSelect.addEventListener('change', () => {
            entriesPerPage = parseInt(entriesSelect.value);
            currentPage = 1;
            loadRoles();
        });
    } else {
        console.warn('Entries per page selector not found');
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentPage = 1;
            loadRoles();
        });
    } else {
        console.warn('Search input not found');
    }

    // Load roles without checking canRead, similar to reference script
    checkServerHealth().then(isUp => {
        if (isUp) {
            loadRoles();
        } else {
            showMessage('Backend server is not responding at ' + API_BASE_URL + '. Please check the server configuration.', 'error');
            const paginationControls = document.getElementById('paginationControls');
            if (paginationControls) {
                paginationControls.style.display = 'none';
            }
            const rolesTableBody = document.getElementById('rolesTableBody');
            if (rolesTableBody) {
                rolesTableBody.innerHTML = '<tr><td colspan="3" class="text-center">Backend server is not responding</td></tr>';
            }
        }
    });
});
