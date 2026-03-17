import http from '@/axios/index.js'

export function generateToken(email) {
    return http.post('/mailboxToken/generate', { email })
}

export function getCurrentToken(email) {
    return http.post('/mailboxToken/current', { email })
}

export function rotateToken(email) {
    return http.post('/mailboxToken/rotate', { email })
}

export function disableToken(email) {
    return http.post('/mailboxToken/disable', { email })
}

export function enableToken(email) {
    return http.post('/mailboxToken/enable', { email })
}

export function getLatestCode(token) {
    return http.post('/code/latest', { token })
}

export function getRecentTokenMails(token) {
    return http.post('/mailboxToken/recent', { token })
}

export function addSubAccount(email) {
    return http.post('/account/add', { email })
}
