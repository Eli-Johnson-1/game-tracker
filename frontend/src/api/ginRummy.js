import client from './client'

export const listGames = (params) => client.get('/gin-rummy/games', { params })
export const getGame = (id) => client.get(`/gin-rummy/games/${id}`)
export const createGame = (data) => client.post('/gin-rummy/games', data)
export const deleteGame = (id) => client.delete(`/gin-rummy/games/${id}`)
export const submitHand = (gameId, data) => client.post(`/gin-rummy/games/${gameId}/hands`, data)
export const undoLastHand = (gameId, handId) => client.delete(`/gin-rummy/games/${gameId}/hands/${handId}`)
export const getLeaderboard = () => client.get('/gin-rummy/leaderboard')
