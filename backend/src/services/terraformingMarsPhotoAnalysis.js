/**
 * Photo analysis service for Terraforming Mars board state.
 * Uses Claude Vision to extract game state from a board photo via 3 parallel focused passes.
 */

const Anthropic = require('@anthropic-ai/sdk')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

// Load reference image once at module init (null if file doesn't exist — reference is optional)
let REF_IMAGE_BASE64 = null
const REF_IMAGE_MEDIA_TYPE = 'image/jpeg'
try {
  const refPath = path.join(__dirname, 'tm-board-reference.jpg')
  REF_IMAGE_BASE64 = fs.readFileSync(refPath).toString('base64')
} catch (_) { /* reference image optional */ }

// Pass 1 — perimeter scale: TR values + Generation
const PROMPT_SCALE = `You are looking at a Terraforming Mars board. Focus ONLY on the perimeter border of the board — ignore the interior hex grid, tiles, milestones, and awards completely.

## Important: image layout

You will see the full board image. The perimeter scale runs around the outside border of the entire board.

## The perimeter scale layout

The board's rectangular border is made up of small alternating orange and yellow squares, each printed with a number from 1 to 100. The scale runs CLOCKWISE with these known anchor points:
- 1  → one square above the very bottom-left corner (left edge, near bottom)
- 25 → top-left corner
- 50 → top-right corner
- 75 → bottom-right corner
- 100 → very bottom-left corner (wrapping back to just before 1)

## Important: cubes cover their number

A cube sitting on a square covers up the printed number. You cannot read the number directly under it. Instead, find the nearest VISIBLE numbered square next to the cube and count one step to determine the covered value.

## How to read each cube — mandatory process

For EACH cube on the perimeter scale, follow this exact process:

1. Identify the cube's color (white = generation tracker; colored = player TR).
2. Identify which edge the cube is on (left / top / right / bottom).
3. Choose the CLOSEST anchor to that cube:
   - Left edge: use anchor 1 (near bottom-left) or anchor 25 (top-left corner).
   - Top edge: use anchor 25 (top-left) or anchor 50 (top-right).
   - Right edge: use anchor 50 (top-right) or anchor 75 (bottom-right).
   - Bottom edge: use anchor 75 (bottom-right) or anchor 100 (bottom-left).
   Always pick whichever of the two options is CLOSER to the cube — fewer squares to count means fewer counting errors.
4. Count the squares from that anchor to the cube along the clockwise track.
5. Calculate: position = anchor value + count (if counting clockwise away from anchor).
6. Verify by counting from the OTHER nearby anchor. If both counts agree, you have the right value. If they disagree, recount.

## The white generation cube

The generation cube is white (or very light-colored) and slightly larger than player cubes. It tracks the current generation on the same perimeter scale. Generation typically runs 7–15 in a late-game photo.

IMPORTANT for generation: the white cube is almost always on the LEFT edge (between anchors 1 and 25). Start your count from anchor 1 (bottom-left) and count UP the left edge. Each square = +1. So if the cube is 14 squares above anchor 1, the generation is 15.

## Player cubes (TR trackers)

One cube per player color. TR starts at 20 and typically reaches 40–65 by late game. A value above 70 almost certainly means a counting error — recount from a different anchor.

If a cube is near anchor 50 (top-right corner), count BACK from 50: e.g., 1 square before anchor 50 = TR 49, 9 squares before = TR 41.

## Sanity check

After computing each value: generation should be 1–20, player TR should be 20–65. If any value falls outside these ranges, recount from the other nearby anchor before accepting it.

Return ONLY this JSON (no prose, no code fences):
{
  "generation": <integer>,
  "players": [
    { "color": "<red|green|blue|yellow|black>", "tr": <integer> }
  ]
}`

