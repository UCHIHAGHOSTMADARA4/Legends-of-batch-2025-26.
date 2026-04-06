/* ================================================================
   js/app.js — Main entry point. Boots NeonSpin.

   ARCHITECTURE:
   app.js is a thin orchestrator. It:
   1. Shows loading screen immediately
   2. Loads theme (synchronous, prevents flash)
   3. Initialises UI modules (no Firebase needed)
   4. Hides loading screen
   5. Starts Firebase auth in background (non-blocking)
   6. When auth resolves, updates UI with user data

   WHY THIS STRUCTURE:
   The old version awaited Firebase auth before hiding the loader.
   If Firebase was slow (or the domain wasn't authorised), the site
   was stuck on "Initialising…" forever.

   New structure: loader hides as soon as local UI is ready.
   Firebase auth happens asynchronously and enriches the UI when ready.
================================================================ */

'use strict';

// ── UI modules (no Firebase, instant) ───────────────────────
import { loadTheme, initThemeToggle } from './ui/theme.js';
import { initParticles }              from './ui/particles.js';
import { initSoundToggle }            from './ui/sound.js';
import { initPopup }                  from './ui/popup.js';
import { hideLoader }                 from './ui/loader.js';

// ── Feature modules ──────────────────────────────────────────
import { initStats, renderStats }         from './features/stats.js';
import { initSpin, renderTasks }          from './features/spin.js';
import { initFeed }                       from './features/feed.js';
import { initFeedback }                   from './features/feedback.js';
import { initRewards, updateRewardEligibility, renderMilestones } from './features/rewards.js';

// ── Game manager ─────────────────────────────────────────────
import { initGameManager }  from './games/manager.js';

// ── Auth (Firebase — async) ───────────────────────────────────
import {
  initTermsGate,
  initAuthButtons,
  initAuthObserver,
  syncUserStats,
  loadLeaderboard,
  loadFeedbackList,
  getUserProfile,
} from './auth.js';

// ── State ─────────────────────────────────────────────────────
import { mergeProfile, getState } from './state.js';

// ── Router ────────────────────────────────────────────────────
import { initTabNav } from './router.js';


/* ================================================================
   BOOT
================================================================ */

// Hard-fallback: if anything stalls, force-hide loader after 4s
const _hardFallback = setTimeout(hideLoader, 4000);

async function boot() {
  try {
    // STEP 1: Theme (sync — prevents flash of wrong theme)
    loadTheme();

    // STEP 2: All synchronous UI setup
    initParticles();
    initPopup();
    initSoundToggle();
    initThemeToggle();
    initStats();
    initSpin();
    initFeed();
    initFeedback();
    initRewards();
    initGameManager();
    initTabNav();
    initTermsGate();
    initAuthButtons();

    // STEP 3: Hide loader — app is usable NOW, even before auth
    clearTimeout(_hardFallback);
    hideLoader();

    // STEP 4: Start Firebase auth observer in the background.
    // This does NOT block anything. UI updates when auth resolves.
    initAuthObserver(_onUserReady, _onUserGone);

    // STEP 5: Try to load feedback list (non-critical)
    loadFeedbackList().catch(() => {});

  } catch (err) {
    console.error('[NeonSpin] Boot error:', err);
    clearTimeout(_hardFallback);
    hideLoader(); // Always hide loader, never leave user stuck
  }
}

// Start boot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}


/* ================================================================
   AUTH CALLBACKS
================================================================ */

function _onUserReady(profile) {
  if (!profile) return;

  // Merge Firebase profile into local state
  mergeProfile(profile);

  // Update referral code display
  const codeEl = document.getElementById('referral-code-display');
  if (codeEl && profile.referralCode) codeEl.textContent = profile.referralCode;

  // Re-render stats with fresh data
  renderStats(getState());
  renderTasks();

  // Rewards tab
  updateRewardEligibility(getState());
  renderMilestones(profile.milestonesAchieved || []);

  // Refresh leaderboard if it's currently open
  const lbSection = document.getElementById('tab-leaderboard');
  if (lbSection?.classList.contains('active')) {
    loadLeaderboard(_currentLbSort);
  }
}

function _onUserGone() {
  // Clear leaderboard when user signs out
  const lbEl = document.getElementById('leaderboard-list');
  if (lbEl) lbEl.innerHTML = '<div class="lb-empty">Sign in to see the leaderboard</div>';
  document.getElementById('my-rank-card')?.classList.add('hidden');
}


/* ================================================================
   TAB-SPECIFIC ACTIONS
   Called by router.js when a tab is activated.
================================================================ */

let _currentLbSort = 'level';

export function onTabActivated(tabId) {
  switch (tabId) {
    case 'leaderboard':
      if (getUserProfile()) loadLeaderboard(_currentLbSort);
      else {
        // Show fake leaderboard for guests
        loadLeaderboard(_currentLbSort);
      }
      break;
    case 'rewards':
      updateRewardEligibility(getState());
      renderMilestones(getUserProfile()?.milestonesAchieved || []);
      break;
  }
}

export function setLbSort(sort) { _currentLbSort = sort; }
