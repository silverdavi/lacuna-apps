export function Extra() {
  function go() {
    new Function('return 1')()
  }
  return <button type="button" onClick={go}>Send</button>
}
