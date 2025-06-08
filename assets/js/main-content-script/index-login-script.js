
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'signin.html';
    }
});

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'signin.html';
}

document.addEventListener('alpine:init', () => {
    Alpine.data('main', () => ({
        // Other existing data properties (e.g., sidebar, theme) can go here
        signOut() {
            localStorage.removeItem('token'); // Clear the token
            window.location.href = 'signin.html'; // Redirect to login page
        },
    }));
});
