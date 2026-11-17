document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const target = document.getElementById(button.dataset.copy);
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target.textContent);
      const old = button.textContent;
      button.textContent = "Copied";
      window.setTimeout(() => { button.textContent = old; }, 1400);
    } catch {
      button.textContent = "Copy unavailable";
    }
  });
});