export function formatElapsed(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function secondsSince(timestampMs: number) {
  return Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
}
