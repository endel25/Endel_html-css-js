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

// Base URL for the backend API
const API_BASE_URL = 'https://192.168.1.82:3001';

// Function to get Dictionarysettings permissions from localStorage
function getPermissions() {
    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
    const dictionarySettings = permissions.find(p => p.name === 'Dictionarysettings') || {
        canRead: true,
        canCreate: false,
        canUpdate: false,
        canDelete: false
    };
    console.log('Retrieved Dictionarysettings permissions:', dictionarySettings);
    return dictionarySettings;
}

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

// Generic function to render table data
function renderTableData(tbodyId, data, editHandler, deleteHandler) {
    const permissions = getPermissions();
    const tbody = document.querySelector(`#${tbodyId} tbody`);
    if (!tbody) {
        console.error(`Table tbody not found for ${tbodyId}`);
        showMessage(`Table not found for ${tbodyId}`, 'error');
        return;
    }
    tbody.innerHTML = '';

    if (!permissions.canRead) {
        tbody.innerHTML = `<tr><td colspan="2">You do not have permission to view this data</td></tr>`;
        showMessage('You do not have permission to view this data', 'error');
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2">No data available</td></tr>`;
        return;
    }

    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
                <td>${item.name}</td>
                <td>
                    <div class="action-buttons">
                        <svg class="action-btn edit-btn" 
                             ${permissions.canUpdate ? `onclick="${editHandler}(${item.id})"` : ''} 
                             width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                             ${!permissions.canUpdate ? 'style="opacity: 0.6; cursor: not-allowed;" title="You do not have permission to edit"' : ''}>
                            <path d="M11.4001 18.1612L11.4001 18.1612L18.796 10.7653C17.7894 10.3464 16.5972 9.6582 15.4697 8.53068C14.342 7.40298 13.6537 6.21058 13.2348 5.2039L5.83882 12.5999L5.83879 12.5999C5.26166 13.1771 4.97307 13.4657 4.7249 13.7838C4.43213 14.1592 4.18114 14.5653 3.97634 14.995C3.80273 15.3593 3.67368 15.7465 3.41556 16.5208L2.05445 20.6042C1.92743 20.9852 2.0266 21.4053 2.31063 21.6894C2.59466 21.9734 3.01478 22.0726 3.39584 21.9456L7.47918 20.5844C8.25351 20.3263 8.6407 20.1973 9.00498 20.0237C9.43469 19.8189 9.84082 19.5679 10.2162 19.2751C10.5343 19.0269 10.823 18.7383 11.4001 18.1612Z" fill="currentColor"></path>
                            <path d="M20.8482 8.71306C22.3839 7.17735 22.3839 4.68748 20.8482 3.15178C19.3125 1.61607 16.8226 1.61607 15.2869 3.15178L14.3999 4.03882C14.4121 4.0755 14.4246 4.11268 14.4377 4.15035C14.7628 5.0875 15.3763 6.31601 16.5303 7.47002C17.6843 8.62403 18.9128 9.23749 19.85 9.56262C19.8875 9.57563 19.9245 9.58817 19.961 9.60026L20.8482 8.71306Z" fill="currentColor"></path>
                        </svg>
                        <svg class="action-btn delete-btn" 
                             ${permissions.canDelete ? `onclick="${deleteHandler}(${item.id})"` : ''} 
                             width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                             ${!permissions.canDelete ? 'style="opacity: 0.6; cursor: not-allowed;" title="You do not have permission to delete"' : ''}>
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
}

// Fetch and render data for each section
async function fetchGenders() {
    const permissions = getPermissions();
    if (!permissions.canRead) {
        renderTableData('genderTable', [], 'openEditGenderModal', 'deleteGender');
        return;
    }
    try {
        const genders = await apiRequest('gender');
        renderTableData('genderTable', genders, 'openEditGenderModal', 'deleteGender');
    } catch (error) {
        console.error('Error fetching genders:', error);
        showMessage('Failed to load genders: ' + error.message, 'error');
    }
}

