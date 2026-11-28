export function Extra() {
  function go() {
    new EventSource('/events')
  }
  return <button type="button" onClick={go}>Send</button>
}
