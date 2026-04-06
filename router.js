/* ================================================================
   js/router.js — Tab navigation + leaderboard sort buttons.
================================================================ */
'use strict';

import { onTabActivated, setLbSort } from './app.js';
import { loadLeaderboard }           from './auth.js';

export function initTabNav() {
  // Bottom nav buttons
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      _activateTab(tab);
      window.__ns_playSound?.('click');
    });
  });

  // Leaderboard sort filters
  document.querySelectorAll('.lb-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sort = btn.dataset.sort;
      setLbSort(sort);

      document.querySelectorAll('.lb-filter-btn').forEach((b) => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });

      loadLeaderboard(sort);
      window.__ns_playSound?.('click');
    });
  });
}

function _activateTab(tabId) {
  // Nav buttons
  document.querySelectorAll('.nav-btn').forEach((b) => {
    const active = b.dataset.tab === tabId;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', String(active));
  });

  // Tab sections
  document.querySelectorAll('.tab-section').forEach((s) => {
    s.classList.toggle('active', s.id === `tab-${tabId}`);
  });

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Notify app.js of tab switch
  onTabActivated(tabId);
}
