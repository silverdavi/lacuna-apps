export function Extra() {
  function go() {
    fetch('/api/items')
  }
  return <button type="button" onClick={go}>Send</button>
}
