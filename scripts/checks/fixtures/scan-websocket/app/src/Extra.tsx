export function Extra() {
  function go() {
    new WebSocket('wss://socket.example.org')
  }
  return <button type="button" onClick={go}>Send</button>
}
