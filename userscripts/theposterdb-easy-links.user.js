// ==UserScript==
// @name          ThePosterDB Easy Links
// @namespace     https://github.com/StylusThemes/Userscripts
// @description   Add "Copy Poster Link" button to all ThePosterDB pages
// @match         *://theposterdb.com/*
// @require       https://code.jquery.com/jquery-3.5.1.min.js
// @version       0.1
// @grant         GM_setClipboard
// ==/UserScript==

(function() { 'use strict';

$(".col-6 .hovereffect").map(function() {
    let posterId = $(this).find('div[data-poster-id]').attr("data-poster-id")
    let linkButton = $("<div style='text-align: center; cursor: pointer;" +
        "margin-top: 5px; background-color: #28965a'>" +
        "COPY LINK TO CLIPBOARD</div>")

    linkButton.click(function() {
        GM_setClipboard("https://theposterdb.com/api/assets/" + posterId);
    });

    linkButton.insertAfter($(this));
});
})();
