import { useState, useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSpring, animated } from '@react-spring/web';
import confetti from 'canvas-confetti';
import { Modal } from '../Modal';
import './GameCompleteModal.css';

/* ──────────────────────────────────────────────────
   Score tiers — drive verdict text, confetti, sound
   ────────────────────────────────────────────────── */
const TIERS = [
  { min: 20000, label: 'INCREDIBLE',     color: '#FFD700', confettiCount: 200, confettiBursts: 2 },
  { min: 12500, label: 'Great game!',    color: '#00E5FF', confettiCount: 120, confettiBursts: 1 },
  { min: 5000,  label: 'Not bad!',       color: '#00E5FF', confettiCount: 60,  confettiBursts: 1 },
  { min: 0,     label: 'Tough one…',     color: 'rgba(255,255,255,0.5)', confettiCount: 0, confettiBursts: 0 },
];

function getTier(score) {
  return TIERS.find(t => score >= t.min) || TIERS[TIERS.length - 1];
}

/* ──────────────────────────────────────────────────
   Timeline constants (ms)
   ────────────────────────────────────────────────── */
const ROUND_STAGGER   = 300;  // gap between each round row appearing
const ROUND_COUNTUP   = 600;  // per-row score count-up duration
const FIRST_ROW_DELAY = 400;  // delay before first row appears after modal opens
const DIVIDER_DELAY   = 500;  // pause after last row before divider
const TOTAL_COUNTUP   = 2000; // total score count-up duration
const VERDICT_DELAY   = 300;  // pause after total lands before verdict
const BUTTON_DELAY    = 500;  // pause after verdict before button appears
const SKIP_THRESHOLD  = 1500; // after this many ms, clicking skips to end

/**
 * Game Complete Modal — Choreographed reveal sequence
 * 
 * Timeline:
 * 1. Rounds stagger in one-by-one with per-row score count-up
 * 2. Divider line animates across
 * 3. Total score counts up with tally ticks + punch on landing
 * 4. Emotional verdict + confetti
 * 5. Play Again button fades in last
 */
