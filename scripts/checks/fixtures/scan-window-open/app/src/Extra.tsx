export function Extra() {
  function go() {
    window.open('/elsewhere')
  }
  return <button type="button" onClick={go}>Send</button>
}