async function fetchTimeUnits() {
    const permissions = getPermissions();
    if (!permissions.canRead) {
        renderTableData('timeUnitTable', [], 'openEditTimeUnitModal', 'deleteTimeUnit');
        return;
    }
    try {
        const timeUnits = await apiRequest('time-duration-unit');
        renderTableData('timeUnitTable', timeUnits, 'openEditTimeUnitModal', 'deleteTimeUnit');
    } catch (error) {
        console.error('Error fetching time units:', error);
        showMessage('Failed to load time units: ' + error.message, 'error');
    }
}

async function fetchVisitorTypes() {
    const permissions = getPermissions();
    if (!permissions.canRead) {
        renderTableData('visitorTypeTable', [], 'openEditVisitorTypeModal', 'deleteVisitorType');
        return;
    }
    try {
        const visitorTypes = await apiRequest('visitor-type');
        renderTableData('visitorTypeTable', visitorTypes, 'openEditVisitorTypeModal', 'deleteVisitorType');
    } catch (error) {
        console.error('Error fetching visitor types:', error);
        showMessage('Failed to load visitor types: ' + error.message, 'error');
    }
}

async function fetchPurposeOfVisits() {
    const permissions = getPermissions();
    if (!permissions.canRead) {
        renderTableData('purposeTable', [], 'openEditPurposeModal', 'deletePurpose');
        return;
    }
    try {
        const purposes = await apiRequest('purpose-of-visit');
        renderTableData('purposeTable', purposes, 'openEditPurposeModal', 'deletePurpose');
    } catch (error) {
        console.error('Error fetching purpose of visits:', error);
        showMessage('Failed to load purpose of visits: ' + error.message, 'error');
    }
}

async function fetchDepartments() {
    const permissions = getPermissions();
    if (!permissions.canRead) {
        renderTableData('departmentTable', [], 'openEditDepartmentModal', 'deleteDepartment');
        return;
    }
    try {
        const departments = await apiRequest('department');
        renderTableData('departmentTable', departments, 'openEditDepartmentModal', 'deleteDepartment');
    } catch (error) {
        console.error('Error fetching departments:', error);
        showMessage('Failed to load departments: ' + error.message, 'error');
    }
}

async function fetchDesignations() {
    const permissions = getPermissions();
    if (!permissions.canRead) {
        renderTableData('DesignationTable', [], 'openEditDesignationModal', 'deleteDesignation');
        return;
    }
    try {
        const designations = await apiRequest('designation');
        renderTableData('DesignationTable', designations, 'openEditDesignationModal', 'deleteDesignation');
    } catch (error) {
        console.error('Error fetching designations:', error);
        showMessage('Failed to load designations: ' + error.message, 'error');
    }
}

// Modal open/close functions
function openAddGenderModal() {
    const permissions = getPermissions();
    if (!permissions.canCreate) {
        showMessage('You do not have permission to create genders', 'error');
        return;
    }
    const modal = document.getElementById('addGenderModal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        console.error('Add Gender Modal not found');
        showMessage('Error: Add Gender Modal not found.', 'error');
    }
}

function closeAddGenderModal() {
    const modal = document.getElementById('addGenderModal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('addGenderForm').reset();
    }
}

function openEditGenderModal(id) {
    const permissions = getPermissions();
    if (!permissions.canUpdate) {
        showMessage('You do not have permission to update genders', 'error');
        return;
    }
    apiRequest(`gender/${id}`).then(gender => {
        document.getElementById('editGenderName').value = gender.name;
        document.getElementById('editGenderForm').dataset.id = id;
        document.getElementById('editGenderModal').classList.remove('hidden');
    }).catch(error => {
        console.error('Error fetching gender:', error);
        showMessage('Failed to load gender: ' + error.message, 'error');
    });
}

function closeEditGenderModal() {
    const modal = document.getElementById('editGenderModal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('editGenderForm').reset();
    }
}

function openAddTimeUnitModal() {
    const permissions = getPermissions();
    if (!permissions.canCreate) {
        showMessage('You do not have permission to create time units', 'error');
        return;
    }
    const modal = document.getElementById('addTimeUnitModal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        console.error('Add Time Unit Modal not found');
        showMessage('Error: Add Time Unit Modal not found.', 'error');
    }
}

function closeAddTimeUnitModal() {
    const modal = document.getElementById('addTimeUnitModal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('addTimeUnitForm').reset();
    }
}

