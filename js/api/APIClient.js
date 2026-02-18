/**
 * FUTURY - API Client
 * Handles all HTTP requests to backend API
 * Features: response caching, request deduplication
 * @version 2.0.0
 */

export class APIClient {
    constructor() {
        this.baseURL = window.location.origin;
        this.timeout = 10000;
        this._cache = new Map();
        this._inflight = new Map();
        this._defaultCacheTTL = 30000; // 30s default cache
    }

    async get(endpoint, params = {}, cacheTTL = this._defaultCacheTTL) {
        const url = this.buildURL(endpoint, params);

        // Check cache
        if (cacheTTL > 0) {
            const cached = this._cache.get(url);
            if (cached && Date.now() - cached.time < cacheTTL) {
                return cached.data;
            }
        }

        // Deduplicate concurrent identical requests
        if (this._inflight.has(url)) {
            return this._inflight.get(url);
        }

        const promise = this.request(url, 'GET').then(data => {
            if (cacheTTL > 0) {
                this._cache.set(url, { data, time: Date.now() });
            }
            this._inflight.delete(url);
            return data;
        }).catch(err => {
            this._inflight.delete(url);
            throw err;
        });

        this._inflight.set(url, promise);
        return promise;
    }

    async post(endpoint, data = {}) {
        const url = this.baseURL + endpoint;
        // Invalidate related GET caches on mutation
        for (const key of this._cache.keys()) {
            if (key.includes(endpoint.split('?')[0])) {
                this._cache.delete(key);
            }
        }
        return await this.request(url, 'POST', data);
    }

    /** Clear all cached responses */
    clearCache() {
        this._cache.clear();
    }

    buildURL(endpoint, params) {
        const url = new URL(this.baseURL + endpoint);
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key]);
        });
        return url.toString();
    }

    async request(url, method, data = null) {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
}
