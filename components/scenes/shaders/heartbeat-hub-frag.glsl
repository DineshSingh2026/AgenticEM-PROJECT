// Octagonal "Gaming Service" hub: graphite body, faint etched rings, beat ripple on the cap.
uniform float uOpacity;
uniform float uTime;
uniform float uRadius;
uniform vec3 uBase;
uniform vec3 uLight;
uniform vec3 uCopper;
uniform vec3 uPulse;

varying vec3 vNormalV;
varying vec3 vLocal;
varying vec3 vViewDir;

void main() {
  vec3 n = normalize(vNormalV);
  float diff = clamp(dot(n, normalize(vec3(-0.4, 0.6, 0.7))), 0.0, 1.0);
  vec3 col = mix(uBase, uLight, diff * 0.6);
  float fres = pow(1.0 - clamp(dot(n, normalize(vViewDir)), 0.0, 1.0), 3.0);
  col += uCopper * fres * 0.35;

  float cap = step(0.6, abs(n.z));
  float r = length(vLocal.xy) / uRadius;
  float etch = smoothstep(0.03, 0.0, abs(fract(r * 5.0) - 0.5) - 0.44) * 0.04;
  float ripple = fract(uTime);
  float ring = exp(-pow((r - ripple) / 0.05, 2.0)) * (1.0 - ripple);
  col += cap * (uLight * etch + uPulse * ring * 0.18);

  gl_FragColor = vec4(col, uOpacity);
  #include <colorspace_fragment>
}
