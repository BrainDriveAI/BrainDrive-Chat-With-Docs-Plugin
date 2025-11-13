import type { ChatSession, ChatMessage } from '../../braindrive-plugin/pluginTypes';
import type { HttpClient } from '../http/HttpClient';

/**
 * ChatSessionRepository - Single Responsibility: Chat session I/O operations
 *
 * Handles all HTTP communication for chat sessions and messages.
 * No business logic, just data access.
 */
export class ChatSessionRepository {
    constructor(private http: HttpClient) {}

    async findAll(): Promise<ChatSession[]> {
        return this.http.get<ChatSession[]>('/chat/sessions');
    }

    async findById(id: string): Promise<ChatSession> {
        return this.http.get<ChatSession>(`/chat/sessions/${id}`);
    }

    async findMessages(sessionId: string): Promise<ChatMessage[]> {
        return this.http.get<ChatMessage[]>(`/chat/messages?session_id=${sessionId}`);
    }

    async createSession(session: Partial<ChatSession>): Promise<ChatSession> {
        return this.http.post<ChatSession>('/chat/sessions', session);
    }

    async createMessage(message: Partial<ChatMessage>): Promise<ChatMessage> {
        return this.http.post<ChatMessage>('/chat/messages', message);
    }

    async deleteSession(id: string): Promise<void> {
        return this.http.delete<void>(`/chat/sessions/${id}`);
    }
}
