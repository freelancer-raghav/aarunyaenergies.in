// ============================================================
//  Aarunya Energies — Site Scripts
// ============================================================

// ▶ STEP 1: Paste your Google Apps Script Web App URL here
//   (after deploying Code.gs — see instructions in Code.gs)
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbx-dNO0FkN69-e2pr8TdMPkjKiXww8PSTSG-3G7Kyl-I8SLdI-nFbpajgBGF1CI6BzM/exec';

document.addEventListener('DOMContentLoaded', () => {

  // ---- Navbar scroll effect ----
  const navbar = document.getElementById('navbar');
  const onScroll = () => {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();


  // ---- Mobile hamburger ----
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');

  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', isOpen);
    // Animate hamburger to X
    const spans = hamburger.querySelectorAll('span');
    if (isOpen) {
      spans[0].style.transform = 'translateY(7px) rotate(45deg)';
      spans[1].style.opacity   = '0';
      spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
    } else {
      spans[0].style.transform = '';
      spans[1].style.opacity   = '';
      spans[2].style.transform = '';
    }
  });

  // Close nav on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      const spans = hamburger.querySelectorAll('span');
      spans[0].style.transform = '';
      spans[1].style.opacity   = '';
      spans[2].style.transform = '';
    });
  });


  // ---- Counter animation ----
  const counters = document.querySelectorAll('.counter');
  let countersStarted = false;

  const animateCounters = () => {
    if (countersStarted) return;
    counters.forEach(counter => {
      const target  = parseInt(counter.dataset.target, 10);
      const duration = 1800;
      const step     = 16;
      const steps    = duration / step;
      const increment = target / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          counter.textContent = target.toLocaleString('en-IN');
          clearInterval(timer);
        } else {
          counter.textContent = Math.floor(current).toLocaleString('en-IN');
        }
      }, step);
    });
    countersStarted = true;
  };

  // Trigger counters when hero stats are visible
  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) {
    const heroObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        animateCounters();
        heroObserver.disconnect();
      }
    }, { threshold: 0.4 });
    heroObserver.observe(heroStats);
  }


  // ---- Scroll fade-in animations ----
  const fadeEls = document.querySelectorAll(
    '.product-card, .industry-card, .why-card, .step, .visual-card, .acard, .stat-item'
  );

  fadeEls.forEach((el, i) => {
    el.classList.add('fade-in');
    if (i % 3 === 1) el.classList.add('fade-in-delay-1');
    if (i % 3 === 2) el.classList.add('fade-in-delay-2');
  });

  const fadeObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        fadeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  fadeEls.forEach(el => fadeObserver.observe(el));


  // ---- Back to top button ----
  const backToTop = document.getElementById('backToTop');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  }, { passive: true });


  // ---- Contact form → Google Sheets ----
  const form        = document.getElementById('contactForm');
  const formSuccess = document.getElementById('formSuccess');

  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();

      const btn = form.querySelector('.form-submit');
      const originalText = btn.textContent;
      btn.textContent = 'Sending…';
      btn.disabled = true;

      // Collect all field values
      const payload = new URLSearchParams({
        timestamp:  new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        name:       form.name.value.trim(),
        company:    form.company.value.trim(),
        phone:      form.phone.value.trim(),
        email:      form.email.value.trim(),
        product:    form.product.value,
        quantity:   form.quantity.value.trim(),
        location:   form.location.value.trim(),
        message:    form.message.value.trim(),
        source:     document.referrer || 'direct',
        page:       window.location.href,
      });

      try {
        // no-cors avoids preflight; Apps Script still receives + records the data
        await fetch(GOOGLE_SHEET_URL, {
          method:   'POST',
          mode:     'no-cors',
          headers:  { 'Content-Type': 'application/x-www-form-urlencoded' },
          body:     payload.toString(),
        });

        // Show success
        form.style.display = 'none';
        formSuccess.classList.add('visible');

      } catch (err) {
        // Network failure — re-enable form so user can retry
        btn.textContent = originalText;
        btn.disabled    = false;
        alert('Could not send your enquiry. Please try again or call us directly.');
        console.error('Form submission error:', err);
      }
    });
  }


  // ---- Active nav link on scroll ----
  const sections = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navAnchors.forEach(a => a.classList.remove('active'));
        const active = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(s => sectionObserver.observe(s));

});
