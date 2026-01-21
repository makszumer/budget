/**
 * useScrollDirection Hook
 * Detects scroll direction and provides visibility state for UI elements
 * that should hide on scroll down and show on scroll up
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export function useScrollDirection(threshold = 10) {
  const [isVisible, setIsVisible] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const updateScrollDirection = useCallback(() => {
    const currentScrollY = window.scrollY;
    
    // Always show when at the top of the page
    if (currentScrollY <= 10) {
      setIsVisible(true);
      lastScrollY.current = currentScrollY;
      ticking.current = false;
      return;
    }

    const scrollDiff = currentScrollY - lastScrollY.current;

    // Only trigger if scroll exceeds threshold (prevents flickering)
    if (Math.abs(scrollDiff) >= threshold) {
      if (scrollDiff > 0) {
        // Scrolling down - hide
        setIsVisible(false);
      } else {
        // Scrolling up - show
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    }

    setScrollY(currentScrollY);
    ticking.current = false;
  }, [threshold]);

  const handleScroll = useCallback(() => {
    if (!ticking.current) {
      window.requestAnimationFrame(updateScrollDirection);
      ticking.current = true;
    }
  }, [updateScrollDirection]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  return { isVisible, scrollY, isAtTop: scrollY <= 10 };
}

export default useScrollDirection;