// Pass 2 — tile grid: Greenery count + city-adjacent greeneries per player
const PROMPT_TILES = `You are looking at a Terraforming Mars board. Focus ONLY on the hexagonal tile grid covering the center of the board (the Mars terrain). Ignore the perimeter scale, milestones, and awards.

## Tile types

- GREEN hexagonal tiles = Greenery tiles. Each has a small colored cube (red/blue/green/yellow/black) on it identifying the owner. The tile itself is green/forest-colored.
- GRAY hexagonal tiles = City tiles. Each has a small colored cube on it. The tile is gray or brown-gray.
- BLUE tiles = Ocean tiles. No player cube. Do not count these.
- BROWN/SPECIAL tiles = Special project tiles. Each has a player cube. Not greeneries.

## Step 1 — Count greeneries per player

Scan the entire board once for EACH player color separately. Do not try to count all colors at once.

For the FIRST player color:
- Go through every hex location on the board from top-left to bottom-right, row by row.
- At each location: is there a green (forest) tile? If yes, does it have a cube of this player's color on it?
- List each matching tile by its approximate board position.
- Count them up. This is that player's greenery count.

Repeat the full row-by-row scan for EACH remaining player color.

This per-color scan prevents accidentally attributing one player's tiles to another.

## Step 2 — Count city-adjacent greeneries per player

For each player, find every city tile they own (gray tile with their cube).

For EACH city tile, work through it explicitly:
- Describe the city's approximate position on the board (e.g. "blue city near top-center").
- Look at each of its 6 neighboring hexes one by one. A hex neighbor shares a full edge with the city hex.
- For each neighbor, state whether it is a green tile or not.
- Count how many of the 6 neighbors are green tiles.

Sum the neighbor-greenery counts across ALL of that player's cities. This total is their city_adjacent_greeneries.

Important: A single greenery tile may border cities from two different players — count it once for each player whose city it touches. Do not skip any cities or any neighbors.

Two special city spots in the very top-left corner (outside the main hex grid) have no hex neighbors — count them as cities but contribute 0 to city_adjacent_greeneries.

## Step 3 — Count total tiles per player

For each player: total_tiles = greeneries + cities + special tiles (everything with their cube on it).

Return ONLY this JSON (no prose, no code fences):
{
  "players": [
    {
      "color": "<red|green|blue|yellow|black>",
      "greeneries": <integer>,
      "city_adjacent_greeneries": <integer>,
      "total_tiles": <integer>
    }
  ]
}`

// Pass 3 — cards area: Milestones claimed + awards funded
const PROMPT_CARDS = `You are looking at a Terraforming Mars board. Focus ONLY on the milestone cards and award cards — ignore the board interior, tiles, and perimeter scale.

## Milestone cards (bottom-left area of the board)

There are exactly 5 milestone cards arranged in the bottom-left region. Their names are printed on the cards:
  Terraformer, Mayor, Gardener, Builder, Planner

A milestone is "claimed" if a colored player cube (red, blue, green, yellow, or black) is physically sitting on or placed on top of that card. An unclaimed milestone has no cube on it.

For EACH of the 5 milestone cards, work through it step by step:
1. Look at the card and read the text printed on it out loud in your reasoning. The exact names are Terraformer, Mayor, Gardener, Builder, Planner — do not substitute one for another.
2. Check whether a small colored cube is physically sitting on top of that card.
3. If a cube is present, identify its color carefully. Hold the cube color in mind separately from the green board background — a blue cube is distinctly blue even against a green surface.

Do NOT assume a milestone is claimed based on position alone — read the text on each card. Do NOT confuse Mayor with any other card name.

Up to 3 milestones can be claimed.

## Award cards (bottom-right area of the board)

There are exactly 5 award cards arranged in the bottom-right region. Their names are:
  Landlord, Banker, Scientist, Thermalist, Miner

An award is "funded" if any cube is sitting on that card. The cube color does not matter for awards — only whether a cube is present.

For EACH of the 5 award cards:
1. Read the name printed on the card.
2. Check whether any cube is present on it.

Up to 3 awards can be funded.

## Landlord award (only if Landlord is funded)

If Landlord is funded, look at the whole board and count total tiles owned by each player (greeneries + cities + any special tiles — everything with a player cube on it). Determine 1st place (most tiles) and 2nd place. If two players tie for 1st, there is no 2nd place.

Return ONLY this JSON (no prose, no code fences):
{
  "milestones_claimed": [
    { "name": "<Terraformer|Mayor|Gardener|Builder|Planner>", "color": "<player color>" }
  ],
  "awards_funded": [
    { "name": "<Landlord|Banker|Scientist|Thermalist|Miner>" }
  ],
  "landlord_ranks": {
    "first": ["<color>", ...],
    "second": ["<color>", ...]
  }
}
Include "landlord_ranks" only if Landlord is funded. Return ONLY the JSON.`

/**
 * Crop the board image into focused regions for each pass.
 * Returns { strips: { top, bottom, left, right }, interior, cards } as JPEG Buffers,
 * or null on any failure (triggers fallback to full image).
 */
