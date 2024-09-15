// ==UserScript==
// @name          Nexus Mod - Updated Mod Highlighter
// @version       1.0.0
// @description   Highlight mods that have updated since you last downloaded them
// @author        Journey Over
// @license       MIT
// @match         *://www.nexusmods.com/users/myaccount?tab=download+history
// @grant         none
// @icon          https://www.google.com/s2/favicons?sz=64&domain=nexusmods.com
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/nexusmods-updated-mod-highlighter.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/nexusmods-updated-mod-highlighter.user.js
// ==/UserScript==

(function() {
  'use strict';

  function whenAvailable(jQuery, cb) {
      var interval = 200; // ms
      window.setTimeout(function() {
          var loadingIndicator = jQuery("p.history_loading");
          if (loadingIndicator !== undefined && loadingIndicator.css("display") === "none") {
              cb(jQuery);
          } else {
              whenAvailable(cb, jQuery);
          }
      }, interval);
  }

  //var slowButton = document.getElementById('slowDownloadButton');
  jQuery(document).ready(function() {
      whenAvailable(jQuery, function() {
          var rows = jQuery("tr.even,tr.odd");

          rows.each(function() {
              var downloadDate = jQuery(this).children("td.table-download").text();
              var updateDate = jQuery(this).children("td.table-update").text();

              try {
                  var dateDl = Date.parse(downloadDate);
                  var dateUp = Date.parse(updateDate);

                  if (dateDl < dateUp) {
                      jQuery(this).children("td").css("background-color", "#444400");
                  }
              } catch (error) {
                  console.log("Err? " + error)
              }
          });
      });
  });
})();
