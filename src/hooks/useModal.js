import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for managing modal state
 * Handles open/close, animation states, and focus management
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.initialOpen - Initial open state (default: false)
 * @param {Function} options.onOpen - Callback when modal opens
 * @param {Function} options.onClose - Callback when modal closes
 * @param {number} options.closeDelay - Delay before closing for animations (default: 0)
 * @returns {Object} Modal state and controls
 */
export function useModal(options = {}) {
  const {
    initialOpen = false,
    onOpen,
    onClose,
    closeDelay = 0,
  } = options;

  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isClosing, setIsClosing] = useState(false);
  const previousActiveElement = useRef(null);

  const open = useCallback(() => {
    // Store the currently focused element to return focus later
    previousActiveElement.current = document.activeElement;
    setIsOpen(true);
    setIsClosing(false);
    onOpen?.();
  }, [onOpen]);

  const close = useCallback(() => {
    if (closeDelay > 0) {
      setIsClosing(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
        // Return focus to previously focused element
        previousActiveElement.current?.focus();
        onClose?.();
      }, closeDelay);
    } else {
      setIsOpen(false);
      setIsClosing(false);
      previousActiveElement.current?.focus();
      onClose?.();
    }
  }, [closeDelay, onClose]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  return {
    isOpen,
    isClosing,
    open,
    close,
    toggle,
    // Expose for controlled components
    setIsOpen,
    setIsClosing,
  };
}

export default useModal;
