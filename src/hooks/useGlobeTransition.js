import { useRef, useCallback } from 'react';

/**
 * Physics-based globe transition hook.
 *
 * Simulates a real hand-flick on a physical globe using exponential velocity
 * decay (friction model) rather than scripted easing curves.
 *
 * Physics:
 *   velocity(t) = ω₀ × e^(-λt)
 *   position(t) = θ₀ + (ω₀ / λ) × (1 − e^(-λt))
 *
 * The globe has no predetermined destination — it simply spins with an
 * initial impulse and decelerates via friction until it naturally stops.
 * Each flick has a randomised direction, speed, and slight vertical
 * wobble to ensure every transition feels unique and organic.
 *
 * @param {React.RefObject} globeRef - ref to the react-globe.gl instance
 */
export function useGlobeTransition(globeRef) {
  const animatingRef = useRef(false);
  const frameIdRef = useRef(null);

  /**
   * Cancel any in-progress animation and re-enable user controls.
   */
  const cancelAnimation = useCallback(() => {
    if (frameIdRef.current) {
      cancelAnimationFrame(frameIdRef.current);
      frameIdRef.current = null;
    }
    animatingRef.current = false;
  }, []);

  /**
   * Spin the globe like a real hand-flick.
   *
   * @param {number} delay - ms to wait before the flick begins (syncs with heatmap fade)
   */
  const spinTransition = useCallback((delay = 400) => {
    if (!globeRef.current) return;

    // Prevent overlapping animations
    cancelAnimation();
    animatingRef.current = true;

    // Leave controls ENABLED — if the user grabs the globe mid-spin,
    // we cancel the animation and let them take over immediately.
    const renderer = globeRef.current.renderer();
    const domElement = renderer?.domElement;

    // Whoosh sound — plays during the spin
    const whoosh = new Audio(`${import.meta.env.BASE_URL || '/'}audio/whoosh.mp3`);
    whoosh.volume = 0.35;
    let whooshPlayed = false;

    const stopWhoosh = () => {
      whoosh.pause();
      whoosh.currentTime = 0;
    };

    const onUserGrab = () => {
      cancelAnimation();
      stopWhoosh();
      cleanup();
    };

    const cleanup = () => {
      if (domElement) {
        domElement.removeEventListener('pointerdown', onUserGrab);
        domElement.removeEventListener('touchstart', onUserGrab);
        domElement.removeEventListener('wheel', onUserGrab);
      }
    };

    // Listen for any user interaction on the globe canvas
    if (domElement) {
      domElement.addEventListener('pointerdown', onUserGrab, { once: true });
      domElement.addEventListener('touchstart', onUserGrab, { once: true });
      domElement.addEventListener('wheel', onUserGrab, { once: true });
    }

    const startPov = globeRef.current.pointOfView();
    const startTime = performance.now() + delay;

    // ── Physics parameters ──────────────────────────────────────
    // Friction coefficient — controls how fast the spin decelerates.
    // Lower = longer spin.  0.0014 gives ~3.5s of visible motion.
    const FRICTION = 0.0014;

    // Initial angular velocities (deg/ms)
    // Horizontal: aggressive flick, randomised direction
    const direction = Math.random() < 0.5 ? 1 : -1;
    const lngSpeed = direction * (0.9 + Math.random() * 0.4); // 0.90–1.30 deg/ms

    // Vertical: noticeable wobble — the hand really slapped it
    const latSpeed = (Math.random() - 0.5) * 0.35; // ±0.175 deg/ms

    // Altitude configuration
    const REST_ALT = 2.5;         // Normal viewing altitude
    const RECOIL_AMPLITUDE = 0.4; // Bigger camera recoil — you feel the force

    // If the camera is zoomed in (e.g. after a correct guess at alt ~1.0),
    // we need to smoothly pull back out before or during the spin.
    // ZOOM_OUT_DURATION controls how long that pull-back takes.
    const isZoomedIn = startPov.altitude < REST_ALT - 0.1;
    const ZOOM_OUT_DURATION = isZoomedIn ? 800 : 0; // ms — only needed when zoomed in

    // Velocity threshold — stop animating when motion is imperceptible
    const STOP_THRESHOLD = 0.0008; // deg/ms

    const animate = (now) => {
      if (!animatingRef.current || !globeRef.current) return;

      const elapsed = now - startTime;

      // Before delay: hold position while heatmap fades
      if (elapsed < 0) {
        frameIdRef.current = requestAnimationFrame(animate);
        return;
      }

      // Play whoosh on the first frame of actual spin
      if (!whooshPlayed) {
        whoosh.play().catch(() => {});
        whooshPlayed = true;
      }

      // Time in seconds for physics calculations
      const t = elapsed / 1000;

      // ─── EXPONENTIAL DECAY PHYSICS ────────────────────────────
      // position(t) = start + (ω₀ / λ) × (1 − e^(-λt))
      // This is the integral of velocity = ω₀ × e^(-λt)
      const decayFactor = 1 - Math.exp(-FRICTION * elapsed); // 0 → 1 asymptotically
      const lngOffset = (lngSpeed / FRICTION) * decayFactor;
      const latOffset = (latSpeed / FRICTION) * decayFactor;

      let lng = startPov.lng + lngOffset;
      let lat = startPov.lat + latOffset;

      // Clamp latitude to avoid flipping over the poles
      lat = Math.max(-65, Math.min(65, lat));

      // ─── ALTITUDE: smooth pull-back + recoil ──────────────────
      // Two layers that blend together:
      //
      // 1. ZOOM-OUT: If starting zoomed in (correct-guess view at alt ~1.0),
      //    smoothly rise to REST_ALT over ZOOM_OUT_DURATION using an
      //    exponential ease-out. This runs concurrently with the spin so the
      //    globe "lifts and spins" in one fluid motion — no snap.
      //
      // 2. RECOIL: A tiny damped-sine "flinch" on top, as if the camera
      //    reacts to the flick force. Only kicks in once we're near rest alt.

      let baseAltitude;
      if (isZoomedIn && elapsed < ZOOM_OUT_DURATION) {
        // Exponential ease-out from current altitude to rest
        const zoomProgress = 1 - Math.exp(-4 * elapsed / ZOOM_OUT_DURATION);
        baseAltitude = startPov.altitude + (REST_ALT - startPov.altitude) * zoomProgress;
      } else {
        baseAltitude = REST_ALT;
      }

      // Recoil — only apply once we're close to rest altitude
      let altitude = baseAltitude;
      if (baseAltitude >= REST_ALT - 0.15) {
        const recoilT = isZoomedIn
          ? Math.max(0, t - ZOOM_OUT_DURATION / 1000 * 0.6) // delay recoil until mostly pulled back
          : t;
        if (recoilT > 0 && recoilT < 1.2) {
          const recoil = RECOIL_AMPLITUDE
            * Math.exp(-3.0 * recoilT)
            * Math.sin(Math.PI * recoilT / 0.7);
          altitude = baseAltitude + Math.max(0, recoil);
        }
      }

      // Apply position — duration=0 for frame-by-frame physics control
      globeRef.current.pointOfView({ lat, lng: lng % 360, altitude }, 0);

      // ─── STOP CONDITION ───────────────────────────────────────
      // Current velocity = ω₀ × e^(-λt)
      // Also keep running if we're still zooming out from a close-up view
      const currentVelocity = Math.abs(lngSpeed) * Math.exp(-FRICTION * elapsed);
      const stillZoomingOut = isZoomedIn && elapsed < ZOOM_OUT_DURATION;

      if (currentVelocity > STOP_THRESHOLD || stillZoomingOut) {
        frameIdRef.current = requestAnimationFrame(animate);
      } else {
        // Spin has naturally come to rest — clean up listeners
        stopWhoosh();
        cleanup();
        cancelAnimation();
      }
    };

    frameIdRef.current = requestAnimationFrame(animate);
  }, [globeRef, cancelAnimation]);

  /**
   * Reset globe to the default equatorial view with a smooth 2s tween.
   */
  const resetToDefault = useCallback(() => {
    cancelAnimation();
    if (globeRef.current) {
      globeRef.current.pointOfView(
        { lat: 0, lng: 0, altitude: 2.5 },
        2000
      );
    }
  }, [globeRef, cancelAnimation]);

  return {
    spinTransition,
    resetToDefault,
    cancelAnimation,
    isAnimating: animatingRef,
  };
}
