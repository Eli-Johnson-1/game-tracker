import client from './client'

export const getSiteLeaderboard = () => client.get('/leaderboard')
