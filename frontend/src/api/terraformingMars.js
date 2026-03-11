import client from './client'

export const listGames = () => client.get('/terraforming-mars/games')
export const createGame = (data) => client.post('/terraforming-mars/games', data)
export const getGame = (id) => client.get(`/terraforming-mars/games/${id}`)
export const completeGame = (id, data) => client.post(`/terraforming-mars/games/${id}/complete`, data)
export const updateGame = (id, data) => client.put(`/terraforming-mars/games/${id}`, data)
export const deleteGame = (id) => client.delete(`/terraforming-mars/games/${id}`)
export const getLeaderboard = () => client.get('/terraforming-mars/leaderboard')
export const analyzePhoto = (formData) =>
  client.post('/terraforming-mars/analyze-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
