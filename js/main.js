/**
 * ariya.ex3 — Minimalist Interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  initGsapSubtleFade();
  initSmoothScroll();
});

function initGsapSubtleFade() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  // Subtle Hero Reveal
  gsap.from('.hero-main-title', {
    y: 30,
    opacity: 0,
    duration: 1.2,
    ease: 'power2.out'
  });

  gsap.from('.hero-tagline', {
    y: 20,
    opacity: 0,
    duration: 1.2,
    delay: 0.2,
    ease: 'power2.out'
  });

  gsap.from('.hero-controls', {
    y: 15,
    opacity: 0,
    duration: 1,
    delay: 0.4,
    ease: 'power2.out'
  });

  // Editorial Section Reveal
  gsap.utils.toArray('.editorial-title').forEach((title) => {
    gsap.from(title, {
      y: 30,
      opacity: 0,
      duration: 1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: title,
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    });
  });

  // Edit Cards subtle fade
  gsap.utils.toArray('.edit-card').forEach((card) => {
    gsap.from(card, {
      y: 25,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: card,
        start: 'top 88%',
        toggleActions: 'play none none reverse'
      }
    });
  });
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}
