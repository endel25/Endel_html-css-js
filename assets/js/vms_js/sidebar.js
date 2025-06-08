document.addEventListener('DOMContentLoaded', function () {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer) {
        fetch('vms_html/sidebar.html')
            .then(response => response.text())
            .then(data => {
                sidebarContainer.innerHTML = data;

                // Now load the sidebar menu logic
                const script = document.createElement('script');
                script.src = 'assets/js/vms_js/menu.js';
                script.onload = () => {
                    if (typeof Alpine !== 'undefined') {
                        Alpine.initTree(document.getElementById('main-menu'));
                    }
                };
                script.onerror = () => console.error('Failed to load sidebar menu.js');
                document.body.appendChild(script);
            })
            .catch(error => console.error('Error loading sidebar:', error));
    }
});
