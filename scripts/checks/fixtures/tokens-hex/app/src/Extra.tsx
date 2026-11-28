export function Extra() {
  function go() {
    document.body.style.outline = '2px solid #ff0000'
  }
  return <button type="button" onClick={go}>Outline</button>
}
