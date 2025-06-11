
let visitors = [];
let currentPage = 1;
let entriesPerPage = 10;
let searchQuery = '';

const API_BASE_URL = 'https://192.168.3.73:3001';

// Function to filter visitors based on user role and personnameid
function filterVisitorsByUserRole(visitors) {
    const userRole = localStorage.getItem('role');
    const userId = localStorage.getItem('userId'); // Get user's ID from localStorage
    
    console.log('Filtering visitors - User Role:', userRole);
    console.log('Filtering visitors - User ID:', userId);
    console.log('All visitors before filtering:', visitors);
    
    // If user is superadmin, admin, or security, show all entries
    if (['superadmin', 'admin', 'security'].includes(userRole?.toLowerCase())) {
        console.log('User is admin/security, showing all entries');
        return visitors;
    }
    
    // For other users, only show entries where personnameid matches their userId
    const filteredVisitors = visitors.filter(visitor => {
        // Convert both IDs to strings for comparison to handle both string and number types
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
    entriesPerPage = parseInt(value);
    currentPage = 1;
    populateTable();
}

function updateSearchQuery(value) {
    searchQuery = value;
    currentPage = 1;
    populateTable();
}

async function fetchVisitors() {
    try {
        console.log('Fetching exit visitors from /appointment and /visitors');
        
        // Concurrently fetch from both endpoints
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

        // Check response status
        if (!appointmentResponse.ok) {
            throw new Error(`Appointment API error! Status: ${appointmentResponse.status}`);
        }
        if (!visitorResponse.ok) {
            throw new Error(`Visitor API error! Status: ${visitorResponse.status}`);
        }

        // Parse responses
        let appointmentData = await appointmentResponse.json();
        let visitorData = await visitorResponse.json();

        // Handle paginated response from /appointment
        if (appointmentData.data && Array.isArray(appointmentData.data)) {
            appointmentData = appointmentData.data;
        } else if (!Array.isArray(appointmentData)) {
            throw new Error('Unexpected appointment response format');
        }

        // Ensure visitorData is an array
        if (!Array.isArray(visitorData)) {
            throw new Error('Unexpected visitor response format');
        }

        // Combine and filter exit visitors
        let combinedVisitors = [...appointmentData, ...visitorData]
            .filter(item => item.exit === true)
            .map(item => ({
                ...item,
                date: item.date ? item.date.split('-').reverse().join('-') : '',
                durationunit: item.durationunit || item.durationUnit || '',
                source: appointmentData.includes(item) ? 'appointment' : 'visitor', // Track source for debugging
            }));

        // Apply user role-based filtering
        visitors = filterVisitorsByUserRole(combinedVisitors);

        console.log('Combined exit visitors:', visitors);

        if (visitors.length === 0) {
            console.warn('No visible exit visitors fetched after filtering');
        }

        localStorage.setItem('exitVisitors', JSON.stringify(visitors));
        populateTable();
    } catch (error) {
        console.error('Failed to fetch visitors:', error.message);
        visitors = JSON.parse(localStorage.getItem('exitVisitors')) || [];
        visitors = visitors.filter(visitor => visitor.exit === true);
        visitors = filterVisitorsByUserRole(visitors);
        if (visitors.length === 0) {
            console.warn('No cached exit visitors available');
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
            visitor.nationalid?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const start = (currentPage - 1) * entriesPerPage;
    const end = start + entriesPerPage;
    const paginatedVisitors = filteredVisitors.slice(start, end);

    if (paginatedVisitors.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7">No exit visitors found</td></tr>';
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
            `;
            tableBody.appendChild(row);
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

// Initial fetch
fetchVisitors();
