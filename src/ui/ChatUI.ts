import { MarkdownRenderer, Notice } from 'obsidian';
import ArtificialMohadithPlugin from '../main';
import { callGemini } from '../api/gemini';

export default class ChatUI {
  container: HTMLElement;
  plugin: ArtificialMohadithPlugin;
  chatEl?: HTMLElement;
  inputEl?: HTMLTextAreaElement;
  sendBtn?: HTMLButtonElement;
  loadingEl?: HTMLElement;

  constructor(container: HTMLElement, plugin: ArtificialMohadithPlugin) {
    this.container = container;
    this.plugin = plugin;
  }

  init() {
    this.container.empty();

    this.chatEl = this.container.createDiv('gemini-chat');

    const inputContainer = this.container.createDiv('gemini-input-container');
    this.inputEl = inputContainer.createEl('textarea', { cls: 'gemini-input' });
    this.sendBtn = inputContainer.createEl('button', { text: 'Send', cls: 'gemini-send-btn' });
    this.loadingEl = inputContainer.createDiv('gemini-loading');
    this.loadingEl.setText('...');
    this.loadingEl.hide();

    this.sendBtn.addEventListener('click', () => this.handleSend());
    this.inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });
  }

  async handleSend() {
    const text = this.inputEl?.value.trim();
    if (!text) return;

    this.addMessage(text, 'user');
    this.inputEl!.value = '';

    this.loadingEl!.show();

    try {
      const resp = await callGemini(this.plugin.settings!, text);
      this.addMessage(resp, 'assistant');
    } catch (e) {
      console.error(e);
      new Notice('Error fetching Gemini response');
    } finally {
      this.loadingEl!.hide();
    }
  }

  addMessage(text: string, sender: 'user' | 'assistant') {
    const msgEl = this.chatEl!.createDiv(`gemini-msg gemini-msg-${sender}`);

    if (sender === 'assistant') {
      MarkdownRenderer.renderMarkdown(text, msgEl, '', this.plugin);
    } else {
      msgEl.setText(text);
    }
  }
}