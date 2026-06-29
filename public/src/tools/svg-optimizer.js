document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("svg-input");
  const output = document.getElementById("svg-output");
  const btnOpt = document.getElementById("btn-optimize-svg");
  const btnCopy = document.getElementById("btn-copy-svg");

  btnOpt.addEventListener("click", () => {
    let svg = input.value.trim();
    if (!svg) return;
    
    // Clean metadata and comments using basic regex minifier
    const optimized = svg
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<\?xml[\s\S]*?\?>/g, "")
      .replace(/<!DOCTYPE[\s\S]*?>/g, "")
      .replace(/\s+/g, " ")
      .replace(/>\s+</g, "><")
      .trim();
      
    output.value = optimized;
    
    // Log MySQL Stat
    fetch("/api/stats/increment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool_key: "svg-optimizer" })
    }).catch(e => {});
  });

  btnCopy.addEventListener("click", () => {
    if (!output.value) return;
    navigator.clipboard.writeText(output.value);
    alert("Copied optimized SVG!");
  });
});
