// ==UserScript==
// @name         Prevent closing last tab on some websites
// @namespace    https://github.com/simonmysun/
// @version      0.1.1
// @description  try to take over the world!
// @author       simonmysun
// @updateURL    https://raw.githubusercontent.com/simonmysun/praxis/raw/gh-pages/userscripts/lastTab.user.js
// @downloadURL  https://raw.githubusercontent.com/simonmysun/praxis/raw/gh-pages/userscripts/lastTab.user.js
// @supportURL   https://github.com/simonmysun/praxis/issues
// @match        https://calendar.google.com/*
// @match        https://mail.google.com/*
// @match        https://web.telegram.org/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';
  if(window.top !== window.self) {
      return;
  }
  var gm_pageId = `{${Math.random() + '/' + Date.now()}}`;
  localStorage.gm_pageCountPing = gm_pageId;
  var gm_pageNum = 1;
  var onLocalStorageEvent = function(e){
      if(e.key == 'gm_pageCountPing'){
          localStorage.gm_pageCountPong = `${e.newValue}|${gm_pageId}`;
          gm_pageNum += 1;
          // console.log(`Other tab opening, ${gm_pageNum} opening`);
      }
      if(e.key == 'gm_pageCountPong'){
          if(e.newValue.split('|')[0] === gm_pageId) {
              gm_pageNum += 1;
              // console.log(`Other tab opened, ${gm_pageNum} opening`);
          }
      }
      if(e.key == 'gm_closeTab'){
          gm_pageNum -= 1;
          // console.log(`One tab closed, ${gm_pageNum} remaining`);
      }
  };
  window.addEventListener('storage', onLocalStorageEvent, false);
  window.onbeforeunload = function (e) {
      localStorage.gm_closeTab = gm_pageId;
      if(gm_pageNum === 1) {
          return '';
      }
  };
})();
