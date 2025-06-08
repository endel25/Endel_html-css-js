// Function to get permissions from localStorage
function getPermissions() {
    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
    const dashboardPermissions = permissions.find(p => p.name === 'Dashboard') || {
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false
    };
    const totalVisitorsPermissions = permissions.find(p => p.name === 'TotalVisitors') || dashboardPermissions;
    const approvedPermissions = permissions.find(p => p.name === 'ApprovedPasses') || dashboardPermissions;
    const disapprovedPermissions = permissions.find(p => p.name === 'DisapprovedPasses') || dashboardPermissions;
    const exitPermissions = permissions.find(p => p.name === 'TotalExitPasses') || dashboardPermissions;

    const result = {
        dashboard: dashboardPermissions,
        totalVisitors: {
            canRead: totalVisitorsPermissions.canRead,
            canCreate: totalVisitorsPermissions.canCreate,
            canUpdate: totalVisitorsPermissions.canUpdate,
            canDelete: totalVisitorsPermissions.canDelete
        },
        approved: {
            canRead: approvedPermissions.canRead,
            canCreate: approvedPermissions.canCreate,
            canUpdate: approvedPermissions.canUpdate,
            canDelete: approvedPermissions.canDelete
        },
        disapproved: {
            canRead: disapprovedPermissions.canRead,
            canCreate: disapprovedPermissions.canCreate,
            canUpdate: disapprovedPermissions.canUpdate,
            canDelete: disapprovedPermissions.canDelete
        },
        exit: {
            canRead: exitPermissions.canRead,
            canCreate: exitPermissions.canCreate,
            canUpdate: exitPermissions.canUpdate,
            canDelete: exitPermissions.canDelete
        }
    };

    console.log('Retrieved permissions:', result);
    return result;
}

let approvedVisitors = [];
let disapprovedVisitors = [];
let exitVisitors = [];
let allVisitors = [];
let passTypes = { spot: 0, preapproval: 0 };

