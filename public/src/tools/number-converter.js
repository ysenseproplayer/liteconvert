document.addEventListener("DOMContentLoaded", () => {
  const dec = document.getElementById("base-dec");
  const bin = document.getElementById("base-bin");
  const hex = document.getElementById("base-hex");
  const oct = document.getElementById("base-oct");

  dec.addEventListener("input", () => {
    const val = parseInt(dec.value, 10);
    if (isNaN(val)) { bin.value = ""; hex.value = ""; oct.value = ""; return; }
    bin.value = val.toString(2);
    hex.value = val.toString(16);
    oct.value = val.toString(8);
    debouncedStatIncrement();
  });

  bin.addEventListener("input", () => {
    const val = parseInt(bin.value, 2);
    if (isNaN(val)) { dec.value = ""; hex.value = ""; oct.value = ""; return; }
    dec.value = val.toString(10);
    hex.value = val.toString(16);
    oct.value = val.toString(8);
    debouncedStatIncrement();
  });

  hex.addEventListener("input", () => {
    const val = parseInt(hex.value, 16);
    if (isNaN(val)) { dec.value = ""; bin.value = ""; oct.value = ""; return; }
    dec.value = val.toString(10);
    bin.value = val.toString(2);
    oct.value = val.toString(8);
    debouncedStatIncrement();
  });

  let statsTimeout = null;
  function debouncedStatIncrement() {
    if (statsTimeout) clearTimeout(statsTimeout);
    statsTimeout = setTimeout(async () => {
      try {
        await fetch("/api/stats/increment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool_key: "number-converter" })
        });
      } catch (e) {}
    }, 2000);
  }
});
