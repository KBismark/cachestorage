"use strict";
/// <reference lib="webworker" />
const exports = {};

var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };

Object.defineProperty(exports, "__esModule", { value: true });
const _self = self;
const CACHE_NAME = "application";
const storage = new Map();
const defaultCacheOptions = { namespace: CACHE_NAME, cacheDuration: 31536000 };
// Helper function to persist storage to cache
function persistToCache(_a) {
  return __awaiter(
    this,
    arguments,
    void 0,
    function* ({ namespace, cacheDuration }) {
      cacheDuration = cacheDuration || defaultCacheOptions.cacheDuration;
      namespace = namespace || defaultCacheOptions.namespace;
      const cache = yield caches.open(namespace);
      const promises = [];
      for (const [key, value] of storage.entries()) {
        const response = new Response(JSON.stringify(value.data), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "max-age=" + cacheDuration, // Default - 31536000 = 1 year
            "Last-Modified": new Date(value.timestamp).toUTCString(),
          },
        });
        promises.push(
          cache.put(`/cache-local-storage/storage/${key}`, response)
        );
      }
      yield Promise.all(promises);
    }
  );
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
  var _a;
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
      client === null || client === void 0
        ? void 0
        : client.postMessage({ success: true });
      break;
    case "retrieve":
      const data = storage.get(event.data.key);
      client === null || client === void 0
        ? void 0
        : client.postMessage(
            (_a = data === null || data === void 0 ? void 0 : data.data) !==
              null && _a !== void 0
              ? _a
              : null
          );
      break;
    case "delete":
      storage.delete(event.data.key);
      persistToCache({ namespace, cacheDuration }); // No await - runs in background
      client === null || client === void 0
        ? void 0
        : client.postMessage({ success: true });
      break;
    case "clear":
      storage.clear();
      persistToCache({ namespace, cacheDuration }); // No await - runs in background
      client === null || client === void 0
        ? void 0
        : client.postMessage({ success: true });
      break;
    case "getSize":
      let totalSize = 0;
      for (const [, value] of storage.entries()) {
        totalSize += value.size;
      }
      client === null || client === void 0
        ? void 0
        : client.postMessage({ size: totalSize });
      break;
  }
});
//# sourceMappingURL=worker.js.map
