import { ItemView, WorkspaceLeaf, MarkdownRenderer } from 'obsidian';
import ArtificialMohadithPlugin from '../main';
import ChatUI from '../ui/ChatUI';

export const VIEW_TYPE_GEMINI = 'artificial-mohadith-view';

export default class GeminiView extends ItemView {
  plugin: ArtificialMohadithPlugin;
  chatUI?: ChatUI;

  constructor(leaf: WorkspaceLeaf, plugin: ArtificialMohadithPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_GEMINI;
  }

  getDisplayText() {
    return 'Artificial Mohadith';
  }

  async onOpen() {
    this.chatUI = new ChatUI(this.contentEl, this.plugin);
    this.chatUI.init();
  }

  async onClose() {
    this.contentEl.empty();
  }
}