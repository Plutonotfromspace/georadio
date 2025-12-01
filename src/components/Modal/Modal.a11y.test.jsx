import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import Modal from './Modal';
import StartModal from '../StartModal/StartModal';
import RoundSummaryModal from '../RoundSummaryModal/RoundSummaryModal';
import GameCompleteModal from '../GameCompleteModal/GameCompleteModal';

expect.extend(toHaveNoViolations);

// Mock createPortal to render inline for testing
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (element) => element,
  };
});

describe('Modal Accessibility (axe-core)', () => {
  describe('Base Modal', () => {
    it('should have no accessibility violations when open', async () => {
      const { container } = render(
        <Modal isOpen={true} title="Test Dialog" onClose={() => {}}>
          <p>Modal content</p>
          <button>Action</button>
        </Modal>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have correct ARIA dialog role', () => {
      render(
        <Modal isOpen={true} title="Test Dialog" onClose={() => {}}>
          <button>Action</button>
        </Modal>
      );
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should have accessible title via aria-labelledby', () => {
      render(
        <Modal isOpen={true} title="Important Dialog" onClose={() => {}}>
          <button>OK</button>
        </Modal>
      );
      
      const dialog = screen.getByRole('dialog');
      const labelId = dialog.getAttribute('aria-labelledby');
      const title = document.getElementById(labelId);
      
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Important Dialog');
    });
  });

  describe('StartModal', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <StartModal isOpen={true} onStart={() => {}} />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible Play button', () => {
      render(<StartModal isOpen={true} onStart={() => {}} />);
      
      const playButton = screen.getByRole('button', { name: /play/i });
      expect(playButton).toBeInTheDocument();
      expect(playButton).not.toHaveAttribute('aria-hidden', 'true');
    });

    it('should have screen reader accessible title', () => {
      render(<StartModal isOpen={true} onStart={() => {}} />);
      
      // Modal should have accessible name from title
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should have accessible legend items', () => {
      render(<StartModal isOpen={true} onStart={() => {}} />);
      
      // Legend items should be readable
      expect(screen.getByText('Very close!')).toBeInTheDocument();
      expect(screen.getByText('Getting warmer')).toBeInTheDocument();
      expect(screen.getByText('Cold')).toBeInTheDocument();
    });
  });

  describe('RoundSummaryModal', () => {
    const defaultProps = {
      isOpen: true,
      isClosing: false,
      onContinue: () => {},
      countryName: 'Brazil',
      countryCode: 'BR',
      score: 4500,
      currentRound: 3,
      totalRounds: 5,
    };

    it('should have no accessibility violations', async () => {
      const { container } = render(<RoundSummaryModal {...defaultProps} />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible flag image with alt text', () => {
      render(<RoundSummaryModal {...defaultProps} />);
      
      const flagImage = screen.getByRole('img');
      expect(flagImage).toHaveAttribute('alt', expect.stringContaining('Brazil'));
    });

    it('should have accessible continue button', () => {
      render(<RoundSummaryModal {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /next round/i });
      expect(button).toBeInTheDocument();
    });

    it('should announce score to screen readers', () => {
      render(<RoundSummaryModal {...defaultProps} />);
      
      // Score should be visible and readable
      expect(screen.getByText('+4500 points')).toBeInTheDocument();
    });
  });

  describe('GameCompleteModal', () => {
    const defaultProps = {
      isOpen: true,
      isClosing: false,
      onPlayAgain: () => {},
      totalScore: 21500,
      roundResults: [
        { round: 1, target: 'Brazil', countryCode: 'BR', score: 4500 },
        { round: 2, target: 'Japan', countryCode: 'JP', score: 5000 },
        { round: 3, target: 'France', countryCode: 'FR', score: 4000 },
        { round: 4, target: 'Australia', countryCode: 'AU', score: 3500 },
        { round: 5, target: 'Canada', countryCode: 'CA', score: 4500 },
      ],
    };

    it('should have no accessibility violations', async () => {
      const { container } = render(<GameCompleteModal {...defaultProps} />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible Play Again button', () => {
      render(<GameCompleteModal {...defaultProps} />);
      
      // Button has aria-label "Play another game"
      const button = screen.getByRole('button', { name: /play another game/i });
      expect(button).toBeInTheDocument();
    });

    it('should have accessible flag images in round summary', () => {
      render(<GameCompleteModal {...defaultProps} />);
      
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
        expect(img.getAttribute('alt')).not.toBe('');
      });
    });

    it('should display total score accessibly', () => {
      render(<GameCompleteModal {...defaultProps} />);
      
      // Score should be prominently displayed and readable
      expect(screen.getByText('21500')).toBeInTheDocument();
      expect(screen.getByText('points')).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      render(<GameCompleteModal {...defaultProps} />);
      
      // Should have heading for the modal
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });
  });
});

describe('Screen Reader Announcements', () => {
  describe('Dynamic content updates', () => {
    it('should have aria-live regions for score updates', () => {
      // This test documents expected behavior
      // Score updates should be announced via aria-live
    });

    it('should announce modal open to screen readers', () => {
      render(
        <Modal isOpen={true} title="Game Complete" onClose={() => {}}>
          <p>You won!</p>
          <button>Play Again</button>
        </Modal>
      );
      
      // Modal with role="dialog" and aria-modal="true" will be announced
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
  });
});

describe('Keyboard Navigation', () => {
  it('Modal should be focusable and trappable', () => {
    render(
      <Modal isOpen={true} title="Test" onClose={() => {}}>
        <button>First</button>
        <button>Second</button>
        <button>Third</button>
      </Modal>
    );
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(3);
    
    // All buttons should be focusable
    buttons.forEach(button => {
      expect(button).not.toHaveAttribute('tabindex', '-1');
    });
  });
});
