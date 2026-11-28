export function Extra() {
  function go() {
    location.href = '/elsewhere'
  }
  return <button type="button" onClick={go}>Send</button>
}
