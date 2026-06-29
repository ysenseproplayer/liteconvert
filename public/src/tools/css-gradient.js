document.addEventListener("DOMContentLoaded", () => {
  const c1 = document.getElementById("grad-color-1");
  const c2 = document.getElementById("grad-color-2");
  const angle = document.getElementById("grad-angle");
  const cssOut = document.getElementById("grad-css-output");
  const preview = document.getElementById("grad-preview-box");
  const btnCopy = document.getElementById("btn-copy-grad");

  function updateGradient() {
    const val1 = c1.value.trim();
    const val2 = c2.value.trim();
    const deg = parseInt(angle.value) || 135;
    
    const gradStr = `linear-gradient(${deg}deg, ${val1}, ${val2})`;
    cssOut.value = `background: ${gradStr};`;
    preview.style.background = gradStr;
  }

  [c1, c2, angle].forEach(i => i.addEventListener("input", () => { updateGradient(); debouncedStatIncrement(); }));
  btnCopy.addEventListener("click", () => { navigator.clipboard.writeText(cssOut.value); alert("Copied CSS Gradient!"); });

  updateGradient();

  let statsTimeout = null;
  function debouncedStatIncrement() {
    if (statsTimeout) clearTimeout(statsTimeout);
    statsTimeout = setTimeout(async () => {
      try {
        await fetch("/api/stats/increment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool_key: "css-gradient" })
        });
      } catch (e) {}
    }, 2000);
  }
});
