#version 300 es
// Procedural brush stroke, part 1: where the dabs go.
//
// There is no vertex buffer. One *instance* is one stamp of the brush: its
// number says how far along the stroke it lands, and a hash of that number
// gives it a random sideways scatter, size and rotation — just like Photoshop's
// "scattering" options. The centre line of the stroke itself is generated right
// here from a few seeded sine waves.
//
// Each instance draws a quad (4 vertices, triangle strip) that the fragment
// shader fills with the speckled dab texture.
precision highp float;

const float TAU = 6.28318530718;

uniform vec2 uView;      // viewport size in CSS px
uniform vec2 uA;         // start of the base line (CSS px)
uniform vec2 uB;         // end of the base line (CSS px)
uniform vec3 uWave[2];   // lateral wobble: (amplitude px, cycles, phase)
uniform vec3 uPress[2];  // width variation: (fraction, cycles, phase)
uniform float uCount;    // total number of dabs in the stroke
uniform float uFirst;    // index of the first dab drawn by this call
uniform float uRadius;   // dab radius (CSS px)
uniform float uScatter;  // max sideways offset of a dab (CSS px)
uniform float uJitter;   // random size variation (± fraction of the radius)
uniform vec2 uSeed;      // per-stroke offset into the hash domain

out vec2 vUV;            // position inside the (un-rotated) dab texture

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

vec2 centre(float t) {
  vec2 base = mix(uA, uB, t);
  vec2 dir = normalize(uB - uA);
  vec2 nrm = vec2(-dir.y, dir.x);
  float off = 0.0;
  for (int i = 0; i < 2; i++) {
    off += uWave[i].x * sin(TAU * uWave[i].y * t + uWave[i].z);
  }
  return base + nrm * off;
}

float pressure(float t) {
  float p = 1.0;
  for (int i = 0; i < 2; i++) {
    p += uPress[i].x * sin(TAU * uPress[i].y * t + uPress[i].z);
  }
  return p;
}

void main() {
  float id = float(gl_InstanceID) + uFirst;
  float t = (id + 0.5) / uCount;

  vec2 c = centre(t);
  vec2 tangent = centre(min(t + 0.0015, 1.0)) - centre(max(t - 0.0015, 0.0));
  vec2 n = normalize(vec2(-tangent.y, tangent.x));

  // Four independent random numbers per dab.
  float key = id * 5.0 + uSeed.x;
  float press = pressure(t);
  float lateral = (hash11(key) * 2.0 - 1.0) * uScatter * press;
  float radius = uRadius * press * (1.0 - uJitter + 2.0 * uJitter * hash11(key + 1.0));
  float angle = hash11(key + 2.0) * TAU;
  float flip = hash11(key + 3.0) < 0.5 ? -1.0 : 1.0;

  // Triangle-strip corners: (-1,-1) (1,-1) (-1,1) (1,1).
  vec2 corner = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1)) * 2.0 - 1.0;
  float ca = cos(angle);
  float sa = sin(angle);
  vec2 offset = vec2(ca * corner.x - sa * corner.y, sa * corner.x + ca * corner.y) * radius;

  vec2 p = c + n * lateral + offset;
  gl_Position = vec4(p.x / uView.x * 2.0 - 1.0, 1.0 - p.y / uView.y * 2.0, 0.0, 1.0);
  vUV = vec2(0.5 + 0.5 * corner.x * flip, 0.5 + 0.5 * corner.y);
}
