document.addEventListener("DOMContentLoaded", () => {
  const jwtInput = document.getElementById("jwt-input");
  const jwtHeader = document.getElementById("jwt-header");
  const jwtPayload = document.getElementById("jwt-payload");

  jwtInput.addEventListener("input", () => {
    const token = jwtInput.value.trim();
    if (!token) { jwtHeader.value = ""; jwtPayload.value = ""; return; }
    
    try {
      const parts = token.split(".");
      if (parts.length < 2) throw new Error("Invalid JWT token format");
      
      const headerDec = atob(parts[0].replace(/-/g, "+").replace(/_/g, "/"));
      const payloadDec = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
      
      jwtHeader.value = JSON.stringify(JSON.parse(headerDec), null, 2);
      jwtPayload.value = JSON.stringify(JSON.parse(payloadDec), null, 2);
      
      debouncedStatIncrement();
    } catch (e) {
      jwtHeader.value = "Error parsing token headers";
      jwtPayload.value = e.message;
    }
  });

  let statsTimeout = null;
  function debouncedStatIncrement() {
    if (statsTimeout) clearTimeout(statsTimeout);
    statsTimeout = setTimeout(async () => {
      try {
        await fetch("/api/stats/increment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool_key: "jwt-decoder" })
        });
      } catch (e) {}
    }, 2000);
  }
});
