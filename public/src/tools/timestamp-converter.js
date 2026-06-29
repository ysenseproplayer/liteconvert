document.addEventListener("DOMContentLoaded", () => {
  const timeUnix = document.getElementById("time-unix");
  const timeDateGmt = document.getElementById("time-date-gmt");
  const timeDateLocal = document.getElementById("time-date-local");
  
  const timeYear = document.getElementById("time-year");
  const timeMonth = document.getElementById("time-month");
  const timeDay = document.getElementById("time-day");
  const btnDateToUnix = document.getElementById("btn-date-to-unix");
  const timeUnixOutput = document.getElementById("time-unix-output");

  timeUnix.addEventListener("input", () => {
    const val = parseInt(timeUnix.value.trim());
    if (isNaN(val)) { timeDateGmt.value = ""; timeDateLocal.value = ""; return; }
    
    const date = new Date(val * 1000);
    timeDateGmt.value = date.toUTCString();
    timeDateLocal.value = date.toString();
  });

  btnDateToUnix.addEventListener("click", () => {
    const yr = parseInt(timeYear.value) || 2026;
    const mon = (parseInt(timeMonth.value) || 1) - 1; // JS months are 0-11
    const dy = parseInt(timeDay.value) || 25;
    
    const date = new Date(yr, mon, dy);
    const epoch = Math.floor(date.getTime() / 1000);
    timeUnixOutput.value = epoch;
    
    // Log MySQL Stat
    fetch("/api/stats/increment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool_key: "timestamp-converter" })
    }).catch(e => {});
  });
});
