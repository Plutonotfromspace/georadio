import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModal } from './useModal';

describe('useModal Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('starts closed by default', () => {
      const { result } = renderHook(() => useModal());
      
      expect(result.current.isOpen).toBe(false);
      expect(result.current.isClosing).toBe(false);
    });

    it('can start open with initialOpen option', () => {
      const { result } = renderHook(() => useModal({ initialOpen: true }));
      
      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('open()', () => {
    it('sets isOpen to true', () => {
      const { result } = renderHook(() => useModal());
      
      act(() => {
        result.current.open();
      });
      
      expect(result.current.isOpen).toBe(true);
    });

    it('sets isClosing to false', () => {
      const { result } = renderHook(() => useModal());
      
      act(() => {
        result.current.open();
      });
      
      expect(result.current.isClosing).toBe(false);
    });

    it('calls onOpen callback', () => {
      const onOpen = vi.fn();
      const { result } = renderHook(() => useModal({ onOpen }));
      
      act(() => {
        result.current.open();
      });
      
      expect(onOpen).toHaveBeenCalledTimes(1);
    });
  });

  describe('close()', () => {
    it('sets isOpen to false immediately without closeDelay', () => {
      const { result } = renderHook(() => useModal({ initialOpen: true }));
      
      act(() => {
        result.current.close();
      });
      
      expect(result.current.isOpen).toBe(false);
    });

    it('calls onClose callback', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() => useModal({ initialOpen: true, onClose }));
      
      act(() => {
        result.current.close();
      });
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('sets isClosing during animation when closeDelay is provided', () => {
      const { result } = renderHook(() => useModal({ 
        initialOpen: true, 
        closeDelay: 300 
      }));
      
      act(() => {
        result.current.close();
      });
      
      // Should be in closing state
      expect(result.current.isClosing).toBe(true);
      expect(result.current.isOpen).toBe(true);
      
      // After delay, should be fully closed
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      expect(result.current.isClosing).toBe(false);
      expect(result.current.isOpen).toBe(false);
    });

    it('calls onClose after delay when closeDelay is provided', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() => useModal({ 
        initialOpen: true, 
        closeDelay: 300,
        onClose 
      }));
      
      act(() => {
        result.current.close();
      });
      
      // onClose should not be called yet
      expect(onClose).not.toHaveBeenCalled();
      
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('toggle()', () => {
    it('opens closed modal', () => {
      const { result } = renderHook(() => useModal());
      
      act(() => {
        result.current.toggle();
      });
      
      expect(result.current.isOpen).toBe(true);
    });

    it('closes open modal', () => {
      const { result } = renderHook(() => useModal({ initialOpen: true }));
      
      act(() => {
        result.current.toggle();
      });
      
      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('setIsOpen / setIsClosing', () => {
    it('exposes setIsOpen for controlled components', () => {
      const { result } = renderHook(() => useModal());
      
      expect(typeof result.current.setIsOpen).toBe('function');
      
      act(() => {
        result.current.setIsOpen(true);
      });
      
      expect(result.current.isOpen).toBe(true);
    });

    it('exposes setIsClosing for controlled components', () => {
      const { result } = renderHook(() => useModal());
      
      expect(typeof result.current.setIsClosing).toBe('function');
      
      act(() => {
        result.current.setIsClosing(true);
      });
      
      expect(result.current.isClosing).toBe(true);
    });
  });

  describe('Focus Management', () => {
    it('stores active element on open', () => {
      // Create a button to focus
      const button = document.createElement('button');
      button.textContent = 'Focus me';
      document.body.appendChild(button);
      button.focus();
      
      const { result } = renderHook(() => useModal());
      
      act(() => {
        result.current.open();
      });
      
      // We can't directly check the internal ref, but we can test the restore behavior
      act(() => {
        result.current.close();
      });
      
      // The original button should get focus back
      expect(document.activeElement).toBe(button);
      
      // Cleanup
      document.body.removeChild(button);
    });
  });

  describe('Return Value', () => {
    it('returns all expected properties', () => {
      const { result } = renderHook(() => useModal());
      
      expect(result.current).toHaveProperty('isOpen');
      expect(result.current).toHaveProperty('isClosing');
      expect(result.current).toHaveProperty('open');
      expect(result.current).toHaveProperty('close');
      expect(result.current).toHaveProperty('toggle');
      expect(result.current).toHaveProperty('setIsOpen');
      expect(result.current).toHaveProperty('setIsClosing');
    });
  });
});
