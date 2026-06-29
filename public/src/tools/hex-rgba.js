document.addEventListener("DOMContentLoaded", () => {
  const hex = document.getElementById("hex-val");
  const opacity = document.getElementById("hex-opacity");
  const rgba = document.getElementById("rgba-output");
  const hsla = document.getElementById("hsla-output");
  const preview = document.getElementById("color-preview-box");

  function hexToRgb(h) {
    let cleanHex = h.replace("#", "").trim();
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split("").map(c => c + c).join("");
    }
    const num = parseInt(cleanHex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  function updateColor() {
    const val = hex.value.trim();
    try {
      const rgb = hexToRgb(val);
      const alpha = (parseInt(opacity.value) / 100).toFixed(2);
      
      const rgbaStr = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
      rgba.value = rgbaStr;
      
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      hsla.value = `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${alpha})`;
      
      preview.style.backgroundColor = rgbaStr;
      debouncedStatIncrement();
    } catch (e) {
      rgba.value = "Invalid HEX code";
      hsla.value = "";
    }
  }

  [hex, opacity].forEach(i => i.addEventListener("input", updateColor));
  updateColor();

  let statsTimeout = null;
  function debouncedStatIncrement() {
    if (statsTimeout) clearTimeout(statsTimeout);
    statsTimeout = setTimeout(async () => {
      try {
        await fetch("/api/stats/increment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool_key: "hex-rgba" })
        });
      } catch (e) {}
    }, 2000);
  }
});
