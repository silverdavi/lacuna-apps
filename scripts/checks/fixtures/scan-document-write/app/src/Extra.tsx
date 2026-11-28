export function Extra() {
  function go() {
    document.write('<p>hi</p>')
  }
  return <button type="button" onClick={go}>Send</button>
}
