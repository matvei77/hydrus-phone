import { useRegisterSW } from "virtual:pwa-register/react";

export function PwaUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh && !offlineReady) return null;
  return (
    <aside className="update-toast" role="status" aria-live="polite">
      <div>
        <strong>{needRefresh ? "Update ready" : "Ready offline"}</strong>
        <span>
          {needRefresh
            ? "Reload when you are ready to use the new version."
            : "The app shell is cached. Media still needs the desktop connection."}
        </span>
      </div>
      {needRefresh ? (
        <>
          <button className="secondary" onClick={() => setNeedRefresh(false)}>
            Later
          </button>
          <button className="primary" onClick={() => updateServiceWorker(true)}>
            Reload
          </button>
        </>
      ) : (
        <button className="secondary" onClick={() => setOfflineReady(false)}>
          Dismiss
        </button>
      )}
    </aside>
  );
}
