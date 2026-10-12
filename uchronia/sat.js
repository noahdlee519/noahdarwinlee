(function () {
  "use strict";

  var VERTEX = "attribute vec2 aPos;\nvoid main() { gl_Position = vec4(aPos, 0.0, 1.0); }";

  var FRAGMENT = [
    "#extension GL_OES_standard_derivatives : enable",
    "#extension GL_EXT_shader_texture_lod : enable",
    "precision highp float;",
    "uniform sampler2D uTex;",
    "uniform sampler2D uDet;",
    "uniform vec3 uE;",
    "uniform vec3 uN;",
    "uniform vec3 uC;",
    "uniform vec3 uView;",
    "uniform vec2 uFlat;",
    "uniform float uMode;",
    "uniform float uHeight;",
    "uniform float uLight;",
    "uniform float uSepia;",
    "uniform float uSeam;",
    "uniform vec4 uDetRect;",
    "uniform float uDetN;",
    "uniform float uDetOn;",
    "const float PI = 3.14159265359;",
    "void main() {",
    "  float sx = (gl_FragCoord.x - uView.x) / uView.z;",
    "  float sy = (gl_FragCoord.y - (uHeight - uView.y)) / uView.z;",
    "  float lam;",
    "  float phi;",
    "  if (uMode < 0.5) {",
    "    float rr = sx * sx + sy * sy;",
    "    if (rr > 1.0) discard;",
    "    vec3 w = sx * uE + sy * uN + sqrt(1.0 - rr) * uC;",
    "    lam = atan(w.y, w.x);",
    "    phi = asin(clamp(w.z, -1.0, 1.0));",
    "  } else {",
    "    lam = uFlat.x + sx;",
    "    phi = uFlat.y + sy;",
    "    if ((uMode < 1.5 && abs(lam) > PI) || abs(phi) > 0.5 * PI) discard;",
    "  }",
    "  float u = fract(lam / (2.0 * PI) + 0.5);",
    "  float v = 0.5 - phi / PI;",
    "  vec3 c;",
    "#if defined(GL_OES_standard_derivatives) && defined(GL_EXT_shader_texture_lod)",
    "  float u2 = fract(u + 0.5) - 0.5;",
    "  vec2 g1 = vec2(dFdx(u), dFdy(u));",
    "  vec2 g2 = vec2(dFdx(u2), dFdy(u2));",
    "  vec2 gu = dot(g1, g1) <= dot(g2, g2) ? g1 : g2;",
    "  c = texture2DGradEXT(uTex, vec2(u, v), vec2(gu.x, dFdx(v)), vec2(gu.y, dFdy(v))).rgb;",
    "#else",
    "#ifdef GL_OES_standard_derivatives",
    "  if (uSeam > 0.5) {",
    "    float u3 = fract(u + 0.5) - 0.5;",
    "    if (fwidth(u) > fwidth(u3) + 1e-6) u = u3;",
    "  }",
    "#endif",
    "  c = texture2D(uTex, vec2(u, v)).rgb;",
    "#endif",
    "  if (uDetOn > 0.0 && abs(phi) < 1.484) {",
    "    float tx = fract(lam / (2.0 * PI) + 0.5) * uDetN;",
    "    float ty = (0.5 - log(tan(0.78539816339 + phi * 0.5)) / (2.0 * PI)) * uDetN;",
    "    float dx = mod(tx - uDetRect.x, uDetN);",
    "    float dy = ty - uDetRect.y;",
    "    if (dx < uDetRect.z && dy >= 0.0 && dy < uDetRect.w) {",
    "      vec4 d = texture2D(uDet, vec2(dx, dy) / 8.0);",
    "      c = c * (1.0 - d.a * uDetOn) + d.rgb * uDetOn;",
    "    }",
    "  }",
    "  c = mix(c, min(vec3(1.0), vec3(dot(c, vec3(0.393, 0.769, 0.189)), dot(c, vec3(0.349, 0.686, 0.168)), dot(c, vec3(0.272, 0.534, 0.131)))), uSepia);",
    "  c = uLight >= 0.0 ? mix(c, vec3(1.0), uLight) : mix(c, vec3(0.0), -uLight);",
    "  gl_FragColor = vec4(c, 1.0);",
    "}"
  ].join("\n");

  var SLOT = 256, SLOTS = 8;

  function compile(gl, type, source) {
    var s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
    return s;
  }

  window.UchroniaSat = function (canvas) {
    var gl = null, program = null, tex = null, det = null, loc = {}, seam = false, image = null, lost = false;
    var detRect = null, detN = 1, detTiles = [];
    try {
      gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false });
    } catch (e) { gl = null; }
    if (!gl) return null;

    function setup() {
      seam = !!gl.getExtension("OES_standard_derivatives");
      gl.getExtension("EXT_shader_texture_lod");
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
      ["uTex", "uDet", "uE", "uN", "uC", "uView", "uFlat", "uMode", "uHeight", "uLight", "uSepia", "uSeam", "uDetRect", "uDetN", "uDetOn"].forEach(function (n) { loc[n] = gl.getUniformLocation(program, n); });
      gl.uniform1i(loc.uTex, 0);
      gl.uniform1i(loc.uDet, 1);
      tex = null;
      det = null;
      if (image) upload(image);
      if (detRect) {
        var rect = detRect, tiles = detTiles;
        detRect = null; detTiles = [];
        beginDetail(rect);
        tiles.forEach(function (t) { putTile(t.img, t.i, t.j); });
      }
    }

    function upload(img) {
      image = img;
      if (lost) return;
      var t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
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

    function beginDetail(rect) {
      detRect = rect; detTiles = [];
      detN = Math.pow(2, rect.z);
      if (lost) return true;
      try {
        if (!det) det = gl.createTexture();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, det);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SLOT * SLOTS, SLOT * SLOTS, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.activeTexture(gl.TEXTURE0);
        return true;
      } catch (e) { console.warn("satellite detail", e); detRect = null; return false; }
    }

    function putTile(img, i, j) {
      if (!detRect) return false;
      detTiles.push({ img: img, i: i, j: j });
      if (lost || !det) return true;
      try {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, det);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, i * SLOT, j * SLOT, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.activeTexture(gl.TEXTURE0);
        return true;
      } catch (e) { console.warn("satellite tile", e); return false; }
    }

    try { setup(); } catch (e) { console.warn("satellite", e); return null; }

    canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); lost = true; tex = null; det = null; });
    canvas.addEventListener("webglcontextrestored", function () {
      lost = false;
      try { setup(); } catch (e) { console.warn("satellite", e); }
      if (api.onRestore) api.onRestore();
    });

    var api = {
      onRestore: null,
      slots: SLOTS,
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
      detailFits: function () { return gl.getParameter(gl.MAX_TEXTURE_SIZE) >= SLOT * SLOTS; },
      beginDetail: beginDetail,
      putTile: putTile,
      endDetail: function () { detRect = null; detTiles = []; },
      draw: function (o) {
        if (!tex || lost) return;
        var w = canvas.width, h = canvas.height;
        gl.viewport(0, 0, w, h);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, det);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1f(loc.uMode, o.flat ? (o.wrap ? 2 : 1) : 0);
        if (o.flat) {
          gl.uniform3f(loc.uView, o.cx * o.dpr, o.cy * o.dpr, o.k * o.dpr);
          gl.uniform2f(loc.uFlat, o.xc, o.yc);
        } else {
          gl.uniform3f(loc.uE, o.e[0], o.e[1], o.e[2]);
          gl.uniform3f(loc.uN, o.n[0], o.n[1], o.n[2]);
          gl.uniform3f(loc.uC, o.c[0], o.c[1], o.c[2]);
          gl.uniform3f(loc.uView, o.cx * o.dpr, o.cy * o.dpr, o.r * o.dpr);
        }
        gl.uniform1f(loc.uHeight, h);
        gl.uniform1f(loc.uLight, o.light);
        gl.uniform1f(loc.uSepia, o.sepia || 0);
        gl.uniform1f(loc.uSeam, seam ? 1 : 0);
        var on = det && detRect && o.detail ? 1 : 0;
        gl.uniform1f(loc.uDetOn, on);
        if (on) {
          gl.uniform4f(loc.uDetRect, detRect.x0, detRect.y0, detRect.nx, detRect.ny);
          gl.uniform1f(loc.uDetN, detN);
        }
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
