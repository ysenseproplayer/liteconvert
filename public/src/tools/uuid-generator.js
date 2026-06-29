document.addEventListener("DOMContentLoaded", () => {
  const count = document.getElementById("uuid-count");
  const upper = document.getElementById("uuid-upper");
  const output = document.getElementById("uuid-output");
  const btnGen = document.getElementById("btn-gen-uuid");
  const btnCopy = document.getElementById("btn-copy-uuid");

  btnGen.addEventListener("click", () => {
    const qty = parseInt(count.value) || 5;
    let uuids = [];
    for (let i = 0; i < qty; i++) {
      let id = crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
      if (upper.checked) id = id.toUpperCase();
      uuids.push(id);
    }
    output.value = uuids.join("\n");
    
    // Log MySQL Stat
    fetch("/api/stats/increment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool_key: "uuid-generator" })
    }).catch(e => {});
  });

  btnCopy.addEventListener("click", () => {
    if (!output.value) return;
    navigator.clipboard.writeText(output.value);
    alert("Copied UUIDs!");
  });
});
