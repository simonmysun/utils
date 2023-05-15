// ==UserScript==
// @name         codeforces sideview
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  put everything to the left
// @author       You
// @match        https://codeforces.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=codeforces.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    document.querySelector('#body').style.marginLeft = '0';
})();
