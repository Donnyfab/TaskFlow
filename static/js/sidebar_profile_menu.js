(function () {
  function setOpen(root, open) {
    root.classList.toggle("is-open", open);
    const toggle = root.querySelector("[data-profile-toggle]");
    if (toggle) toggle.setAttribute("aria-expanded", String(open));
  }

  function closeAll(exceptRoot) {
    document.querySelectorAll("[data-profile-root].is-open").forEach((root) => {
      if (root !== exceptRoot) setOpen(root, false);
    });
  }

  document.addEventListener("click", function (event) {
    const toggle = event.target.closest("[data-profile-toggle]");
    if (toggle) {
      const root = toggle.closest("[data-profile-root]");
      if (!root) return;

      const shouldOpen = !root.classList.contains("is-open");
      closeAll(root);
      setOpen(root, shouldOpen);
      return;
    }

    if (!event.target.closest("[data-profile-root]")) {
      closeAll();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeAll();
  });
})();
