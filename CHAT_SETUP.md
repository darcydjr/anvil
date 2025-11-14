# Chat Feature Setup

The chat feature allows you to communicate with Claude AI directly from the Anvil application.

## Setup Instructions

### Option 1: Environment Variable (Recommended)

1. Set the `ANTHROPIC_API_KEY` environment variable:

   ```bash
   export ANTHROPIC_API_KEY=your-api-key-here
   ```

2. Restart your server for the changes to take effect.

### Option 2: Configuration File

1. Add your API key to `config.json`:

   ```json
   {
     "aiAssistant": {
       "provider": "claude",
       "apiKey": "your-api-key-here",
       "model": "claude-3-5-sonnet-20241022",
       "maxTokens": 2048
     }
   }
   ```

2. Restart your server.

## Getting an API Key

1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Sign in or create an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and use it in one of the methods above

## Configuration Options

- **provider**: Must be `"claude"` (OpenAI support can be added later)
- **apiKey**: Your Anthropic API key (optional if using environment variable)
- **model**: The Claude model to use (default: `claude-3-5-sonnet-20241022`)
- **maxTokens**: Maximum tokens in the response (default: 2048)

## Available Models

- `claude-3-5-sonnet-20241022` (recommended, default)
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`

## Usage

1. Click the chat icon (MessageSquare) in the header
2. A popup window will appear on the right side
3. Type your message and press Enter or click Send
4. Claude will respond to your questions and requests
5. Your conversation history is maintained within each session

## Troubleshooting

- **"AI assistant not configured"**: Make sure you've set your API key
- **"Invalid API key"**: Check that your API key is correct
- **"Rate limit exceeded"**: You've hit the API rate limit, wait and try again

