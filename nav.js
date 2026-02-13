// all navigation links in one place so i dont have to copy paste everywhere
const navigationHTML = `
    <div class="toc-menu" id="tocMenu">
        <ul>
            <li><a href="/index.html" onclick="toggleMenu()">Home</a></li>
            <li><a href="/pages/about.html" onclick="toggleMenu()">About Me</a></li>
            <li><a href="/pages/skills.html" onclick="toggleMenu()">Skills</a></li>
            <li><a href="/pages/projects.html" onclick="toggleMenu()">Projects</a></li>
            <li><a href="/pages/experience.html" onclick="toggleMenu()">Experience</a></li>
            <li><a href="/pages/certifications.html" onclick="toggleMenu()">Certifications</a></li>
            <li><a href="/pages/references.html" onclick="toggleMenu()">References</a></li>
            <li><a href="/pages/contact.html" onclick="toggleMenu()">Contact</a></li>
        </ul>
    </div>
`;

// inject the nav menu once DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // slap the nav right after the menu button
    const menuButton = document.querySelector('.menu-btn');
    if (menuButton) {
        menuButton.insertAdjacentHTML('afterend', navigationHTML);
        
        // figure out which page we're on and highlight it
        const path = window.location.pathname;
        const currentPage = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
        
        document.querySelectorAll('.toc-menu a').forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage) {
                link.classList.add('active');  // add active class to current page
            }
        });
    }
});

// toggles the menu open/close when you click the hamburger
function toggleMenu() {
    const menu = document.getElementById('tocMenu');
    if (menu) {
        menu.classList.toggle('active');
    }
}
