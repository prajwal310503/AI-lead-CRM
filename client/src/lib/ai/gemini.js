import axios from 'axios'

export async function callGemini(prompt, apiKey, model = 'gemini-1.5-flash') {
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2048 },
    }
  )
  return response.data.candidates[0].content.parts[0].text
}
