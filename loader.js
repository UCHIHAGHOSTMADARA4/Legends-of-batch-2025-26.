/* ================================================================
   js/ui/loader.js — Loading screen controller
================================================================ */
'use strict';

export function showLoader(msg = 'Initialising…') {
  const screen = document.getElementById('loading-screen');
  const status = document.getElementById('loading-status');
  if (screen) screen.style.display = '';
  if (status) status.textContent = msg;
}

export function hideLoader() {
  const screen = document.getElementById('loading-screen');
  if (!screen) return;
  // Small delay so layout settles before fade
  setTimeout(() => {
    screen.classList.add('fade-out');
    setTimeout(() => { screen.remove(); }, 320);
  }, 80);
}
