(function () {
  function setOpen(root, open) {
    root.classList.toggle("is-open", open);
    const toggle = root.querySelector("[data-mobile-nav-toggle]");
    if (toggle) toggle.setAttribute("aria-expanded", String(open));

    const hasOpenNav = document.querySelector("[data-mobile-nav-root].is-open");
    document.body.classList.toggle("mobile-page-nav-open", Boolean(hasOpenNav));
  }

  function closeAll(exceptRoot) {
    document.querySelectorAll("[data-mobile-nav-root].is-open").forEach((root) => {
      if (root !== exceptRoot) setOpen(root, false);
    });
  }

  document.addEventListener("click", function (event) {
    const toggle = event.target.closest("[data-mobile-nav-toggle]");
    if (toggle) {
      const root = toggle.closest("[data-mobile-nav-root]");
      if (!root) return;

      const shouldOpen = !root.classList.contains("is-open");
      closeAll(root);
      setOpen(root, shouldOpen);
      return;
    }

    const closeButton = event.target.closest("[data-mobile-nav-close]");
    if (closeButton) {
      const root = closeButton.closest("[data-mobile-nav-root]");
      if (root) setOpen(root, false);
      return;
    }

    const overlay = event.target.closest("[data-mobile-nav-overlay]");
    if (overlay) {
      const root = overlay.closest("[data-mobile-nav-root]");
      if (root) setOpen(root, false);
      return;
    }

    const link = event.target.closest("[data-mobile-nav-link]");
    if (link) {
      const root = link.closest("[data-mobile-nav-root]");
      if (root) setOpen(root, false);
      return;
    }

    if (!event.target.closest("[data-mobile-nav-root]")) {
      closeAll();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeAll();
  });
})();
