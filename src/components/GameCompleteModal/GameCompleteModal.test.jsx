import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GameCompleteModal from './GameCompleteModal';

describe('GameCompleteModal Component', () => {
  const mockRoundResults = [
    { round: 1, target: 'France', score: 1000, countryCode: 'fr' },
    { round: 2, target: 'Germany', score: 800, countryCode: 'de' },
    { round: 3, target: 'Japan', score: 1200, countryCode: 'jp' },
  ];

  const defaultProps = {
    isOpen: true,
    onPlayAgain: vi.fn(),
    totalScore: 3000,
    roundResults: mockRoundResults,
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('does not render when isOpen is false', () => {
      const { container } = render(<GameCompleteModal {...defaultProps} isOpen={false} />);
      expect(container.innerHTML).toBe('');
    });

    it('renders modal when isOpen is true', () => {
      render(<GameCompleteModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('displays the total score', () => {
      render(<GameCompleteModal {...defaultProps} totalScore={3000} />);
      expect(screen.getByText('3000')).toBeInTheDocument();
      expect(screen.getByText('points')).toBeInTheDocument();
    });
  });

  describe('Rounds Summary', () => {
    it('displays all round results', () => {
      render(<GameCompleteModal {...defaultProps} />);
      expect(screen.getByText('France')).toBeInTheDocument();
      expect(screen.getByText('Germany')).toBeInTheDocument();
      expect(screen.getByText('Japan')).toBeInTheDocument();
    });

    it('displays scores for each round', () => {
      render(<GameCompleteModal {...defaultProps} />);
      expect(screen.getByText('+1000')).toBeInTheDocument();
      expect(screen.getByText('+800')).toBeInTheDocument();
      expect(screen.getByText('+1200')).toBeInTheDocument();
    });

    it('renders flag images for each round', () => {
      render(<GameCompleteModal {...defaultProps} />);
      const flags = screen.getAllByRole('img');
      expect(flags).toHaveLength(3);
    });
  });

  describe('Play Again Button', () => {
    it('renders the Play Again button', () => {
      render(<GameCompleteModal {...defaultProps} />);
      expect(screen.getByText('Play Again')).toBeInTheDocument();
    });

    it('calls onPlayAgain when clicked', () => {
      const onPlayAgain = vi.fn();
      render(<GameCompleteModal {...defaultProps} onPlayAgain={onPlayAgain} />);
      fireEvent.click(screen.getByText('Play Again'));
      expect(onPlayAgain).toHaveBeenCalledTimes(1);
    });
  });

  describe('Modal Behavior', () => {
    it('can be dismissed by Escape key', () => {
      const onPlayAgain = vi.fn();
      render(<GameCompleteModal {...defaultProps} onPlayAgain={onPlayAgain} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onPlayAgain).toHaveBeenCalledTimes(1);
    });
  });

  describe('Closing Animation', () => {
    it('applies closing class when isClosing is true', () => {
      render(<GameCompleteModal {...defaultProps} isClosing={true} />);
      expect(screen.getByRole('dialog')).toHaveClass('base-modal--closing');
    });
  });
});
