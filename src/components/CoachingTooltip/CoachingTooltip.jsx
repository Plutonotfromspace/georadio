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
function CoachingTooltip({ visible, text, type, x, y, heatmapColor, isOnVisibleSide }) {
  // Only unmount if completely dismissed (not just rotated behind)
  if (!visible) return null;

  // Use heatmapColor for inline styling if provided
  const useInlineColor = !!heatmapColor;
  
  // Determine text color based on background brightness
  const getTextColor = (hexColor) => {
    if (!hexColor) return 'white';
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 150 ? '#3d2314' : 'white';
  };

  const inlineStyle = useInlineColor ? {
    left: x,
    top: y,
    background: heatmapColor,
    color: getTextColor(heatmapColor),
  } : {
    left: x,
    top: y,
  };

  // Use CSS class to control visibility via transitions
  const visibilityClass = isOnVisibleSide ? 'coaching-tooltip--visible' : 'coaching-tooltip--hidden';

  return (
    <div 
      className={`coaching-tooltip ${useInlineColor ? '' : `coaching-tooltip--${type}`} ${visibilityClass}`}
      style={inlineStyle}
      role="status"
      aria-live="polite"
    >
      <span className="coaching-tooltip__text">{text}</span>
      <div 
        className="coaching-tooltip__pointer" 
        aria-hidden="true"
        style={useInlineColor ? { borderTopColor: heatmapColor } : undefined}
      />
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
  /** Optional: exact heatmap color from getColor() to match country polygon */
  heatmapColor: PropTypes.string,
  /** Whether the tooltip's country is on the visible side of the globe */
  isOnVisibleSide: PropTypes.bool,
};

export default CoachingTooltip;
