const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision highp float;

  uniform sampler2D u_world;
  uniform sampler2D u_palette;
  varying vec2 v_texCoord;

  void main() {
    vec4 source = texture2D(u_world, v_texCoord);
    vec3 bins = floor(source.rgb * 31.875);
    float index = bins.r * 1024.0 + bins.g * 32.0 + bins.b;
    float paletteX = mod(index, 1024.0);
    float paletteY = floor(index / 1024.0);
    vec3 graded = texture2D(
      u_palette,
      vec2((paletteX + 0.5) / 1024.0, (paletteY + 0.5) / 32.0)
    ).rgb;
    gl_FragColor = vec4(graded, source.a);
  }
`;

export function createDayNightPaletteRenderer() {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
    stencil: false
  });
  if (!gl) throw new Error("Marque & Reprisal requires WebGL for palette lighting");
  const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  if (!precision || precision.precision < 16) {
    throw new Error("WebGL fragment precision is insufficient for exact palette lighting");
  }

  const program = createProgram(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
  const positionLocation = requiredAttribute(gl, program, "a_position");
  const textureLocation = requiredAttribute(gl, program, "a_texCoord");
  const worldLocation = requiredUniform(gl, program, "u_world");
  const paletteLocation = requiredUniform(gl, program, "u_palette");
  const vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) throw new Error("Could not allocate palette lighting vertex buffer");
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 0, 1,
     1, -1, 1, 1,
    -1,  1, 0, 0,
     1,  1, 1, 0
  ]), gl.STATIC_DRAW);

  const worldTexture = createNearestTexture(gl);
  const paletteTexture = createNearestTexture(gl);
  gl.useProgram(program);
  gl.uniform1i(worldLocation, 0);
  gl.uniform1i(paletteLocation, 1);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(textureLocation);
  gl.vertexAttribPointer(textureLocation, 2, gl.FLOAT, false, 16, 8);
  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  if (gl.UNPACK_COLORSPACE_CONVERSION_WEBGL !== undefined) {
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  }

  let paletteKey = null;
  return Object.freeze({
    canvas,
    render(sourceCanvas, variant) {
      if (!(sourceCanvas instanceof HTMLCanvasElement)) {
        throw new Error("Palette lighting requires a canvas world source");
      }
      if (!variant?.key || !(variant.pixels instanceof Uint8ClampedArray)) {
        throw new Error("Palette lighting requires a cached palette variant");
      }
      if (canvas.width !== sourceCanvas.width || canvas.height !== sourceCanvas.height) {
        canvas.width = sourceCanvas.width;
        canvas.height = sourceCanvas.height;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, worldTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        sourceCanvas
      );
      if (paletteKey !== variant.key) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          variant.width,
          variant.height,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          variant.pixels
        );
        paletteKey = variant.key;
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return canvas;
    }
  });
}

function createNearestTexture(gl) {
  const texture = gl.createTexture();
  if (!texture) throw new Error("Could not allocate palette lighting texture");
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const program = gl.createProgram();
  if (!program) throw new Error("Could not allocate palette lighting program");
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Could not link palette lighting program: ${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not allocate palette lighting shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Could not compile palette lighting shader: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

function requiredAttribute(gl, program, name) {
  const location = gl.getAttribLocation(program, name);
  if (location < 0) throw new Error(`Palette lighting attribute is missing: ${name}`);
  return location;
}

function requiredUniform(gl, program, name) {
  const location = gl.getUniformLocation(program, name);
  if (location === null) throw new Error(`Palette lighting uniform is missing: ${name}`);
  return location;
}
