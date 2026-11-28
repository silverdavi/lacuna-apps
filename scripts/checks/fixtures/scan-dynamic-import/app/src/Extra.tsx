export function Extra() {
  function go() {
    import('./App').then((m) => console.log(m))
  }
  return <button type="button" onClick={go}>Send</button>
}
