import { createMemoryStorage, createMockRecordStore } from '/home/agent/worktrees/lacuna-apps/study-planner/toolbox/modules/host-mock/0.1.0/src/index.ts'
const store = createMockRecordStore({ key: 'k', idPrefix: 'session-' })
console.log('add1:', JSON.stringify(store.add({ subject: 'Math', date: '2024-05-15', start: '14:00', duration: 60, done: false })))
console.log('add2:', JSON.stringify(store.add({ subject: 'History', date: '2024-05-16', start: '10:00', duration: 90, done: false })))
console.log('add3:', JSON.stringify(store.add({ subject: 'History', date: '2024-05-23', start: '10:00', duration: 90, done: false })))
console.log('list:', JSON.stringify(store.list()))
store.update('session-1', { done: true })
console.log('after update:', JSON.stringify(store.list()))
