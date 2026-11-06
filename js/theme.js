(function () {
  var KEY = "ielts-theme";
  function current() { try { return localStorage.getItem(KEY) || "light"; } catch (e) { return "light"; } }
  function apply(t) { document.documentElement.setAttribute("data-theme", t); }
  apply(current());
  document.addEventListener("DOMContentLoaded", function () {
    var header = document.querySelector("header");
    if (!header || header.querySelector(".theme-toggle")) return;
    var host = header.querySelector(".header-right, nav, .navlinks, .bar") || header;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-toggle";
    function label() { btn.textContent = current() === "dark" ? "Light mode" : "Dark mode"; }
    btn.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      try { localStorage.setItem(KEY, next); } catch (e) {}
      apply(next);
      label();
    });
    label();
    host.appendChild(btn);
  });
})();
