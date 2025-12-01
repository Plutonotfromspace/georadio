import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RoundSummaryModal from './RoundSummaryModal';

describe('RoundSummaryModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onContinue: vi.fn(),
    countryName: 'France',
    countryCode: 'fr',
    score: 1000,
    currentRound: 3,
    totalRounds: 5,
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('does not render when isOpen is false', () => {
      const { container } = render(<RoundSummaryModal {...defaultProps} isOpen={false} />);
      expect(container.innerHTML).toBe('');
    });

    it('renders modal when isOpen is true', () => {
      render(<RoundSummaryModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('displays the country name', () => {
      render(<RoundSummaryModal {...defaultProps} />);
      expect(screen.getByText('France')).toBeInTheDocument();
    });

    it('displays the score', () => {
      render(<RoundSummaryModal {...defaultProps} score={1500} />);
      expect(screen.getByText('+1500 points')).toBeInTheDocument();
    });
  });

  describe('Continue Button', () => {
    it('shows "Next Round" for non-final rounds', () => {
      render(<RoundSummaryModal {...defaultProps} currentRound={3} totalRounds={5} />);
      expect(screen.getByText('Next Round')).toBeInTheDocument();
    });

    it('shows "See Results" for final round', () => {
      render(<RoundSummaryModal {...defaultProps} currentRound={5} totalRounds={5} />);
      expect(screen.getByText('See Results')).toBeInTheDocument();
    });

    it('calls onContinue when clicked', () => {
      const onContinue = vi.fn();
      render(<RoundSummaryModal {...defaultProps} onContinue={onContinue} />);
      fireEvent.click(screen.getByText('Next Round'));
      expect(onContinue).toHaveBeenCalledTimes(1);
    });
  });

  describe('Modal Behavior', () => {
    it('can be dismissed by Escape key', () => {
      const onContinue = vi.fn();
      render(<RoundSummaryModal {...defaultProps} onContinue={onContinue} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onContinue).toHaveBeenCalledTimes(1);
    });
  });

  describe('Closing Animation', () => {
    it('applies closing class when isClosing is true', () => {
      render(<RoundSummaryModal {...defaultProps} isClosing={true} />);
      expect(screen.getByRole('dialog')).toHaveClass('base-modal--closing');
    });
  });
});