function GameCompleteModal({ 
  isOpen, 
  isClosing = false,
  onPlayAgain, 
  totalScore, 
  roundResults,
  volume = 50,
  onFlagError = (e) => { e.target.src = 'https://flagcdn.com/w80/un.png'; },
}) {
  // Timeline phase tracking
  const [revealedRows, setRevealedRows] = useState(0);       // 0–5: how many rows visible
  const [rowScores, setRowScores] = useState([0, 0, 0, 0, 0]); // animated per-row scores
  const [showDivider, setShowDivider] = useState(false);
  const [showTotal, setShowTotal] = useState(false);
  const [showVerdict, setShowVerdict] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [skipped, setSkipped] = useState(false);

  const timersRef = useRef([]);
  const rafRef = useRef([]);
  const modalOpenTime = useRef(0);

  // Sound memos
  const tallySound = useMemo(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}audio/tally.mp3`);
    return audio;
  }, []);

  const finalTallySound = useMemo(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}audio/finaltally.mp3`);
    return audio;
  }, []);

  const playAgainSound = useMemo(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}audio/playagain.mp3`);
    return audio;
  }, []);

  // Animated total score (rAF-driven like row count-ups)
  const [displayedTotal, setDisplayedTotal] = useState(0);

  // Punch scale on total landing
  const { scale: totalScale } = useSpring({
    scale: showVerdict ? 1 : (showTotal ? 1.12 : 1),
    config: { tension: 300, friction: 10 },
  });

  // ── Total score count-up (rAF + finalTally ticks) ──
  const countUpTotal = () => {
    const startTime = performance.now();
    const tickVolume = Math.min(1.0, 0.25 + (volume / 100) * 0.4);
    let lastTickTime = 0;
    let lastDisplayed = 0;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / TOTAL_COUNTUP, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const displayed = Math.floor(easeOut * totalScore);

      setDisplayedTotal(displayed);

      // Tally tick
      if (totalScore > 0 && displayed > lastDisplayed && (currentTime - lastTickTime) > 60) {
        const tick = finalTallySound.cloneNode();
        tick.volume = tickVolume;
        tick.play().catch(() => {});
        lastTickTime = currentTime;
        lastDisplayed = displayed;
      }

      if (progress < 1) {
        const id = requestAnimationFrame(animate);
        rafRef.current.push(id);
      } else {
        // Count-up finished — trigger verdict
        setDisplayedTotal(totalScore);
        fireVerdict();
      }
    };
    const id = requestAnimationFrame(animate);
    rafRef.current.push(id);
  };

  const tier = getTier(totalScore);

  // ── Cleanup ──
  const clearAllTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    rafRef.current.forEach(id => cancelAnimationFrame(id));
    rafRef.current = [];
  };

  // ── Per-row score count-up (rAF + tally ticks) ──
  const countUpRow = (rowIndex, targetScore) => {
    const startTime = performance.now();
    const tickVolume = Math.min(1.0, 0.25 + (volume / 100) * 0.4);
    let lastTickTime = 0;
    let lastDisplayed = 0;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / ROUND_COUNTUP, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const displayed = Math.floor(easeOut * targetScore);

      setRowScores(prev => {
        const next = [...prev];
        next[rowIndex] = displayed;
        return next;
      });

      // Tally tick
      if (targetScore > 0 && displayed > lastDisplayed && (currentTime - lastTickTime) > 60) {
        const tick = tallySound.cloneNode();
        tick.volume = tickVolume;
        tick.play().catch(() => {});
        lastTickTime = currentTime;
        lastDisplayed = displayed;
      }

      if (progress < 1) {
        const id = requestAnimationFrame(animate);
        rafRef.current.push(id);
      }
    };
    const id = requestAnimationFrame(animate);
    rafRef.current.push(id);
  };

  // ── Fire verdict + confetti ──
  const fireVerdict = () => {
    setShowVerdict(true);

    const tid1 = setTimeout(() => {
      // Confetti bursts
      if (tier.confettiCount > 0) {
        const colors = totalScore >= 20000
          ? ['#FFD700', '#FFA500', '#FFEC8B', '#DAA520']
          : ['#00E5FF', '#58CC02', '#FFD700', '#FF6B6B'];

        confetti({
          particleCount: tier.confettiCount,
          spread: 80,
          origin: { y: 0.5 },
          colors,
        });

        if (tier.confettiBursts > 1) {
          const tid2 = setTimeout(() => {
            confetti({
              particleCount: tier.confettiCount * 0.7,
              spread: 100,
              origin: { y: 0.4, x: 0.6 },
              colors,
            });
          }, 400);
          timersRef.current.push(tid2);
        }
      }

    }, 100);
    timersRef.current.push(tid1);

    // Show button after verdict — playAgainSound is the celebratory punctuation
    const tid4 = setTimeout(() => {
      setShowButton(true);
      const sfx = playAgainSound.cloneNode();
      sfx.volume = Math.min(1.0, 0.3 + (volume / 100) * 0.4);
      sfx.play().catch(() => {});
    }, BUTTON_DELAY);
    timersRef.current.push(tid4);
  };

  // ── Skip to end state ──
  const skipToEnd = () => {
    if (showButton) return; // already done
    clearAllTimers();
    setSkipped(true);
    setRevealedRows(5);
    setRowScores(roundResults.map(r => r.score));
    setDisplayedTotal(totalScore);
    setShowDivider(true);
    setShowTotal(true);
    setShowVerdict(true);
    setShowButton(true);

    // Play again sound
    const sfx = playAgainSound.cloneNode();
    sfx.volume = Math.min(1.0, 0.3 + (volume / 100) * 0.4);
    sfx.play().catch(() => {});

    // Still fire confetti on skip
    if (tier.confettiCount > 0) {
      const colors = totalScore >= 20000
        ? ['#FFD700', '#FFA500', '#FFEC8B', '#DAA520']
        : ['#00E5FF', '#58CC02', '#FFD700', '#FF6B6B'];
      confetti({ particleCount: tier.confettiCount, spread: 80, origin: { y: 0.5 }, colors });
    }
  };

  // ── Master timeline — runs when modal opens ──
  useEffect(() => {
    if (!isOpen || roundResults.length === 0) return;

    // Reset state
    setRevealedRows(0);
    setRowScores([0, 0, 0, 0, 0]);
    setDisplayedTotal(0);
    setShowDivider(false);
    setShowTotal(false);
    setShowVerdict(false);
    setShowButton(false);
    setSkipped(false);
    modalOpenTime.current = Date.now();

    let t = FIRST_ROW_DELAY;

    // Phase 1: Stagger round rows
    for (let i = 0; i < roundResults.length; i++) {
      const delay = t;
      const tid = setTimeout(() => {
        setRevealedRows(i + 1);
        countUpRow(i, roundResults[i].score);
      }, delay);
      timersRef.current.push(tid);
      t += ROUND_STAGGER + ROUND_COUNTUP * 0.3; // overlap count-ups slightly
    }

    // Phase 2: Divider
    t += DIVIDER_DELAY;
    const divTid = setTimeout(() => setShowDivider(true), t);
    timersRef.current.push(divTid);

    // Phase 3: Total count-up
    t += 400;
    const totalTid = setTimeout(() => {
      setShowTotal(true);
      countUpTotal();
    }, t);
    timersRef.current.push(totalTid);

    // Phase 4 (verdict + confetti + button) triggered by spring onRest

    return () => clearAllTimers();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Click-to-skip handler ──
  const handleModalClick = () => {
    if (showButton) return;
    if (Date.now() - modalOpenTime.current > SKIP_THRESHOLD) {
      skipToEnd();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      isClosing={isClosing}
      onClose={onPlayAgain}
      title={`Game Complete - Final Score: ${totalScore} points`}
      closeOnEscape={showButton}
      closeOnBackdropClick={false}
      size="sm"
      className={`game-complete-modal${totalScore >= 20000 ? ' game-complete-modal--gold' : ''}`}
    >
      {/* Click-to-skip overlay */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="game-complete-modal__inner" onClick={handleModalClick}>
        
        {/* Rounds Summary — staggered reveal */}
        <div className="game-complete-modal__rounds">
          {roundResults.map((result, i) => (
            <div
              key={result.round}
              className={`game-complete-modal__round${i < revealedRows ? ' game-complete-modal__round--visible' : ''}`}
            >
              <div className="game-complete-modal__round-left">
                <img 
                  src={`https://flagcdn.com/w80/${result.countryCode || 'un'}.png`}
                  alt={`Flag of ${result.target}`}
                  onError={onFlagError}
                  className="game-complete-modal__round-flag"
                />
                <span className="game-complete-modal__round-country">
                  {result.target}
                </span>
              </div>
              <div className={`game-complete-modal__round-score${result.score === 0 ? ' game-complete-modal__round-score--zero' : ''}`}>
                +{i < revealedRows ? rowScores[i].toLocaleString() : 0}
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className={`game-complete-modal__divider${showDivider ? ' game-complete-modal__divider--visible' : ''}`} />

        {/* Total Score Hero */}
        <div className={`game-complete-modal__hero${showTotal ? ' game-complete-modal__hero--visible' : ''}`}>
          <div className="game-complete-modal__label">total</div>
          <animated.div 
            className="game-complete-modal__score"
            style={{ 
              transform: totalScale.to(s => `scale(${s})`),
              color: showVerdict ? tier.color : '#00E5FF',
            }}
          >
            {displayedTotal.toLocaleString()}
          </animated.div>
          <div className="game-complete-modal__label">points</div>
        </div>

        {/* Emotional Verdict */}
        <div className={`game-complete-modal__verdict${showVerdict ? ' game-complete-modal__verdict--visible' : ''}`}>
          <span style={{ color: tier.color }}>{tier.label}</span>
        </div>

        {/* Play Again Button — appears last */}
        <button 
          className={`game-complete-modal__button${showButton ? ' game-complete-modal__button--visible' : ''}`}
          onClick={showButton ? onPlayAgain : undefined}
          aria-label="Play another game"
          tabIndex={showButton ? 0 : -1}
        >
          Play Again
        </button>
      </div>
    </Modal>
  );
}

GameCompleteModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  isClosing: PropTypes.bool,
  onPlayAgain: PropTypes.func.isRequired,
  totalScore: PropTypes.number.isRequired,
  roundResults: PropTypes.arrayOf(PropTypes.shape({
    round: PropTypes.number.isRequired,
    target: PropTypes.string.isRequired,
    score: PropTypes.number.isRequired,
    countryCode: PropTypes.string,
  })).isRequired,
  volume: PropTypes.number,
  onFlagError: PropTypes.func,
};

export default GameCompleteModal;
