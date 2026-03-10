import client from './client'

export const entraAuth = (idToken) => client.post('/auth/entra', { idToken })
export const getMe = () => client.get('/auth/me')
