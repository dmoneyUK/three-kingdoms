export const MAX_KNOWN_PROXY_RESTARTS = 2;

export function hasKnownProxyDisconnect(log) {
  const marker = log.lastIndexOf("Error in ProxyController: Error inside ProxyWorker");
  if (marker < 0) return false;
  const failure = log.slice(marker);
  const disconnect = failure.indexOf("Network connection lost.");
  return disconnect >= 0 && !failure.slice(disconnect + "Network connection lost.".length).includes("Error in ");
}

export function shouldRestartAfterKnownProxyDisconnect({ code, wasReady, restartCount, log }) {
  return code === 1 && wasReady && restartCount < MAX_KNOWN_PROXY_RESTARTS && hasKnownProxyDisconnect(log);
}
