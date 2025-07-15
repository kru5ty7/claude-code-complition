import * as vscode from 'vscode';

export class ActivityLogger {
    private logs: string[] = [];
    private outputChannel: vscode.OutputChannel;
    
    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Claude Copilot');
    }
    
    log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        this.logs.push(logEntry);
        this.outputChannel.appendLine(logEntry);
        
        // Keep only last 1000 logs in memory
        if (this.logs.length > 1000) {
            this.logs.shift();
        }
    }
    
    getRecentLogs(count: number = 50): string[] {
        return this.logs.slice(-count);
    }
    
    clear() {
        this.logs = [];
        this.outputChannel.clear();
    }
}