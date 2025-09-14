import { App, Plugin, WorkspaceLeaf } from 'obsidian';
import GeminiView, { VIEW_TYPE_GEMINI } from './views/GeminiView';
import { GeminiSettings, DEFAULT_SETTINGS, GeminiSettingTab } from './settings';

export default class ArtificialMohadithPlugin extends Plugin {
  settings?: GeminiSettings;

  async onload() {
    console.log('Loading Artificial Mohadith plugin');

    await this.loadSettings();

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
}