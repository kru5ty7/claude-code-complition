import * as vscode from 'vscode';

export class ConfigurationManager {
    private static readonly CONFIG_SECTION = 'claudeCopilot';
    private secretStorage: vscode.SecretStorage | undefined;
    
    constructor() {
        // Secret storage will be set when context is available
    }
    
    setSecretStorage(secretStorage: vscode.SecretStorage) {
        this.secretStorage = secretStorage;
    }
    
    async getApiKey(): Promise<string | undefined> {
        // First try secret storage
        if (this.secretStorage) {
            const secretKey = await this.secretStorage.get('anthropicApiKey');
            if (secretKey) {
                return secretKey;
            }
        }
        
        // Fallback to settings (not recommended for production)
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        return config.get<string>('apiKey');
    }
    
    async setApiKey(apiKey: string): Promise<void> {
        if (this.secretStorage) {
            await this.secretStorage.store('anthropicApiKey', apiKey);
        } else {
            const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
            await config.update('apiKey', apiKey, vscode.ConfigurationTarget.Global);
        }
    }
    
    getModel(): string {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        return config.get<string>('model', 'claude-3-5-haiku-20241022');
    }
    
    isEnabled(): boolean {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        return config.get<boolean>('enabled', true);
    }
    
    setEnabled(enabled: boolean): void {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        config.update('enabled', enabled, vscode.ConfigurationTarget.Global);
    }
    
    getDebounceDelay(): number {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        return config.get<number>('debounceDelay', 400);
    }
    
    getMaxTokens(): number {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        return config.get<number>('maxTokens', 150);
    }
    
    getTemperature(): number {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        return config.get<number>('temperature', 0.2);
    }
}