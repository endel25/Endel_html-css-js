
let visitors = [];
let currentPage = 1;
let entriesPerPage = 10;
let searchQuery = '';

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
        console.log('Fetching disapproved visitors from https://192.168.1.82:3001/visitors');
        const response = await fetch(`https://192.168.1.82:3001/visitors?t=${new Date().getTime()}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Fetched visitors:', data);
        visitors = data
            .filter(visitor => visitor.isApproved === false)
            .map(visitor => ({
                ...visitor,
                date: visitor.date ? visitor.date.split('-').reverse().join('-') : '',
                durationunit: visitor.durationunit || visitor.durationUnit || '',
            }));

        if (visitors.length === 0) {
            console.warn('No disapproved visitors fetched from the server');
        }

        localStorage.setItem('visitors', JSON.stringify(visitors));
        populateTable();
    } catch (error) {
        console.error('Failed to fetch visitors:', error.message);
        visitors = JSON.parse(localStorage.getItem('visitors')) || [];
        visitors = visitors.filter(visitor => visitor.isApproved === false);
        if (visitors.length === 0) {
            console.warn('No cached disapproved visitors available either');
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
        tableBody.innerHTML = '<tr><td colspan="7">No disapproved visitors found</td></tr>';
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

