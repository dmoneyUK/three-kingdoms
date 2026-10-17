export function parseTestTimings(output) {
  const timings = [];
  let currentName = null;

  for (const line of output.split(/\r?\n/)) {
    const subtest = line.match(/^# Subtest: (.+)$/);
    if (subtest) {
      currentName = subtest[1];
      continue;
    }

    const duration = line.match(/^\s*duration_ms:\s*([\d.]+)/);
    if (duration && currentName) {
      timings.push({ name: currentName, duration: Number(duration[1]) });
      currentName = null;
    }
  }

  if (timings.length) return timings;

  return [...output.matchAll(/✔ (.+?) \(([\d.]+)ms\)/g)]
    .map(([, name, duration]) => ({ name, duration: Number(duration) }));
}
