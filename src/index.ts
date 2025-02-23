import { CompressionOptions, EncryptedData, Schema, SchemaDefinition, StorageOptions, StorageResult, StorageStats } from "./types";

/**
 * Main storage class with TypeScript support
 */
class CacheLocalStorage {
  private readonly baseUrl: string;
  private readonly maxSize: number;
  private readonly encryptionKey?: string;
  private readonly namespace: string;
  private readonly cacheDuration: number;
  private readonly hasWebCrypto: boolean;
  private readonly initPromise: Promise<void>;
  private readonly cacheStore: Map<string, any>;
  private readonly compression: CompressionOptions;
  private hasServiceWorker: boolean;
  private currentSize: number;

  constructor(options: StorageOptions = {}) {
    this.maxSize = options.maxSize || 50 * 1024 * 1024; // 50MB default
    this.encryptionKey = options.encryptionKey;
    this.namespace = options.namespace || "application";
    this.cacheDuration = options.cacheDuration || 31536000; // 1 year default
    this.baseUrl = `/cache-local-storage/storage/`;
    this.hasServiceWorker = "serviceWorker" in navigator;
    this.hasWebCrypto = "crypto" in window && "subtle" in window.crypto;
    this.currentSize = 0;
    this.cacheStore = new Map(); // In-memory cache for performance
    this.compression = {
      enabled: options.compression?.enabled ?? false,
      level: options.compression?.level ?? 6,
      threshold: options.compression?.threshold ?? 1024, // 1KB default
    };
    this.initPromise = this.init();
  }

  /**
   * Initialize storage system
   * @private
   */
  private async init(): Promise<void> {
    try {
      if (this.hasServiceWorker) {
        await this.initServiceWorker();
      }
      await this.calculateCurrentSize();
    } catch (error) {
      console.warn("Storage initialization error:", error);
      // Continue without failing - will use fallback mechanisms
    }
  }

