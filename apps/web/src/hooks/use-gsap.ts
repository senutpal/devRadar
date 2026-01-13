'use client';

import { useEffect, useRef, useCallback } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap-config';

export function useGsapAnimation<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, []);

  const animate = useCallback(
    (animation: gsap.TweenVars, options?: { from?: gsap.TweenVars; timeline?: boolean }) => {
      if (!ref.current) return null;

      if (options?.from) {
        return gsap.fromTo(ref.current, options.from, animation);
      }

      return gsap.to(ref.current, animation);
    },
    []
  );

  const createTimeline = useCallback((defaults?: gsap.TimelineVars) => {
    if (timelineRef.current) {
      timelineRef.current.kill();
    }
    timelineRef.current = gsap.timeline(defaults);
    return timelineRef.current;
  }, []);

  return { ref, animate, createTimeline, timeline: timelineRef };
}

export function useScrollTrigger<T extends HTMLElement = HTMLDivElement>(
  animation: gsap.TweenVars,
  options?: {
    from?: gsap.TweenVars;
    trigger?: ScrollTrigger.Vars;
  }
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!ref.current) return;

    const ctx = gsap.context(() => {
      const fromVars = options?.from || { y: 50, opacity: 0 };

      gsap.fromTo(ref.current, fromVars, {
        ...animation,
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 85%',
          once: true,
          ...options?.trigger,
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [animation, options]);

  return ref;
}

export function useStaggerAnimation<T extends HTMLElement = HTMLDivElement>(
  selector: string,
  animation: gsap.TweenVars,
  options?: {
    from?: gsap.TweenVars;
    stagger?: number | gsap.StaggerVars;
    scrollTrigger?: boolean;
  }
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!ref.current) return;

    const elements = ref.current.querySelectorAll(selector);
    if (elements.length === 0) return;

    const ctx = gsap.context(() => {
      const fromVars = options?.from || { y: 40, opacity: 0 };
      const stagger = options?.stagger ?? 0.1;

      const tweenVars: gsap.TweenVars = {
        ...animation,
        stagger,
      };

      if (options?.scrollTrigger !== false) {
        tweenVars.scrollTrigger = {
          trigger: ref.current,
          start: 'top 85%',
          once: true,
        };
      }

      gsap.fromTo(elements, fromVars, tweenVars);
    }, ref);

    return () => ctx.revert();
  }, [selector, animation, options]);

  return ref;
}

export function useParallax<T extends HTMLElement = HTMLDivElement>(speed: number = 0.5) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!ref.current) return;

    const ctx = gsap.context(() => {
      gsap.to(ref.current, {
        yPercent: -30 * speed,
        ease: 'none',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [speed]);

  return ref;
}

export function useHoverAnimation<T extends HTMLElement = HTMLDivElement>(
  enterAnimation: gsap.TweenVars,
  leaveAnimation?: gsap.TweenVars
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;

    const handleEnter = () => {
      gsap.to(element, {
        duration: 0.3,
        ease: 'power2.out',
        ...enterAnimation,
      });
    };

    const handleLeave = () => {
      gsap.to(element, {
        duration: 0.3,
        ease: 'power2.out',
        ...(leaveAnimation || {
          scale: 1,
          y: 0,
          x: 0,
        }),
      });
    };

    element.addEventListener('mouseenter', handleEnter);
    element.addEventListener('mouseleave', handleLeave);

    return () => {
      element.removeEventListener('mouseenter', handleEnter);
      element.removeEventListener('mouseleave', handleLeave);
    };
  }, [enterAnimation, leaveAnimation]);

  return ref;
}

export function useCounterAnimation(
  endValue: number,
  options?: {
    duration?: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
  }
) {
  const ref = useRef<HTMLElement>(null);
  const valueRef = useRef({ value: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;
    const { duration = 2, prefix = '', suffix = '', decimals = 0 } = options || {};

    const ctx = gsap.context(() => {
      gsap.to(valueRef.current, {
        value: endValue,
        duration,
        ease: 'power2.out',
        onUpdate: () => {
          const formatted =
            decimals > 0
              ? valueRef.current.value.toFixed(decimals)
              : Math.round(valueRef.current.value).toLocaleString();
          element.textContent = `${prefix}${formatted}${suffix}`;
        },
        scrollTrigger: {
          trigger: element,
          start: 'top 85%',
          once: true,
        },
      });
    });

    return () => ctx.revert();
  }, [endValue, options]);

  return ref;
}
