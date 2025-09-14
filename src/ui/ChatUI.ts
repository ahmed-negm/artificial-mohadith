import { MarkdownRenderer, Notice, setIcon } from 'obsidian';
import ArtificialMohadithPlugin from '../main';
import { callGemini, callGeminiWithContext, ApiStatusCallbacks } from '../api/gemini';
import { ChatMessage } from './ChatModels';
import { ConversationManager } from './ConversationManager';

export default class ChatUI {
  container: HTMLElement;
  plugin: ArtificialMohadithPlugin;
  
  // UI elements
  private chatEl?: HTMLElement;
  private inputEl?: HTMLTextAreaElement;
  private sendBtn?: HTMLButtonElement;
  private loadingEl?: HTMLElement;
  private loadingOverlayEl?: HTMLElement;
  private scrollAnchor?: HTMLElement;
  private conversationSelector?: HTMLSelectElement;
  private headerEl?: HTMLElement;
  private actionsEl?: HTMLElement;
  
  // State management
  private conversationManager: ConversationManager;
  private isStreaming = false;
  private currentStreamedMessageId?: string;
  
  constructor(container: HTMLElement, plugin: ArtificialMohadithPlugin) {
    this.container = container;
    this.plugin = plugin;
    this.conversationManager = new ConversationManager(this.plugin.settings?.maxHistoryLength || 30);
    
    // Try to load conversation history from storage
    try {
      const savedData = this.plugin.getConversations();
      if (savedData) {
        this.conversationManager.loadFromStorage(savedData);
      } else {
        this.conversationManager.createNewConversation('New Chat');
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
      this.conversationManager.createNewConversation('New Chat');
    }
  }

  init() {
    this.container.empty();
    this.container.addClass('gemini-chat-container');
    
    // Apply theme based on settings
    this.applyTheme();

    // Main chat card container with modern design
    const card = this.container.createDiv('gemini-chat-card');

    // Create loading overlay for full screen loading animations
    this.loadingOverlayEl = card.createDiv('gemini-loading-overlay');
    const overlaySpinner = this.loadingOverlayEl.createDiv('gemini-loading-overlay-spinner');
    const overlayText = this.loadingOverlayEl.createDiv('gemini-loading-overlay-text');
    overlayText.innerHTML = 'Fetching data<span class="gemini-loading-dots"></span>';

    // Header bar with logo, title, and actions
    this.headerEl = card.createDiv('gemini-chat-header');
    this.createHeader();
    
    // Chat area (messages)
    const chatWrapper = card.createDiv({ cls: 'gemini-chat-wrapper' });
    this.chatEl = chatWrapper.createDiv('gemini-chat');
    this.scrollAnchor = this.chatEl.createDiv({ cls: 'gemini-scroll-anchor' });

    // Load conversation history
    this.renderConversationHistory();

    // Loading indicator (now placed above the input area)
    this.loadingEl = card.createDiv('gemini-loading');
    this.loadingEl.innerHTML = `<span class="gemini-spinner"></span> Thinking...`;
    this.loadingEl.hide();
    
    // Input area (docked at bottom) - Added directly to container for absolute positioning
    const inputContainer = this.container.createDiv('gemini-input-container');
    
    // Actions bar (buttons)
    this.actionsEl = inputContainer.createDiv('gemini-actions');
    this.createActionButtons();
    
    // Input wrapper for positioning - making it take full width
    const inputWrapper = inputContainer.createDiv('gemini-input-wrapper');
    
    // Text input (full width)
    this.inputEl = inputWrapper.createEl('textarea', { 
      cls: 'gemini-input', 
      attr: { 
        placeholder: 'Message Artificial Mohadith...',
        rows: '1'
      } 
    });
    
    // Auto-resize input as user types
    this.inputEl.addEventListener('input', this.autoResizeInput.bind(this));
    
    // Controls container (absolutely positioned)
    const controlsContainer = inputWrapper.createDiv('gemini-controls');
    
    // Send button
    this.sendBtn = controlsContainer.createEl('button', { 
      cls: 'gemini-send-btn', 
      attr: { 'aria-label': 'Send' } 
    });
    setIcon(this.sendBtn, 'arrow-up');
    
    // Event listeners
    this.sendBtn.addEventListener('click', () => this.handleSend());
    this.inputEl.addEventListener('keydown', (e) => {
      // Send on Enter (but not with Shift+Enter for newlines)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
      
      // Grow input as needed
      this.autoResizeInput();
    });
  }
  
  private createHeader() {
    if (!this.headerEl) return;
    
    this.headerEl.empty();
    
    // Logo
    const logoContainer = this.headerEl.createDiv('gemini-logo');
    setIcon(logoContainer, 'message-square');
    
    // Title with dropdown for conversation selection
    const titleContainer = this.headerEl.createDiv('gemini-title-container');
    
    // Conversation selector
    this.conversationSelector = titleContainer.createEl('select', { cls: 'gemini-conversation-selector' });
    
    // Populate conversation options
    const conversations = this.conversationManager.getAllConversations();
    const activeConversation = this.conversationManager.getActiveConversation();
    
    conversations.forEach(conv => {
      const option = this.conversationSelector!.createEl('option', {
        text: conv.title,
        value: conv.id
      });
      
      if (activeConversation && conv.id === activeConversation.id) {
        option.selected = true;
      }
    });
    
    // Handle conversation change
    this.conversationSelector.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      const selectedId = target.value;
      
      if (selectedId && this.conversationManager.setActiveConversation(selectedId)) {
        this.renderConversationHistory();
      }
    });
    
