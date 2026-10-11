(function () {
  "use strict";

  var VERTEX = "attribute vec2 aPos;\nvoid main() { gl_Position = vec4(aPos, 0.0, 1.0); }";

  var FRAGMENT = [
    "#extension GL_OES_standard_derivatives : enable",
    "precision highp float;",
    "uniform sampler2D uTex;",
    "uniform vec3 uE;",
    "uniform vec3 uN;",
    "uniform vec3 uC;",
    "uniform vec3 uView;",
    "uniform float uHeight;",
    "uniform float uLight;",
    "uniform float uSeam;",
    "void main() {",
    "  float sx = (gl_FragCoord.x - uView.x) / uView.z;",
    "  float sy = (gl_FragCoord.y - (uHeight - uView.y)) / uView.z;",
    "  float rr = sx * sx + sy * sy;",
    "  if (rr > 1.0) discard;",
    "  vec3 w = sx * uE + sy * uN + sqrt(1.0 - rr) * uC;",
    "  float u = atan(w.y, w.x) / 6.28318530718 + 0.5;",
    "  float v = 0.5 - asin(clamp(w.z, -1.0, 1.0)) / 3.14159265359;",
    "#ifdef GL_OES_standard_derivatives",
    "  if (uSeam > 0.5) {",
    "    float u2 = fract(u + 0.5) - 0.5;",
    "    if (fwidth(u) > fwidth(u2) + 1e-6) u = u2;",
    "  }",
    "#endif",
    "  vec3 c = texture2D(uTex, vec2(u, v)).rgb;",
    "  c = uLight >= 0.0 ? mix(c, vec3(1.0), uLight) : mix(c, vec3(0.0), -uLight);",
    "  gl_FragColor = vec4(c, 1.0);",
    "}"
  ].join("\n");

  function compile(gl, type, source) {
    var s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
    return s;
  }

  window.UchroniaSat = function (canvas) {
    var gl = null, program = null, tex = null, loc = {}, seam = false, image = null, lost = false;
    try {
      gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false });
    } catch (e) { gl = null; }
    if (!gl) return null;

    function setup() {
      seam = !!gl.getExtension("OES_standard_derivatives");
      program = gl.createProgram();
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "program");
      gl.useProgram(program);
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var aPos = gl.getAttribLocation(program, "aPos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      ["uTex", "uE", "uN", "uC", "uView", "uHeight", "uLight", "uSeam"].forEach(function (n) { loc[n] = gl.getUniformLocation(program, n); });
      gl.uniform1i(loc.uTex, 0);
      tex = null;
      if (image) upload(image);
    }

    function upload(img) {
      image = img;
      if (lost) return;
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      var aniso = gl.getExtension("EXT_texture_filter_anisotropic");
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(4, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      if (tex) gl.deleteTexture(tex);
      tex = t;
    }

    try { setup(); } catch (e) { console.warn("satellite", e); return null; }

    canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); lost = true; tex = null; });
    canvas.addEventListener("webglcontextrestored", function () {
      lost = false;
      try { setup(); } catch (e) { console.warn("satellite", e); }
      if (api.onRestore) api.onRestore();
    });

    var api = {
      onRestore: null,
      ready: function () { return !!tex && !lost; },
      load: function (urls, done) {
        var maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        var queue = urls.filter(function (u) { return u.size <= maxSize; });
        function next() {
          var u = queue.shift();
          if (!u) return;
          var img = new Image();
          img.decoding = "async";
          img.onload = function () {
            try { upload(img); } catch (e) { console.warn("satellite", e); return; }
            if (done) done();
            next();
          };
          img.onerror = function () { console.warn("satellite image", u.src); next(); };
          img.src = u.src;
        }
        next();
      },
      draw: function (o) {
        if (!tex || lost) return;
        var w = canvas.width, h = canvas.height;
        gl.viewport(0, 0, w, h);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform3f(loc.uE, o.e[0], o.e[1], o.e[2]);
        gl.uniform3f(loc.uN, o.n[0], o.n[1], o.n[2]);
        gl.uniform3f(loc.uC, o.c[0], o.c[1], o.c[2]);
        gl.uniform3f(loc.uView, o.cx * o.dpr, o.cy * o.dpr, o.r * o.dpr);
        gl.uniform1f(loc.uHeight, h);
        gl.uniform1f(loc.uLight, o.light);
        gl.uniform1f(loc.uSeam, seam ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      clear: function () {
        if (lost) return;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
    };
    return api;
  };
})();
