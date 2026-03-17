import http from '@/axios/index.js'

export function generateToken(email) {
    return http.post('/mailboxToken/generate', { email })
}

export function getLatestCode(token) {
    return http.post('/code/latest', { token })
}

export function addSubAccount(email) {
    return http.post('/account/add', { email })
}
