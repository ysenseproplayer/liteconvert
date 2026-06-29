document.addEventListener('DOMContentLoaded', () => {
  const cronMinute = document.getElementById('cron-minute');
  const cronHour = document.getElementById('cron-hour');
  const cronDay = document.getElementById('cron-day');
  const cronMonth = document.getElementById('cron-month');
  const cronWeekday = document.getElementById('cron-weekday');
  const output = document.getElementById('cron-output');
  const description = document.getElementById('cron-description');
  const btnCopy = document.getElementById('btn-copy-cron');

  const selectors = [cronMinute, cronHour, cronDay, cronMonth, cronWeekday];
  selectors.forEach(s => s.addEventListener('change', generateCron));

  btnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(output.value);
    alert('Copied Cron expression to clipboard!');
  });

  const cronDescriptions = {
    '* * * * *': 'Runs at every minute, every hour, every day.',
    '*/5 * * * *': 'Runs every 5 minutes, every hour, every day.',
    '0 * * * *': 'Runs at minute 0 of every hour (hourly).',
    '0 0 * * *': 'Runs at 00:00 (Midnight) every day.',
    '0 12 * * *': 'Runs at 12:00 (Noon) every day.',
    '0 0 1 * *': 'Runs at 00:00 on the first day of every month.',
    '0 0 * 1 *': 'Runs at 00:00 every day in January.',
    '0 0 * * 1-5': 'Runs at 00:00, Monday through Friday (weekdays only).',
    '0 0 * * 0,6': 'Runs at 00:00, Saturday and Sunday (weekends only).',
  };

  function generateCron() {
    const min = cronMinute.value;
    const hr = cronHour.value;
    const day = cronDay.value;
    const mon = cronMonth.value;
    const wday = cronWeekday.value;
    
    const expr = `${min} ${hr} ${day} ${mon} ${wday}`;
    output.value = expr;

    // Search custom description or construct base
    let desc = cronDescriptions[expr];
    if (!desc) {
      desc = `Runs at Schedule: "${expr}". Triggers on minute ${min}, hour ${hr}, day of month ${day}, month ${mon}, day of week ${wday}.`;
    }
    description.textContent = desc;

    debouncedStatIncrement();
  }

  generateCron();

  let statsTimeout = null;
  function debouncedStatIncrement() {
    if (statsTimeout) clearTimeout(statsTimeout);
    statsTimeout = setTimeout(async () => {
      try {
        await fetch('/api/stats/increment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool_key: 'cron-generator' })
        });
      } catch (err) {
        console.error('Failed to log stats:', err);
      }
    }, 2000);
  }
});