    // Action buttons in header
    const headerActions = this.headerEl.createDiv('gemini-header-actions');
    
    // New chat button
    const newChatBtn = headerActions.createEl('button', {
      cls: 'gemini-icon-btn',
      attr: { 'aria-label': 'New Chat' }
    });
    setIcon(newChatBtn, 'plus');
    newChatBtn.addEventListener('click', () => {
      const newId = this.conversationManager.createNewConversation('New Chat');
      this.saveConversations();
      this.createHeader(); // Refresh header with new conversation
      this.renderConversationHistory();
    });
    
    // Settings button
    const settingsBtn = headerActions.createEl('button', {
      cls: 'gemini-icon-btn',
      attr: { 'aria-label': 'Settings' }
    });
    setIcon(settingsBtn, 'settings');
    settingsBtn.addEventListener('click', () => {
      // Just open plugin settings - using the helper method we added
      (this.plugin as any).openSettings();
    });
  }
  
  private createActionButtons() {
    if (!this.actionsEl) return;
    
    this.actionsEl.empty();
    
    // Context awareness toggle (if enabled in settings)
    if (this.plugin.settings?.enableContextAwareness) {
      const contextBtn = this.actionsEl.createEl('button', {
        cls: 'gemini-action-btn',
        attr: { 'aria-label': 'Include active note content' }
      });
      
      contextBtn.innerHTML = `<span class="gemini-action-icon">${this.getIcon('file-text')}</span> Include note content`;
      
      // Toggle active state
      let isContextActive = false;
      contextBtn.addEventListener('click', () => {
        isContextActive = !isContextActive;
        contextBtn.toggleClass('gemini-action-active', isContextActive);
        
        if (isContextActive) {
          new Notice('Will include current note content');
        } else {
          new Notice('Note content disabled');
        }
      });
    }
    
    // Clear conversation button
    const clearBtn = this.actionsEl.createEl('button', {
      cls: 'gemini-action-btn',
      attr: { 'aria-label': 'Clear conversation' }
    });
    
    clearBtn.innerHTML = `<span class="gemini-action-icon">${this.getIcon('trash')}</span> Clear chat`;
    
    clearBtn.addEventListener('click', () => {
      // Clear current conversation
      this.conversationManager.clearConversation();
      this.saveConversations();
      this.renderConversationHistory();
      new Notice('Conversation cleared');
    });
  }
  
  private getIcon(name: string): string {
    // Simple function to return SVG icons as strings
    // This is a simplified version - in a full implementation, 
    // we would use Obsidian's setIcon or a more complete icon set
    
    const icons: Record<string, string> = {
      'file-text': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
      'trash': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
      'copy': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
      'refresh': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>'
    };
    
    return icons[name] || '';
  }
  
  private applyTheme() {
    // Apply theme based on settings
    const theme = this.plugin.settings?.theme || 'system';
    
    if (theme === 'system') {
      // Use system theme (follow Obsidian)
      this.container.removeClass('gemini-theme-light', 'gemini-theme-dark');
    } else {
      // Apply specific theme
      this.container.removeClass('gemini-theme-light', 'gemini-theme-dark');
      this.container.addClass(`gemini-theme-${theme}`);
    }
  }
  
  private autoResizeInput() {
    if (!this.inputEl) return;
    
    // Reset height to calculate proper scrollHeight
    this.inputEl.style.height = 'auto';
    
    // Set height based on content (with max height limit)
    const newHeight = Math.min(Math.max(this.inputEl.scrollHeight, 48), 200);
    this.inputEl.style.height = `${newHeight}px`;
    
    // Ensure the chat area scrolls to bottom when input expands
    if (this.chatEl && newHeight > 48) {
      this.scrollAnchor?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  async handleSend() {
    if (this.isStreaming) {
      // Cancel streaming if in progress
      this.isStreaming = false;
      this.loadingEl?.hide();
      if (this.loadingOverlayEl) {
        this.loadingOverlayEl.removeClass('active');
      }
      new Notice('Generation cancelled');
      return;
    }
    
    const text = this.inputEl?.value.trim();
    if (!text) return;

    // Add user message to UI and conversation
    const userMessage: Omit<ChatMessage, 'id'> = {
      content: text,
      role: 'user',
      timestamp: Date.now(),
    };
    
    // Add to conversation manager
    const savedMessage = this.conversationManager.addMessage(userMessage);
    this.saveConversations();
    
    // Clear input
    this.inputEl!.value = '';
    this.autoResizeInput();
    
    // Add to UI
    this.addMessageToUI(savedMessage);

    // Show loading state
    this.loadingEl!.show();
    this.sendBtn!.innerHTML = ''; // Clear button content
    setIcon(this.sendBtn!, 'square'); // Set to stop icon
    this.isStreaming = true;

    try {
      // Create a placeholder for the streaming response
      const assistantMessage: Omit<ChatMessage, 'id'> = {
        content: '',
        role: 'assistant',
        timestamp: Date.now(),
        isStreaming: true,
      };
      
      const savedAssistantMessage = this.conversationManager.addMessage(assistantMessage);
      this.currentStreamedMessageId = savedAssistantMessage.id;
      
      // Add empty message that will be updated during streaming
      this.addMessageToUI(savedAssistantMessage);
      
      // Create API callbacks
      const callbacks: ApiStatusCallbacks = {
        onStart: () => {
          // Show the loading overlay on API start if streaming is disabled and overlay is enabled
          if (this.loadingOverlayEl && 
              !this.plugin.settings?.enableStreaming && 
              this.plugin.settings?.showLoadingOverlay) {
            this.loadingOverlayEl.addClass('active');
          }
        },
        onPartialResponse: (text: string) => {
          if (!this.isStreaming || !this.currentStreamedMessageId) return;
          // Update the message content as it streams in
          this.updateMessageContent(this.currentStreamedMessageId, text, true);
        },
        onComplete: () => {
          // Hide the loading overlay when complete
          if (this.loadingOverlayEl) {
            this.loadingOverlayEl.removeClass('active');
          }
        },
        onError: (error) => {
          console.error("API error:", error);
          if (this.loadingOverlayEl) {
            this.loadingOverlayEl.removeClass('active');
          }
        }
      };
      
      // Check if context awareness is enabled and there's an active document
      let response: string;
      
      if (this.plugin.settings?.enableContextAwareness) {
        // Get active note content if available
        const activeView = this.plugin.getActiveMarkdownView();
        if (activeView) {
          const editor = activeView.editor;
          const docContent = editor.getValue();
          
          if (docContent && docContent.length > 0) {
            response = await callGeminiWithContext(
              this.plugin.settings!,
              text,
              docContent,
              callbacks
            );
          } else {
            response = await callGemini(
              this.plugin.settings!,
              text,
              callbacks
            );
          }
        } else {
          response = await callGemini(
            this.plugin.settings!,
            text,
            callbacks
          );
        }
      } else {
        response = await callGemini(
          this.plugin.settings!,
          text,
          callbacks
        );
      }
      
      // Once streaming is complete, update with final response if needed
      if (this.isStreaming) {
        this.updateMessageContent(savedAssistantMessage.id, response, false);
        this.saveConversations();
      }
    } catch (e) {
      console.error(e);
      
      // Add error message
      const errorMessage: Omit<ChatMessage, 'id'> = {
        content: 'Error: Failed to generate response. Please try again.',
        role: 'assistant',
        timestamp: Date.now(),
        isError: true,
      };
      
      const savedErrorMessage = this.conversationManager.addMessage(errorMessage);
      this.addMessageToUI(savedErrorMessage);
      this.saveConversations();
      
      new Notice('Error fetching Gemini response');
    } finally {
      this.isStreaming = false;
      this.currentStreamedMessageId = undefined;
      this.loadingEl!.hide();
      if (this.loadingOverlayEl) {
        this.loadingOverlayEl.removeClass('active');
      }
      this.sendBtn!.innerHTML = ''; // Clear button content
      setIcon(this.sendBtn!, 'arrow-up'); // Reset to send icon
    }
  }
  
  private updateMessageContent(messageId: string, content: string, isStreaming: boolean) {
    // Find the message element in the DOM
    const messageEl = this.chatEl?.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageEl) return;
    
    // Find the content element
    const contentEl = messageEl.querySelector('.gemini-msg-content');
    if (!contentEl) return;
    
    // Update the message in our data model
    const activeConv = this.conversationManager.getActiveConversation();
    if (activeConv) {
      const message = activeConv.messages.find(m => m.id === messageId);
      if (message) {
        message.content = content;
        message.isStreaming = isStreaming;
      }
    }
    
    // Clear content element
    contentEl.empty();
    
    // Render markdown content
    MarkdownRenderer.renderMarkdown(content, contentEl as HTMLElement, '', this.plugin);
    
    // Apply code highlighting if enabled
    if (this.plugin.settings?.codeHighlighting) {
      this.enhanceCodeBlocks(contentEl as HTMLElement);
    }
    
    // Scroll to bottom
    this.scrollAnchor?.scrollIntoView({ behavior: 'smooth' });
  }
  
  private enhanceCodeBlocks(element: HTMLElement) {
    // Find all code blocks
    const codeBlocks = element.querySelectorAll('pre code');
    
    codeBlocks.forEach((codeBlock, index) => {
      const pre = codeBlock.parentElement;
      if (!pre) return;
      
      // Add a wrapper for actions
      const wrapper = document.createElement('div');
      wrapper.className = 'gemini-code-block-wrapper';
      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
      
      // Create the header with language display and actions
      const header = document.createElement('div');
      header.className = 'gemini-code-block-header';
      
      // Get language if available
      const langClass = Array.from(codeBlock.classList).find(c => c.startsWith('language-'));
      const language = langClass ? langClass.replace('language-', '') : 'plaintext';
      
      header.innerHTML = `<span class="gemini-code-language">${language}</span>`;
      
      // Copy button
      const copyBtn = document.createElement('button');
      copyBtn.className = 'gemini-code-copy-btn';
      copyBtn.setAttribute('aria-label', 'Copy code');
      copyBtn.innerHTML = this.getIcon('copy');
      
      copyBtn.addEventListener('click', () => {
        const code = codeBlock.textContent || '';
        navigator.clipboard.writeText(code).then(() => {
          copyBtn.innerHTML = 'Copied!';
          setTimeout(() => {
            copyBtn.innerHTML = this.getIcon('copy');
          }, 2000);
        });
      });
      
      header.appendChild(copyBtn);
      wrapper.insertBefore(header, pre);
    });
  }

  private addMessageToUI(message: ChatMessage) {
    if (!this.chatEl) return;
    
    // Message wrapper
    const msgWrapper = this.chatEl.createDiv({
      cls: 'gemini-msg-row',
      attr: {
        'data-message-id': message.id,
        'data-role': message.role
      }
    });
    
    // Avatar/Icon
    const avatar = msgWrapper.createDiv('gemini-avatar');
    if (message.role === 'assistant') {
      setIcon(avatar, 'bot');
    } else if (message.role === 'user') {
      setIcon(avatar, 'user');
    } else {
      setIcon(avatar, 'info');
    }
    
    // Message container
    const msgContainer = msgWrapper.createDiv('gemini-msg-container');
    
    // Add timestamp if enabled
    if (this.plugin.settings?.showTimestamps) {
      const timestamp = msgContainer.createDiv('gemini-msg-timestamp');
      timestamp.textContent = this.formatTimestamp(message.timestamp);
    }
    
    // Message bubble with proper styling based on role
    const msgEl = msgContainer.createDiv(`gemini-msg gemini-msg-${message.role}`);
    
    if (message.isError) {
      msgEl.addClass('gemini-msg-error');
    }
    
    if (message.isStreaming) {
      msgEl.addClass('gemini-msg-streaming');
    }
    
    // Content element (for easier updating during streaming)
    const contentEl = msgEl.createDiv('gemini-msg-content');
    
    if (message.role === 'assistant') {
      // Render markdown for assistant messages
      MarkdownRenderer.renderMarkdown(message.content, contentEl, '', this.plugin);
      
      // Enhance code blocks if enabled
      if (this.plugin.settings?.codeHighlighting) {
        this.enhanceCodeBlocks(contentEl);
      }
      
      // Add action buttons for assistant messages
      const actionsEl = msgContainer.createDiv('gemini-msg-actions');
      
      // Copy message button
      const copyBtn = actionsEl.createEl('button', {
        cls: 'gemini-msg-action-btn',
        attr: { 'aria-label': 'Copy message' }
      });
      copyBtn.innerHTML = this.getIcon('copy');
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(message.content).then(() => {
          new Notice('Message copied to clipboard');
        });
      });
      
      // Regenerate button
      const regenerateBtn = actionsEl.createEl('button', {
        cls: 'gemini-msg-action-btn',
        attr: { 'aria-label': 'Regenerate response' }
      });
      regenerateBtn.innerHTML = this.getIcon('refresh');
      regenerateBtn.addEventListener('click', () => {
        // Find the preceding user message
        const activeConv = this.conversationManager.getActiveConversation();
        if (!activeConv) return;
        
        const messageIndex = activeConv.messages.findIndex(m => m.id === message.id);
        if (messageIndex <= 0) return;
        
        const userMessage = activeConv.messages[messageIndex - 1];
        if (userMessage.role !== 'user') return;
        
        // Remove this assistant message
        activeConv.messages.splice(messageIndex, 1);
        
        // Trigger regeneration
        this.conversationManager.addMessage({
          content: userMessage.content,
          role: 'user',
          timestamp: Date.now()
        });
        
        // Rerender and save
        this.saveConversations();
        this.renderConversationHistory();
        
        // Focus the last user message
        setTimeout(() => {
          const lastUserMsg = this.chatEl?.querySelector(`.gemini-msg-row[data-role="user"]:last-child`);
          lastUserMsg?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        
        // Trigger the API call
        this.handleSend();
      });
    } else {
      // Plain text for user messages
      contentEl.setText(message.content);
    }

    // Scroll to bottom smoothly
    setTimeout(() => {
      this.scrollAnchor?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }
  
  private renderConversationHistory() {
    if (!this.chatEl) return;
    
    // Clear existing messages
    this.chatEl.empty();
    this.scrollAnchor = this.chatEl.createDiv({ cls: 'gemini-scroll-anchor' });
    
    // Get active conversation
    const activeConversation = this.conversationManager.getActiveConversation();
    if (!activeConversation) return;
    
    // Render all messages
    activeConversation.messages.forEach(message => {
      this.addMessageToUI(message);
    });
  }
  
  private formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    
    // Format: 10:30 AM
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  
  private saveConversations() {
    const data = this.conversationManager.saveToStorage();
    this.plugin.saveConversations(data);
  }
}