#!/usr/bin/env node
/**
 * Test script to verify Anthropic API key and list available models
 */

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const apiKey = process.env.ANTHROPIC_API_KEY;

console.log('=== Anthropic API Key Test ===\n');
console.log('API Key found:', !!apiKey);
console.log('API Key length:', apiKey?.length || 0);
console.log('API Key prefix:', apiKey?.substring(0, 20) + '...\n');

if (!apiKey) {
  console.error('ERROR: No API key found in environment');
  process.exit(1);
}

const anthropic = new Anthropic({
  apiKey: apiKey,
});

// Try different model names to see which one works
const modelsToTest = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
  'claude-3-5-sonnet-latest',
  'claude-3-opus-latest',
];

async function testModel(modelName) {
  try {
    console.log(`Testing model: ${modelName}...`);
    const response = await anthropic.messages.create({
      model: modelName,
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say "OK" if you can read this.' }],
    });

    const text = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    console.log(`✅ SUCCESS: ${modelName} works!`);
    console.log(`   Response: ${text}\n`);
    return true;
  } catch (error) {
    console.log(`❌ FAILED: ${modelName}`);
    console.log(`   Error: ${error.message}\n`);
    return false;
  }
}

async function main() {
  console.log('Testing models...\n');

  let workingModel = null;

  for (const model of modelsToTest) {
    const works = await testModel(model);
    if (works && !workingModel) {
      workingModel = model;
    }
  }

  console.log('\n=== Results ===');
  if (workingModel) {
    console.log(`✅ Found working model: ${workingModel}`);
    console.log(`\nUpdate your config files to use: "${workingModel}"`);
  } else {
    console.log('❌ No working models found!');
    console.log('\nPossible issues:');
    console.log('1. Your API key may be invalid or expired');
    console.log('2. Your account may not have API access enabled');
    console.log('3. You may need to add payment information at https://console.anthropic.com/');
    console.log('4. Your API key may be from a different region or have restrictions');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
