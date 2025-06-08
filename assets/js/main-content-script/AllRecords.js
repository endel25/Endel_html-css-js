let records = [];
let currentPage = 1;
let entriesPerPage = 10;
let searchQuery = '';

// Original fetchAllRecords function (unchanged)
async function fetchAllRecords() {
  try {
    const response = await fetch('https://192.168.1.82:3001/master-records');

    const fetchedRecords = await response.json(); // Convert a json string to json object,array

    const tableBody = document.getElementById('visitorTableBody');
    // Do not update tableBody directly; return records for pagination
    return fetchedRecords;
  } catch (error) {
    console.error('Error fetching master records:', error);
    return [];
  }
}

// New function to populate table with pagination and search
async function populateTable() {
  const tableBody = document.getElementById('visitorTableBody');
  if (!tableBody) {
    console.error('Table body not found');
    return;
  }
  tableBody.innerHTML = '';

  // Fetch records if not already loaded
  if (records.length === 0) {
    records = await fetchAllRecords();
  }

  // Filter records based on search query
  const filteredRecords = records.filter(
    record =>
      record.firstname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.lastname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.contactnumber?.includes(searchQuery) ||
      record.nationalid?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const start = (currentPage - 1) * entriesPerPage;
  const end = start + entriesPerPage;
  const paginatedRecords = filteredRecords.slice(start, end);

  // Populate table (reusing original fetchAllRecords' table population logic)
  if (paginatedRecords.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="12">No records found</td></tr>';
  } else {
    paginatedRecords.forEach(record => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${record.id || ''}</td>
        <td>${record.firstname || ''}</td>
        <td>${record.lastname || ''}</td>
        <td>${record.contactnumber || ''}</td>
        <td>${record.date || ''}</td>
        <td>${record.time || ''}</td>
        <td>${record.nationalid || ''}</td>
        <td>${record.visit || ''}</td>
        <td>${record.personname || ''}</td>
        <td>${record.department || ''}</td>
        <td>${record.visitortype || ''}</td>
        <td>${record.recordType || ''}</td>
      `;
      tableBody.appendChild(row);
    });
  }

  // Update pagination info
  const totalEntries = filteredRecords.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const showingStart = totalEntries === 0 ? 0 : start + 1;
  const showingEnd = Math.min(end, totalEntries);
  document.getElementById('paginationInfo').textContent = `Showing ${showingStart} to ${showingEnd} of ${totalEntries} entries`;

  // Update pagination buttons
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

// Previous page function
function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    populateTable();
  }
}

// Next page function
function nextPage() {
  const filteredRecords = records.filter(
    record =>
      record.firstname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.lastname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.contactnumber?.includes(searchQuery) ||
      record.nationalid?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.ceil(filteredRecords.length / entriesPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    populateTable();
  }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  // Fetch and populate table
  populateTable();

  // Add event listeners for pagination buttons
  document.getElementById('prevPage')?.addEventListener('click', previousPage);
  document.getElementById('nextPage')?.addEventListener('click', nextPage);

  // Add event listener for entries per page dropdown
  const entriesPerPageSelect = document.getElementById('entriesPerPage');
  if (entriesPerPageSelect) {
    entriesPerPageSelect.addEventListener('change', function () {
      entriesPerPage = parseInt(this.value) || 10;
      currentPage = 1;
      populateTable();
    });
  } else {
    console.warn('Entries per page dropdown (#entriesPerPage) not found; assuming default 10 entries per page');
  }

  // Add event listener for search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      searchQuery = this.value;
      currentPage = 1;
      populateTable();
    });
  } else {
    console.warn('Search input (#searchInput) not found; search functionality disabled');
  }
});
