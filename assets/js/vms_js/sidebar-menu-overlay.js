document.addEventListener('DOMContentLoaded', function () {
    const sidebarContainer = document.getElementById('sidebar-menu-overlay-container');
    if (sidebarContainer) {
        fetch('vms_html/sidebar-menu-overlay.html')
            .then(response => response.text())
            .then(data => {
                sidebarContainer.innerHTML = data;
                // Re-initialize Alpine.js after injecting the sidebar
                if (typeof Alpine !== 'undefined') {
                    Alpine.initTree(sidebarContainer);
                }
            })
            .catch(error => console.error('Error loading sidebar:', error));
    }
});

