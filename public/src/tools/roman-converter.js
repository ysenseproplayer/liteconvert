document.addEventListener("DOMContentLoaded", () => {
  const intInput = document.getElementById("roman-int-input");
  const strOutput = document.getElementById("roman-str-output");
  const strInput = document.getElementById("roman-str-input");
  const intOutput = document.getElementById("roman-int-output");

  function integerToRoman(num) {
    if (num < 1 || num > 3999) return "N/A";
    const lookup = { M:1000, CM:900, D:500, CD:400, C:100, XC:90, L:50, XL:40, X:10, IX:9, V:5, IV:4, I:1 };
    let roman = "";
    for (let i in lookup) {
      while (num >= lookup[i]) {
        roman += i;
        num -= lookup[i];
      }
    }
    return roman;
  }

  function romanToInteger(str) {
    const roman = str.toUpperCase().trim();
    const lookup = { I:1, V:5, X:10, L:50, C:100, D:500, M:1000 };
    let num = 0;
    for (let i = 0; i < roman.length; i++) {
      const current = lookup[roman[i]];
      const next = lookup[roman[i+1]];
      if (next && current < next) {
        num += next - current;
        i++;
      } else {
        num += current;
      }
    }
    return isNaN(num) ? "Invalid" : num;
  }

  intInput.addEventListener("input", () => {
    strOutput.value = integerToRoman(parseInt(intInput.value) || 0);
    debouncedStatIncrement();
  });

  strInput.addEventListener("input", () => {
    intOutput.value = romanToInteger(strInput.value);
    debouncedStatIncrement();
  });

  strOutput.value = integerToRoman(parseInt(intInput.value) || 0);
  intOutput.value = romanToInteger(strInput.value);

  let statsTimeout = null;
  function debouncedStatIncrement() {
    if (statsTimeout) clearTimeout(statsTimeout);
    statsTimeout = setTimeout(async () => {
      try {
        await fetch("/api/stats/increment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool_key: "roman-converter" })
        });
      } catch (e) {}
    }, 2000);
  }
});
