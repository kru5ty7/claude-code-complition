import * as vscode from 'vscode';
import Anthropic from '@anthropic-ai/sdk';
import { ConfigurationManager } from './configuration';
import { ActivityLogger } from './activityLogger';

export class ClaudeCompletionProvider implements vscode.InlineCompletionItemProvider {
    private anthropic: Anthropic | null = null;
    private lastCompletionTime = 0;
    private debounceTimer: NodeJS.Timeout | null = null;
    
    constructor(
        private config: ConfigurationManager,
        private logger: ActivityLogger
    ) {}
    
    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | null> {
        
        if (!this.config.isEnabled()) {
            return null;
        }
        
        // Debounce logic
        const currentTime = Date.now();
        const debounceDelay = this.config.getDebounceDelay();
        
        if (currentTime - this.lastCompletionTime < debounceDelay) {
            return null;
        }
        
        this.lastCompletionTime = currentTime;
        
        try {
            // Initialize Anthropic client fresh each time to avoid configuration issues
            const apiKey = await this.config.getApiKey();
            if (!apiKey) {
                this.logger.log('No API key configured', 'warn');
                return null;
            }
            
            // Get context
            const beforeCursor = document.getText(new vscode.Range(
                Math.max(0, position.line - 50),
                0,
                position.line,
                position.character
            ));
            
            const afterCursor = document.getText(new vscode.Range(
                position.line,
                position.character,
                Math.min(document.lineCount - 1, position.line + 10),
                0
            ));
            
            const languageId = document.languageId;
            
            this.logger.log(`Requesting completion for ${languageId} at ${position.line}:${position.character}`);
            
            // Create prompt
            const prompt = this.createPrompt(beforeCursor, afterCursor, languageId);
            
            // Try direct HTTP request to bypass SDK issues
            const requestBody = {
                model: this.config.getModel(),
                max_tokens: this.config.getMaxTokens(),
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            };
            
            this.logger.log(`Direct HTTP Request: ${JSON.stringify(requestBody, null, 2)}`);
            
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                this.logger.log(`HTTP Error ${response.status}: ${errorText}`, 'error');
                return null;
            }
            
            const completion = await response.json();
            
            if (token.isCancellationRequested) {
                return null;
            }
            
            const completionText = this.extractCompletion(completion);
            
            if (!completionText) {
                return null;
            }
            
            this.logger.log(`Generated completion: ${completionText.substring(0, 50)}...`);
            
            // Create inline completion item
            const item = new vscode.InlineCompletionItem(
                completionText,
                new vscode.Range(position, position)
            );
            
            return [item];
            
        } catch (error) {
            this.logger.log(`Error generating completion: ${error}`, 'error');
            return null;
        }
    }
    
    private createPrompt(beforeCursor: string, afterCursor: string, languageId: string): string {
        const cleanPrompt = `You are a code completion assistant. Complete the code at <CURSOR>.

Language: ${languageId}

${beforeCursor}<CURSOR>${afterCursor}

Generate only the code that should replace <CURSOR>. No explanations.`;
        
        return cleanPrompt.trim();
    }
    
    private extractCompletion(response: any): string {
        if (!response.content || response.content.length === 0) {
            return '';
        }
        
        const content = response.content[0];
        if (content.type === 'text') {
            return content.text.trim();
        }
        
        return '';
    }
}