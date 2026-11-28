export function Extra() {
  function go() {
    const img = new Image(); img.src = 'https://tracker.example.org/p.png'
  }
  return <button type="button" onClick={go}>Send</button>
}
