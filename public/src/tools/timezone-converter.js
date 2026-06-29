document.addEventListener("DOMContentLoaded", () => {
  const gmt = document.getElementById("tz-gmt");
  const est = document.getElementById("tz-est");
  const ist = document.getElementById("tz-ist");
  const pst = document.getElementById("tz-pst");

  function updateClocks() {
    const date = new Date();
    gmt.value = date.toLocaleString("en-US", { timeZone: "UTC" });
    est.value = date.toLocaleString("en-US", { timeZone: "America/New_York" });
    ist.value = date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    pst.value = date.toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
  }

  updateClocks();
  setInterval(updateClocks, 1000);

  // Log stats on load
  fetch("/api/stats/increment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool_key: "timezone-converter" })
  }).catch(e => {});
});
