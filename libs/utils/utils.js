// ==UserScript==
// @author       Journey Over
// @exclude      *
// ==UserLibrary==
// @name         @journeyover/utils
// @description  Utility helpers for my userscripts
// @license      MIT
// @version      1.0.0
// @homepageURL  https://github.com/StylusThemes/Userscripts
// ==/UserScript==

/**
 * Create a debounced function that delays calling `fn` until `wait`
 * milliseconds have passed without another call.
 *
 * The returned function preserves the original `this` binding and forwards
 * all arguments to `fn`. This implementation does not provide cancel/flush
 * helpers; it only postpones execution.
 *
 * Inputs:
 * - fn: Function to invoke after the quiet period.
 * - wait: Number of milliseconds to wait.
 *
 * Output:
 * - A callable function that schedules `fn` and returns undefined.
 *
 * Edge cases:
 * - If `fn` is not a function a TypeError will be thrown by the runtime when
 *   attempting to call it. `wait` is coerced by the timer APIs to a number.
 *
 * @param {Function} fn - Function to debounce. Called with the original `this`.
 * @param {number} wait - Delay in milliseconds.
 * @returns {Function} A debounced wrapper function.
 *
 * @example
 * const save = debounce(() => api.save(data), 250);
 * input.addEventListener('input', save);
 */
function debounce(fn, wait) {
  let timeoutId = null;
  return function (...args) {
    if (timeoutId) clearTimeout(timeoutId);
    const context = this;
    timeoutId = setTimeout(() => fn.apply(context, args), wait);
  };
}

/**
 * Lightweight logger factory for userscripts.
 *
 * Returns a logging function that prefixes every message with `prefix` and
 * delegates to the corresponding `console` method. The returned function is
 * callable as `log(message, ...args)` and also exposes helper methods:
 * - log.error(message, ...args)
 * - log.warn(message, ...args)
 * - log.debug(message, ...args)
 *
 * All helpers forward additional arguments to the console API so objects and
 * Error instances are preserved.
 *
 * @param {string} prefix - String to prepend to every log entry (example: '[MyScript]').
 * @returns {Function} A logging function with `.error`, `.warn`, and `.debug` methods.
 *
 * @example
 * const log = Logger('[My-Script]');
 * log('initialized', { version: 1 });
 * log.error('request failed', err);
 */
function Logger(prefix) {
  function log(message, ...rest) {
    console.log(prefix + ' ' + message, ...rest);
  }
  log.error = function(message, ...rest) {
    console.error(prefix + ' ' + message, ...rest);
  };
  log.warn = function(message, ...rest) {
    console.warn(prefix + ' ' + message, ...rest);
  };
  log.debug = function(message, ...rest) {
    console.debug(prefix + ' ' + message, ...rest);
  };
  return log;
}

// Expose for CommonJS (node) and as browser globals to match previous usage.
if (typeof module !== 'undefined' && module.exports) {
	module.exports = { debounce, Logger };
}

if (typeof window !== 'undefined') {
	window.debounce = debounce;
	window.Logger = Logger;
}
