import { useEffect, useCallback } from 'react';

/**
 * Custom hook that traps focus within a container element
 * Essential for modal accessibility (WCAG 2.4.3)
 * 
 * @param {React.RefObject} containerRef - Ref to the container element
 * @param {boolean} isActive - Whether the focus trap is active
 */
export function useFocusTrap(containerRef, isActive) {
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    
    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');
    
    return Array.from(containerRef.current.querySelectorAll(focusableSelectors));
  }, [containerRef]);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];

    // Focus first element on mount
    firstElement?.focus();

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      // Get fresh list of focusable elements (in case DOM changed)
      const currentFocusableElements = getFocusableElements();
      if (currentFocusableElements.length === 0) return;

      const currentFirst = currentFocusableElements[0];
      const currentLast = currentFocusableElements[currentFocusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === currentFirst) {
          e.preventDefault();
          currentLast?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === currentLast) {
          e.preventDefault();
          currentFirst?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [containerRef, isActive, getFocusableElements]);
}

export default useFocusTrap;
