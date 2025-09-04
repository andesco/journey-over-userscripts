module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
  },
  globals: {
    // Runtime / library globals used across userscripts
    Logger: 'readonly',
    GMC: 'readonly',
    GM: 'readonly',
    Wikidata: 'readonly',
    NodeCreationObserver: 'readonly',
    $: 'readonly',
    jQuery: 'readonly',
    ClipboardJS: 'readonly',
    debounce: 'readonly',
    TAG_VIDEO_SELECTORS: 'readonly',
  },
  parserOptions: {
  ecmaVersion: 2024,
    sourceType: 'module',
  },
  // Only enable the unused-vars check for now. All other rules disabled.
  rules: {
    'no-unused-vars': ['warn', { vars: 'all', args: 'after-used', ignoreRestSiblings: true }],
  },
};
