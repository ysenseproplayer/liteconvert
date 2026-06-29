document.addEventListener("DOMContentLoaded", () => {
  const r = document.getElementById("rgb-r");
  const g = document.getElementById("rgb-g");
  const b = document.getElementById("rgb-b");
  const hex = document.getElementById("hex-output");
  const preview = document.getElementById("rgb-preview-box");

  function rgbToHex(red, green, blue) {
    const clamp = (val) => Math.max(0, Math.min(255, parseInt(val) || 0));
    const rHex = clamp(red).toString(16).padStart(2, "0");
    const gHex = clamp(green).toString(16).padStart(2, "0");
    const bHex = clamp(blue).toString(16).padStart(2, "0");
    return `#${rHex}${gHex}${bHex}`.toUpperCase();
  }

  function updateColor() {
    const hexStr = rgbToHex(r.value, g.value, b.value);
    hex.value = hexStr;
    preview.style.backgroundColor = hexStr;
    debouncedStatIncrement();
  }

  [r, g, b].forEach(i => i.addEventListener("input", updateColor));
  updateColor();

  let statsTimeout = null;
  function debouncedStatIncrement() {
    if (statsTimeout) clearTimeout(statsTimeout);
    statsTimeout = setTimeout(async () => {
      try {
        await fetch("/api/stats/increment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool_key: "rgb-hex" })
        });
      } catch (e) {}
    }, 2000);
  }
});
