import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import ArtificialMohadithPlugin from './main';

export interface GeminiSettings {
  apiKey: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  maxHistoryLength: number;
  enableStreaming: boolean;
  showLoadingOverlay: boolean;
  enableContextAwareness: boolean;
  theme: 'light' | 'dark' | 'system';
  codeHighlighting: boolean;
  showTimestamps: boolean;
}

export const DEFAULT_SETTINGS: GeminiSettings = {
  apiKey: '',
  model: 'models/gemini-pro',
  temperature: 0.2,
  systemPrompt: 'You are a helpful AI assistant for Obsidian users. Provide concise and accurate information.',
  maxHistoryLength: 30,
  enableStreaming: true,
  showLoadingOverlay: true,
  enableContextAwareness: true,
  theme: 'system',
  codeHighlighting: true,
  showTimestamps: true,
};

export class GeminiSettingTab extends PluginSettingTab {
  plugin: ArtificialMohadithPlugin;

  constructor(app: App, plugin: ArtificialMohadithPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Artificial Mohadith Settings' });

    new Setting(containerEl)
      .setName('API Key')
      .setDesc('Your Google Cloud API key or Bearer token for the Generative Language API.')
      .addText((text) =>
        text
          .setPlaceholder('Bearer ... or API KEY')
          .setValue(this.plugin.settings!.apiKey)
          .onChange(async (value) => {
            this.plugin.settings!.apiKey = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Model')
      .setDesc('Model resource name, e.g. models/gemini-pro or models/gemini-1.5-flash')
      .addText((text) =>
        text
          .setPlaceholder('models/gemini-pro')
          .setValue(this.plugin.settings!.model)
          .onChange(async (value) => {
            this.plugin.settings!.model = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Temperature')
      .setDesc('Controls randomness (0.0 - 1.0)')
      .addSlider((slider) =>
        slider
          .setLimits(0, 1, 0.05)
          .setValue(this.plugin.settings!.temperature)
          .onChange(async (value) => {
            this.plugin.settings!.temperature = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Test API Key')
      .setDesc('Quickly verify the API key by sending a small test prompt')
      .addButton((btn) =>
        btn.setButtonText('Test').onClick(async () => {
          if (!this.plugin.settings!.apiKey) {
            new Notice('Please set API key first');
            return;
          }
          new Notice('Testing key...');
          try {
            const { testApiKey } = await import('./api/gemini');
            const ok = await testApiKey(this.plugin.settings!);
            new Notice(ok ? 'Test OK' : 'Test failed - check key and network');
          } catch (e) {
            console.error(e);
            new Notice('Test failed - see console');
          }
        })
      );

    // System prompt configuration
    containerEl.createEl('h3', { text: 'Chat Configuration' });

    new Setting(containerEl)
      .setName('System Prompt')
      .setDesc('Instructions that define how the assistant behaves')
      .addTextArea((text) => {
        text
          .setPlaceholder('You are a helpful AI assistant...')
          .setValue(this.plugin.settings!.systemPrompt)
          .onChange(async (value) => {
            this.plugin.settings!.systemPrompt = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.rows = 4;
        text.inputEl.cols = 50;
      });

    new Setting(containerEl)
      .setName('Enable Streaming')
      .setDesc('Show responses as they are generated (recommended)')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings!.enableStreaming)
          .onChange(async (value) => {
            this.plugin.settings!.enableStreaming = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Show Loading Overlay')
      .setDesc('Display a full-screen loading animation while waiting for responses when streaming is disabled')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings!.showLoadingOverlay)
          .onChange(async (value) => {
            this.plugin.settings!.showLoadingOverlay = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Enable Context Awareness')
      .setDesc('Allow the assistant to access the current note content')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings!.enableContextAwareness)
          .onChange(async (value) => {
            this.plugin.settings!.enableContextAwareness = value;
            await this.plugin.saveSettings();
          })
      );

    // UI customization
    containerEl.createEl('h3', { text: 'UI Customization' });

    new Setting(containerEl)
      .setName('Theme')
      .setDesc('Choose how the chat UI appears')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('system', 'Match Obsidian Theme')
          .addOption('light', 'Light')
          .addOption('dark', 'Dark')
          .setValue(this.plugin.settings!.theme)
          .onChange(async (value) => {
            this.plugin.settings!.theme = value as 'system' | 'light' | 'dark';
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Code Highlighting')
      .setDesc('Highlight syntax in code blocks')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings!.codeHighlighting)
          .onChange(async (value) => {
            this.plugin.settings!.codeHighlighting = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Show Timestamps')
      .setDesc('Display time when messages were sent')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings!.showTimestamps)
          .onChange(async (value) => {
            this.plugin.settings!.showTimestamps = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Max Message History')
      .setDesc('Maximum number of messages to keep in conversation history')
      .addSlider((slider) =>
        slider
          .setLimits(5, 100, 5)
          .setValue(this.plugin.settings!.maxHistoryLength)
          .onChange(async (value) => {
            this.plugin.settings!.maxHistoryLength = value;
            await this.plugin.saveSettings();
          })
      );
  }
}