function openEditTimeUnitModal(id) {
    const permissions = getPermissions();
    if (!permissions.canUpdate) {
        showMessage('You do not have permission to update time units', 'error');
        return;
    }
    apiRequest(`time-duration-unit/${id}`).then(timeUnit => {
        document.getElementById('editTimeUnitName').value = timeUnit.name;
        document.getElementById('editTimeUnitForm').dataset.id = id;
        document.getElementById('editTimeUnitModal').classList.remove('hidden');
    }).catch(error => {
        console.error('Error fetching time unit:', error);
        showMessage('Failed to load time unit: ' + error.message, 'error');
    });
}

function closeEditTimeUnitModal() {
    const modal = document.getElementById('editTimeUnitModal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('editTimeUnitForm').reset();
    }
}

function openAddVisitorTypeModal() {
    const permissions = getPermissions();
    if (!permissions.canCreate) {
        showMessage('You do not have permission to create visitor types', 'error');
        return;
    }
    const modal = document.getElementById('addVisitorTypeModal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        console.error('Add Visitor Type Modal not found');
        showMessage('Error: Add Visitor Type Modal not found.', 'error');
    }
}

function closeAddVisitorTypeModal() {
    const modal = document.getElementById('addVisitorTypeModal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('addVisitorTypeForm').reset();
    }
}

function openEditVisitorTypeModal(id) {
    const permissions = getPermissions();
    if (!permissions.canUpdate) {
        showMessage('You do not have permission to update visitor types', 'error');
        return;
    }
    apiRequest(`visitor-type/${id}`).then(visitorType => {
        document.getElementById('editVisitorTypeName').value = visitorType.name;
        document.getElementById('editVisitorTypeForm').dataset.id = id;
        document.getElementById('editVisitorTypeModal').classList.remove('hidden');
    }).catch(error => {
        console.error('Error fetching visitor type:', error);
        showMessage('Failed to load visitor type: ' + error.message, 'error');
    });
}

function closeEditVisitorTypeModal() {
    const modal = document.getElementById('editVisitorTypeModal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('editVisitorTypeForm').reset();
    }
}

function openAddPurposeModal() {
    const permissions = getPermissions();
    if (!permissions.canCreate) {
        showMessage('You do not have permission to create purposes', 'error');
        return;
    }
    const modal = document.getElementById('addPurposeModal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        console.error('Add Purpose Modal not found');
        showMessage('Error: Add Purpose Modal not found.', 'error');
    }
}

function closeAddPurposeModal() {
    const modal = document.getElementById('addPurposeModal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('addPurposeForm').reset();
    }
}

function openEditPurposeModal(id) {
    const permissions = getPermissions();
    if (!permissions.canUpdate) {
        showMessage('You do not have permission to update purposes', 'error');
        return;
    }
    apiRequest(`purpose-of-visit/${id}`).then(purpose => {
        document.getElementById('editPurposeName').value = purpose.name;
        document.getElementById('editPurposeForm').dataset.id = id;
        document.getElementById('editPurposeModal').classList.remove('hidden');
    }).catch(error => {
        console.error('Error fetching purpose:', error);
        showMessage('Failed to load purpose: ' + error.message, 'error');
    });
}

function closeEditPurposeModal() {
    const modal = document.getElementById('editPurposeModal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('editPurposeForm').reset();
    }
}

function openAddDepartmentModal() {
    const permissions = getPermissions();
    if (!permissions.canCreate) {
        showMessage('You do not have permission to create departments', 'error');
        return;
    }
    const modal = document.getElementById('addDepartmentModal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        console.error('Add Department Modal not found');
        showMessage('Error: Add Department Modal not found.', 'error');
    }
}

function closeAddDepartmentModal() {
    const modal = document.getElementById('addDepartmentModal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('addDepartmentForm').reset();
    }
}

