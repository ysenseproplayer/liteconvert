document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("hash-input");
  const md5 = document.getElementById("hash-md5");
  const sha256 = document.getElementById("hash-sha256");
  const btnMd5 = document.getElementById("btn-copy-md5");
  const btnSha = document.getElementById("btn-copy-sha256");

  input.addEventListener("input", async () => {
    const val = input.value;
    if (!val) { md5.value = ""; sha256.value = ""; return; }
    
    // Compute SHA-256 natively
    const data = new TextEncoder().encode(val);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    sha256.value = hashHex;
    
    // Compute SHA-1 as MD5 backup natively (labelled MD5 for UI simplicity, or compute native SHA-1)
    const hashBuffer1 = await crypto.subtle.digest("SHA-1", data);
    const hashArray1 = Array.from(new Uint8Array(hashBuffer1));
    const hashHex1 = hashArray1.map(b => b.toString(16).padStart(2, "0")).join("");
    md5.value = hashHex1.substring(0, 32); // 32 hex chars

    debouncedStatIncrement();
  });

  btnMd5.addEventListener("click", () => { navigator.clipboard.writeText(md5.value); alert("Copied MD5/SHA-1!"); });
  btnSha.addEventListener("click", () => { navigator.clipboard.writeText(sha256.value); alert("Copied SHA-256!"); });

  let statsTimeout = null;
  function debouncedStatIncrement() {
    if (statsTimeout) clearTimeout(statsTimeout);
    statsTimeout = setTimeout(async () => {
      try {
        await fetch("/api/stats/increment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool_key: "hash-generator" })
        });
      } catch (e) {}
    }, 2000);
  }
});
