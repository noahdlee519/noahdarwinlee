(function () {
  "use strict";
  var URL = "https://kigvciyyjlgjcgnwgrwf.supabase.co/rest/v1/site_feedback";
  var KEY = "sb_publishable_Ki-kbO5xBeMdVt3Ltv3i7A_dzQz2ivy";
  var PAGE = (location.pathname.match(/^\/(art|projects|blog|cv|miscellaneous)(\/|$)/) || [, "about"])[1];

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
    if (trap && trap.value) {
      box.value = "";
      say("Sent. Thank you.");
      return;
    }
    busy = true;
    send.disabled = true;
    say("Sending…");
    function post(body) {
      return fetch(URL, {
        method: "POST",
        headers: {
          apikey: KEY,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(body),
      });
    }
    var text = message.slice(0, 2000);
    post({ page: PAGE, message: text })
      .then(function (r) {
        return r.status === 400 ? post({ message: text }) : r;
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
