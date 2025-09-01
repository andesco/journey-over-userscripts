// ==UserScript==
// @author       Journey Over
// @exclude      *
// ==UserLibrary==
// @name         @journeyover/utils
// @description  Utility helpers for my userscripts
// @license      MIT
// @version      1.0.1
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
 * Styled logger factory for userscripts.
 *
 * Creates a logging function that prefixes every message with `[prefix]`
 * and an icon indicating the log level. The returned function delegates
 * to the corresponding `console` method for proper formatting.
 *
 * The returned function is callable as:
 *   log(message, ...args)
 *
 * It also exposes helper methods:
 *   - log.error(message, ...args)  ❌ red
 *   - log.warn(message, ...args)   ⚠️ orange
 *   - log.debug(message, ...args)  🔍 blue
 *   - log(message, ...args)        ✅ green
 *
 * Additional arguments are forwarded directly to the console API so
 * objects, arrays, and Error instances are preserved.
 *
 * @param {string} prefix - Label to display in brackets before each message
 *                          (e.g. 'YouTube - Resumer' → '[YouTube - Resumer]').
 * @returns {Function} A logging function with `.error`, `.warn`, and `.debug` helpers.
 *
 * @example
 * const log = Logger('YouTube - Resumer');
 * log('Initialized', { version: '1.2.2' });
 * log.warn('Unstable connection');
 * log.error('Failed to resume playback', new Error('Timeout'));
 * log.debug('Progress data', { time: 123 });
 */
function Logger(prefix) {
  const baseStyle = 'font-weight: bold; padding:2px 6px; border-radius: 4px;';
  const formattedPrefix = `[${prefix}]`;

  const styles = {
    log:    'background: #4caf50; color: white;' + baseStyle, // green
    error:  'background: #f44336; color: white;' + baseStyle, // red
    warn:   'background: #ff9800; color: black;' + baseStyle, // orange
    debug:  'background: #2196f3; color: white;' + baseStyle, // blue
  };

  const icons = {
    log:   '✅',
    error: '❌',
    warn:  '⚠️',
    debug: '🔍',
  };

  function format(type, message, ...rest) {
    console[type](
      `%c${icons[type]} ${formattedPrefix}%c ${message}`,
      styles[type],
      '',
      ...rest
    );
  }

  function log(message, ...rest) {
    format('log', message, ...rest);
  }

  log.error = function(message, ...rest) {
    format('error', message, ...rest);
  };
  log.warn = function(message, ...rest) {
    format('warn', message, ...rest);
  };
  log.debug = function(message, ...rest) {
    format('debug', message, ...rest);
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
