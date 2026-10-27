varying vec3 vNormalV;
varying vec3 vLocal;
varying vec3 vViewDir;

void main() {
  vLocal = position;
  vNormalV = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
