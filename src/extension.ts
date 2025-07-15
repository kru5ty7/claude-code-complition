import * as vscode from 'vscode';
import { ClaudeCompletionProvider } from './completionProvider';
import { ConfigurationManager } from './configuration';
import { ActivityLogger } from './activityLogger';

let completionProvider: vscode.Disposable | undefined;
let activityLogger: ActivityLogger;

export function activate(context: vscode.ExtensionContext) {
    console.log('Claude Copilot is activating...');
    
    activityLogger = new ActivityLogger();
    activityLogger.log('Extension activated');
    
    const config = new ConfigurationManager();
    config.setSecretStorage(context.secrets);
    
    // Register the completion provider
    const provider = new ClaudeCompletionProvider(config, activityLogger);
    completionProvider = vscode.languages.registerInlineCompletionItemProvider(
        { pattern: '**' },
        provider
    );
    
    context.subscriptions.push(completionProvider);
    
    // Register commands
    const toggleCommand = vscode.commands.registerCommand('claudeCopilot.toggleEnabled', () => {
        const currentEnabled = config.isEnabled();
        config.setEnabled(!currentEnabled);
        vscode.window.showInformationMessage(`Claude Copilot ${!currentEnabled ? 'enabled' : 'disabled'}`);
        activityLogger.log(`Extension ${!currentEnabled ? 'enabled' : 'disabled'}`);
    });
    
    const setApiKeyCommand = vscode.commands.registerCommand('claudeCopilot.setApiKey', async () => {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your Anthropic API key',
            password: true,
            placeHolder: 'sk-ant-...'
        });
        
        if (apiKey) {
            await config.setApiKey(apiKey);
            vscode.window.showInformationMessage('API key saved securely');
            activityLogger.log('API key updated');
        }
    });
    
    context.subscriptions.push(toggleCommand, setApiKeyCommand);
    
    // Show welcome message if no API key is set
    config.getApiKey().then(apiKey => {
        if (!apiKey) {
            vscode.window.showInformationMessage(
                'Welcome to Claude Copilot! Please set your API key to get started.',
                'Set API Key'
            ).then(selection => {
                if (selection === 'Set API Key') {
                    vscode.commands.executeCommand('claudeCopilot.setApiKey');
                }
            });
        }
    });
    
    console.log('Claude Copilot activated');
}

export function deactivate() {
    activityLogger?.log('Extension deactivated');
    if (completionProvider) {
        completionProvider.dispose();
    }
}