/* ================================================================
   js/games/manager.js — Game unlock system.

   HOW UNLOCKING WORKS:
   - Game 1 (Tap Frenzy) is always unlocked.
   - Game 2 (2048) unlocks when user scrolls to the bottom of Game 1.
   - Game 3 (Memory) unlocks when user scrolls to the bottom of Game 2.
   
   Uses IntersectionObserver to detect when the scroll sentinel
   at the bottom of each game block enters the viewport.
   Unlock state persists to localStorage.

   If a user tries to interact with a locked game, the lock overlay
   shows with a helpful message.
================================================================ */
'use strict';

import { lsGet, lsSet } from '../utils.js';
import { initTapFrenzy } from './tapFrenzy.js';
import { init2048 }      from './g2048.js';
import { initMemoryGame } from './memory.js';

const LS_KEY = 'ns_unlocked_games';

// Returns Set of unlocked game IDs (numbers)
function getUnlocked() {
  try {
    const raw = JSON.parse(lsGet(LS_KEY, '[]'));
    return new Set([1, ...raw]); // Game 1 always unlocked
  } catch { return new Set([1]); }
}

function saveUnlocked(set) {
  lsSet(LS_KEY, JSON.stringify([...set]));
}

export function initGameManager() {
  const unlocked = getUnlocked();

  // Always init Tap Frenzy (game 1)
  initTapFrenzy();

  // Apply initial locked/unlocked visual state
  _applyUnlockState(unlocked);

  // Watch sentinels with IntersectionObserver
  _watchSentinels(unlocked);

  // Init unlocked games' logic immediately
  if (unlocked.has(2)) init2048();
  if (unlocked.has(3)) initMemoryGame();
}

function _applyUnlockState(unlocked) {
  [2, 3].forEach((id) => {
    const block     = document.getElementById(`game-block-${id}`);
    const lockBadge = document.getElementById(`badge-${id}`);
    const unlkBadge = document.getElementById(`unlocked-badge-${id}`);
    const lockOvrl  = document.getElementById(`lock-overlay-${id}`);
    const hint      = document.getElementById(`unlock-hint-${id}`);

    if (!block) return;

    if (unlocked.has(id)) {
      block.classList.remove('locked');
      lockBadge?.classList.add('hidden');
      unlkBadge?.classList.remove('hidden');
      lockOvrl?.classList.add('hidden');
      hint?.classList.add('hidden');
    } else {
      block.classList.add('locked');
      lockBadge?.classList.remove('hidden');
      unlkBadge?.classList.add('hidden');
    }

    // Hide next-game hint if game that COMES AFTER is already unlocked
    const nextId = id + 1;
    const nextHint = document.getElementById(`unlock-hint-${nextId}`);
    if (unlocked.has(nextId) && nextHint) {
      nextHint.classList.add('hidden');
    }
  });
}

function _watchSentinels(unlocked) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const unlocksId = parseInt(entry.target.dataset.unlocks, 10);
      if (!unlocksId || unlocked.has(unlocksId)) return;

      // UNLOCK!
      unlocked.add(unlocksId);
      saveUnlocked(unlocked);

      _applyUnlockState(unlocked);
      _playUnlockAnimation(unlocksId);

      // Init the game now that it's unlocked
      if (unlocksId === 2) init2048();
      if (unlocksId === 3) initMemoryGame();

      // Stop watching this sentinel
      observer.unobserve(entry.target);
    });
  }, {
    root: null,
    threshold: 0.5, // Sentinel must be 50% visible to trigger
  });

  document.querySelectorAll('.unlock-sentinel').forEach((sentinel) => {
    const unlocksId = parseInt(sentinel.dataset.unlocks, 10);
    if (!unlocked.has(unlocksId)) {
      observer.observe(sentinel);
    }
  });
}

function _playUnlockAnimation(gameId) {
  const block = document.getElementById(`game-block-${gameId}`);
  if (!block) return;

  // Scroll to it
  setTimeout(() => {
    block.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);

  // Flash animation
  block.style.transition = 'box-shadow 400ms ease';
  block.style.boxShadow  = '0 0 0 3px rgba(57,255,20,.6), 0 0 40px rgba(57,255,20,.3)';
  setTimeout(() => { block.style.boxShadow = ''; }, 1800);

  window.__ns_showPopup?.('🔓', 'Game Unlocked!',
    gameId === 2 ? '🔢 2048 is now available! Give it a try!'
                 : '🃏 Memory Match is now available! Test your memory!');
  window.__ns_playSound?.('levelup');
}