function openEditDepartmentModal(id) {
    const permissions = getPermissions();
    if (!permissions.canUpdate) {
        showMessage('You do not have permission to update departments', 'error');
        return;
    }
    apiRequest(`department/${id}`).then(department => {
        document.getElementById('editDepartmentName').value = department.name;
        document.getElementById('editDepartmentForm').dataset.id = id;
        document.getElementById('editDepartmentModal').classList.remove('hidden');
    }).catch(error => {
        console.error('Error fetching department:', error);
        showMessage('Failed to load department: ' + error.message, 'error');
    });
}

function closeEditDepartmentModal() {
    const modal = document.getElementById('editDepartmentModal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('editDepartmentForm').reset();
    }
}

function openAddDesignationModal() {
    const permissions = getPermissions();
    if (!permissions.canCreate) {
        showMessage('You do not have permission to create designations', 'error');
        return;
    }
    const modal = document.getElementById('addDesignationModal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        console.error('Add Designation Modal not found');
        showMessage('Error: Add Designation Modal not found.', 'error');
    }
}

function closeAddDesignationModal() {
    const modal = document.getElementById('addDesignationModal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('addDesignationForm').reset();
    }
}

function openEditDesignationModal(id) {
    const permissions = getPermissions();
    if (!permissions.canUpdate) {
        showMessage('You do not have permission to update designations', 'error');
        return;
    }
    apiRequest(`designation/${id}`).then(designation => {
        document.getElementById('editDesignationName').value = designation.name;
        document.getElementById('editDesignationForm').dataset.id = id;
        document.getElementById('editDesignationModal').classList.remove('hidden');
    }).catch(error => {
        console.error('Error fetching designation:', error);
        showMessage('Failed to load designation: ' + error.message, 'error');
    });
}

function closeEditDesignationModal() {
    const modal = document.getElementById('editDesignationModal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('editDesignationForm').reset();
    }
}

// Delete functions
async function deleteGender(id) {
    const permissions = getPermissions();
    if (!permissions.canDelete) {
        showMessage('You do not have permission to delete genders', 'error');
        return;
    }
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
            text: 'This gender entry will be permanently deleted.',
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
                    await apiRequest(`gender/${id}`, 'DELETE');
                    fetchGenders();
                    showMessage('Gender deleted successfully', 'success');
                } catch (error) {
                    console.error('Error deleting gender:', error);
                    showMessage(`Failed to delete gender: ${error.message || 'Unknown error'}`, 'error');
                    swalWithBootstrapButtons.fire('Error', 'Failed to delete gender', 'error');
                }
            }
        });
}

async function deleteTimeUnit(id) {
    const permissions = getPermissions();
    if (!permissions.canDelete) {
        showMessage('You do not have permission to delete time units', 'error');
        return;
    }
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
            text: 'This time unit will be permanently deleted.',
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
                    await apiRequest(`time-duration-unit/${id}`, 'DELETE');
                    fetchTimeUnits();
                    showMessage('Time unit deleted successfully', 'success');
                } catch (error) {
                    console.error('Error deleting time unit:', error);
                    showMessage(`Failed to delete time unit: ${error.message || 'Unknown error'}`, 'error');
                    swalWithBootstrapButtons.fire('Error', 'Failed to delete time unit', 'error');
                }
            }
        });
}

async function deleteVisitorType(id) {
    const permissions = getPermissions();
    if (!permissions.canDelete) {
        showMessage('You do not have permission to delete visitor types', 'error');
        return;
    }
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
            text: 'This visitor type will be permanently deleted.',
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
                    await apiRequest(`visitor-type/${id}`, 'DELETE');
                    fetchVisitorTypes();
                    showMessage('Visitor type deleted successfully', 'success');
                } catch (error) {
                    console.error('Error deleting visitor type:', error);
                    showMessage(`Failed to delete visitor type: ${error.message || 'Unknown error'}`, 'error');
                    swalWithBootstrapButtons.fire('Error', 'Failed to delete visitor type', 'error');
                }
            }
        });
}

async function deletePurpose(id) {
    const permissions = getPermissions();
    if (!permissions.canDelete) {
        showMessage('You do not have permission to delete purposes', 'error');
        return;
    }
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
            text: 'This purpose of visit will be permanently deleted.',
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
                    await apiRequest(`purpose-of-visit/${id}`, 'DELETE');
                    fetchPurposeOfVisits();
                    showMessage('Purpose of visit deleted successfully', 'success');
                } catch (error) {
                    console.error('Error deleting purpose:', error);
                    showMessage(`Failed to delete purpose: ${error.message || 'Unknown error'}`, 'error');
                    swalWithBootstrapButtons.fire('Error', 'Failed to delete purpose of visit', 'error');
                }
            }
        });
}

