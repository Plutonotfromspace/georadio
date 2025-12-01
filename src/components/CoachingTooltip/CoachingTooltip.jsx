import PropTypes from 'prop-types';
import './CoachingTooltip.css';

/**
 * CoachingTooltip - Floating contextual tooltip for first-guess onboarding
 * 
 * Appears on the globe near the clicked country to teach the hot/cold mechanic.
 * Follows Norman's spatial mapping principle - feedback appears where action occurred.
 * 
 * Design principles:
 * - Dieter Rams #10: Minimal, disappears quickly
 * - Don Norman: Spatial feedback at point of interaction
 * - Nielsen #1: Visibility of system status
 */
function CoachingTooltip({ visible, text, type, x, y }) {
  if (!visible) return null;

  return (
    <div 
      className={`coaching-tooltip coaching-tooltip--${type}`}
      style={{ 
        left: x, 
        top: y,
      }}
      role="status"
      aria-live="polite"
    >
      <span className="coaching-tooltip__text">{text}</span>
      <div className="coaching-tooltip__pointer" aria-hidden="true" />
    </div>
  );
}

CoachingTooltip.propTypes = {
  /** Whether the tooltip is visible */
  visible: PropTypes.bool.isRequired,
  /** The coaching message to display */
  text: PropTypes.string.isRequired,
  /** Temperature type: 'hot', 'warm', 'cool', 'cold' */
  type: PropTypes.oneOf(['hot', 'warm', 'cool', 'cold']).isRequired,
  /** X position on screen */
  x: PropTypes.number.isRequired,
  /** Y position on screen */
  y: PropTypes.number.isRequired,
};

export default CoachingTooltip;