async function fetchApprovedVisitors() {
    try {
        console.log('Fetching approved visitors...');
        const [appointmentResponse, visitorResponse] = await Promise.all([
            fetch(`https://192.168.1.82:3001/appointment?t=${new Date().getTime()}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }),
            fetch(`https://192.168.1.82:3001/visitors?t=${new Date().getTime()}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            })
        ]);

        if (!appointmentResponse.ok) {
            throw new Error(`HTTP error! Status: ${appointmentResponse.status}`);
        }
        if (!visitorResponse.ok) {
            throw new Error(`HTTP error! Status: ${visitorResponse.status}`);
        }

        const appointmentData = await appointmentResponse.json();
        const visitorData = await visitorResponse.json();

        approvedVisitors = [
            ...(Array.isArray(appointmentData) ? appointmentData : appointmentData.data || [])
                .filter(visitor => visitor.isApproved === true)
                .map(visitor => ({
                    ...visitor,
                    recordType: 'preapproval',
                    date: visitor.date ? visitor.date.split('-').reverse().join('-') : '',
                    durationunit: visitor.durationunit || visitor.durationUnit || ''
                })),
            ...(Array.isArray(visitorData) ? visitorData : visitorData.data || [])
                .filter(visitor => visitor.isApproved === true)
                .map(visitor => ({
                    ...visitor,
                    recordType: 'spot',
                    date: visitor.date ? visitor.date.split('-').reverse().join('-') : '',
                    durationunit: visitor.durationunit || visitor.durationUnit || ''
                }))
        ];

        localStorage.setItem('approvedVisitors', JSON.stringify(approvedVisitors));
        updateApprovedCard();
    } catch (error) {
        console.error('Failed to fetch approved visitors:', error.message);
        approvedVisitors = JSON.parse(localStorage.getItem('approvedVisitors') || '[]');
        approvedVisitors = approvedVisitors.filter(visitor => visitor.isApproved === true);
        updateApprovedCard();
    }
}

async function fetchDisapprovedVisitors() {
    try {
        console.log('Fetching disapproved visitors...');
        const [appointmentResponse, visitorResponse] = await Promise.all([
            fetch(`https://192.168.1.82:3001/appointment?t=${new Date().getTime()}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }),
            fetch(`https://192.168.1.82:3001/visitors?t=${new Date().getTime()}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            })
        ]);

        if (!appointmentResponse.ok) {
            throw new Error(`HTTP error! Status: ${appointmentResponse.status}`);
        }
        if (!visitorResponse.ok) {
            throw new Error(`HTTP error! Status: ${visitorResponse.status}`);
        }

        const appointmentData = await appointmentResponse.json();
        const visitorData = await visitorResponse.json();

        disapprovedVisitors = [
            ...(Array.isArray(appointmentData) ? appointmentData : appointmentData.data || [])
                .filter(visitor => visitor.isApproved === false)
                .map(visitor => ({
                    ...visitor,
                    recordType: 'preapproval',
                    date: visitor.date ? visitor.date.split('-').reverse().join('-') : '',
                    durationunit: visitor.durationunit || visitor.durationUnit || ''
                })),
            ...(Array.isArray(visitorData) ? visitorData : visitorData.data || [])
                .filter(visitor => visitor.isApproved === false)
                .map(visitor => ({
                    ...visitor,
                    recordType: 'spot',
                    date: visitor.date ? visitor.date.split('-').reverse().join('-') : '',
                    durationunit: visitor.durationunit || visitor.durationUnit || ''
                }))
        ];

        localStorage.setItem('disapprovedVisitors', JSON.stringify(disapprovedVisitors));
        updateDisapprovedCard();
    } catch (error) {
        console.error('Failed to fetch disapproved visitors:', error.message);
        disapprovedVisitors = JSON.parse(localStorage.getItem('disapprovedVisitors') || '[]');
        disapprovedVisitors = disapprovedVisitors.filter(visitor => visitor.isApproved === false);
        updateDisapprovedCard();
    }
}

async function fetchExitVisitors() {
    try {
        console.log('Fetching exit visitors...');
        const [appointmentResponse, visitorResponse] = await Promise.all([
            fetch(`https://192.168.1.82:3001/appointment?t=${new Date().getTime()}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }),
            fetch(`https://192.168.1.82:3001/visitors?t=${new Date().getTime()}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            })
        ]);

        if (!appointmentResponse.ok) {
            throw new Error(`HTTP error! Status: ${appointmentResponse.status}`);
        }
        if (!visitorResponse.ok) {
            throw new Error(`HTTP error! Status: ${visitorResponse.status}`);
        }

        const appointmentData = await appointmentResponse.json();
        const visitorData = await visitorResponse.json();

        exitVisitors = [
            ...(Array.isArray(appointmentData) ? appointmentData : appointmentData.data || [])
                .filter(visitor => visitor.exit === true)
                .map(visitor => ({
                    ...visitor,
                    recordType: 'preapproval',
                    date: visitor.date ? visitor.date.split('-').reverse().join('-') : '',
                    durationunit: visitor.durationunit || visitor.durationUnit || ''
                })),
            ...(Array.isArray(visitorData) ? visitorData : visitorData.data || [])
                .filter(visitor => visitor.exit === true)
                .map(visitor => ({
                    ...visitor,
                    recordType: 'spot',
                    date: visitor.date ? visitor.date.split('-').reverse().join('-') : '',
                    durationunit: visitor.durationunit || visitor.durationUnit || ''
                }))
        ];

        localStorage.setItem('exitVisitors', JSON.stringify(exitVisitors));
        updateExitCard();
    } catch (error) {
        console.error('Failed to fetch exit visitors:', error.message);
        exitVisitors = JSON.parse(localStorage.getItem('exitVisitors') || '[]');
        exitVisitors = exitVisitors.filter(visitor => visitor.exit === true);
        updateExitCard();
    }
}

async function fetchVisitors() {
    try {
        console.log('Fetching all visitors...');
        const [appointmentResponse, visitorResponse] = await Promise.all([
            fetch(`https://192.168.1.82:3001/appointment?t=${new Date().getTime()}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }),
            fetch(`https://192.168.1.82:3001/visitors?t=${new Date().getTime()}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            })
        ]);

        if (!appointmentResponse.ok) {
            throw new Error(`HTTP error! Status: ${appointmentResponse.status}`);
        }
        if (!visitorResponse.ok) {
            throw new Error(`HTTP error! Status: ${visitorResponse.status}`);
        }

        const appointmentData = await appointmentResponse.json();
        const visitorData = await visitorResponse.json();

        allVisitors = [
            ...(Array.isArray(appointmentData) ? appointmentData : appointmentData.data || [])
                .map(visitor => ({
                    ...visitor,
                    recordType: 'preapproval',
                    date: visitor.date ? visitor.date.split('-').reverse().join('-') : '',
                    durationunit: visitor.durationunit || visitor.durationUnit || ''
                })),
            ...(Array.isArray(visitorData) ? visitorData : visitorData.data || [])
                .map(visitor => ({
                    ...visitor,
                    recordType: 'spot',
                    date: visitor.date ? visitor.date.split('-').reverse().join('-') : '',
                    durationunit: visitor.durationunit || visitor.durationUnit || ''
                }))
        ];

        if (allVisitors.length === 0) {
            console.warn('No visitors fetched from the server');
        }

        localStorage.setItem('allVisitors', JSON.stringify(allVisitors));
        updateCard();
    } catch (error) {
        console.error('Failed to fetch visitors:', error.message);
        allVisitors = JSON.parse(localStorage.getItem('allVisitors') || '[]');
        if (allVisitors.length === 0) {
            console.warn('No cached visitors available either');
        }
        updateCard();
    }
}

async function fetchPassTypes() {
    try {
        console.log('Fetching pass types...');
        const [appointmentResponse, visitorResponse] = await Promise.all([
            fetch(`https://192.168.1.82:3001/appointment?t=${new Date().getTime()}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }),
            fetch(`https://192.168.1.82:3001/visitors?t=${new Date().getTime()}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            })
        ]);

        if (!appointmentResponse.ok) {
            throw new Error(`HTTP error! Status: ${appointmentResponse.status}`);
        }
        if (!visitorResponse.ok) {
            throw new Error(`HTTP error! Status: ${visitorResponse.status}`);
        }

        const appointmentData = await appointmentResponse.json();
        const visitorData = await visitorResponse.json();

        const appointmentArray = Array.isArray(appointmentData) ? appointmentData : appointmentData.data || [];
        const visitorArray = Array.isArray(visitorData) ? visitorData : visitorData.data || [];

        passTypes = {
            spot: visitorArray.length,
            preapproval: appointmentArray.length
        };
    } catch (error) {
        console.error('Failed to fetch pass types:', error.message);
        passTypes = { spot: 0, preapproval: 0 };
    }
}

function updateApprovedCard() {
    document.getElementById('approvedCount').textContent = approvedVisitors.length;

    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekCount = approvedVisitors.filter(visitor => {
        if (!visitor.date) return false;
        const [day, month, year] = visitor.date.split('-').map(Number);
        const visitorDate = new Date(year, month - 1, day);
        return visitorDate >= oneWeekAgo && visitorDate <= today;
    }).length;

    const approvedCard = document.getElementById('approvedCard');
    if (approvedCard) {
        approvedCard.querySelector('.text-sm')?.remove();
        const changeElement = document.createElement('div');
        changeElement.className = 'text-sm font-medium text-gray-500 dark:text-gray-400';
        changeElement.textContent = `Last week: ${lastWeekCount}`;
        approvedCard.appendChild(changeElement);
    }
}

function updateDisapprovedCard() {
    document.getElementById('disapprovedCount').textContent = disapprovedVisitors.length;

    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekCount = disapprovedVisitors.filter(visitor => {
        if (!visitor.date) return false;
        const [day, month, year] = visitor.date.split('-').map(Number);
        const visitorDate = new Date(year, month - 1, day);
        return visitorDate >= oneWeekAgo && visitorDate <= today;
    }).length;

    const disapprovedCard = document.getElementById('disapprovedCard');
    if (disapprovedCard) {
        disapprovedCard.querySelector('.text-sm')?.remove();
        const changeElement = document.createElement('div');
        changeElement.className = 'text-sm font-medium text-gray-500 dark:text-gray-400';
        changeElement.textContent = `Last week: ${lastWeekCount}`;
        disapprovedCard.appendChild(changeElement);
    }
}

function updateExitCard() {
    document.getElementById('exitCount').textContent = exitVisitors.length;

    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekCount = exitVisitors.filter(visitor => {
        if (!visitor.date) return false;
        const [day, month, year] = visitor.date.split('-').map(Number);
        const visitorDate = new Date(year, month - 1, day);
        return visitorDate >= oneWeekAgo && visitorDate <= today;
    }).length;

    const exitCard = document.getElementById('exitCard');
    if (exitCard) {
        exitCard.querySelector('.text-sm')?.remove();
        const changeElement = document.createElement('div');
        changeElement.className = 'text-sm font-medium text-gray-500 dark:text-gray-400';
        changeElement.textContent = `Last week: ${lastWeekCount}`;
        exitCard.appendChild(changeElement);
    }
}

function updateCard() {
    const totalVisitorsCount = allVisitors.length;
    document.getElementById('totalVisitorsCount').textContent = totalVisitorsCount;

    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekCount = allVisitors.filter(visitor => {
        if (!visitor.date) return false;
        const [day, month, year] = visitor.date.split('-').map(Number);
        const visitorDate = new Date(year, month - 1, day);
        return visitorDate >= oneWeekAgo && visitorDate <= today;
    }).length;

    const totalVisitorsCard = document.getElementById('totalVisitorsCard');
    if (totalVisitorsCard) {
        totalVisitorsCard.querySelector('.text-sm')?.remove();
        const changeElement = document.createElement('div');
        changeElement.className = 'text-sm font-medium text-gray-500 dark:text-gray-400';
        changeElement.textContent = `Last week: ${lastWeekCount}`;
        totalVisitorsCard.appendChild(changeElement);
    }
}

// Alpine.js data components
document.addEventListener('alpine:init', () => {
    // Upcoming Appointments
    Alpine.data('upcomingAppointments', () => ({
        appointmentsList: [],
        searchQuery: '',

        get filteredAppointments() {
            if (!this.searchQuery) return this.appointmentsList;
            const query = this.searchQuery.toLowerCase();
            return this.appointmentsList.filter(item =>
                Object.values(item).some(val =>
                    val?.toString().toLowerCase().includes(query)
                )
            );
        },

        async fetchUpcomingAppointments() {
            try {
                const response = await fetch('https://192.168.1.82:3001/appointment');
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();

                const normalizeData = (item) => {
                    let hostName = 'Unknown';
                    let department = 'N/A';
                    let designation = 'N/A';

                    if (item.personname) {
                        const match = item.personname.match(/^(.+?)\s*\((.+?)\s*&\s*(.+?)\)$/);
                        if (match) {
                            hostName = match[1].trim();
                            department = match[2].trim();
                            designation = match[3].trim();
                        } else {
                            hostName = item.personname;
                        }
                    }

                    return {
                        id: item.id,
                        firstName: item.firstname || 'Unknown',
                        lastName: item.lastname || 'Unknown',
                        date: item.date ? item.date.split('-').reverse().join('-') : 'N/A',
                        allocatedTime: item.time || 'N/A',
                        host: hostName,
                        department,
                        designation,
                        purpose: item.visit || 'N/A',
                        nationalId: item.nationalid || 'N/A',
                        typeOfPass: 'preapproval'
                    };
                };

                const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
                const processedData = Array.isArray(data) ? data : data.data || [];
                const apiData = processedData
                    .filter(item => item.date && item.date >= today)
                    .map(normalizeData);

                this.appointmentsList = apiData;
                console.log('Mapped Upcoming Appointments List:', JSON.stringify(this.appointmentsList, null, 2));
            } catch (error) {
                console.error('Error fetching upcoming appointments:', error);
                this.showMessage('Failed to load upcoming appointments.', 'error');
            }
        }
    }));

    // Today's Visitors
    Alpine.data('todaysVisitors', () => ({
        visitorsList: [],
        searchQuery: '',

        get filteredVisitors() {
            if (!this.searchQuery) return this.visitorsList;
            const query = this.searchQuery.toLowerCase();
            return this.visitorsList.filter(item =>
                Object.values(item).some(val =>
                    val?.toString().toLowerCase().includes(query)
                )
            );
        },

        async fetchTodaysVisitors() {
            try {
                const [appointmentResponse, visitorResponse] = await Promise.all([
                    fetch('https://192.168.1.82:3001/appointment'),
                    fetch('https://192.168.1.82:3001/visitors')
                ]);

                if (!appointmentResponse.ok) {
                    throw new Error(`HTTP error! Status: ${appointmentResponse.status}`);
                }
                if (!visitorResponse.ok) {
                    throw new Error(`HTTP error! Status: ${visitorResponse.status}`);
                }

                const appointmentData = await appointmentResponse.json();
                const visitorData = await visitorResponse.json();
                const today = new Date().toISOString().split('T')[0];

                const normalizeData = (item, recordType) => {
                    let hostName = 'Unknown';
                    let department = 'N/A';
                    let designation = 'N/A';

                    if (item.personname) {
                        const match = item.personname.match(/^(.+?)\s*\((.+?)\s*&\s*(.+?)\)$/);
                        if (match) {
                            hostName = match[1].trim();
                            department = match[2].trim();
                            designation = match[3].trim();
                        } else {
                            hostName = item.personname;
                        }
                    }

                    return {
                        id: item.id,
                        firstName: item.firstname || 'Unknown',
                        lastName: item.lastname || 'Unknown',
                        date: item.date ? item.date.split('-').reverse().join('-') : 'N/A',
                        allocatedTime: item.time || 'N/A',
                        host: hostName,
                        department,
                        designation,
                        purpose: item.visit || 'N/A',
                        nationalId: item.nationalid || 'N/A',
                        pendingApproval: item.isApproved ?? true,
                        recordType
                    };
                };

                const processedAppointmentData = (Array.isArray(appointmentData) ? appointmentData : appointmentData.data || [])
                    .filter(item => item.date === today)
                    .map(item => normalizeData(item, 'preapproval'));

                const processedVisitorData = (Array.isArray(visitorData) ? visitorData : visitorData.data || [])
                    .filter(item => item.date === today)
                    .map(item => normalizeData(item, 'spot'));

                this.visitorsList = [...processedAppointmentData, ...processedVisitorData];
                console.log('Mapped Today\'s Visitor List:', JSON.stringify(this.visitorsList, null, 2));
            } catch (error) {
                console.error("Error fetching today's visitors:", error);
                this.showMessage("Failed to load today's visitors.", 'error');
            }
        },

        async toggleApproval(id, currentStatus, recordType) {
            try {
                const status = currentStatus ? 'disapprove' : 'approve';
                const endpoint = recordType === 'preapproval' ? 'appointment' : 'visitors';
                const response = await fetch(`https://192.168.1.82:3001/${endpoint}/${id}/status/${status}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                this.showMessage(`Visitor ${status}d successfully.`);
                await this.fetchTodaysVisitors();
            } catch (error) {
                console.error('Error toggling approval status:', error);
                this.showMessage('Failed to toggle approval status.', 'error');
            }
        },

        showMessage(msg = '', type = 'success') {
            const toast = window.Swal.mixin({
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000
            });
            toast.fire({
                icon: type,
                title: msg,
                padding: '10px 20px'
            });
        }
    }));

    // Visitor Details
    Alpine.data('visitorDetails', () => ({
        visitorsList: [],
        searchQuery: '',

        get filteredVisitors() {
            if (!this.searchQuery) return this.visitorsList;
            const query = this.searchQuery.toLowerCase();
            return this.visitorsList.filter(item =>
                Object.values(item).some(val =>
                    val?.toString().toLowerCase().includes(query)
                )
            );
        },

        getVisitorStatus(visitor) {
            if (visitor.exitApproval) return 'exit';
            if (visitor.complete) return 'complete';
            if (visitor.inCampus) return 'incampus';
            if (visitor.pendingApproval) return 'pending';
            return '';
        },

        async fetchVisitorDetails() {
            try {
                const [appointmentResponse, visitorResponse] = await Promise.all([
                    fetch('https://192.168.1.82:3001/appointment'),
                    fetch('https://192.168.1.82:3001/visitors')
                ]);

                if (!appointmentResponse.ok) {
                    throw new Error(`HTTP error! Status: ${appointmentResponse.status}`);
                }
                if (!visitorResponse.ok) {
                    throw new Error(`HTTP error! Status: ${visitorResponse.status}`);
                }

                const appointmentData = await appointmentResponse.json();
                const visitorData = await visitorResponse.json();
                console.log('API Response for Visitor Details:', JSON.stringify({ appointmentData, visitorData }, null, 2));

                const today = new Date();
                const todayStr = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
                console.log('Today\'s date:', todayStr);

                const normalizeData = (item, recordType) => {
                    let hostName = 'Unknown';
                    let department = 'N/A';
                    let designation = 'N/A';

                    if (item.personname) {
                        const match = item.personname.match(/^(.+?)\s*\((.+?)\s*&\s*(.+?)\)$/);
                        if (match) {
                            hostName = match[1].trim();
                            department = match[2].trim();
                            designation = match[3].trim();
                        } else {
                            hostName = item.personname;
                        }
                    }

                    let exitDateToUse = item.exitDate || localStorage.getItem(`exitDate_${item.id}`) || item.date;
                    if (exitDateToUse?.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        const [year, month, day] = exitDateToUse.split('-').map(Number);
                        exitDateToUse = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
                    }

                    if (!exitDateToUse?.match(/^\d{2}-\d{2}-\d{4}$/)) {
                        console.warn(`Invalid exitDate format for visitor ID ${item.id}. Fallback used.`);
                        exitDateToUse = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
                    }

                    return {
                        id: item.id,
                        firstName: item.firstname || 'Unknown',
                        lastName: item.lastname || 'Unknown',
                        date: item.date ? item.date.split('-').reverse().join('-') : 'N/A',
                        allocatedTime: item.time || 'N/A',
                        host: hostName,
                        department,
                        designation,
                        purpose: item.visit || 'N/A',
                        nationalId: item.nationalid || 'N/A',
                        pendingApproval: true,
                        inCampus: (item.isApproved ?? true) ? true : (item.inprogress ?? false),
                        complete: item.complete ?? false,
                        exitApproval: item.exit ?? false,
                        exitDate: exitDateToUse,
                        isApproved: item.isApproved ?? true,
                        typeOfPass: recordType,
                        recordType
                    };
                };

                const processedAppointmentData = (Array.isArray(appointmentData) ? appointmentData : appointmentData.data || [])
                    .filter(item => item.date && item.date === todayStr)
                    .map(item => normalizeData(item, 'preapproval'));

                const processedVisitorData = (Array.isArray(visitorData) ? visitorData : visitorData.data || [])
                    .filter(item => item.date && item.date === todayStr)
                    .map(item => normalizeData(item, 'spot'));

                const apiData = [...processedAppointmentData, ...processedVisitorData]
                    .filter(item => {
                        if (item.exitApproval && item.exitDate) {
                            const [exitDay, exitMonth, exitYear] = item.exitDate.split('-').map(Number);
                            const exitDate = new Date(Date.UTC(exitYear, exitMonth - 1, exitDay));
                            const todayDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
                            return exitDate >= todayDate;
                        }
                        return true;
                    });

                this.visitorsList = apiData;
                console.log('Mapped Visitor List:', JSON.stringify(this.visitorsList, null, 2));
            } catch (error) {
                console.error('Error fetching visitor details:', error);
                this.showMessage('Failed to load visitor details.', 'error');
            }
        },

        async updateVisitor(visitor) {
            try {
                let status = '';
                let body = {};
                const endpoint = visitor.recordType === 'preapproval' ? 'appointment' : 'visitors';

                if (visitor.inCampus) {
                    status = 'inprogress';
                    body = { inprogress: true };
                } else if (visitor.complete) {
                    status = 'complete';
                    body = { complete: true };
                } else if (visitor.exitApproval) {
                    status = 'exit';
                    const today = new Date();
                    const day = String(today.getDate()).padStart(2, '0');
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const year = today.getFullYear();
                    const exitDateStr = `${day}-${month}-${year}`;
                    body = { exit: true, exitDate: exitDateStr };
                    localStorage.setItem(`exitDate_${visitor.id}`, exitDateStr);
                }

                if (status) {
                    const response = await fetch(`https://192.168.1.82:3001/${endpoint}/${visitor.id}/status/${status}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    this.showMessage('Visitor status updated successfully.');
                    await this.fetchVisitorDetails();
                } else {
                    throw new Error('No status change detected.');
                }
            } catch (error) {
                console.error('Error updating visitor status:', error);
                this.showMessage('Failed to update visitor status.', 'error');
            }
        },

        showMessage(msg = '', type = 'success') {
            const toast = window.Swal.mixin({
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000
            });
            toast.fire({
                icon: type,
                title: msg,
                padding: '10px 20px'
            });
        },

        renderProgressSteps(visitor) {
            const status = this.getVisitorStatus(visitor);
            const isDisapproved = !visitor.isApproved;
            const isExited = visitor.exitApproval;
            console.log(`Rendering progress steps for visitor ID ${visitor.id}: status=${status}, isDisapproved=${isDisapproved}, isExited=${isExited}`);
            return `
                <div class="progress-steps" data-status="${status}" data-is-disapproved="${isDisapproved}" data-is-exited="${isExited}">
                    <div class="step gap-after1" data-step="pending">
                        <div class="step-circle">
                            <svg class="step-icon h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3"></path>
                            </svg>
                        </div>
                        <div class="step-label"></div>
                    </div>
                    <div class="step gap-after1" data-step="incampus">
                        <div class="step-circle">
                            <svg class="step-icon h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <div class="step-label"></div>
                    </div>
                    <div class="step gap-after" data-step="complete">
                        <div class="step-circle">
                            <svg class="step-icon h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <div class="step-label"></div>
                    </div>
                    <div class="step" data-step="exit">
                        <div class="step-circle">
                            <svg class="step-icon h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                            </svg>
                        </div>
                        <div class="step-label"></div>
                    </div>
                </div>
            `;
        }
    }));
});

// Add logic to update step classes based on status
document.addEventListener('DOMContentLoaded', () => {
    const updateSteps = () => {
        document.querySelectorAll('.progress-steps').forEach(progress => {
            const status = progress.dataset.status;
            const isDisapproved = progress.dataset.isDisapproved === 'true' || false;
            const isExited = progress.dataset.isExited === 'true' || false;
            const steps = progress.querySelectorAll('.step');

            console.log(`Updating steps: status=${status}, isDisapproved=${isDisapproved}, isExited=${isExited}`);

            steps.forEach(step => {
                step.classList.remove('active', 'red');
                const stepType = step.dataset.step;

                const shouldHighlight =
                    (status === 'pending' && stepType === 'pending') ||
                    (status === 'incampus' && (stepType === 'pending' || stepType === 'incampus')) ||
                    (status === 'complete' && (stepType === 'pending' || stepType === 'incampus' || stepType === 'complete')) ||
                    (status === 'exit' && (stepType === 'pending' || stepType === 'incampus' || stepType === 'complete' || stepType === 'exit'));

                if (shouldHighlight) {
                    if (isDisapproved) {
                        console.log(`Applying red class to step ${stepType} due to disapproval`);
                        step.classList.add('red');
                    } else if (isExited && stepType === 'exit') {
                        console.log(`Applying red class to exit step due to exit status`);
                        step.classList.add('red');
                    } else {
                        console.log(`Applying active (green) class to step ${stepType}`);
                        step.classList.add('active');
                    }
                } else {
                    console.log(`Step ${stepType} not highlighted (gray)`);
                }
            });
        });
    };

    // Initial update
    updateSteps();

    // Watch for Alpine.js updates
    document.addEventListener('alpine:initialized', updateSteps);
    setInterval(updateSteps, 1000);
});

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing dashboard');

    const permissions = getPermissions();

    const createButton = document.getElementById('sticky-button');
    if (!createButton) {
        console.error('Create Visitor Gatepass button not found');
    } else {
        if (!permissions.dashboard.canRead || !permissions.dashboard.canCreate) {
            createButton.style.pointerEvents = 'none';
            createButton.setAttribute('aria-disabled', 'true');
            const reason = !permissions.dashboard.canRead
                ? 'You do not have permission to view the dashboard'
                : 'You do not have permission to create a visitor gatepass';
            createButton.setAttribute('title', reason);

            createButton.addEventListener('click', e => {
                e.preventDefault();
                const toast = window.Swal.mixin({
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000
                });
                toast.fire({
                    icon: 'error',
                    title: reason,
                    padding: '10px 20px'
                });
            });

            console.log('Create Visitor Gatepass button disabled:', { canRead: permissions.dashboard.canRead, canCreate: permissions.dashboard.canCreate });
        } else {
            createButton.style.pointerEvents = 'auto';
            createButton.removeAttribute('aria-disabled');
            createButton.removeAttribute('title');
            console.log('Create Visitor Gatepass button enabled');
        }
    }

    const cards = [
        {
            id: 'totalVisitorsCard',
            selector: '.panel[onclick*="SpotEntry.html"]',
            permissions: permissions.totalVisitors,
            reason: 'You do not have permission to interact with Total Visitors.'
        },
        {
            id: 'approvedCard',
            selector: '.panel[onclick*="Approvedpasses.html"]',
            permissions: permissions.approved,
            reason: 'You do not have permission to interact with Approved Passes.'
        },
        {
            id: 'disapprovedCard',
            selector: '.panel[onclick*="Disapprovedpasses.html"]',
            permissions: permissions.disapproved,
            reason: 'You do not have permission to interact with Disapproved Passes.'
        },
        {
            id: 'exitCard',
            selector: '.panel[onclick*="Totalexitpasses.html"]',
            permissions: permissions.exit,
            reason: 'You do not have permission to interact with Total Exit Passes.'
        }
    ];

    cards.forEach(card => {
        const element = document.querySelector(card.selector);
        if (!element) {
            console.error(`${card.id} not found`);
            return;
        }

        const isInteractive = card.permissions.canRead &&
            (card.permissions.canCreate || card.permissions.canUpdate || card.permissions.canDelete);

        if (!isInteractive) {
            element.style.pointerEvents = 'none';
            element.setAttribute('aria-disabled', 'true');
            element.setAttribute('title', card.reason);

            element.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                const toast = window.Swal.mixin({
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000
                });
                toast.fire({
                    icon: 'error',
                    title: card.reason,
                    padding: '10px 20px'
                });
            });

            console.log(`${card.id} made static:`, {
                canRead: card.permissions.canRead,
                canCreate: card.permissions.canCreate,
                canUpdate: card.permissions.canUpdate,
                canDelete: card.permissions.canDelete
            });
        } else {
            element.style.pointerEvents = 'auto';
            element.removeAttribute('aria-disabled');
            element.removeAttribute('title');
            console.log(`${card.id} enabled`);
        }
    });

    fetchApprovedVisitors();
    fetchDisapprovedVisitors();
    fetchExitVisitors();
    fetchVisitors();
    fetchPassTypes();
});

document.addEventListener('DOMContentLoaded', function () {
    const isDarkMode = document.documentElement.classList.contains('dark');

    // Define colors for chart-status (Total Visitors: blue, Approved Passes: green, Disapproved Passes: red, Total Exit Passes: yellow)
    const statusBackgroundColors = ['#3b82f6', '#10b981', '#ef4444', '#fbbf24']; // Blue, Green, Red, Yellow
    const typeBackgroundColors = ['#3b82f6', '#10b981']; // Blue for Spot Entry, Yellow for Pre-Approval Entry

    const borderColor = isDarkMode ? '#1f2937' : '#ffffff';

    setTimeout(() => {
        const ctxStatus = document.getElementById('chart-status').getContext('2d');
        new Chart(ctxStatus, {
            type: 'pie',
            data: {
                labels: ['Total Visitors', 'Approved Passes', 'Disapproved Passes', 'Total Exit Passes'],
                datasets: [{
                    label: 'Visitor Status',
                    data: [
                        allVisitors.length,
                        approvedVisitors.length,
                        disapprovedVisitors.length,
                        exitVisitors.length
                    ],
                    backgroundColor: statusBackgroundColors,
                    borderColor: borderColor,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: isDarkMode ? '#e5e7eb' : '#111827'
                        }
                    },
                    tooltip: {
                        backgroundColor: isDarkMode ? '#374151' : '#f9fafb',
                        titleColor: isDarkMode ? '#f9fafb' : '#111827',
                        bodyColor: isDarkMode ? '#d1d5db' : '#1f2937'
                    }
                }
            }
        });

        const ctxType = document.getElementById('chart-type').getContext('2d');
        new Chart(ctxType, {
            type: 'pie',
            data: {
                labels: ['Spot Entry', 'Pre-Approval Entry'],
                datasets: [{
                    label: 'Pass Types',
                    data: [passTypes.spot, passTypes.preapproval],
                    backgroundColor: typeBackgroundColors,
                    borderColor: borderColor,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: isDarkMode ? '#e5e7eb' : '#111827'
                        }
                    },
                    tooltip: {
                        backgroundColor: isDarkMode ? '#374151' : '#f9fafb',
                        titleColor: isDarkMode ? '#f9fafb' : '#111827',
                        bodyColor: isDarkMode ? '#d1d5db' : '#1f2937'
                    }
                }
            }
        });
    }, 500);
});
