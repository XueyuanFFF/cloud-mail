export const requirePerms = [
  '/email/send',
  '/email/delete',
  '/account/list',
  '/account/delete',
  '/account/add',
  '/my/delete',
  '/role/add',
  '/role/list',
  '/role/delete',
  '/role/tree',
  '/role/set',
  '/role/setDefault',
  '/allEmail/list',
  '/allEmail/delete',
  '/setting/setBackground',
  '/setting/deleteBackground',
  '/setting/set',
  '/setting/query',
  '/user/delete',
  '/user/setPwd',
  '/user/setStatus',
  '/user/setType',
  '/user/list',
  '/user/resetSendCount',
  '/user/add',
  '/user/deleteAccount',
  '/user/allAccount',
  '/regKey/add',
  '/regKey/list',
  '/regKey/delete',
  '/regKey/clearNotUse',
  '/regKey/history',
  '/mailboxToken/generate',
  '/mailboxToken/current',
  '/mailboxToken/rotate',
  '/mailboxToken/disable',
  '/mailboxToken/enable',
  '/mailboxToken/recent',
  '/mailboxToken/ban',
  '/mailboxToken/unban',
]

export const permPathMap = {
  'email:delete': ['/email/delete'],
  'email:send': ['/email/send'],
  'account:add': ['/account/add'],
  'account:query': ['/account/list'],
  'account:delete': ['/account/delete'],
  'my:delete': ['/my/delete'],
  'role:add': ['/role/add'],
  'role:set': ['/role/set', '/role/setDefault'],
  'role:query': ['/role/list', '/role/tree'],
  'role:delete': ['/role/delete'],
  'user:query': ['/user/list', '/user/allAccount'],
  'user:add': ['/user/add'],
  'user:reset-send': ['/user/resetSendCount'],
  'user:set-pwd': ['/user/setPwd'],
  'user:set-status': ['/user/setStatus'],
  'user:set-type': ['/user/setType'],
  'user:delete': ['/user/delete', '/user/deleteAccount'],
  'all-email:query': ['/allEmail/list', '/allEmail/latest'],
  'all-email:delete': ['/allEmail/delete', '/allEmail/batchDelete'],
  'setting:query': ['/setting/query'],
  'setting:set': ['/setting/set', '/setting/setBackground', '/setting/deleteBackground'],
  'analysis:query': ['/analysis/echarts'],
  'reg-key:add': ['/regKey/add'],
  'reg-key:query': ['/regKey/list', '/regKey/history'],
  'reg-key:delete': ['/regKey/delete', '/regKey/clearNotUse'],
  'mailboxToken:generate': [
    '/mailboxToken/generate',
    '/mailboxToken/current',
    '/mailboxToken/rotate',
    '/mailboxToken/disable',
    '/mailboxToken/enable',
    '/mailboxToken/recent',
  ],
  'mailboxToken:ban': ['/mailboxToken/ban'],
  'mailboxToken:unban': ['/mailboxToken/unban'],
}

export function permKeyToPaths(permKeys) {
  const paths = []

  for (const key of Array.isArray(permKeys) ? permKeys : []) {
    const routeList = permPathMap[key]
    if (Array.isArray(routeList)) {
      paths.push(...routeList)
    }
  }

  return paths
}
