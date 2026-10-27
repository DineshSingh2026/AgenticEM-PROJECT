// AgentField GPGPU position step. Prepend noise.glsl.
uniform sampler2D uPositions;
uniform sampler2D uOrigin;
uniform float uInit;
uniform float uTime;
uniform float uDt;
uniform float uSpeed;
uniform float uFreq;
uniform vec3 uBounds;
uniform vec2 uPointer;      // world xy
uniform float uRadius;      // world units
uniform float uStrength;
uniform float uPointerOn;
varying vec2 vUv;

void main() {
  vec4 o = texture2D(uOrigin, vUv);
  if (uInit > 0.5) { gl_FragColor = o; return; }
  vec4 p = texture2D(uPositions, vUv);
  vec3 pos = p.xyz;

  vec3 c = curlNoise(pos * uFreq + vec3(0.0, 0.0, uTime * 0.015));
  c.z *= 0.35; // keep the volume flattened
  pos += c * uSpeed * uDt;

  // Soft gravity well with a little swirl so particles orbit instead of collapsing.
  vec2 d = uPointer - pos.xy;
  float dist = max(length(d), 1e-3);
  float f = (1.0 - smoothstep(0.0, uRadius, dist)) * uPointerOn;
  vec2 dir = d / dist;
  pos.xy += (dir * 0.7 + vec2(-dir.y, dir.x) * 0.9) * f * uStrength * uDt;

  // Containment: drift back to home slowly; keep depth flat.
  pos = mix(pos, o.xyz, 0.06 * uDt);
  pos.z = mix(pos.z, o.z, 0.4 * uDt);
  if (any(greaterThan(abs(pos), uBounds))) pos = o.xyz;

  gl_FragColor = vec4(pos, p.w);
}
