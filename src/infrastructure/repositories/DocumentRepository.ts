import type { Document } from '../../braindrive-plugin/pluginTypes';
import type { HttpClient } from '../http/HttpClient';

/**
 * DocumentRepository - Single Responsibility: Document I/O operations
 *
 * Handles all HTTP communication for documents.
 * No business logic, just data access.
 */
export class DocumentRepository {
    constructor(private http: HttpClient) {}

    async findByCollection(collectionId: string): Promise<Document[]> {
        return this.http.get<Document[]>(`/documents/?collection_id=${collectionId}`);
    }

    async findById(id: string): Promise<Document> {
        return this.http.get<Document>(`/documents/${id}`);
    }

    async create(document: Partial<Document>): Promise<Document> {
        return this.http.post<Document>('/documents/', document);
    }

    async update(id: string, document: Partial<Document>): Promise<Document> {
        return this.http.put<Document>(`/documents/${id}`, document);
    }

    async delete(id: string): Promise<void> {
        return this.http.delete<void>(`/documents/${id}`);
    }
}
