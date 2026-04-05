import axios from 'axios'

export async function callOpenAI(prompt, apiKey, model = 'gpt-4o') {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  )
  return response.data.choices[0].message.content
}
