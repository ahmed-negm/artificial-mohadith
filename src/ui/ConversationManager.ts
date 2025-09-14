import { ChatMessage, Conversation } from './ChatModels';

export class ConversationManager {
  private conversations: Map<string, Conversation> = new Map();
  private activeConversationId: string | null = null;
  private maxMessagesPerConversation: number;

  constructor(maxMessagesPerConversation: number = 30) {
    this.maxMessagesPerConversation = maxMessagesPerConversation;
  }

  public loadFromStorage(data: string) {
    try {
      const parsed = JSON.parse(data);
      
      if (Array.isArray(parsed.conversations)) {
        parsed.conversations.forEach((conv: Conversation) => {
          this.conversations.set(conv.id, conv);
        });
      }
      
      this.activeConversationId = parsed.activeConversationId || null;
      
      // If no active conversation, create one
      if (!this.activeConversationId || !this.conversations.has(this.activeConversationId)) {
        this.createNewConversation();
      }
    } catch (e) {
      console.error('Failed to load conversations from storage:', e);
      this.createNewConversation();
    }
  }

  public saveToStorage(): string {
    return JSON.stringify({
      conversations: Array.from(this.conversations.values()),
      activeConversationId: this.activeConversationId
    });
  }

  public createNewConversation(title: string = 'New Conversation'): string {
    const id = crypto.randomUUID();
    const now = Date.now();
    
    const newConversation: Conversation = {
      id,
      title,
      messages: [],
      createdAt: now,
      updatedAt: now
    };
    
    this.conversations.set(id, newConversation);
    this.activeConversationId = id;
    
    return id;
  }

  public getActiveConversation(): Conversation | null {
    if (!this.activeConversationId) {
      return null;
    }
    
    return this.conversations.get(this.activeConversationId) || null;
  }

  public setActiveConversation(id: string): boolean {
    if (!this.conversations.has(id)) {
      return false;
    }
    
    this.activeConversationId = id;
    return true;
  }

  public addMessage(message: Omit<ChatMessage, 'id'>, conversationId?: string): ChatMessage {
    const targetId = conversationId || this.activeConversationId;
    
    if (!targetId || !this.conversations.has(targetId)) {
      throw new Error('No active conversation');
    }
    
    const conversation = this.conversations.get(targetId)!;
    
    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID()
    };
    
    conversation.messages.push(newMessage);
    conversation.updatedAt = Date.now();
    
    // Limit conversation size
    if (conversation.messages.length > this.maxMessagesPerConversation) {
      conversation.messages = conversation.messages.slice(-this.maxMessagesPerConversation);
    }
    
    return newMessage;
  }

  public getAllConversations(): Conversation[] {
    return Array.from(this.conversations.values())
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public deleteConversation(id: string): boolean {
    if (!this.conversations.has(id)) {
      return false;
    }
    
    this.conversations.delete(id);
    
    // If we deleted the active conversation, set a new one
    if (this.activeConversationId === id) {
      const allConversations = this.getAllConversations();
      
      if (allConversations.length > 0) {
        this.activeConversationId = allConversations[0].id;
      } else {
        this.createNewConversation();
      }
    }
    
    return true;
  }

  public renameConversation(id: string, newTitle: string): boolean {
    if (!this.conversations.has(id)) {
      return false;
    }
    
    const conversation = this.conversations.get(id)!;
    conversation.title = newTitle;
    conversation.updatedAt = Date.now();
    
    return true;
  }

  public clearConversation(id?: string): boolean {
    const targetId = id || this.activeConversationId;
    
    if (!targetId || !this.conversations.has(targetId)) {
      return false;
    }
    
    const conversation = this.conversations.get(targetId)!;
    conversation.messages = [];
    conversation.updatedAt = Date.now();
    
    return true;
  }
}