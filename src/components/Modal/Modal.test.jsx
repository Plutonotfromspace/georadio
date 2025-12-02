import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from './Modal';

describe('Modal Component', () => {
  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(
        <Modal isOpen={false} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      
      expect(container.innerHTML).toBe('');
    });

    it('renders modal content when isOpen is true', () => {
      render(
        <Modal isOpen={true} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('renders sr-only title by default', () => {
      render(
        <Modal isOpen={true} title="Test Modal">
          <p>Content</p>
        </Modal>
      );
      
      const title = screen.getByRole('heading', { level: 2 });
      expect(title).toHaveClass('sr-only');
      expect(title.textContent).toBe('Test Modal');
    });

    it('renders visible title when showTitle is true', () => {
      render(
        <Modal isOpen={true} title="Test Modal" showTitle={true}>
          <p>Content</p>
        </Modal>
      );
      
      const title = screen.getByRole('heading', { level: 2 });
      expect(title).toHaveClass('base-modal__title');
      expect(title).not.toHaveClass('sr-only');
    });

    it('applies custom className to modal', () => {
      render(
        <Modal isOpen={true} title="Test Modal" className="custom-modal">
          <p>Content</p>
        </Modal>
      );
      
      expect(screen.getByRole('dialog')).toHaveClass('custom-modal');
    });
  });

  describe('Accessibility', () => {
    it('has role="dialog"', () => {
      render(
        <Modal isOpen={true} title="Test Modal">
          <p>Content</p>
        </Modal>
      );
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal="true"', () => {
      render(
        <Modal isOpen={true} title="Test Modal">
          <p>Content</p>
        </Modal>
      );
      
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to title', () => {
      render(
        <Modal isOpen={true} title="My Test Modal">
          <p>Content</p>
        </Modal>
      );
      
      const dialog = screen.getByRole('dialog');
      expect(dialog.getAttribute('aria-labelledby')).toBe('modal-title-my-test-modal');
    });

    it('uses custom titleId when provided', () => {
      render(
        <Modal isOpen={true} title="Test" titleId="custom-id">
          <p>Content</p>
        </Modal>
      );
      
      expect(screen.getByRole('dialog').getAttribute('aria-labelledby')).toBe('custom-id');
    });
  });

  describe('Escape Key Handling', () => {
    it('calls onClose when Escape is pressed', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} title="Test" onClose={onClose}>
          <p>Content</p>
        </Modal>
      );
      
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when closeOnEscape is false', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} title="Test" onClose={onClose} closeOnEscape={false}>
          <p>Content</p>
        </Modal>
      );
      
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Backdrop Click Handling', () => {
    it('calls onClose when clicking backdrop with closeOnBackdropClick', () => {
      const onClose = vi.fn();
      const { container } = render(
        <Modal isOpen={true} title="Test" onClose={onClose} closeOnBackdropClick={true}>
          <p>Content</p>
        </Modal>
      );
      
      const overlay = container.querySelector('.base-modal-overlay');
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when clicking modal content', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} title="Test" onClose={onClose} closeOnBackdropClick={true}>
          <p>Content</p>
        </Modal>
      );
      
      fireEvent.click(screen.getByRole('dialog'));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Closing Animation', () => {
    it('applies closing classes when isClosing is true', () => {
      const { container } = render(
        <Modal isOpen={true} isClosing={true} title="Test">
          <p>Content</p>
        </Modal>
      );
      
      expect(screen.getByRole('dialog')).toHaveClass('base-modal--closing');
      expect(container.querySelector('.base-modal-overlay')).toHaveClass('base-modal-overlay--closing');
    });
  });
});
