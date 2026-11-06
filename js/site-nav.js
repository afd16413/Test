/* Shared site header: the same links and the same sign-in / sign-out place on every page.
   Pages include <header id="siteHeader"></header> followed by this script. */
(function () {
  var SUPABASE_URL = "https://yfsxbiqszvrqhsdcuwyr.supabase.co";
  var SUPABASE_KEY = "sb_publishable_W1BJsbUOZdR0dm5Ai_yHJg_J64HYtPH";

  var header = document.getElementById("siteHeader");
  if (!header) return;

  var here = (location.pathname.split("/").pop() || "index.html");
  function link(href, text) {
    return '<a href="' + href + '"' + (here === href ? ' aria-current="page"' : "") + ">" + text + "</a>";
  }

  // Links are always in this order. The sign-in area is always the last item before the theme button.
  header.innerHTML =
    '<div class="topbar">' +
      '<a class="brand" href="index.html">IELTS <span>ACADEMIC</span> PRACTICE</a>' +
      '<nav class="navlinks" aria-label="Main">' +
        link("tests.html", "Practice") +
        '<a id="navResults" href="results.html"' + (here === "results.html" ? ' aria-current="page"' : "") + ' hidden>My results</a>' +
        '<a id="navAdmin" href="admin.html" hidden>Admin panel</a>' +
        link("contact.html", "Contact") +
        '<span id="authSlot">' + link("login.html", "Sign in") + "</span>" +
      "</nav>" +
    "</div>";

  function withClient(callback) {
    if (window.supabase) return callback(window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY));
    var script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = function () { callback(window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)); };
    document.head.appendChild(script);
  }

  withClient(function (client) {
    client.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (!session) return;
      document.getElementById("authSlot").innerHTML =
        '<button type="button" id="navSignout">Sign out</button>';
      document.getElementById("navSignout").addEventListener("click", async function () {
        await client.auth.signOut();
        window.location.replace("index.html");
      });
      document.getElementById("navResults").hidden = false;
      client.from("admins").select("user_id").eq("user_id", session.user.id).maybeSingle()
        .then(function (r) { if (r.data) document.getElementById("navAdmin").hidden = false; });
    }).catch(function () {});
  });
})();
