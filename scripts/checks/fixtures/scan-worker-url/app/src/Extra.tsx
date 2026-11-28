export function Extra() {
  function go() {
    new Worker('https://cdn.example.org/worker.js')
  }
  return <button type="button" onClick={go}>Send</button>
}
