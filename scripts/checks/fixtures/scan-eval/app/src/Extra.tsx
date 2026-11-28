export function Extra() {
  function go() {
    eval('1 + 1')
  }
  return <button type="button" onClick={go}>Send</button>
}