  /**
   * Initialize service worker if available
   * @private
   */
  private async initServiceWorker(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.register("/cls.js");
      await navigator.serviceWorker.ready;

      // Ensure service worker is controlling the page
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener("controllerchange", () =>
            resolve()
          );
        });
      }
    } catch (error) {
      console.warn("Service Worker registration failed:", error);
      this.hasServiceWorker = false; // Fallback to cache-only mode
    }
  }

  /**
   * Calculate current storage size
   * @private
   */
  private async calculateCurrentSize(): Promise<number> {
    try {
      if (this.hasServiceWorker) {
        const response = await this.postServiceWorkerMessage({
          type: "getSize",
        });
        this.currentSize = response.size;
      } else {
        const cache = await caches.open(this.namespace);
        const keys = await cache.keys();
        this.currentSize = await this.calculateCacheSize(
          cache,
          keys as Request[]
        );
      }
    } catch (error) {
      console.warn("Size calculation error:", error);
      this.currentSize = 0; // Reset on error
    }
    return this.currentSize;
  }

  /**
   * Helper method to calculate cache size
   * @private
   */
  private async calculateCacheSize(
    cache: Cache,
    keys: Request[]
  ): Promise<number> {
    let size = 0;
    for (const key of keys) {
      const response = await cache.match(key);
      if (response) {
        const blob = await response.blob();
        size += blob.size;
      }
    }
    return size;
  }

  /**
   * Convert data to string format suitable for encryption
   * @private
   */
  private dataToString(data: string | Uint8Array): string {
    if (typeof data === "string") {
      return data;
    }
    // Convert Uint8Array to base64 string for consistent handling
    return btoa(String.fromCharCode.apply(null, data as any));
  }

  /**
   * Convert string back to original format
   * @private
   */
  private stringToData(
    str: string,
    wasCompressed: boolean
  ): string | Uint8Array {
    if (!wasCompressed) {
      return str;
    }
    // Convert base64 string back to Uint8Array
    const binaryStr = atob(str);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Encrypt data if encryption is enabled and available
   * @private
   */
  private async encrypt(data: string | Uint8Array): Promise<EncryptedData> {
    if (!this.encryptionKey || !this.hasWebCrypto) {
      throw new Error("Encryption not available");
    }

    try {
      const stringData = this.dataToString(data);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(stringData);

      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(this.encryptionKey),
        { name: "AES-GCM" },
        false,
        ["encrypt"]
      );

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        dataBuffer
      );

      return {
        data: Array.from(new Uint8Array(encrypted)),
        iv: Array.from(iv),
        wasCompressed: data instanceof Uint8Array, // Store format information
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Decrypt data if encryption is enabled and available
   * @private
   */
  private async decrypt(
    encryptedData: EncryptedData
  ): Promise<string | Uint8Array> {
    if (!this.encryptionKey || !this.hasWebCrypto) {
      throw new Error("Decryption not available");
    }

    try {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(this.encryptionKey),
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(encryptedData.iv) },
        key,
        new Uint8Array(encryptedData.data)
      );

      const decryptedString = new TextDecoder().decode(decrypted);
      return this.stringToData(decryptedString, encryptedData.wasCompressed);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate data against schema
   * @private
   */
  private validateSchema<T>(data: T, schema: Schema): boolean {
    for (const [key, def] of Object.entries(schema)) {
      const value = (data as any)[key];

      if (def.required && value === undefined) {
        throw new Error(`Required field missing: ${key}`);
      }

      if (value !== undefined) {
        if (typeof value !== def.type) {
          throw new Error(
            `Invalid type for ${key}: expected ${def.type}, got ${typeof value}`
          );
        }

        if (def.validate && !def.validate(value)) {
          throw new Error(`Validation failed for ${key}`);
        }
      }
    }
    return true;
  }

  /**
   * Compress data using CompressionStream API with fallback
   * @private
   */
  private async compress(data: string): Promise<string | Uint8Array> {
    if (!this.compression.enabled) return data;

    const bytes = new TextEncoder().encode(data);
    if (bytes.length < (this.compression.threshold as number)) return data;

    try {
      // Try modern CompressionStream API first
      if ("CompressionStream" in window) {
        const cs = new CompressionStream("gzip");
        const writer = cs.writable.getWriter();
        const reader = cs.readable.getReader();
        const chunks: Uint8Array[] = [];

        await writer.write(bytes);
        await writer.close();

        let result: ReadableStreamReadResult<Uint8Array>;
        while (!(result = await reader.read()).done) {
          chunks.push(result.value);
        }

        const compressed = new Uint8Array(
          chunks.reduce((acc, chunk) => acc + chunk.length, 0)
        );
        let offset = 0;
        for (const chunk of chunks) {
          compressed.set(chunk, offset);
          offset += chunk.length;
        }

        return compressed;
      }

      // Fallback to pako if available
      if ("pako" in window) {
        const pako = (window as any).pako;
        return pako.gzip(data, { level: this.compression.level });
      }

      // If no compression method is available, return original data
      return data;
    } catch (error) {
      console.warn("Compression failed:", error);
      return data;
    }
  }

  /**
   * Decompress data using DecompressionStream API with fallback
   * @private
   */
  private async decompress(data: string | Uint8Array): Promise<string> {
    if (!this.compression.enabled || typeof data === "string")
      return data as string;

    try {
      // Try modern DecompressionStream API first
      if ("DecompressionStream" in window) {
        const ds = new DecompressionStream("gzip");
        const writer = ds.writable.getWriter();
        const reader = ds.readable.getReader();
        const chunks: Uint8Array[] = [];

        await writer.write(data);
        await writer.close();

        let result: ReadableStreamReadResult<Uint8Array>;
        while (!(result = await reader.read()).done) {
          chunks.push(result.value);
        }

        const decompressed = new Uint8Array(
          chunks.reduce((acc, chunk) => acc + chunk.length, 0)
        );
        let offset = 0;
        for (const chunk of chunks) {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        }

        return new TextDecoder().decode(decompressed);
      }

      // Fallback to pako if available
      if ("pako" in window) {
        const pako = (window as any).pako;
        const decompressed = pako.ungzip(data, { to: "string" });
        return decompressed;
      }

      throw new Error("No decompression method available");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get compression statistics for a stored item
   */
  public async getCompressionStats(key: string): Promise<{
    compressed: boolean;
    originalSize: number;
    compressedSize: number;
    savingsPercent: number;
  } | null> {
    try {
      let storedData: {
        data: string | EncryptedData;
        metadata: {
          compressed: boolean;
          originalSize: number;
          compressedSize: number;
        };
      } | null;
      if (this.hasServiceWorker) {
        storedData = await this.postServiceWorkerMessage({
          type: "retrieve",
          key,
          namespace: this.namespace,
          cacheDuration: this.cacheDuration,
        });
      } else {
        const cache = await caches.open(this.namespace);
        const response = await cache.match(this.baseUrl + key);
        if (!response) return null;
        storedData = await response.json();
      }

      if (!storedData?.metadata) return null;

      const { originalSize, compressedSize } = storedData.metadata;
      const savingsPercent =
        ((originalSize - compressedSize) / originalSize) * 100;

      return {
        compressed: storedData.metadata.compressed,
        originalSize,
        compressedSize,
        savingsPercent,
      };
    } catch (error) {
      console.warn("Failed to get compression stats:", error);
      return null;
    }
  }

  /**
   * Store data with optional schema validation
   */
  public async setItem<T>(
    key: string,
    data: T,
    schema?: Schema
  ): Promise<StorageResult<T>> {
    try {
      await this.initPromise;

      if (schema) {
        this.validateSchema(data, schema);
      }

      const serialized = JSON.stringify(data);
      const compressed = await this.compress(serialized);
      const size =
        compressed instanceof Uint8Array
          ? compressed.length
          : new Blob([compressed]).size;

      if (this.currentSize + size > this.maxSize) {
        throw new Error("Storage quota exceeded");
      }

      const storageData = {
        data: this.encryptionKey ? await this.encrypt(compressed) : compressed,
        metadata: {
          compressed: compressed !== serialized,
          originalSize: new Blob([serialized]).size,
          compressedSize: size,
        },
      };

      if (this.hasServiceWorker) {
        await this.postServiceWorkerMessage({
          type: "store",
          key,
          data: storageData,
          size,
          namespace: this.namespace,
          cacheDuration: this.cacheDuration,
        });
      } else {
        await this.storeInCache(this.baseUrl + key, storageData);
      }

      this.currentSize += size;
      this.cacheStore.set(key, data);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * Retrieve data with optional type checking
   */
  public async getItem<T>(key: string): Promise<StorageResult<T>> {
    try {
      await this.initPromise;

      const cachedData = this.cacheStore.get(key);
      if (cachedData) {
        return { success: true, data: cachedData };
      }

      let storedData;
      if (this.hasServiceWorker) {
        storedData = await this.postServiceWorkerMessage({
          type: "retrieve",
          key,
          namespace: this.namespace,
          cacheDuration: this.cacheDuration,
        });
      } else {
        const cache = await caches.open(this.namespace);
        const response = await cache.match(this.baseUrl + key);
        if (!response)
          return { success: false, error: new Error("Item not found") };
        storedData = await response.json();
      }

      if (!storedData || !storedData.data) {
        return { success: false, error: new Error("Item not found") };
      }

      const { data, metadata = {} } = storedData;

      let decrypted = this.encryptionKey ? await this.decrypt(data) : data;

      if (metadata.compressed) {
        decrypted = await this.decompress(decrypted);
      }

      const parsed = JSON.parse(decrypted) as T;
      this.cacheStore.set(key, parsed);

      return { success: true, data: parsed };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * Update specific properties of stored data
   */
  public async updateItem<T>(
    key: string,
    updates: Partial<T>,
    schema?: Schema
  ): Promise<StorageResult<T>> {
    try {
      const current = await this.getItem<T>(key);
      if (!current.success || !current.data) {
        throw new Error(`Item with key ${key} not found`);
      }

      const updatedData = { ...current.data, ...updates };
      return this.setItem(key, updatedData, schema);
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  public async removeItem(key: string) {
    try {
      const cache = await caches.open(this.namespace);
      await cache.delete(this.baseUrl + key);
      this.cacheStore.delete(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  public async clear() {
    try {
      await caches.delete(this.namespace);
      this.cacheStore.clear();
      return true;
    } catch (error) {
      return false;
    }
  }
  /**
   * Get storage statistics
   */
  public async getStats(): Promise<StorageStats> {
    await this.calculateCurrentSize();
    return {
      used: this.currentSize,
      total: this.maxSize,
      available: this.maxSize - this.currentSize,
      percentUsed: (this.currentSize / this.maxSize) * 100,
    };
  }

  /**
   * Helper method to store data in cache
   * @private
   */
  private async storeInCache(url: string, data: any): Promise<void> {
    const response = new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `max-age=${this.cacheDuration}`,
        "Last-Modified": new Date().toUTCString(),
      },
    });

    const cache = await caches.open(this.namespace);
    await cache.put(url, response);
  }

  /**
   * Helper method to communicate with Service Worker
   * @private
   */
  private async postServiceWorkerMessage(message: any): Promise<any> {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => resolve(event.data);
      navigator.serviceWorker.controller?.postMessage(message, [channel.port2]);
    });
  }
}

// Export types for consumers
export type {
  StorageOptions,
  StorageStats,
  Schema,
  SchemaDefinition,
  StorageResult,
};

export default CacheLocalStorage;
