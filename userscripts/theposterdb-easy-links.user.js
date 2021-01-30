// ==UserScript==
// @name ThePosterDB Easy Links
// @version 0.1
// @description Add "Copy Poster Link" button to all ThePosterDB pages
// @match https://theposterdb.com/*
// @grant GM_setClipboard
// @require http://code.jquery.com/jquery-3.5.1.min.js
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
