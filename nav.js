// Centralized navigation menu
const navigationHTML = `
    <div class="toc-menu" id="tocMenu">
        <ul>
            <li><a href="index.html" onclick="toggleMenu()">Home</a></li>
            <li><a href="about.html" onclick="toggleMenu()">About Me</a></li>
            <li><a href="skills.html" onclick="toggleMenu()">Skills</a></li>
            <li><a href="projects.html" onclick="toggleMenu()">Projects</a></li>
            <li><a href="experience.html" onclick="toggleMenu()">Experience</a></li>
            <li><a href="certifications.html" onclick="toggleMenu()">Certifications</a></li>
            <li><a href="references.html" onclick="toggleMenu()">References</a></li>
            <li><a href="contact.html" onclick="toggleMenu()">Contact</a></li>
        </ul>
    </div>
`;

// Inject navigation and set active page
document.addEventListener('DOMContentLoaded', function() {
    // Insert navigation after menu button
    const menuButton = document.querySelector('.menu-btn');
    if (menuButton) {
        menuButton.insertAdjacentHTML('afterend', navigationHTML);
        
        // Highlight current page in menu
        const path = window.location.pathname;
        const currentPage = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
        
        document.querySelectorAll('.toc-menu a').forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage) {
                link.classList.add('active');
            }
        });
    }
});

// Global toggleMenu function for onclick handlers
function toggleMenu() {
    const menu = document.getElementById('tocMenu');
    if (menu) {
        menu.classList.toggle('active');
    }
}
