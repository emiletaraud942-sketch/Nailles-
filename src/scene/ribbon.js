import * as THREE from 'three';

/** Ruban de satin qui ondule dans l'espace : bande extrudée le long d'une courbe, avec torsion. */
export function makeRibbon({ points, width = 0.7, segments = 260, twist = 2.5, phase = 0 }, material) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.5);
  const frames = curve.computeFrenetFrames(segments, false);
  const positions = [];
  const uvs = [];
  const index = [];
  const tmp = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPointAt(t);
    const n = frames.normals[i];
    const b = frames.binormals[i];
    const ang = phase + t * twist * Math.PI * 2;
    tmp.copy(n).multiplyScalar(Math.cos(ang)).addScaledVector(b, Math.sin(ang));
    const taper = Math.pow(Math.sin(Math.PI * t), 0.5);
    const w = (width * taper) / 2;
    positions.push(p.x + tmp.x * w, p.y + tmp.y * w, p.z + tmp.z * w);
    positions.push(p.x - tmp.x * w, p.y - tmp.y * w, p.z - tmp.z * w);
    uvs.push(0, t, 1, t);
    if (i < segments) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

export function buildRibbons() {
  const satin = new THREE.MeshPhysicalMaterial({
    color: 0xb98f64, roughness: 0.42, metalness: 0.3, sheen: 0.5, sheenColor: new THREE.Color(0xe9c99c), sheenRoughness: 0.45,
    side: THREE.DoubleSide,
  });
  const group = new THREE.Group();

  const back = makeRibbon({
    points: [[-13, 6.5, -6], [-8, 4.2, -9], [-3, 7.6, -7], [3, 3.2, -10], [9, 6.8, -7], [14, 3.0, -9]],
    width: 1.3, twist: 3.2, phase: 0.4,
  }, satin);
  const front = makeRibbon({
    points: [[12, -3.6, 5], [7, -4.4, 8.5], [1, -3.2, 7], [-5, -4.8, 9.5], [-11, -3.0, 6]],
    width: 1.0, twist: 2.6, phase: 1.7,
  }, satin);
  group.add(back, front);
  return group;
}
