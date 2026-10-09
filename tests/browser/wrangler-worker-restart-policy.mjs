export function hasKnownProxyDisconnect(log) {
  const marker = log.lastIndexOf("Error in ProxyController: Error inside ProxyWorker");
  if (marker < 0) return false;
  const failure = log.slice(marker);
  const disconnect = failure.indexOf("Network connection lost.");
  return disconnect >= 0 && !failure.slice(disconnect + "Network connection lost.".length).includes("Error in ");
}

export function shouldRestartAfterKnownProxyDisconnect({ code, wasReady, log }) {
  return code === 1 && wasReady && hasKnownProxyDisconnect(log);
}
