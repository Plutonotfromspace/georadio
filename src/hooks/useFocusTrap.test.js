import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap';

describe('useFocusTrap Hook', () => {
  let container;

  beforeEach(() => {
    // Create a container div for the test
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('focuses the first focusable element when active', () => {
    container.innerHTML = `
      <button id="first">First</button>
      <button id="second">Second</button>
    `;
    
    const ref = { current: container };
    
    renderHook(() => useFocusTrap(ref, true));
    
    expect(document.activeElement).toBe(container.querySelector('#first'));
  });

  it('does not focus anything when inactive', () => {
    container.innerHTML = `
      <button id="first">First</button>
      <button id="second">Second</button>
    `;
    
    document.body.focus();
    
    const ref = { current: container };
    
    renderHook(() => useFocusTrap(ref, false));
    
    // Should not have changed focus
    expect(document.activeElement).not.toBe(container.querySelector('#first'));
  });

  it('handles empty container gracefully', () => {
    const ref = { current: container };
    
    // Should not throw
    expect(() => {
      renderHook(() => useFocusTrap(ref, true));
    }).not.toThrow();
  });

  it('handles null ref gracefully', () => {
    const ref = { current: null };
    
    expect(() => {
      renderHook(() => useFocusTrap(ref, true));
    }).not.toThrow();
  });

  describe('Tab Navigation', () => {
    it('wraps from last to first on Tab', () => {
      container.innerHTML = `
        <button id="first">First</button>
        <button id="second">Second</button>
        <button id="last">Last</button>
      `;
      
      const ref = { current: container };
      renderHook(() => useFocusTrap(ref, true));
      
      // Focus the last element
      const lastButton = container.querySelector('#last');
      lastButton.focus();
      
      // Simulate Tab key
      const event = new KeyboardEvent('keydown', { 
        key: 'Tab', 
        shiftKey: false,
        bubbles: true,
      });
      
      // Mock preventDefault
      const preventDefaultSpy = vi.fn();
      Object.defineProperty(event, 'preventDefault', {
        value: preventDefaultSpy,
        writable: true,
      });
      
      document.dispatchEvent(event);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('wraps from first to last on Shift+Tab', () => {
      container.innerHTML = `
        <button id="first">First</button>
        <button id="second">Second</button>
        <button id="last">Last</button>
      `;
      
      const ref = { current: container };
      renderHook(() => useFocusTrap(ref, true));
      
      // Focus should be on first element already
      const firstButton = container.querySelector('#first');
      expect(document.activeElement).toBe(firstButton);
      
      // Simulate Shift+Tab key
      const event = new KeyboardEvent('keydown', { 
        key: 'Tab', 
        shiftKey: true,
        bubbles: true,
      });
      
      const preventDefaultSpy = vi.fn();
      Object.defineProperty(event, 'preventDefault', {
        value: preventDefaultSpy,
        writable: true,
      });
      
      document.dispatchEvent(event);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Focusable Elements', () => {
    it('finds buttons', () => {
      container.innerHTML = `<button id="test-btn">Button</button>`;
      const ref = { current: container };
      renderHook(() => useFocusTrap(ref, true));
      
      expect(document.activeElement.tagName).toBe('BUTTON');
    });

    it('finds links', () => {
      container.innerHTML = `<a href="#" id="test-link">Link</a>`;
      const ref = { current: container };
      renderHook(() => useFocusTrap(ref, true));
      
      expect(document.activeElement.tagName).toBe('A');
    });

    it('finds inputs', () => {
      container.innerHTML = `<input type="text" id="test-input" />`;
      const ref = { current: container };
      renderHook(() => useFocusTrap(ref, true));
      
      expect(document.activeElement.tagName).toBe('INPUT');
    });

    it('finds textareas', () => {
      container.innerHTML = `<textarea id="test-textarea"></textarea>`;
      const ref = { current: container };
      renderHook(() => useFocusTrap(ref, true));
      
      expect(document.activeElement.tagName).toBe('TEXTAREA');
    });

    it('finds select elements', () => {
      container.innerHTML = `<select id="test-select"><option>Option</option></select>`;
      const ref = { current: container };
      renderHook(() => useFocusTrap(ref, true));
      
      expect(document.activeElement.tagName).toBe('SELECT');
    });

    it('finds elements with tabindex', () => {
      container.innerHTML = `<div tabindex="0" id="test-div">Focusable div</div>`;
      const ref = { current: container };
      renderHook(() => useFocusTrap(ref, true));
      
      expect(document.activeElement.tagName).toBe('DIV');
    });

    it('ignores disabled buttons', () => {
      container.innerHTML = `
        <button disabled id="disabled-btn">Disabled</button>
        <button id="enabled-btn">Enabled</button>
      `;
      const ref = { current: container };
      renderHook(() => useFocusTrap(ref, true));
      
      expect(document.activeElement.id).toBe('enabled-btn');
    });
  });
});
