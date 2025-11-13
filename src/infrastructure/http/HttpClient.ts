import type { Services } from '../../types';

/**
 * HttpClient - Single Responsibility: HTTP transport abstraction
 *
 * Handles the switch between BrainDrive's API service and raw fetch.
 * No business logic, just I/O.
 */
export class HttpClient {
    private apiService: Services['api'];
    private baseUrl: string;

    constructor(apiService: Services['api'], baseUrl: string) {
        this.apiService = apiService;
        this.baseUrl = baseUrl;
    }

    async get<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, 'GET');
    }

    async post<T>(endpoint: string, data?: any): Promise<T> {
        return this.request<T>(endpoint, 'POST', data);
    }

    async put<T>(endpoint: string, data?: any): Promise<T> {
        return this.request<T>(endpoint, 'PUT', data);
    }

    async delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, 'DELETE');
    }

    private async request<T>(
        endpoint: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        data?: any
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        if (this.apiService) {
            // Use BrainDrive service API
            switch (method) {
                case 'GET': return this.apiService.get<T>(url);
                case 'POST': return this.apiService.post<T>(url, data);
                case 'PUT': return this.apiService.put<T>(url, data);
                case 'DELETE': return this.apiService.delete<T>(url);
            }
        } else {
            // Fallback to raw fetch
            const options: RequestInit = {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: data ? JSON.stringify(data) : undefined,
                signal: method === 'GET' ? AbortSignal.timeout(10000) : undefined,
            };

            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP ${method} ${url} failed: ${response.status}`);
            }

            // Handle no-content responses (e.g., DELETE)
            return response.status === 204 ? ({} as T) : response.json();
        }
    }
}