async function cropRegions(imageBuffer) {
  try {
    const { width, height } = await sharp(imageBuffer).metadata()

    const topH    = Math.floor(height * 0.15)
    const bottomH = Math.floor(height * 0.15)
    const leftW   = Math.floor(width * 0.12)
    const rightW  = Math.floor(width * 0.12)

    // Extract 4 edge strips, each resized to a manageable size
    const top = await sharp(imageBuffer)
      .extract({ left: 0, top: 0, width, height: topH })
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()
    const bottom = await sharp(imageBuffer)
      .extract({ left: 0, top: height - bottomH, width, height: bottomH })
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()
    const left = await sharp(imageBuffer)
      .extract({ left: 0, top: 0, width: leftW, height })
      .resize({ height: 1200, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()
    const right = await sharp(imageBuffer)
      .extract({ left: width - rightW, top: 0, width: rightW, height })
      .resize({ height: 1200, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()

    // Interior hex grid — center 80%
    const interior = await sharp(imageBuffer)
      .extract({ left: Math.floor(width * 0.10), top: Math.floor(height * 0.10), width: Math.floor(width * 0.80), height: Math.floor(height * 0.80) })
      .jpeg({ quality: 85 })
      .toBuffer()

    // Cards area — bottom 35%
    const cardsH = Math.floor(height * 0.35)
    const cards = await sharp(imageBuffer)
      .extract({ left: 0, top: height - cardsH, width, height: cardsH })
      .jpeg({ quality: 85 })
      .toBuffer()

    console.log('[TM Photo] cropRegions succeeded')
    return { strips: { top, bottom, left, right }, interior, cards }
  } catch (err) {
    console.error('[TM Photo] cropRegions failed, using full image:', err.message)
    return null
  }
}

/**
 * Extract JSON object from a text string (handles prose wrappers and code fences).
 */
function parseJson(text) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return {}
  try {
    return JSON.parse(match[0])
  } catch (_) {
    return {}
  }
}

/**
 * Build the message content array, optionally prepending the reference board image.
 * @param {boolean} useRef - whether to include the reference image (default true)
 */
function buildContent(base64Image, mediaType, promptText, useRef = true) {
  const content = []
  if (useRef && REF_IMAGE_BASE64) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: REF_IMAGE_MEDIA_TYPE, data: REF_IMAGE_BASE64 },
    })
    content.push({
      type: 'text',
      text: 'Image 1 above is a blank reference board — use it to understand the board layout.\nImage 2 below is the actual game board to analyze.\n',
    })
  }
  content.push({
    type: 'image',
    source: { type: 'base64', media_type: mediaType, data: base64Image },
  })
  content.push({ type: 'text', text: promptText })
  return content
}

/**
 * Build the content array for the scale pass using 4 individual edge strip images.
 * Each strip is labeled so the model knows which edge it represents.
 */
function buildScaleContent(strips, promptText) {
  const content = []
  content.push({
    type: 'text',
    text: 'The following 4 images are cropped strips of the 4 edges of the game board perimeter:\n',
  })
  content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: strips.top.toString('base64') } })
  content.push({ type: 'text', text: 'Image above: TOP edge of the board (anchor 25 at left end → anchor 50 at right end).\n' })
  content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: strips.bottom.toString('base64') } })
  content.push({ type: 'text', text: 'Image above: BOTTOM edge of the board (anchor 75 at left end → anchor 100 at right end).\n' })
  content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: strips.left.toString('base64') } })
  content.push({ type: 'text', text: 'Image above: LEFT edge of the board (anchor 1 near bottom → anchor 25 at top).\n' })
  content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: strips.right.toString('base64') } })
  content.push({ type: 'text', text: 'Image above: RIGHT edge of the board (anchor 50 at top → anchor 75 near bottom).\n' })
  content.push({ type: 'text', text: promptText })
  return content
}

/**
 * Make one focused API call, with one automatic retry on connection error.
 * Returns {} only if both attempts fail.
 * Pass options.content to override the auto-built content array.
 */
