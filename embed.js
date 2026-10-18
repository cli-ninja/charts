/* Climate Ninja chart embed loader.
 * WordPress (Custom HTML block):
 *   <div class="cn-chart" data-chart="emissions-3d-explorer"><a href="https://cli-ninja.github.io/charts/emissions-3d-explorer.html">Open the chart</a></div>
 *   <script src="https://cli-ninja.github.io/charts/embed.js" async></script>
 * Each div becomes a full-width iframe with auto-height and a fullscreen fallback.
 * Chart files, titles, versions and default heights live in CHARTS below: change them here only.
 */
(function () {
  'use strict';
  var CHARTS = {
    'emissions-explorer': {
      file: 'emissions-explorer.html', v: 2,
      title: 'Emissions Explorer: greenhouse gas emissions by country and sector',
      height: '760px', minHeight: '0', zeroMeansDefault: false
    },
    'emissions-3d-explorer': {
      file: 'emissions-3d-explorer.html', v: 18,
      title: 'Development Paths 3D: wealth, population and emissions by country',
      height: 'min(88vh,860px)', minHeight: '520px', zeroMeansDefault: true
    }
  };

  var me = document.currentScript;
  var BASE = me && me.src ? me.src.replace(/[^\/]*(\?.*)?$/, '') : 'https://cli-ninja.github.io/charts/';
  var de = document.documentElement;

  function embed(div) {
    if (div.getAttribute('data-cn-done')) return;
    var cfg = CHARTS[div.getAttribute('data-chart')];
    if (!cfg) return; // unknown name: leave the fallback link in place
    div.setAttribute('data-cn-done', '1');

    var wrap = document.createElement('div');
    wrap.className = 'cn-chart-wrap alignfull';
    wrap.style.cssText = 'width:100vw;max-width:100vw;margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw)';
    var f = document.createElement('iframe');
    f.src = BASE + cfg.file + '?v=' + cfg.v;
    f.title = cfg.title;
    f.setAttribute('allow', 'fullscreen');
    f.setAttribute('allowfullscreen', '');
    f.setAttribute('loading', 'lazy');
    f.style.cssText = 'display:block;width:100%;border:0;height:' + cfg.height + ';min-height:' + cfg.minHeight;
    wrap.appendChild(f);
    div.innerHTML = '';
    div.appendChild(wrap);

    var mode = '', saved = null, btn = null, got = false, t = 0;
    function post(m) { if (f.contentWindow) f.contentWindow.postMessage(m, '*'); }
    function sendViewport() {
      var v = window.visualViewport;
      post({ type: 'ee-viewport',
        height: Math.round(v ? v.height * (v.scale || 1) : window.innerHeight),
        width: Math.round(v ? v.width * (v.scale || 1) : window.innerWidth) });
    }
    function sendFs(on) { post({ type: 'ee-fs-state', on: !!on }); }
    function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement; }
    function overlayOn() {
      saved = { style: f.getAttribute('style'), ho: de.style.overflow, bo: document.body.style.overflow };
      var s = f.style;
      s.position = 'fixed'; s.top = '0'; s.left = '0'; s.right = '0'; s.bottom = '0';
      s.width = '100vw'; s.height = '100vh'; s.minHeight = '0'; s.maxWidth = 'none'; s.margin = '0';
      s.zIndex = '2147483000'; s.background = '#fff';
      if (window.CSS && CSS.supports && CSS.supports('height', '100dvh')) s.height = '100dvh';
      de.style.overflow = 'hidden'; document.body.style.overflow = 'hidden';
      btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'ee-fs-close'; btn.setAttribute('aria-label', 'Exit fullscreen'); btn.textContent = '\u2715';
      btn.style.cssText = 'position:fixed;top:6px;left:6px;z-index:2147483001;width:32px;height:32px;padding:0;border:1px solid #ccc;border-radius:50%;background:#fff;color:#333;font:16px/30px sans-serif;text-align:center;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.3)';
      btn.addEventListener('click', exitFs);
      document.body.appendChild(btn);
      mode = 'overlay'; sendFs(true);
    }
    function overlayOff() {
      if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
      btn = null;
      if (saved) {
        if (saved.style == null) f.removeAttribute('style'); else f.setAttribute('style', saved.style);
        de.style.overflow = saved.ho; document.body.style.overflow = saved.bo;
      }
      saved = null; mode = ''; sendFs(false); sendViewport();
    }
    function enterFs() {
      if (mode) return;
      var rq = f.requestFullscreen || f.webkitRequestFullscreen;
      var enabled = document.fullscreenEnabled !== undefined ? document.fullscreenEnabled : !!document.webkitFullscreenEnabled;
      if (!rq || !enabled) { overlayOn(); return; }
      mode = 'native-pending';
      try {
        var r = rq.call(f);
        if (r && r.then) r.then(null, function () { mode = ''; overlayOn(); });
      } catch (err) { mode = ''; overlayOn(); }
    }
    function exitFs() {
      if (mode === 'overlay') overlayOff();
      else if (fsEl() === f) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    }
    function onFsChange() {
      if (fsEl() === f) { if (mode === 'native-pending') { mode = 'native'; sendFs(true); } }
      else if (mode === 'native' || mode === 'native-pending') { mode = ''; sendFs(false); sendViewport(); }
    }
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('keydown', function (e) { if (mode === 'overlay' && (e.key === 'Escape' || e.key === 'Esc')) overlayOff(); });
    window.addEventListener('message', function (e) {
      var d = e.data;
      if (e.source !== f.contentWindow || !d) return;
      if (d.type === 'ee-fullscreen') { if (d.on) enterFs(); else exitFs(); return; }
      if (d.type !== 'ee-height' || mode) return;
      var h = Math.round(+d.height);
      if (!(h >= 0)) return;
      if (h === 0) { if (!cfg.zeroMeansDefault) return; f.style.height = cfg.height; f.style.minHeight = cfg.minHeight; }
      else { f.style.height = h + 'px'; f.style.minHeight = '0'; }
      if (!got) { got = true; sendViewport(); }
    });
    function fitWrap() {
      /* 100vw includes a classic vertical scrollbar: shrink the full-bleed wrapper by its width */
      var sb = Math.max(0, window.innerWidth - de.clientWidth);
      wrap.style.width = wrap.style.maxWidth = 'calc(100vw - ' + sb + 'px)';
      wrap.style.marginLeft = wrap.style.marginRight = 'calc(50% - 50vw + ' + (sb / 2) + 'px)';
    }
    function later() { clearTimeout(t); t = setTimeout(function () { fitWrap(); sendViewport(); }, 100); }
    fitWrap();
    f.addEventListener('load', function () { got = false; sendViewport(); });
    window.addEventListener('resize', later);
    window.addEventListener('orientationchange', later);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', later);
  }

  function run() {
    var list = document.querySelectorAll('.cn-chart[data-chart]');
    for (var i = 0; i < list.length; i++) embed(list[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
