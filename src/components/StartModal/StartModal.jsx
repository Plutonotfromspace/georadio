import PropTypes from 'prop-types';
import { Modal } from '../Modal';
import './StartModal.css';

/**
 * Start Modal - Game introduction and onboarding
 * 
 * Displays:
 * - Game title and icon
 * - Instructions
 * - Color legend for feedback
 * - Play button
 * - Credits
 */
function StartModal({ isOpen, onStart }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={null} // Start modal cannot be dismissed
      title="GeoRadio - Welcome"
      closeOnEscape={false}
      closeOnBackdropClick={false}
      size="sm"
      className="start-modal"
    >
      {/* Header */}
      <div className="start-modal__header">
        <span className="start-modal__icon" aria-hidden="true">🌍</span>
        <h1 className="start-modal__title">GeoRadio</h1>
      </div>

      {/* Instructions */}
      <p className="start-modal__text">
        Listen to a radio station and guess which country it&apos;s from.
      </p>
      
      {/* Color Legend */}
      <div className="start-modal__legend" aria-label="Color legend for guesses">
        <div className="start-modal__legend-item">
          <div 
            className="start-modal__legend-color" 
            style={{ backgroundColor: '#b83700' }}
            aria-hidden="true"
          />
          <span>Very close!</span>
        </div>
        <div className="start-modal__legend-item">
          <div 
            className="start-modal__legend-color" 
            style={{ backgroundColor: '#fe7835' }}
            aria-hidden="true"
          />
          <span>Getting warmer</span>
        </div>
        <div className="start-modal__legend-item">
          <div 
            className="start-modal__legend-color" 
            style={{ backgroundColor: '#fef2dc', border: '1px solid #e2e8f0' }}
            aria-hidden="true"
          />
          <span>Cold</span>
        </div>
      </div>

      {/* CTA Button */}
      <button 
        className="start-modal__button"
        onClick={onStart}
        aria-label="Start playing GeoRadio"
      >
        Play
      </button>

      {/* Credits */}
      <div className="start-modal__credits">
        <span>
          Inspired by{' '}
          <a 
            href="https://globle-game.com/" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            Globle
          </a>
        </span>
      </div>
    </Modal>
  );
}

StartModal.propTypes = {
  /** Whether the modal is open */
  isOpen: PropTypes.bool.isRequired,
  /** Callback when user clicks Play */
  onStart: PropTypes.func.isRequired,
};

export default StartModal;
