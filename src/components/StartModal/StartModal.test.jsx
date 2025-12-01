import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StartModal from './StartModal';

describe('StartModal Component', () => {
  describe('Rendering', () => {
    it('does not render when isOpen is false', () => {
      const { container } = render(<StartModal isOpen={false} onStart={vi.fn()} />);
      expect(container.innerHTML).toBe('');
    });

    it('renders modal when isOpen is true', () => {
      render(<StartModal isOpen={true} onStart={vi.fn()} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('displays the GeoRadio title', () => {
      render(<StartModal isOpen={true} onStart={vi.fn()} />);
      expect(screen.getByText('GeoRadio')).toBeInTheDocument();
    });

    it('displays the game icon', () => {
      render(<StartModal isOpen={true} onStart={vi.fn()} />);
      expect(screen.getByText('🌍')).toBeInTheDocument();
    });

    it('displays instructions text', () => {
      render(<StartModal isOpen={true} onStart={vi.fn()} />);
      expect(screen.getByText(/Listen to a radio station/)).toBeInTheDocument();
    });
  });

  describe('Color Legend', () => {
    it('displays all three color legend items', () => {
      render(<StartModal isOpen={true} onStart={vi.fn()} />);
      expect(screen.getByText('Very close!')).toBeInTheDocument();
      expect(screen.getByText('Getting warmer')).toBeInTheDocument();
      expect(screen.getByText('Cold')).toBeInTheDocument();
    });
  });

  describe('Play Button', () => {
    it('renders the Play button', () => {
      render(<StartModal isOpen={true} onStart={vi.fn()} />);
      expect(screen.getByText('Play')).toBeInTheDocument();
    });

    it('calls onStart when Play button is clicked', () => {
      const onStart = vi.fn();
      render(<StartModal isOpen={true} onStart={onStart} />);
      fireEvent.click(screen.getByText('Play'));
      expect(onStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('Credits', () => {
    it('displays credits section with Globle link', () => {
      render(<StartModal isOpen={true} onStart={vi.fn()} />);
      const globleLink = screen.getByRole('link', { name: 'Globle' });
      expect(globleLink).toHaveAttribute('href', 'https://globle-game.com/');
    });
  });

  describe('Modal Behavior', () => {
    it('cannot be dismissed by Escape key (closeOnEscape is false)', () => {
      render(<StartModal isOpen={true} onStart={vi.fn()} />);
      // The modal uses closeOnEscape={false}, so Escape should do nothing
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
