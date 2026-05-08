/**
 * Simple in-memory LRU cache for schema metadata
 * Avoids external dependencies like Redis
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export class SchemaCache {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;
  private ttlMs: number;

  /**
   * Create a new schema cache
   * @param maxSize Maximum number of entries (default: 100)
   * @param ttlMs Time to live in milliseconds (default: 5 minutes)
   */
  constructor(maxSize = 100, ttlMs = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns Cached value or undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value as T;
  }

  /**
   * Set a value in the cache
   * @param key Cache key
   * @param value Value to cache
   */
  set<T>(key: string, value: T): void {
    // Remove oldest entry if at max size
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if a key exists in the cache (and is not expired)
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }
}

// Export a singleton instance for schema metadata
export const schemaCache = new SchemaCache(100, 5 * 60 * 1000); // 100 entries, 5 min TTL
