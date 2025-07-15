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
            // Initialize Anthropic client if needed
            if (!this.anthropic) {
                const apiKey = await this.config.getApiKey();
                if (!apiKey) {
                    this.logger.log('No API key configured', 'warn');
                    return null;
                }
                this.anthropic = new Anthropic({ apiKey });
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
            
            // Make API call
            const completion = await this.anthropic.messages.create({
                model: this.config.getModel(),
                max_tokens: this.config.getMaxTokens(),
                temperature: this.config.getTemperature(),
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                stop_sequences: ['```', '</code>', 'function', 'class', 'const', 'export', 'import', ';']
            });
            
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
        return `You are a code completion assistant. Generate a concise code completion at the cursor position.

Language: ${languageId}

Code before cursor:
${beforeCursor}

Code after cursor:
${afterCursor}

Generate ONLY the code that should be inserted at the cursor position. Do not include any explanations or markdown formatting. Respond with just the completion text.`;
    }
    
    private extractCompletion(response: Anthropic.Message): string {
        if (response.content.length === 0) {
            return '';
        }
        
        const content = response.content[0];
        if (content.type === 'text') {
            return content.text.trim();
        }
        
        return '';
    }
}