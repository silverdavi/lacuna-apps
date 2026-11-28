export function Extra() {
  function go() {
    console.log(document.cookie)
  }
  return <button type="button" onClick={go}>Send</button>
}
