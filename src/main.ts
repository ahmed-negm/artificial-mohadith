import { App, Plugin, WorkspaceLeaf, MarkdownView } from 'obsidian';
import GeminiView, { VIEW_TYPE_GEMINI } from './views/GeminiView';
import { GeminiSettings, DEFAULT_SETTINGS, GeminiSettingTab } from './settings';

export default class ArtificialMohadithPlugin extends Plugin {
  settings?: GeminiSettings;
  
  // Store conversation data
  private conversationsData: string | null = null;

  async onload() {
    console.log('Loading Artificial Mohadith plugin');

    await this.loadSettings();
    
    // Load conversations from storage
    const data = await this.loadData();
    this.conversationsData = data?.conversations || null;

    this.registerView(VIEW_TYPE_GEMINI, (leaf: WorkspaceLeaf) => new GeminiView(leaf, this));

    this.addCommand({
      id: 'open-artificial-mohadith-chat',
      name: 'Toggle Artificial Mohadith Panel',
      callback: () => {
        this.toggleView();
      },
      hotkeys: [
        {
          modifiers: ['Mod', 'Shift'],
          key: 'G',
        },
      ],
    });

    this.addSettingTab(new GeminiSettingTab(this.app, this));
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_GEMINI);
    console.log('Unloading Artificial Mohadith plugin');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // Save conversations data
  async saveConversations(data: string) {
    this.conversationsData = data;
    const currentData = await this.loadData() || {};
    await this.saveData({
      ...currentData,
      conversations: data
    });
  }

  // Get conversations data
  getConversations(): string | null {
    return this.conversationsData;
  }

  async toggleView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_GEMINI);
    if (leaves.length) {
      leaves.forEach((leaf) => leaf.detach());
    } else {
      const rightLeaf = this.app.workspace.getRightLeaf(false);
      await rightLeaf?.setViewState({ type: VIEW_TYPE_GEMINI, active: true });
      if (rightLeaf) {
        this.app.workspace.revealLeaf(rightLeaf);
      }
    }
  }
  
  // Helper method to get the active markdown view
  getActiveMarkdownView(): MarkdownView | null {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    return activeView;
  }
  
  // Helper method to open settings
  openSettings() {
    // Try to open the settings tab for this plugin
    const settingsTabId = this.manifest.id;
    if (settingsTabId) {
      // Open settings
      const app = this.app as any;
      if (app.setting && typeof app.setting.open === 'function') {
        app.setting.open();
        
        // Try to navigate to the plugin's tab if possible
        if (typeof app.setting.openTabById === 'function') {
          app.setting.openTabById(settingsTabId);
        }
      }
    }
  }
}