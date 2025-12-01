import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import './Modal.css';

/**
 * Base Modal Component with built-in accessibility features
 * 
 * Features:
 * - ARIA dialog semantics (role="dialog", aria-modal, aria-labelledby)
 * - Focus trap (Tab/Shift+Tab cycles within modal)
 * - Escape key dismissal (optional)
 * - Backdrop click dismissal (optional)
 * - Focus management (saves/restores focus)
 * - Reduced motion support
 * - Screen reader announcements
 * 
 * @param {Object} props - Component props
 */
function Modal({
  isOpen,
  isClosing = false,
  onClose,
  title,
  titleId,
  children,
  closeOnEscape = true,
  closeOnBackdropClick = false,
  size = 'md',
  className = '',
  showTitle = false,
  ...props
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Generate a unique ID for aria-labelledby if not provided
  const labelId = titleId || `modal-title-${title?.toLowerCase().replace(/\s+/g, '-') || 'dialog'}`;

  // Focus trap
  useFocusTrap(modalRef, isOpen);

  // Save focus on open, restore on close
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  const modalContent = (
    <div
      className={`base-modal-overlay ${isClosing ? 'base-modal-overlay--closing' : ''}`}
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        className={`base-modal base-modal--${size} ${isClosing ? 'base-modal--closing' : ''} ${className}`}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {/* Screen reader title - always present for accessibility */}
        <h2 
          id={labelId} 
          className={showTitle ? 'base-modal__title' : 'sr-only'}
        >
          {title}
        </h2>
        
        {children}
      </div>
    </div>
  );

  // Render into portal for proper stacking context
  return createPortal(modalContent, document.body);
}

Modal.propTypes = {
  /** Whether the modal is open */
  isOpen: PropTypes.bool.isRequired,
  /** Whether the modal is in closing animation state */
  isClosing: PropTypes.bool,
  /** Callback when modal should close */
  onClose: PropTypes.func,
  /** Title for accessibility (aria-labelledby) */
  title: PropTypes.string.isRequired,
  /** Custom ID for the title element */
  titleId: PropTypes.string,
  /** Modal content */
  children: PropTypes.node.isRequired,
  /** Whether Escape key closes the modal */
  closeOnEscape: PropTypes.bool,
  /** Whether clicking backdrop closes the modal */
  closeOnBackdropClick: PropTypes.bool,
  /** Modal size variant */
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  /** Additional CSS class names */
  className: PropTypes.string,
  /** Whether to visually show the title */
  showTitle: PropTypes.bool,
};

export default Modal;
