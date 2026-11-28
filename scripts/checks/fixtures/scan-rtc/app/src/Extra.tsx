export function Extra() {
  function go() {
    new RTCPeerConnection()
  }
  return <button type="button" onClick={go}>Send</button>
}
