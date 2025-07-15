# Claude Copilot

AI-powered code completions for VS Code using Anthropic's Claude.

## Features

- Inline code completions powered by Claude
- Support for all programming languages
- Configurable models (Opus, Sonnet, Haiku)
- Adjustable completion parameters

## Getting Started

1. Install the extension
2. Set your Anthropic API key:
   - Use Command Palette: `Claude Copilot: Set API Key`
   - Or set in settings: `claudeCopilot.apiKey`
3. Start coding! Completions will appear automatically

## Configuration

- `claudeCopilot.apiKey`: Your Anthropic API key
- `claudeCopilot.model`: Choose between Claude models
- `claudeCopilot.enabled`: Enable/disable completions
- `claudeCopilot.debounceDelay`: Delay before triggering completion
- `claudeCopilot.maxTokens`: Maximum tokens for completion
- `claudeCopilot.temperature`: Creativity of completions (0-1)

## Commands

- `Claude Copilot: Toggle Enable/Disable`
- `Claude Copilot: Set API Key`

## Requirements

- VS Code 1.85.0 or higher
- Valid Anthropic API key