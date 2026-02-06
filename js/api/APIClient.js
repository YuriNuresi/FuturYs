/**
 * FUTURY - API Client
 * Handles all HTTP requests to backend API
 */

export class APIClient {
    constructor() {
        this.baseURL = window.location.origin;
        this.timeout = 10000;
    }
    
    async get(endpoint, params = {}) {
        const url = this.buildURL(endpoint, params);
        return await this.request(url, 'GET');
    }
    
    async post(endpoint, data = {}) {
        const url = this.baseURL + endpoint;
        return await this.request(url, 'POST', data);
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
