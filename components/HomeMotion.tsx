"use client";

import { useEffect } from "react";

export default function HomeMotion() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const animations: Animation[] = [];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (!media.matches) animations.push(entry.target.animate(
          [{ opacity: 0.6, transform: "translateY(18px)" }, { opacity: 1, transform: "translateY(0)" }],
          { duration: 650, easing: "cubic-bezier(.2,.7,.2,1)" }
        ));
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    document.querySelectorAll("[data-home-reveal]").forEach(element => observer.observe(element));
    const stop = () => { if (media.matches) animations.forEach(animation => animation.finish()); };
    media.addEventListener("change", stop);
    return () => { observer.disconnect(); animations.forEach(animation => animation.cancel()); media.removeEventListener("change", stop); };
  }, []);
  return null;
}
