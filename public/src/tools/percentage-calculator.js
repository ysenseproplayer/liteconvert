document.addEventListener("DOMContentLoaded", () => {
  const p1 = document.getElementById("perc-val-1");
  const p2 = document.getElementById("perc-val-2");
  const ans1 = document.getElementById("perc-ans-1");

  const i1 = document.getElementById("perc-inc-1");
  const i2 = document.getElementById("perc-inc-2");
  const ans2 = document.getElementById("perc-ans-2");

  function calculatePercentage() {
    const val1 = parseFloat(p1.value) || 0;
    const val2 = parseFloat(p2.value) || 0;
    ans1.value = ((val1 / 100) * val2).toFixed(2);
  }

  function calculateDifference() {
    const val1 = parseFloat(i1.value) || 0;
    const val2 = parseFloat(i2.value) || 0;
    if (val1 === 0) { ans2.value = "N/A"; return; }
    const diff = ((val2 - val1) / val1) * 100;
    ans2.value = `${diff > 0 ? "+" : ""}${diff.toFixed(2)}%`;
  }

  [p1, p2].forEach(i => i.addEventListener("input", () => { calculatePercentage(); debouncedStatIncrement(); }));
  [i1, i2].forEach(i => i.addEventListener("input", () => { calculateDifference(); debouncedStatIncrement(); }));

  calculatePercentage();
  calculateDifference();

  let statsTimeout = null;
  function debouncedStatIncrement() {
    if (statsTimeout) clearTimeout(statsTimeout);
    statsTimeout = setTimeout(async () => {
      try {
        await fetch("/api/stats/increment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool_key: "percentage-calculator" })
        });
      } catch (e) {}
    }, 2000);
  }
});
