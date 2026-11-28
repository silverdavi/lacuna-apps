export function Extra() {
  function go() {
    const x = new XMLHttpRequest(); x.open('POST', '/collect'); x.send('hi')
  }
  return <button type="button" onClick={go}>Send</button>
}
