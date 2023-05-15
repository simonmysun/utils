// ==UserScript==
// @name         static host export
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  append text url
// @author       You
// @updateURL    https://raw.githubusercontent.com/simonmysun/utils/gh-pages/userscripts/static_host_export.user.js
// @downloadURL  https://raw.githubusercontent.com/simonmysun/utils/gh-pages/userscripts/static_host_export.user.js
// @supportURL   https://github.com/simonmysun/utils/issues
// @match        https://psb46805.seedbox.io/files/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=seedbox.io
// @grant        none
// ==/UserScript==

(function() {
  'use strict';
  const p=document.createElement('p');
  p.innerText = Array.from(document.querySelectorAll('a')).map(a => a.href.replace('https://', 'https://user:pass@')).join('\n');
  document.querySelector('body').appendChild(p);
})();
