// assets/js/auth.js
(function () {
    const token = localStorage.getItem('token');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    console.log('Current Page:', currentPage);
    console.log('Token:', token);

    // List of pages that require authentication
    const protectedPages = [
        'index.html',
        'PreApprovalEntry.html',
        'SpotEntry.html',
        'UserManagement.html',
        'UserRole.html',
        
        // Add more protected pages here
    ];

    // Redirect to login.html if the current page is protected and no token exists
    if (protectedPages.includes(currentPage) && (!token || token.trim() === '')) {
        console.log('No valid token found, redirecting to login.html');
        window.location.href = 'signin.html';
    }
})();

// Global sign-out function
window.signOut = function () {
    console.log('Signing out from:', window.location.pathname);
    localStorage.removeItem('token');
    window.location.href = 'signin.html';
};


window.hasPermission = function (moduleName, action = 'canRead') {
    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
    const perm = permissions.find(p => p.name === moduleName);
    return perm ? perm[action] : false;
};
