import PropTypes from 'prop-types';
import { Modal } from '../Modal';
import './RoundSummaryModal.css';

/**
 * Round Summary Modal - Shows results after a correct guess
 * 
 * Displays:
 * - Country flag
 * - Country name
 * - Points earned
 * - Continue button
 */
function RoundSummaryModal({ 
  isOpen, 
  isClosing,
  onContinue, 
  countryName, 
  countryCode,
  score, 
  currentRound,
  totalRounds,
  onFlagError,
}) {
  const isLastRound = currentRound >= totalRounds;
  const flagUrl = `https://flagcdn.com/w640/${countryCode}.png`;

  return (
    <Modal
      isOpen={isOpen}
      isClosing={isClosing}
      onClose={onContinue}
      title={`Round ${currentRound} Complete - ${countryName}`}
      closeOnEscape={true}
      closeOnBackdropClick={false}
      size="sm"
      className="round-summary-modal"
    >
      {/* Country Reveal */}
      <div className="round-summary-modal__reveal">
        <div className="round-summary-modal__flag-wrapper">
          <img 
            src={flagUrl}
            alt={`Flag of ${countryName}`}
            onError={onFlagError}
            className="round-summary-modal__flag"
          />
        </div>
        <h2 className="round-summary-modal__country">{countryName}</h2>
        <div className="round-summary-modal__score">
          +{score} points
        </div>
      </div>
      
      {/* Continue Button */}
      <button 
        className="round-summary-modal__button"
        onClick={onContinue}
        aria-label={isLastRound ? 'See final results' : 'Continue to next round'}
      >
        {isLastRound ? 'See Results' : 'Next Round'}
      </button>
    </Modal>
  );
}

RoundSummaryModal.propTypes = {
  /** Whether the modal is open */
  isOpen: PropTypes.bool.isRequired,
  /** Whether the modal is in closing animation state */
  isClosing: PropTypes.bool,
  /** Callback when user clicks continue */
  onContinue: PropTypes.func.isRequired,
  /** Name of the country */
  countryName: PropTypes.string.isRequired,
  /** ISO country code for flag */
  countryCode: PropTypes.string.isRequired,
  /** Points earned this round */
  score: PropTypes.number.isRequired,
  /** Current round number */
  currentRound: PropTypes.number.isRequired,
  /** Total number of rounds */
  totalRounds: PropTypes.number,
  /** Callback when flag image fails to load */
  onFlagError: PropTypes.func,
};

RoundSummaryModal.defaultProps = {
  isClosing: false,
  totalRounds: 5,
  onFlagError: (e) => {
    e.target.src = 'https://flagcdn.com/w640/un.png';
  },
};

export default RoundSummaryModal;