async function callClaude(client, base64Image, mediaType, prompt, maxTokens, passName, options = {}, attempt = 1) {
  const { thinking, useRef = true, content: prebuiltContent } = options
  try {
    const createParams = {
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prebuiltContent || buildContent(base64Image, mediaType, prompt, useRef) }],
    }
    if (thinking) createParams.thinking = thinking
    const message = await client.messages.create(createParams)
    const textBlock = message.content.find(b => b.type === 'text')
    const raw = textBlock?.text ?? ''
    const result = parseJson(raw)
    console.log(`[TM Photo] ${passName} (attempt ${attempt}) raw text:`, raw.slice(0, 500))
    console.log(`[TM Photo] ${passName} parsed:`, JSON.stringify(result))
    return result
  } catch (err) {
    console.error(`[TM Photo] ${passName} (attempt ${attempt}) error [${err.constructor.name} status=${err.status ?? 'none'}]:`, err.message, err.cause ?? '')
    if (attempt < 2) {
      console.log(`[TM Photo] ${passName} retrying...`)
      return callClaude(client, base64Image, mediaType, prompt, maxTokens, passName, options, 2)
    }
    return {}
  }
}

/**
 * Merge the three pass results into one unified object matching the response schema.
 */
function mergeResults(scaleResult, tilesResult, cardsResult) {
  // Union all player colors seen across both player-data passes
  const allColors = new Set()
  for (const p of [...(scaleResult.players || []), ...(tilesResult.players || [])]) {
    allColors.add(p.color)
  }

  const players = []
  for (const color of allColors) {
    const sp = (scaleResult.players || []).find(p => p.color === color) || {}
    const tp = (tilesResult.players || []).find(p => p.color === color) || {}
    players.push({
      color,
      tr: sp.tr ?? 20,
      greeneries: tp.greeneries ?? 0,
      city_adjacent_greeneries: tp.city_adjacent_greeneries ?? 0,
      total_tiles: tp.total_tiles ?? 0,
    })
  }

  const merged = {
    generation: scaleResult.generation ?? null,
    players,
    milestones_claimed: cardsResult.milestones_claimed || [],
    awards_funded: cardsResult.awards_funded || [],
  }
  if (cardsResult.landlord_ranks) {
    merged.landlord_ranks = cardsResult.landlord_ranks
  }
  return merged
}

/**
 * Analyze a Terraforming Mars board photo and extract structured game state.
 * Runs 3 parallel focused passes (scale, tiles, cards) for better accuracy.
 *
 * @param {Buffer} imageBuffer  - Raw image bytes
 * @param {string} mediaType    - MIME type, e.g. 'image/jpeg'
 * @returns {Promise<object>}   - Parsed JSON matching the structured prompt schema
 * @throws {Error}              - If API key missing or all passes fail
 */
async function analyzeBoardPhoto(imageBuffer, mediaType, playerColors) {
  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error('ANTHROPIC_API_KEY is not configured in the backend environment')
    err.statusCode = 503
    throw err
  }

  const client = new Anthropic()
  const base64Image = imageBuffer.toString('base64')

  const crops = await cropRegions(imageBuffer)

  // If player colors are known, inject them into the scale and tiles prompts
  const colorConstraint = (playerColors && playerColors.length)
    ? `\nIMPORTANT: This game has exactly ${playerColors.length} player(s). The only player cube colors present on this board are: ${playerColors.join(', ')}. Do not report any other colors — if you think you see a different color, it is a background object or misidentification.\n`
    : ''

  // Scale: full image resized to 800px — gives Claude board orientation context for accurate counting
  const scaleBuffer = await sharp(imageBuffer)
    .resize({ width: 800, withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()
  console.log('[TM Photo] scale image size (bytes):', scaleBuffer.length)
  const scaleResult = await callClaude(
    client, scaleBuffer.toString('base64'), 'image/jpeg', PROMPT_SCALE + colorConstraint, 8000, 'scale',
    { thinking: { type: 'enabled', budget_tokens: 5000 } }
  )

  // Tiles: interior crop when available; reference board helps orient the hex grid
  const tilesImage     = crops ? crops.interior.toString('base64') : base64Image
  const tilesMediaType = crops ? 'image/jpeg' : mediaType
  const tilesResult = await callClaude(client, tilesImage, tilesMediaType, PROMPT_TILES + colorConstraint, 4096, 'tiles')

  // Cards: cards crop when available; NO reference image — reading card text directly is more reliable
  const cardsImage     = crops ? crops.cards.toString('base64') : base64Image
  const cardsMediaType = crops ? 'image/jpeg' : mediaType
  const cardsResult = await callClaude(client, cardsImage, cardsMediaType, PROMPT_CARDS, 2048, 'cards',
    { useRef: false })

  const merged = mergeResults(scaleResult, tilesResult, cardsResult)
  console.log('[TM Photo] merged result:', JSON.stringify(merged))
  return merged
}

module.exports = { analyzeBoardPhoto }
