/*
# Feature : Apple Music Search
# Type : ESM Plugin
# Source : https://music.apple.com
*/
import axios from 'axios'

let cachedToken = null
let cachedTokenExp = 0

const getAppleMusicToken = async () => {
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedTokenExp - now > 60) {
    return cachedToken
  }

  const homepage = await axios.get('https://music.apple.com/id/browse')
  const html = homepage.data

  const jsMatch = html.match(/(?:src|href)="([^"]*\/assets\/index-[^"]+\.js)"/)
  if (!jsMatch) {
    throw new Error('Could not find the index-*.js bundle on music.apple.com')
  }

  const jsUrl = jsMatch[1].startsWith('http') ? jsMatch[1] : `https://music.apple.com${jsMatch[1]}`
  const jsResponse = await axios.get(jsUrl)
  const jsContent = jsResponse.data

  const tokenMatch = jsContent.match(/"(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)"/)
  if (!tokenMatch) {
    throw new Error('Could not find the token inside the JS bundle')
  }

  const token = tokenMatch[1]
  const payloadBase64 = token.split('.')[1]
  const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'))

  cachedToken = token
  cachedTokenExp = payload.exp

  return token
}

const searchSuggestionsRaw = async (term, storefront = 'id') => {
  const token = await getAppleMusicToken()
  const url = `https://amp-api-edge.music.apple.com/v1/catalog/${storefront}/search/suggestions`

  const params = {
    'art[url]': 'f',
    'fields[albums]': 'artistName,artwork,contentRating,name,playParams,url',
    'fields[artists]': 'url,name,artwork',
    'format[resources]': 'map',
    kinds: 'terms,topResults',
    l: 'en-GB',
    'limit[results:terms]': 5,
    'limit[results:topResults]': 10,
    'omit[resource]': 'autos',
    platform: 'web',
    term,
    types: 'activities,albums,artists,editorial-items,music-movies,music-videos,playlists,record-labels,songs,stations,tv-episodes',
    with: 'naturalLanguage'
  }

  const headers = {
    origin: 'https://amp.apple.com',
    authorization: `Bearer ${token}`,
    'x-apple-client-version': '2632.4.0-external'
  }

  const response = await axios.get(url, { params, headers })
  return response.data
}

const resolveResource = (resources, type, id) => {
  if (!resources || !resources[type] || !resources[type][id]) return null
  return resources[type][id]
}

const summarizeItem = (item, resources) => {
  if (!item) return null
  const { type, id } = item
  const resource = resolveResource(resources, type, id)
  if (!resource) return { type, id, title: '(not found)' }

  const attrs = resource.attributes || {}
  const base = { type, id, title: attrs.name || '(untitled)' }

  if (type === 'songs' || type === 'music-videos') {
    base.artist = attrs.artistName
    base.album = attrs.albumName
    base.url = attrs.url
  } else if (type === 'albums') {
    base.artist = attrs.artistName
    base.releaseDate = attrs.releaseDate
    base.url = attrs.url
  } else if (type === 'artists') {
    base.url = attrs.url
  } else if (type === 'playlists') {
    base.curator = attrs.curatorName
    base.url = attrs.url
  } else {
    base.url = attrs.url
  }

  return base
}

const searchSuggestions = async (term, storefront = 'id') => {
  const data = await searchSuggestionsRaw(term, storefront)
  const suggestions = data.results?.suggestions || []
  const resources = data.resources || {}

  const terms = []
  const topResults = []

  for (const item of suggestions) {
    if (item.kind === 'terms') {
      terms.push(item.displayTerm || item.searchTerm)
    } else if (item.kind === 'topResults') {
      const summary = summarizeItem(item.content, resources)
      if (summary) topResults.push(summary)
    }
  }

  return { term, terms, topResults }
}

const typeEmoji = {
  songs: '🎵',
  albums: '💿',
  artists: '🎤',
  playlists: '📃',
  'music-videos': '🎬'
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    const guide = `
🍎 *Apple Music Search*

This feature searches Apple Music's catalog for songs, albums, artists, and playlists, and shows you the top matches along with their Apple Music links.

*How to use:*
\`${usedPrefix + command} <search term>\`

*Example:*
${usedPrefix + command} let me love you
`.trim()

    return conn.reply(m.chat, guide, m)
  }

  try {
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    const result = await searchSuggestions(text.trim())

    if (!result.topResults.length && !result.terms.length) {
      throw new Error('No results found for that search term.')
    }

    let msg = `🍎 *Apple Music Search:* "${result.term}"\n\n`

    if (result.topResults.length) {
      msg += '*Top results:*\n'
      result.topResults.forEach((r, i) => {
        const emoji = typeEmoji[r.type] || '•'
        msg += `${i + 1}. ${emoji} *${r.title}*${r.artist ? ` - ${r.artist}` : ''}\n`
        if (r.url) msg += `   ${r.url}\n`
      })
    }

    if (result.terms.length) {
      msg += `\n*Related searches:*\n${result.terms.map((t) => `• ${t}`).join('\n')}`
    }

    await conn.reply(m.chat, msg.trim(), m)
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  } catch (err) {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    conn.reply(m.chat, `❌ Failed to search: ${err.message}`, m)
  }
}

handler.help = ['applemusic']
handler.command = ['applemusic']
handler.tags = ['search']

handler.limit = false

export default handler
