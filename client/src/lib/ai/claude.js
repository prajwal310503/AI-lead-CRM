import axios from 'axios'

export async function callClaude(prompt, apiKey, model = 'claude-sonnet-4-6') {
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    }
  )
  return response.data.content[0].text
}
