document.addEventListener('DOMContentLoaded', function () {
    // Create a container for the loader
    const loaderContainer = document.createElement('div');
    loaderContainer.id = 'screen-loader-container';
    loaderContainer.innerHTML = `
        <div class="screen_loader animate__animated animate__fadeIn fixed inset-0 z-[60] grid place-content-center bg-[#fafafa] dark:bg-[#060818]">
            <svg width="64" height="64" viewBox="0 0 135 135" xmlns="http://www.w3.org/2000/svg" fill="#4361ee">
                <path d="M67.447 58c5.523 0 10-4.477 10-10s-4.477-10-10-10-10 4.477-10 10 4.477 10 10 10zm9.448 9.447c0 5.523 4.477 10 10 10 5.522 0 10-4.477 10-10s-4.478-10-10-10c-5.523 0-10 4.477-10 10zm-9.448 9.448c-5.523 0-10 4.477-10 10 0 5.522 4.477 10 10 10s10-4.478 10-10c0-5.523-4.477-10-10-10zM58 67.447c0-5.523-4.477-10-10-10s-10 4.477-10 10 4.477 10 10 10 10-4.477 10-10z">
                    <animateTransform attributeName="transform" type="rotate" from="0 67 67" to="-360 67 67" dur="2.5s" repeatCount="indefinite" />
                </path>
                <path d="M28.19 40.31c6.627 0 12-5.374 12-12 0-6.628-5.373-12-12-12-6.628 0-12 5.372-12 12 0 6.626 5.372 12 12 12zm30.72-19.825c4.686 4.687 12.284 4.687 16.97 0 4.686-4.686 4.686-12.284 0-16.97-4.686-4.687-12.284-4.687-16.97 0-4.687 4.686-4.687 12.284 0 16.97zm35.74 7.705c0 6.627 5.37 12 12 12 6.626 0 12-5.373 12-12 0-6.628-5.374-12-12-12-6.63 0-12 5.372-12 12zm19.822 30.72c-4.686 4.686-4.686 12.284 0 16.97 4.687 4.686 12.285 4.686 16.97 0 4.687-4.686 4.687-12.284 0-16.97-4.685-4.687-12.283-4.687-16.97 0zm-7.704 35.74c-6.627 0-12 5.37-12 12 0 6.626 5.373 12 12 12s12-5.374 12-12c0-6.63-5.373-12-12-12zm-30.72 19.822c-4.686-4.686-12.284-4.686-16.97 0-4.686 4.687-4.686 12.285 0 16.97 4.686 4.687 12.284 4.687 16.97 0 4.687-4.685 4.687-12.283 0-16.97zm-35.74-7.704c0-6.627-5.372-12-12-12-6.626 0-12 5.373-12 12s5.374 12 12 12c6.628 0 12-5.373 12-12zm-19.823-30.72c4.687-4.686 4.687-12.284 0-16.97-4.686-4.686-12.284-4.686-16.97 0-4.687 4.686-4.687 12.284 0 16.97 4.686 4.687 12.284 4.687 16.97 0z">
                    <animateTransform attributeName="transform" type="rotate" from="0 67 67" to="360 67 67" dur="8s" repeatCount="indefinite" />
                </path>
            </svg>
        </div>
    `;
    document.body.appendChild(loaderContainer);

    // Hide main content initially
    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
        mainContainer.style.display = 'none';
    }

    // Function to check if all critical components are loaded
    function waitForComponents() {
        return Promise.all([
            // Wait for critical scripts to load
            loadScript('assets/js/alpine.min.js'),
            loadScript('assets/js/vms_js/sidebar.js'),
            loadScript('assets/js/vms_js/header.js'),
            // Wait for Alpine.js to initialize
            new Promise(resolve => {
                if (window.Alpine && window.Alpine.store) {
                    resolve();
                } else {
                    const alpineCheck = setInterval(() => {
                        if (window.Alpine && window.Alpine.store) {
                            clearInterval(alpineCheck);
                            resolve();
                        }
                    }, 50);
                }
            }),
            // Wait for table data (if fetched dynamically)
            new Promise(resolve => {
                const tableBody = document.getElementById('visitorTableBody');
                if (tableBody && tableBody.children.length > 0 && !tableBody.querySelector('.skeleton-row')) {
                    resolve();
                } else {
                    const tableCheck = setInterval(() => {
                        if (tableBody.children.length > 0 && !tableBody.querySelector('.skeleton-row')) {
                            clearInterval(tableCheck);
                            resolve();
                        }
                    }, 50);
                }
            })
        ]);
    }

    // Helper function to load scripts
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.querySelector(`script[src="${src}"]`);
            if (script) {
                if (script.complete) {
                    resolve();
                } else {
                    script.onload = resolve;
                    script.onerror = reject;
                }
            } else {
                const newScript = document.createElement('script');
                newScript.src = src;
                newScript.onload = resolve;
                newScript.onerror = reject;
                document.head.appendChild(newScript);
            }
        });
    }

    // Wait for components to load or timeout after 5 seconds
    Promise.race([
        waitForComponents(),
        new Promise(resolve => setTimeout(resolve, 50)) // Fallback timeout
    ]).then(() => {
        const loader = loaderContainer.querySelector('.screen_loader');
        if (loader) {
            // Add fade-out animation
            loader.classList.remove('animate__fadeIn');
            loader.classList.add('animate__fadeOut');
            // Show main content and remove loader after animation
            setTimeout(() => {
                if (mainContainer) {
                    mainContainer.style.display = 'block';
                }
                loaderContainer.remove();
            }, 50); // Match animation duration
        }
    }).catch(error => {
        console.error('Error loading components:', error);
        // Remove loader and show content on error
        if (mainContainer) {
            mainContainer.style.display = 'block';
        }
        loaderContainer.remove();
    });
});