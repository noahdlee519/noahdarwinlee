// The message boxes on the front page (under about), art, projects, blog and cv. A
// message goes into the site_feedback table in the site's own Supabase
// project (the one citylayoutguessr uses), with the page it came from. The key below is the publishable one, meant to
// sit in a web page; the table's row-level security and grants let a browser
// add a message and never read one back. The SQL is in supabase/feedback.sql.
(function () {
  "use strict";
  var URL = "https://kigvciyyjlgjcgnwgrwf.supabase.co/rest/v1/site_feedback";
  var KEY = "sb_publishable_Ki-kbO5xBeMdVt3Ltv3i7A_dzQz2ivy";
  var PAGE = (location.pathname.match(/^\/(art|projects|blog|cv)(\/|$)/) || [, "about"])[1];

  var form = document.getElementById("feedback");
  if (!form) return;
  var box = form.querySelector("textarea");
  var trap = form.querySelector(".feedback-trap");
  var send = form.querySelector(".feedback-send");
  var status = document.getElementById("feedback-status");
  var busy = false;

  function say(text, ok) {
    status.textContent = text;
    status.classList.toggle("is-bad", ok === false);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy) return;
    var message = box.value.trim();
    if (!message) {
      say("Write something first.", false);
      box.focus();
      return;
    }
    // A field people never see; a bot that fills it in is thanked and ignored.
    if (trap && trap.value) {
      box.value = "";
      say("Sent. Thank you.");
      return;
    }
    busy = true;
    send.disabled = true;
    say("Sending…");
    fetch(URL, {
      method: "POST",
      headers: {
        apikey: KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ page: PAGE, message: message.slice(0, 2000) }),
    })
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        box.value = "";
        say("Sent. Thank you.");
      })
      .catch(function () {
        say("That didn’t go through. Try again in a moment, or email noahlee519@gmail.com.", false);
      })
      .then(function () {
        busy = false;
        send.disabled = false;
      });
  });
})();
