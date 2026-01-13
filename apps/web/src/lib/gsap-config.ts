'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);

  gsap.defaults({
    ease: 'power3.out',
    duration: 1,
  });

  ScrollTrigger.defaults({
    markers: false,
  });
}

export const EASINGS = {
  springBounce:
    'linear(0, 0.1719, 0.4986, 0.7952, 0.9887, 1.0779, 1.0939, 1.0726, 1.0412, 1.0148, 0.9986, 0.9919, 0.9913, 0.9937, 0.9967, 0.999, 1)',

  springSnappy:
    'linear(0, 0.3566, 0.7963, 1.0045, 1.0459, 1.0287, 1.0088, 0.9996, 1, 0.9987, 0.9996, 1)',

  smoothOut: 'power3.out',

  elastic: 'elastic.out(1, 0.5)',

  back: 'back.out(1.7)',
} as const;

export const ANIMATION_PRESETS = {
  fadeUp: {
    from: { y: 50, opacity: 0 },
    to: { y: 0, opacity: 1 },
  },
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  scaleIn: {
    from: { scale: 0.8, opacity: 0 },
    to: { scale: 1, opacity: 1 },
  },
  slideInLeft: {
    from: { x: -100, opacity: 0 },
    to: { x: 0, opacity: 1 },
  },
  slideInRight: {
    from: { x: 100, opacity: 0 },
    to: { x: 0, opacity: 1 },
  },
  } as const;

export function initScrollReveal() {
  if (typeof window === 'undefined') return;

  ScrollTrigger.batch('.scroll-reveal', {
    onEnter: (elements) => {
      gsap.fromTo(
        elements,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: EASINGS.smoothOut,
          clearProps: 'transform',
        }
      );
    },
    start: 'top 85%',
    once: true,
  });

  ScrollTrigger.batch('.scroll-reveal-scale', {
    onEnter: (elements) => {
      gsap.fromTo(
        elements,
        { scale: 0.9, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.6,
          stagger: 0.08,
          ease: EASINGS.back,
          clearProps: 'transform',
        }
      );
    },
    start: 'top 85%',
    once: true,
  });
}

export function createHeroTimeline(container: HTMLElement) {
  const tl = gsap.timeline({ defaults: { ease: EASINGS.smoothOut } });

  tl.from(container.querySelector('.hero-badge'), {
    y: 20,
    opacity: 0,
    duration: 0.6,
  })
    .from(
      container.querySelector('.hero-title'),
      {
        y: 40,
        opacity: 0,
        duration: 0.8,
      },
      '-=0.3'
    )
    .from(
      container.querySelector('.hero-subtitle'),
      {
        y: 30,
        opacity: 0,
        duration: 0.7,
      },
      '-=0.4'
    )
    .from(
      container.querySelectorAll('.hero-cta'),
      {
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
      },
      '-=0.3'
    )
    .from(
      container.querySelector('.hero-visual'),
      {
        scale: 0.9,
        opacity: 0,
        duration: 1,
        ease: EASINGS.back,
      },
      '-=0.5'
    );

  return tl;
}

export function animateFeatureCards(cards: HTMLElement[]) {
  return gsap.fromTo(
    cards,
    { y: 60, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.7,
      stagger: 0.1,
      ease: EASINGS.smoothOut,
      scrollTrigger: {
        trigger: cards[0]?.parentElement,
        start: 'top 80%',
        once: true,
      },
    }
  );
}

export function animatePricingCards(cards: HTMLElement[]) {
  return gsap.fromTo(
    cards,
    { y: 40, opacity: 0, scale: 0.95 },
    {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 0.6,
      stagger: 0.15,
      ease: EASINGS.back,
      scrollTrigger: {
        trigger: cards[0]?.parentElement,
        start: 'top 80%',
        once: true,
      },
    }
  );
}

export function animateCounter(element: HTMLElement, endValue: number, duration: number = 2) {
  const obj = { value: 0 };

  return gsap.to(obj, {
    value: endValue,
    duration,
    ease: 'power2.out',
    onUpdate: () => {
      element.textContent = Math.round(obj.value).toLocaleString();
    },
    scrollTrigger: {
      trigger: element,
      start: 'top 85%',
      once: true,
    },
  });
}

export function createParallax(element: HTMLElement, speed: number = 0.5) {
  return gsap.to(element, {
    yPercent: -30 * speed,
    ease: 'none',
    scrollTrigger: {
      trigger: element.closest('section'),
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1,
    },
  });
}

export function animateTextReveal(element: HTMLElement) {
  return gsap.from(element, {
    y: 30,
    opacity: 0,
    duration: 0.8,
    ease: EASINGS.smoothOut,
    scrollTrigger: {
      trigger: element,
      start: 'top 85%',
      once: true,
    },
  });
}

export { gsap, ScrollTrigger };
