/**
 * A single chat message in the UI.
 */
export interface ChatMessage {
    id: string;
    role: 'system' | 'user' | 'assistant';
    parts: Array<{ type: 'text'; text: string }>;
    metadata?: {
      createdAt: string;
    };
  }
  
  /**
   * Simple attachment object (for images, files, etc).
   */
  export interface Attachment {
    name: string;
    url: string;
    contentType: string;
  }
  