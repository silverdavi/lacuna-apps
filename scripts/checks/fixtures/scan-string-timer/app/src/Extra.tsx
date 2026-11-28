export function Extra() {
  function go() {
    setTimeout('alert(1)', 10)
  }
  return <button type="button" onClick={go}>Send</button>
}
