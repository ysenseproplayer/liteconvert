document.addEventListener("DOMContentLoaded", () => {
  const seed = document.getElementById("palette-seed");
  const harmony = document.getElementById("palette-harmony");
  const btnGen = document.getElementById("btn-gen-palette");
  const container = document.getElementById("palette-results-container");

  btnGen.addEventListener("click", () => {
    const val = seed.value.trim().replace("#", "");
    if (val.length !== 6) { alert("Invalid seed HEX color"); return; }
    
    // Generate basic dummy palette items (monochrome or triadic offsets)
    container.innerHTML = "";
    const offsets = [-20, -10, 0, 10, 20];
    const baseNum = parseInt(val, 16);
    
    offsets.forEach(offset => {
      let r = ((baseNum >> 16) & 255) + offset;
      let g = ((baseNum >> 8) & 255) + offset;
      let b = (baseNum & 255) + offset;
      
      const clamp = (c) => Math.max(0, Math.min(255, c));
      const hex = "#" + [clamp(r), clamp(g), clamp(b)].map(c => c.toString(16).padStart(2, "0")).join("");
      
      const block = document.createElement("div");
      block.style.display = "flex";
      block.style.flexDirection = "column";
      block.style.alignItems = "center";
      block.style.gap = "0.25rem";
      block.innerHTML = `
        <div style="background-color:${hex}; height:80px; width:100%; border-radius:8px; border:1px solid var(--card-border);"></div>
        <span style="font-size:0.75rem; font-family:var(--font-mono);">${hex.toUpperCase()}</span>
      `;
      container.appendChild(block);
    });
    
    // Log MySQL Stat
    fetch("/api/stats/increment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool_key: "color-palette" })
    }).catch(e => {});
  });
});
