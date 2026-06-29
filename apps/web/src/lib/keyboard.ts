// Publishes the on-screen keyboard height as the --keyboard-height CSS variable,
// app-wide, by watching the visual viewport. iOS doesn't shrink the layout
// viewport (or dvh) for the keyboard, so without this a focused input low on the
// screen makes iOS scroll the whole document to reveal it, sliding fixed top
// chrome under the status bar. Screens that contain inputs give their scroller
// this much bottom room so the focused field scrolls within the scroller instead
// (see OnboardingScaffold), and bottom sheets lift by it.
export function initKeyboardTracking(): void {
  const vv = window.visualViewport;
  if (!vv) return;
  const root = document.documentElement;
  const update = () => {
    const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    root.style.setProperty('--keyboard-height', `${Math.round(overlap)}px`);
  };
  update();
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  window.addEventListener('orientationchange', update);
}
