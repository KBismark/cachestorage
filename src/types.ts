/**
 * Configuration options for MyLocalStorage
 */
export interface StorageOptions {
  /** Maximum storage size in bytes */
  maxSize?: number;

  /** Optional encryption key */
  encryptionKey?: string;

  /** Storage namespace for multi-app support */
  namespace?: string;

  /** Cache duration in seconds */
  cacheDuration?: number;

  /** Compression configurations */
  compression?: CompressionOptions;
}

export interface CompressionOptions {
  /** Enable compression? */
  enabled: boolean;

  /** Compression level (1-9) */
  level?: number;
  
  /** Minimum size in bytes before compression is applied */
  threshold?: number;
}

/**
 * Storage statistics export 
 */
export interface StorageStats {
  used: number;
  total: number;
  available: number;
  percentUsed: number;
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  data: number[];
  iv: number[];
  wasCompressed: boolean;
}

/**
 * Schema validation types
 */
export type SchemaType = "string" | "number" | "boolean" | "object" | "array";

export interface SchemaDefinition {
  type: SchemaType;
  required?: boolean;
  validate?: (value: any) => boolean;
}

export type Schema = Record<string, SchemaDefinition>;

/**
 * Storage operation result
 */
export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}


export interface StorageData {
  data: any;
  size: number;
  timestamp: number;
}