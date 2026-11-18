#version 300 es
// Procedural brush stroke, part 1: geometry.
//
// There is no vertex buffer. Every vertex derives its position from
// gl_VertexID: pairs of vertices straddle the centre line, which is generated
// right here from a few seeded sine waves. The result is a triangle strip
// ("ribbon") that is a little wider than the visible stroke; the fragment
// shader decides which pixels of it actually get painted.
precision highp float;

const float TAU = 6.28318530718;
// How much wider than the nominal stroke the ribbon is, so the grainy halo and
// the ragged edge have room to breathe.
const float RIBBON = 1.75;

uniform vec2 uView;      // viewport size in CSS px
uniform vec2 uA;         // start of the base line (CSS px)
uniform vec2 uB;         // end of the base line (CSS px)
uniform vec3 uWave[3];   // lateral wobble: (amplitude px, cycles, phase)
uniform vec3 uPress[2];  // width variation: (fraction, cycles, phase)
uniform float uHalfW;    // nominal half width (CSS px)
uniform float uSegments; // number of ribbon segments

out float vT;    // 0..1 position along the stroke
out float vLat;  // signed distance from the centre line (CSS px)
out float vHalf; // nominal half width at this point (CSS px)

vec2 centre(float t) {
  vec2 base = mix(uA, uB, t);
  vec2 dir = normalize(uB - uA);
  vec2 nrm = vec2(-dir.y, dir.x);
  float off = 0.0;
  for (int i = 0; i < 3; i++) {
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
  int seg = gl_VertexID >> 1;
  float side = (gl_VertexID & 1) == 0 ? -1.0 : 1.0;
  float t = float(seg) / uSegments;

  vec2 c = centre(t);
  vec2 tangent = centre(min(t + 0.0015, 1.0)) - centre(max(t - 0.0015, 0.0));
  vec2 n = normalize(vec2(-tangent.y, tangent.x));

  float half_ = uHalfW * pressure(t);
  float reach = half_ * RIBBON;
  vec2 p = c + n * side * reach;

  gl_Position = vec4(p.x / uView.x * 2.0 - 1.0, 1.0 - p.y / uView.y * 2.0, 0.0, 1.0);
  vT = t;
  vLat = side * reach;
  vHalf = half_;
}
