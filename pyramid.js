// Get the canvas and WebGL context
const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl");

// Check for WebGL support
if (!gl) {
  alert("WebGL is not supported in this browser");
}

// SHADERS

// Vertex shader handles position and transforms
const vertexShaderSource = `
    attribute vec3 position;
    attribute vec3 color;
    uniform mat4 mvpMatrix;
    varying vec3 vColor;

    void main() {
        gl_Position = mvpMatrix * vec4(position, 1.0);
        vColor = color;
    }
`;

// Fragment shader sets solid color for each face
const fragmentShaderSource = `
    precision mediump float;
    varying vec3 vColor;

    void main() {
        gl_FragColor = vec4(vColor, 1.0);
    }
`;

// Helper function to create and compile shader
function createShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

//PROGRAM

const program = gl.createProgram();
gl.attachShader(program, createShader(gl.VERTEX_SHADER, vertexShaderSource));
gl.attachShader(
  program,
  createShader(gl.FRAGMENT_SHADER, fragmentShaderSource),
);
gl.linkProgram(program);
gl.useProgram(program);

// PYRAMID DATA

// Pyramid vertices (each face has 4 vertices for solid colors)
const vertices = new Float32Array([
  // Base (square)
  -0.5, 0.0, -0.5, 0, 1, 0, 0.5, 0.0, -0.5, 0, 1, 0, 0.5, 0.0, 0.5, 0, 1, 0,
  -0.5, 0.0, 0.5, 0, 1, 0,

  // Side 1
  -0.5, 0.0, -0.5, 1, 0, 0, 0.5, 0.0, -0.5, 1, 0, 0, 0.0, 0.8, 0.0, 1, 0, 0,

  // Side 2
  0.5, 0.0, -0.5, 0, 0, 1, 0.5, 0.0, 0.5, 0, 0, 1, 0.0, 0.8, 0.0, 0, 0, 1,

  // Side 3
  0.5, 0.0, 0.5, 1, 1, 0, -0.5, 0.0, 0.5, 1, 1, 0, 0.0, 0.8, 0.0, 1, 1, 0,

  // Side 4
  -0.5, 0.0, 0.5, 1, 0, 1, -0.5, 0.0, -0.5, 1, 0, 1, 0.0, 0.8, 0.0, 1, 0, 1,
]);

// Indices for drawing each triangle
const indices = new Uint16Array([
  // Base (two triangles)
  0,
  1,
  2,
  0,
  2,
  3,

  // Sides
  4,
  5,
  6, // Side 1
  7,
  8,
  9, // Side 2
  10,
  11,
  12, // Side 3
  13,
  14,
  15, // Side 4
]);

// BUFFERS

// Vertex buffer
const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// Index buffer
const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

// ATTRIBUTES

const stride = 6 * Float32Array.BYTES_PER_ELEMENT;

// Position
const positionLoc = gl.getAttribLocation(program, "position");
gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, stride, 0);
gl.enableVertexAttribArray(positionLoc);

// Color
const colorLoc = gl.getAttribLocation(program, "color");
gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, stride, 3 * 4);
gl.enableVertexAttribArray(colorLoc);

// Enable depth test for proper face rendering
gl.enable(gl.DEPTH_TEST);

// ROTATION & INTERACTIVITY

let angle = 0;
let rotationSpeed = 0.01;
let isRotating = true;

// Pause/Resume button
document.getElementById("toggleBtn").onclick = () => {
  isRotating = !isRotating;
};

// Speed slider
document.getElementById("speedSlider").oninput = (e) => {
  rotationSpeed = parseFloat(e.target.value);
};

// MATRIX FUNCTIONS

// Perspective projection
function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2);
  return new Float32Array([
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) / (near - far),
    -1,
    0,
    0,
    (2 * far * near) / (near - far),
    0,
  ]);
}

// Rotate around Y-axis
function rotationY(a) {
  return new Float32Array([
    Math.cos(a),
    0,
    -Math.sin(a),
    0,
    0,
    1,
    0,
    0,
    Math.sin(a),
    0,
    Math.cos(a),
    0,
    0,
    0,
    0,
    1,
  ]);
}

// Move along Z-axis
function translateZ(z) {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, z, 1]);
}

// Move along Y-axis
function translateY(y) {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, y, 0, 1]);
}

// Scale matrix
function scale(s) {
  return new Float32Array([s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1]);
}

// Multiply 4x4 matrices
function multiply(a, b) {
  const result = new Float32Array(16);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      result[col * 4 + row] =
        a[row] * b[col * 4] +
        a[row + 4] * b[col * 4 + 1] +
        a[row + 8] * b[col * 4 + 2] +
        a[row + 12] * b[col * 4 + 3];
    }
  }
  return result;
}

// ==================== RENDER LOOP ====================

function render() {
  // Clear canvas
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Update rotation
  if (isRotating) angle += rotationSpeed;

  // Create transformation matrices
  const proj = perspective(Math.PI / 4, canvas.width / canvas.height, 0.1, 10);
  const rot = rotationY(angle);
  const transZ = translateZ(-3);
  const transY = translateY(-0.2); // move pyramid slightly down
  const scl = scale(1.6); // make pyramid bigger

  // Combine transformations: Projection * TranslationZ * TranslationY * Rotation * Scale
  const modelView = multiply(transZ, multiply(transY, multiply(rot, scl)));
  const mvp = multiply(proj, modelView);

  // Send to shader
  const mvpLoc = gl.getUniformLocation(program, "mvpMatrix");
  gl.uniformMatrix4fv(mvpLoc, false, mvp);

  // Draw pyramid
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

  requestAnimationFrame(render);
}

// Start animation
render();
