// matrix rain thing for the background - looks kinda cool
const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');

// make canvas full screen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// threw some japanese characters in here cuz why not lol
const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
const fontSize = 14;
const columns = canvas.width / fontSize;
const drops = Array(Math.floor(columns)).fill(1);

function drawMatrix() {
    // fade effect with low opacity
    ctx.fillStyle = 'rgba(10, 14, 39, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#00f0ff';
    ctx.font = fontSize + 'px monospace';
    
    //this here loops through and draws random chars
    for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        
        // reset drop to top when it reaches bottom (randomly)
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}

// runs every 35ms, fast enough to look smooth
setInterval(drawMatrix, 35);

//gotta resize canvas if window changes
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// smooth scrolling for anchor links - way better UX than default jump
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// intersection observer stuff for the fade in effect when scrolling
const observerOptions = {
    threshold: 0.1,  // triggers when 10% visible
    rootMargin: '0px 0px -100px 0px'  // offset from bottom
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // make it visible when it enters viewport
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// start all sections invisible and slightly down
document.querySelectorAll('section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(section);  // watch em
});

// hero needs to show immediately, don't fade it in
const heroSection = document.querySelector('#hero');
if (heroSection) {
    heroSection.style.opacity = '1';
    heroSection.style.transform = 'translateY(0)';
}

//this here is for the collapsible sections on project pages
function toggleMainSection(header) {
    const content = header.nextElementSibling;
    header.classList.toggle('collapsed');
    content.classList.toggle('expanded');
}

// start everything collapsed when page loads
window.addEventListener('load', function() {
    const collapsibleSections = document.querySelectorAll('.collapsible-section');
    collapsibleSections.forEach(section => {
        section.classList.add('collapsed');
    });
});

