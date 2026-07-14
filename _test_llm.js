const { queryOllama } = require('./models/llm-predict');
const path = require('path');
const fs = require('fs');

async function test() {
  const prompt = `You are a BRVM stock analyst. 
Answer ONLY with a valid JSON object, no other text.

Predict for ORAC (Orange Cote d'Ivoire).
Last price: 15205 FCFA

{"direction": "up", "target": 16500, "confidence": 70}`;

  console.log('Sending to qwen2.5:3b-instruct...');
  const r = await queryOllama(prompt, 'qwen2.5:3b-instruct');
  console.log('Response:', r.substring(0, 500));
  process.exit(0);
}
test();
