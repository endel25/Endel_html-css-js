let visitors = [];
let currentPage = 1;
let entriesPerPage = 10;
let searchQuery = '';

const API_BASE_URL = 'https://192.168.3.73:3001';

function filterVisitorsByUserRole(visitors) {
    const userRole = localStorage.getItem('role');
    const userId = localStorage.getItem('userId');
    
    console.log('Filtering visitors - User Role:', userRole);
    console.log('Filtering visitors - User ID:', userId);
    console.log('All visitors before filtering:', visitors);
    
    if (['superadmin', 'admin', 'security'].includes(userRole?.toLowerCase())) {
        console.log('User is admin/security, showing all entries');
        return visitors;
    }
    
    const filteredVisitors = visitors.filter(visitor => {
        const visitorPersonnameId = String(visitor.personnameid);
        const userPersonnameId = String(userId);
        
        console.log('Comparing IDs:', {
            visitorPersonnameId,
            userPersonnameId,
            visitor: visitor.personname,
            matches: visitorPersonnameId === userPersonnameId
        });
        
        return visitorPersonnameId === userPersonnameId;
    });
    
    console.log('Filtered visitors:', filteredVisitors);
    return filteredVisitors;
}

function updateEntriesPerPage(value) {
    entriesPerPage = parseInt(value) || 10; // Fallback to 10 if invalid
    currentPage = 1;
    populateTable();
}

function updateSearchQuery(value) {
    searchQuery = value.trim();
    currentPage = 1;
    populateTable();
}

async function fetchVisitors() {
    try {
        console.log('Fetching disapproved visitors from /appointment and /visitors');
        
        const [appointmentResponse, visitorResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/appointment?t=${new Date().getTime()}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
            fetch(`${API_BASE_URL}/visitors?t=${new Date().getTime()}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
        ]);

        if (!appointmentResponse.ok) {
            throw new Error(`Appointment API error! Status: ${appointmentResponse.status}`);
        }
        if (!visitorResponse.ok) {
            throw new Error(`Visitor API error! Status: ${visitorResponse.status}`);
        }

        let appointmentData = await appointmentResponse.json();
        let visitorData = await visitorResponse.json();

        if (appointmentData.data && Array.isArray(appointmentData.data)) {
            appointmentData = appointmentData.data;
        } else if (!Array.isArray(appointmentData)) {
            throw new Error('Unexpected appointment response format');
        }

        if (!Array.isArray(visitorData)) {
            throw new Error('Unexpected visitor response format');
        }

        let combinedVisitors = [...appointmentData, ...visitorData]
            .filter(item => item.isApproved === false)
            .map(item => ({
                ...item,
                date: item.date ? item.date.split('-').reverse().join('-') : '',
                durationunit: item.durationunit || item.durationUnit || '',
                source: appointmentData.includes(item) ? 'Pre-Approval' : 'Spot', // Map source to display values
            }));

        visitors = filterVisitorsByUserRole(combinedVisitors);

        console.log('Filtered disapproved visitors:', visitors);

        if (visitors.length === 0) {
            console.warn('No disapproved visitors fetched after filtering');
        }

        localStorage.setItem('disapprovedVisitors', JSON.stringify(visitors));
        populateTable();
    } catch (error) {
        console.error('Failed to fetch visitors:', error.message);
        visitors = JSON.parse(localStorage.getItem('disapprovedVisitors')) || [];
        visitors = visitors.filter(visitor => visitor.isApproved === false);
        visitors = filterVisitorsByUserRole(visitors);
        if (visitors.length === 0) {
            console.warn('No cached disapproved visitors available');
        }
        populateTable();
    }
}

function populateTable() {
    const tableBody = document.getElementById('visitorTableBody');
    if (!tableBody) {
        console.error('Table body not found');
        return;
    }
    tableBody.innerHTML = '';

    const filteredVisitors = visitors.filter(
        visitor =>
            visitor.firstname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            visitor.lastname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            visitor.contactnumber?.includes(searchQuery) ||
            visitor.date?.includes(searchQuery)||
            visitor.time?.includes(searchQuery)||
            visitor.type?.includes(searchQuery)||
            visitor.nationalid?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const start = (currentPage - 1) * entriesPerPage;
    const end = start + entriesPerPage;
    const paginatedVisitors = filteredVisitors.slice(start, end);

    if (paginatedVisitors.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8">No disapproved visitors found</td></tr>';
    } else {
        paginatedVisitors.forEach(visitor => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${visitor.id || ''}</td>
                <td>${visitor.firstname || ''}</td>
                <td>${visitor.lastname || ''}</td>
                <td>${visitor.contactnumber || ''}</td>
                <td>${visitor.date || ''}</td>
                <td>${visitor.time || ''}</td>
                <td>${visitor.nationalid || ''}</td>
                <td>${visitor.source || ''}</td> <!-- Display type (Spot or Pre-Approval) -->
            `;
            tableBody.appendChild(row);
        });
    }

    const totalEntries = filteredVisitors.length;
    const totalPages = Math.ceil(totalEntries / entriesPerPage);
    const showingStart = totalEntries ? start + 1 : 0;
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
            visitor.date?.includes(searchQuery)||
            visitor.time?.includes(searchQuery)||
            visitor.type?.includes(searchQuery)||
            visitor.nationalid?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const totalPages = Math.ceil(filteredVisitors.length / entriesPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        populateTable();
    }
}

fetchVisitors();
