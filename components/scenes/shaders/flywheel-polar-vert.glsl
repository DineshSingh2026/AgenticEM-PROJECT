// FlywheelScene: flat overlays authored in mechanism space (XY plane). Passes local position for polar coords.
varying vec2 vPos;
void main() {
  vPos = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
