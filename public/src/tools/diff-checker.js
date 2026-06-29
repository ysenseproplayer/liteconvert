document.addEventListener("DOMContentLoaded", () => {
  const txt1 = document.getElementById("diff-text-1");
  const txt2 = document.getElementById("diff-text-2");
  const output = document.getElementById("diff-checker-output");

  function compareTexts() {
    const original = txt1.value.split("\n");
    const modified = txt2.value.split("\n");
    
    let html = "";
    const maxLength = Math.max(original.length, modified.length);
    
    for (let i = 0; i < maxLength; i++) {
      const origLine = original[i] || "";
      const modLine = modified[i] || "";
      
      if (origLine === modLine) {
        html += `<div>  ${origLine}</div>`;
      } else {
        if (i < original.length) {
          html += `<div style="background-color:rgba(239, 68, 68, 0.15); color:#fca5a5;">- ${origLine}</div>`;
        }
        if (i < modified.length) {
          html += `<div style="background-color:rgba(16, 185, 129, 0.15); color:#86efac;">+ ${modLine}</div>`;
        }
      }
    }
    output.innerHTML = html || "No differences found.";
  }

  [txt1, txt2].forEach(i => i.addEventListener("input", () => { compareTexts(); debouncedStatIncrement(); }));

  let statsTimeout = null;
  function debouncedStatIncrement() {
    if (statsTimeout) clearTimeout(statsTimeout);
    statsTimeout = setTimeout(async () => {
      try {
        await fetch("/api/stats/increment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool_key: "diff-checker" })
        });
      } catch (e) {}
    }, 2000);
  }
});
