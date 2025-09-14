import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import ArtificialMohadithPlugin from './main';

export interface GeminiSettings {
  apiKey: string;
  model: string;
  temperature: number;
}

export const DEFAULT_SETTINGS: GeminiSettings = {
  apiKey: '',
  model: 'models/gemini-pro',
  temperature: 0.2,
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
  }
}