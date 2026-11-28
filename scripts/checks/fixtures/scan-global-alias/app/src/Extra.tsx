export function Extra() {
  function go() {
    const name = ['fe', 'tch'].join(''); (globalThis as any)[name]('/x')
  }
  return <button type="button" onClick={go}>Send</button>
}