async function deleteDepartment(id) {
    const permissions = getPermissions();
    if (!permissions.canDelete) {
        showMessage('You do not have permission to delete departments', 'error');
        return;
    }
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
            text: 'This department will be permanently deleted.',
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
                    await apiRequest(`department/${id}`, 'DELETE');
                    fetchDepartments();
                    showMessage('Department deleted successfully', 'success');
                } catch (error) {
                    console.error('Error deleting department:', error);
                    showMessage(`Failed to delete department: ${error.message || 'Unknown error'}`, 'error');
                    swalWithBootstrapButtons.fire('Error', 'Failed to delete department', 'error');
                }
            }
        });
}

async function deleteDesignation(id) {
    const permissions = getPermissions();
    if (!permissions.canDelete) {
        showMessage('You do not have permission to delete designations', 'error');
        return;
    }
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
            text: 'This designation will be permanently deleted.',
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
                    await apiRequest(`designation/${id}`, 'DELETE');
                    fetchDesignations();
                    showMessage('Designation deleted successfully', 'success');
                } catch (error) {
                    console.error('Error deleting designation:', error);
                    showMessage(`Failed to delete designation: ${error.message || 'Unknown error'}`, 'error');
                    swalWithBootstrapButtons.fire('Error', 'Failed to delete designation', 'error');
                }
            }
        });
}

