# Quick Setup: Chat API Key

The chat feature requires an Anthropic API key to communicate with Claude.

## Step 1: Get Your API Key

1. Go to https://console.anthropic.com/
2. Sign in (or create a free account)
3. Navigate to "API Keys" section
4. Click "Create Key"
5. Copy your new API key

## Step 2: Add the API Key

Open the `.env` file in the root directory and add your API key:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxx
```

**Note:** Replace `sk-ant-api03-xxxxxxxxxxxxxxxxxxxxx` with your actual API key.

## Step 3: Restart the Server

Stop your server (Ctrl+C) and restart it:

```bash
npm start
```

## Step 4: Test the Chat

1. Click the chat icon (💬) in the header
2. Type a message like "Hello!"
3. Claude should respond

## Troubleshooting

### Error: "AI assistant not properly initialized"
- Make sure you added your API key to `.env`
- Make sure you restarted the server after adding the key
- Check that the API key starts with `sk-ant-`

### Error: "Invalid API key"
- Double-check your API key in the Anthropic Console
- Make sure you copied the entire key

### Still having issues?
- Check the server logs for detailed error messages
- Make sure your Anthropic account has API access
- Verify you have API credits available

## Available Models

If you get a "model not found" error, try these models (update in config.json):
- `claude-3-5-sonnet-20241022` (latest, may require newer API access)
- `claude-3-5-sonnet-20240620` (stable)
- `claude-3-opus-20240229` (most capable)
- `claude-3-sonnet-20240229` (balanced)
- `claude-3-haiku-20240307` (fastest)

## Free Tier

Anthropic offers a free tier with API credits for testing. Check their pricing page for current limits.
