import PropTypes from 'prop-types';
import { Modal } from '../Modal';
import './GameCompleteModal.css';

/**
 * Game Complete Modal - Shows final results and play again option
 * 
 * Displays:
 * - Final score
 * - Summary of all rounds with flags
 * - Play again button
 */
function GameCompleteModal({ 
  isOpen, 
  isClosing,
  onPlayAgain, 
  totalScore, 
  roundResults,
  getCountryCode,
  onFlagError,
}) {
  return (
    <Modal
      isOpen={isOpen}
      isClosing={isClosing}
      onClose={onPlayAgain}
      title={`Game Complete - Final Score: ${totalScore} points`}
      closeOnEscape={true}
      closeOnBackdropClick={false}
      size="sm"
      className="game-complete-modal"
    >
      {/* Final Score Hero */}
      <div className="game-complete-modal__hero">
        <div className="game-complete-modal__score">{totalScore}</div>
        <div className="game-complete-modal__label">points</div>
      </div>
      
      {/* Rounds Summary */}
      <div className="game-complete-modal__summary">
        <div className="game-complete-modal__rounds">
          {roundResults.map((result) => (
            <div key={result.round} className="game-complete-modal__round">
              <div className="game-complete-modal__round-left">
                <img 
                  src={`https://flagcdn.com/w80/${getCountryCode(result.target)}.png`}
                  alt={`Flag of ${result.target}`}
                  onError={onFlagError}
                  className="game-complete-modal__round-flag"
                />
                <span className="game-complete-modal__round-country">
                  {result.target}
                </span>
              </div>
              <div className="game-complete-modal__round-score">
                +{result.score}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Play Again Button */}
      <button 
        className="game-complete-modal__button"
        onClick={onPlayAgain}
        aria-label="Play another game"
      >
        Play Again
      </button>
    </Modal>
  );
}

GameCompleteModal.propTypes = {
  /** Whether the modal is open */
  isOpen: PropTypes.bool.isRequired,
  /** Whether the modal is in closing animation state */
  isClosing: PropTypes.bool,
  /** Callback when user clicks play again */
  onPlayAgain: PropTypes.func.isRequired,
  /** Total score across all rounds */
  totalScore: PropTypes.number.isRequired,
  /** Array of round results */
  roundResults: PropTypes.arrayOf(PropTypes.shape({
    round: PropTypes.number.isRequired,
    target: PropTypes.string.isRequired,
    score: PropTypes.number.isRequired,
  })).isRequired,
  /** Function to get country code from country name */
  getCountryCode: PropTypes.func.isRequired,
  /** Callback when flag image fails to load */
  onFlagError: PropTypes.func,
};

GameCompleteModal.defaultProps = {
  isClosing: false,
  onFlagError: (e) => {
    e.target.src = 'https://flagcdn.com/w80/un.png';
  },
};

export default GameCompleteModal;