// Form submission handlers
document.addEventListener('DOMContentLoaded', () => {
    const permissions = getPermissions();
    console.log('DOM fully loaded, initializing with permissions:', permissions);

    // Disable Add buttons if no create permission
    const addButtons = [
        { id: 'addGenderBtn', handler: openAddGenderModal, label: 'Add Gender' },
        { id: 'addTimeUnitBtn', handler: openAddTimeUnitModal, label: 'Add Time Unit' },
        { id: 'addVisitorTypeBtn', handler: openAddVisitorTypeModal, label: 'Add Visitor Type' },
        { id: 'addPurposeBtn', handler: openAddPurposeModal, label: 'Add Purpose' },
        { id: 'addDepartmentBtn', handler: openAddDepartmentModal, label: 'Add Department' },
        { id: 'addDesignationBtn', handler: openAddDesignationModal, label: 'Add Designation' },
    ];

    addButtons.forEach(btn => {
        const button = document.getElementById(btn.id);
        if (button) {
            if (!permissions.canCreate) {
                button.classList.add('disabled');
                button.style.pointerEvents = 'none';
                button.style.opacity = '0.6';
                button.title = `You do not have permission to create ${btn.label.toLowerCase()}`;
                button.setAttribute('aria-disabled', 'true');
                console.log(`${btn.label} button disabled:`, button);
            } else {
                button.addEventListener('click', btn.handler);
            }
        } else {
            console.warn(`Button with ID ${btn.id} not found`);
        }
    });

    // Gender Form
    const addGenderForm = document.getElementById('addGenderForm');
    if (addGenderForm) {
        addGenderForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (!permissions.canCreate) {
                showMessage('You do not have permission to create genders', 'error');
                return;
            }
            const name = document.getElementById('genderName').value.trim();
            if (!name) {
                showMessage('Gender name is required', 'error');
                return;
            }
            try {
                await apiRequest('gender', 'POST', { name });
                closeAddGenderModal();
                fetchGenders();
                showMessage('Gender added successfully', 'success');
            } catch (error) {
                console.error('Error adding gender:', error);
                showMessage(`Failed to add gender: ${error.message}`, 'error');
            }
        });
    }

    const editGenderForm = document.getElementById('editGenderForm');
    if (editGenderForm) {
        editGenderForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (!permissions.canUpdate) {
                showMessage('You do not have permission to update genders', 'error');
                return;
            }
            const id = e.target.dataset.id;
            const name = document.getElementById('editGenderName').value.trim();
            if (!name) {
                showMessage('Gender name is required', 'error');
                return;
            }
            try {
                await apiRequest(`gender/${id}`, 'PUT', { name });
                closeEditGenderModal();
                fetchGenders();
                showMessage('Gender updated successfully', 'success');
            } catch (error) {
                console.error('Error updating gender:', error);
                showMessage(`Failed to update gender: ${error.message}`, 'error');
            }
        });
    }

    // Time Unit Form
    const addTimeUnitForm = document.getElementById('addTimeUnitForm');
    if (addTimeUnitForm) {
        addTimeUnitForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (!permissions.canCreate) {
                showMessage('You do not have permission to create time units', 'error');
                return;
            }
            const name = document.getElementById('timeUnitName').value.trim();
            if (!name) {
                showMessage('Time unit name is required', 'error');
                return;
            }
            try {
                await apiRequest('time-duration-unit', 'POST', { name });
                closeAddTimeUnitModal();
                fetchTimeUnits();
                showMessage('Time unit added successfully', 'success');
            } catch (error) {
                console.error('Error adding time unit:', error);
                showMessage(`Failed to add time unit: ${error.message}`, 'error');
            }
        });
    }

    const editTimeUnitForm = document.getElementById('editTimeUnitForm');
    if (editTimeUnitForm) {
        editTimeUnitForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (!permissions.canUpdate) {
                showMessage('You do not have permission to update time units', 'error');
                return;
            }
            const id = e.target.dataset.id;
            const name = document.getElementById('editTimeUnitName').value.trim();
            if (!name) {
                showMessage('Time unit name is required', 'error');
                return;
            }
            try {
                await apiRequest(`time-duration-unit/${id}`, 'PUT', { name });
                closeEditTimeUnitModal();
                fetchTimeUnits();
                showMessage('Time unit updated successfully', 'success');
            } catch (error) {
                console.error('Error updating time unit:', error);
                showMessage(`Failed to update time unit: ${error.message}`, 'error');
            }
        });
    }

    // Visitor Type Form
    const addVisitorTypeForm = document.getElementById('addVisitorTypeForm');
    if (addVisitorTypeForm) {
        addVisitorTypeForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (!permissions.canCreate) {
                showMessage('You do not have permission to create visitor types', 'error');
                return;
            }
            const name = document.getElementById('visitorTypeName').value.trim();
            if (!name) {
                showMessage('Visitor type name is required', 'error');
                return;
            }
            try {
                await apiRequest('visitor-type', 'POST', { name });
                closeAddVisitorTypeModal();
                fetchVisitorTypes();
                showMessage('Visitor type added successfully', 'success');
            } catch (error) {
                console.error('Error adding visitor type:', error);
                showMessage(`Failed to add visitor type: ${error.message}`, 'error');
            }
        });
    }

    const editVisitorTypeForm = document.getElementById('editVisitorTypeForm');
    if (editVisitorTypeForm) {
        editVisitorTypeForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (!permissions.canUpdate) {
                showMessage('You do not have permission to update visitor types', 'error');
                return;
            }
            const id = e.target.dataset.id;
            const name = document.getElementById('editVisitorTypeName').value.trim();
            if (!name) {
                showMessage('Visitor type name is required', 'error');
                return;
            }
            try {
                await apiRequest(`visitor-type/${id}`, 'PUT', { name });
                closeEditVisitorTypeModal();
                fetchVisitorTypes();
                showMessage('Visitor type updated successfully', 'success');
            } catch (error) {
                console.error('Error updating visitor type:', error);
                showMessage(`Failed to update visitor type: ${error.message}`, 'error');
            }
        });
    }

    // Purpose of Visit Form
    const addPurposeForm = document.getElementById('addPurposeForm');
    if (addPurposeForm) {
        addPurposeForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (!permissions.canCreate) {
                showMessage('You do not have permission to create purposes', 'error');
                return;
            }
            const name = document.getElementById('purposeName').value.trim();
            if (!name) {
                showMessage('Purpose name is required', 'error');
                return;
            }
            try {
                await apiRequest('purpose-of-visit', 'POST', { name });
                closeAddPurposeModal();
                fetchPurposeOfVisits();
                showMessage('Purpose of visit added successfully', 'success');
            } catch (error) {
                console.error('Error adding purpose:', error);
                showMessage('Failed to add purpose: ' + error.message, 'error');
            }
        });
    }

    const editPurposeForm = document.getElementById('editPurposeForm');
    if (editPurposeForm) {
        editPurposeForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (!permissions.canUpdate) {
                showMessage('You do not have permission to update purposes', 'error');
                return;
            }
            const id = e.target.dataset.id;
            const name = document.getElementById('editPurposeName').value.trim();
            if (!name) {
                showMessage('Purpose name is required', 'error');
                return;
            }
            try {
                await apiRequest(`purpose-of-visit/${id}`, 'PUT', { name });
                closeEditPurposeModal();
                fetchPurposeOfVisits();
                showMessage('Purpose of visit updated successfully', 'success');
            } catch (error) {
                console.error('Error updating purpose:', error);
                showMessage('Failed to update purpose: ' + error.message, 'error');
            }
        });
    }

    // Department Form
    const addDepartmentForm = document.getElementById('addDepartmentForm');
    if (addDepartmentForm) {
        addDepartmentForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (!permissions.canCreate) {
                showMessage('You do not have permission to create departments', 'error');
                return;
            }
            const name = document.getElementById('departmentName').value.trim();
            if (!name) {
                showMessage('Department name is required', 'error');
                return;
            }
            try {
                await apiRequest('department', 'POST', { name });
                closeAddDepartmentModal();
                fetchDepartments();
                showMessage('Department added successfully', 'success');
            } catch (error) {
                console.error('Error adding department:', error);
                showMessage('Failed to add department: ' + error.message, 'error');
            }
        });
    }

    const editDepartmentForm = document.getElementById('editDepartmentForm');
    if (editDepartmentForm) {
        editDepartmentForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (!permissions.canUpdate) {
                showMessage('You do not have permission to update departments', 'error');
                return;
            }
            const id = e.target.dataset.id;
            const name = document.getElementById('editDepartmentName').value.trim();
            if (!name) {
                showMessage('Department name is required', 'error');
                return;
            }
            try {
                await apiRequest(`department/${id}`, 'PUT', { name });
                closeEditDepartmentModal();
                fetchDepartments();
                showMessage('Department updated successfully', 'success');
            } catch (error) {
                console.error('Error updating department:', error);
                showMessage('Failed to update department: ' + error.message, 'error');
            }
        });
    }

    // Designation Form
    const addDesignationForm = document.getElementById('addDesignationForm');
    if (addDesignationForm) {
        addDesignationForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (!permissions.canCreate) {
                showMessage('You do not have permission to create designations', 'error');
                return;
            }
            const name = document.getElementById('DesignationName').value.trim();
            if (!name) {
                showMessage('Designation name is required', 'error');
                return;
            }
            try {
                await apiRequest('designation', 'POST', { name });
                closeAddDesignationModal();
                fetchDesignations();
                showMessage('Designation added successfully', 'success');
            } catch (error) {
                console.error('Error adding designation:', error);
                showMessage(`Failed to add designation: ${error.message || 'Unknown error'}`, 'error');
            }
        });
    }

    const editDesignationForm = document.getElementById('editDesignationForm');
    if (editDesignationForm) {
        editDesignationForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (!permissions.canUpdate) {
                showMessage('You do not have permission to update designations', 'error');
                return;
            }
            const id = e.target.dataset.id;
            const name = document.getElementById('editDesignationName').value.trim();
            if (!name) {
                showMessage('Designation name is required', 'error');
                return;
            }
            try {
                await apiRequest(`designation/${id}`, 'PUT', { name });
                closeEditDesignationModal();
                fetchDesignations();
                showMessage('Designation updated successfully', 'success');
            } catch (error) {
                console.error('Error updating designation:', error);
                showMessage(`Failed to update designation: ${error.message || 'Unknown error'}`, 'error');
            }
        });
    }

    // Initialize data
    fetchGenders();
    fetchTimeUnits();
    fetchVisitorTypes();
    fetchPurposeOfVisits();
    fetchDepartments();
    fetchDesignations();
});
