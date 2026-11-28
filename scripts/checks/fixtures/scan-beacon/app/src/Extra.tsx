export function Extra() {
  function go() {
    navigator.sendBeacon('/collect', 'hi')
  }
  return <button type="button" onClick={go}>Send</button>
}
