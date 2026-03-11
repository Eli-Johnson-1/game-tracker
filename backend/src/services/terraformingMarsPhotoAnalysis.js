/**
 * Photo analysis service for Terraforming Mars board state.
 * Uses Claude Vision to extract game state from a board photo.
 */

const Anthropic = require('@anthropic-ai/sdk')

const PROMPT = `You are analyzing a Terraforming Mars board photo. Extract the game state and return ONLY a JSON object — no prose, no markdown, no code fences. The JSON must match this exact structure:

{
  "generation": <integer>,
  "players": [
    {
      "color": "<one of: red, green, blue, yellow, black>",
      "tr": <integer, terraforming rating>,
      "greeneries": <integer, number of greenery tiles this player placed>,
      "cities": <integer, number of city tiles this player placed>,
      "city_adjacent_greeneries": <integer, total greenery tiles adjacent to this player's cities regardless of who placed the greenery>,
      "total_tiles": <integer, total tiles placed by this player — used for Landlord award>
    }
  ],
  "milestones_claimed": [
    { "name": "<milestone name>", "color": "<player color>" }
  ],
  "awards_funded": [
    { "name": "<award name>" }
  ],
  "notes": "<any uncertainty, ambiguity, or caveats about this analysis>"
}

Important rules:
- Include only players who have tiles or a visible TR marker on the board.
- For city_adjacent_greeneries: count every greenery tile touching each of the player's city tiles, regardless of who owns the greenery tile.
- If a value is unclear, make your best estimate and note the uncertainty in the "notes" field.
- Return ONLY the JSON object. No other text.`

/**
 * Analyze a Terraforming Mars board photo and extract structured game state.
 *
 * @param {Buffer} imageBuffer  - Raw image bytes
 * @param {string} mediaType    - MIME type, e.g. 'image/jpeg'
 * @returns {Promise<object>}   - Parsed JSON matching the structured prompt schema
 * @throws {Error}              - If API key missing, Claude returns non-JSON, or parse fails
 */
async function analyzeBoardPhoto(imageBuffer, mediaType) {
  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error('ANTHROPIC_API_KEY is not configured in the backend environment')
    err.statusCode = 503
    throw err
  }

  const client = new Anthropic()

  const base64Image = imageBuffer.toString('base64')

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: PROMPT,
          },
        ],
      },
    ],
  })

  const raw = message.content[0]?.text ?? ''

  // Extract JSON — handles cases where Claude wraps output in prose or code fences
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) {
    throw new Error(`Claude did not return valid JSON. Raw response: ${raw}`)
  }

  let parsed
  try {
    parsed = JSON.parse(match[0])
  } catch (e) {
    throw new Error(`Failed to parse Claude's JSON response: ${e.message}. Raw: ${raw}`)
  }

  return parsed
}

module.exports = { analyzeBoardPhoto }
