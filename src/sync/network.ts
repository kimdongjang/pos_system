export type NetworkListener = (online: boolean) => void;

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export function subscribeNetwork(listener: NetworkListener): () => void {
  const handleOnline = () => listener(true);
  const handleOffline = () => listener(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}