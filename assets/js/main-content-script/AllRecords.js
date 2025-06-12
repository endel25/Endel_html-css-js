let records = [];
let currentPage = 1;
let entriesPerPage = 10;
let searchQuery = '';

// Debounce function to limit rapid search updates
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Original fetchAllRecords function (unchanged)
async function fetchAllRecords() {
  try {
    const response = await fetch('https://192.168.3.73:3001/master-records');
    const fetchedRecords = await response.json();
    return fetchedRecords;
  } catch (error) {
    console.error('Error fetching master records:', error);
    return [];
  }
}

// Normalize data function (provided by user)
const normalizeData = (item, typeOfPass, index) => {
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
    id: item.id || 'N/A',
    firstName: item.firstname || 'Unknown',
    lastName: item.lastname || 'Unknown',
    date: item.date ? item.date.split('-').reverse().join('-') : 'N/A',
    allocatedTime: item.time || 'N/A',
    host: hostName,
    department,
    designation,
    purpose: item.visit || 'N/A',
    nationalId: item.nationalid || 'N/A',
    typeOfPass,
    personnameid: item.personnameid,
    contactnumber: item.contactnumber || 'N/A', // Added to match original table
    visitortype: item.visitortype || 'N/A', // Added to match original table
    recordType: item.recordType || 'N/A' // Added to match original table
  };
};

// Function to populate table with pagination and search
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
    // Normalize all records on fetch
    records = records.map((record, index) => normalizeData(record, 'visitor', index));
  }

  // Filter records based on search query
  const filteredRecords = records.filter(
    record =>
      record.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.contactnumber?.includes(searchQuery) ||
      record.date?.includes(searchQuery) ||
      record.allocatedTime?.includes(searchQuery) ||
      record.nationalId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.purpose?.includes(searchQuery) ||
      record.host?.includes(searchQuery) ||
      record.department?.includes(searchQuery) ||
      record.visitortype?.includes(searchQuery) ||
      record.recordType?.includes(searchQuery) 
  );

  // Calculate pagination
  const start = (currentPage - 1) * entriesPerPage;
  const end = start + entriesPerPage;
  const paginatedRecords = filteredRecords.slice(start, end);

  // Populate table
  if (paginatedRecords.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="12">No records found</td></tr>';
  } else {
    paginatedRecords.forEach(record => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${record.id || ''}</td>
        <td>${record.firstName || ''}</td>
        <td>${record.lastName || ''}</td>
        <td>${record.contactnumber || ''}</td>
        <td>${record.date || ''}</td>
        <td>${record.allocatedTime || ''}</td>
        <td>${record.nationalId || ''}</td>
        <td>${record.purpose || ''}</td>
        <td class="personname-cell" data-host="${record.host}" data-department="${record.department}" data-designation="${record.designation}">
          ${record.host || ''}
          <div class="tooltip">
            <strong>Host:</strong> ${record.host}<br>
            <strong>Department:</strong> ${record.department}<br>
            <strong>Designation:</strong> ${record.designation}
          </div>
        </td>
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
      record.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.contactnumber?.includes(searchQuery) ||
      record.date?.includes(searchQuery) ||
      record.allocatedTime?.includes(searchQuery) ||
      record.nationalId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.purpose?.includes(searchQuery) ||
      record.host?.includes(searchQuery) ||
      record.department?.includes(searchQuery) ||
      record.visitortype?.includes(searchQuery) ||
      record.recordType?.includes(searchQuery) 
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

  // Add event listener for search input with debounce
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener(
      'input',
      debounce(function () {
        searchQuery = this.value;
        currentPage = 1;
        populateTable();
      }, 300)
    );
  } else {
    console.warn('Search input (#searchInput) not found; search functionality disabled');
  }
});
