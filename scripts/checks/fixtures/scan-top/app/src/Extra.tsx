export function Extra() {
  function go() {
    top?.postMessage('hi', '*')
  }
  return <button type="button" onClick={go}>Send</button>
}
