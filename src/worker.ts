/// <reference lib="webworker" />

import { StorageData } from "./types";


const _self = self as unknown as ServiceWorkerGlobalScope;

const CACHE_NAME = "application";
const storage = new Map<string, StorageData>();
const defaultCacheOptions = { namespace: CACHE_NAME, cacheDuration: 31536000 }; 

// Helper function to persist storage to cache
async function persistToCache({namespace, cacheDuration}: {
  cacheDuration: number;
  namespace: string;
}): Promise<void> {
  cacheDuration = cacheDuration || defaultCacheOptions.cacheDuration;
  namespace = namespace || defaultCacheOptions.namespace;
  const cache = await caches.open(namespace);
  const promises: Promise<void>[] = [];
  

  for (const [key, value] of storage.entries()) {
    const response = new Response(JSON.stringify(value.data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "max-age=" + cacheDuration, // Default - 31536000 = 1 year
        "Last-Modified": new Date(value.timestamp).toUTCString(),
      },
    });
    promises.push(cache.put(`/cache-local-storage/storage/${key}`, response));
  }

  await Promise.all(promises);
}

// Handle install event
_self.addEventListener("install", (event) => {
  event.waitUntil(_self.skipWaiting());
});

// Handle activate event
_self.addEventListener("activate", (event) => {
  event.waitUntil(_self.clients.claim());
});

// Handle messages from the main thread
_self.addEventListener("message", (event) => {
  const client = event.ports[0];
  let { namespace, cacheDuration } = event.data;
  switch (event.data.type) {
    case "store":
      storage.set(event.data.key, {
        data: event.data.data,
        size: event.data.size,
        timestamp: Date.now(),
      });
      persistToCache({ namespace, cacheDuration }); // No await - runs in background
      client?.postMessage({ success: true });
      break;

    case "retrieve":
      const data = storage.get(event.data.key);
      client?.postMessage(data?.data ?? null);
      break;

    case "delete":
      storage.delete(event.data.key);
      persistToCache({ namespace, cacheDuration }); // No await - runs in background
      client?.postMessage({ success: true });
      break;

    case "clear":
      storage.clear();
      persistToCache({ namespace, cacheDuration }); // No await - runs in background
      client?.postMessage({ success: true });
      break;

    case "getSize":
      let totalSize = 0;
      for (const [, value] of storage.entries()) {
        totalSize += value.size;
      }
      client?.postMessage({ size: totalSize });
      break;
  }
});
