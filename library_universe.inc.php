<?php
/*
 * File: library_universe.inc.php
 * Created on Thu Oct 01 2026
 * Last Updated: Thu Oct 01 2026 8:46:55 PM
 * Author: Erwan Setyo Budi
 * Email: erwans818@gmail.com
 * License: The GNU General Public License, Version 3 (GPL-3.0) - Copyright (C) 2026 Erwan Setyo Budi. This program is free software.
 */

if (!defined('INDEX_AUTH') || INDEX_AUTH != 1) die('can not access this file directly');
require __DIR__.'/helper.php';
$page_title='Library Universe | '.($sysconf['library_name']??'Perpustakaan');
?>
<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title><?=lu_h($page_title)?></title>
<link rel="stylesheet" href="<?=SWB?>plugins/library_universe/assets/css/universe.css?v=100">
</head>
<body class="lu-body">
<div id="luApp" class="lu-app">
  <div id="luViewport" class="lu-viewport"></div>
  <div class="lu-brand"><div class="lu-kicker">LIBRARY INTELLIGENCE</div><h1>Library Universe</h1><p>Pertumbuhan koleksi dan aliran peminjaman dalam ruang waktu.</p></div>
  <div id="luStatus" class="lu-status">Menyiapkan semesta…</div>
  <aside id="luPanel" class="lu-panel"><button id="luClose" type="button">×</button><div id="luPanelBody"></div></aside>
  <div class="lu-legend"><span><i class="birth"></i>Koleksi</span><span><i class="orbit"></i>Eksemplar</span><span><i class="trail"></i>Peminjaman</span></div>
  <div class="lu-timeline">
    <div class="lu-time-row">
      <button id="luPlay" type="button" title="Play/Pause">▶</button>
      <button id="luRestart" type="button" title="Ulangi">↺</button>
      <label>Kecepatan <select id="luSpeed"><option value="1">1×</option><option value="2">2×</option><option value="5" selected>5×</option><option value="10">10×</option><option value="25">25×</option></select></label>
      <strong id="luClock">—</strong>
      <span id="luCounts">0 koleksi • 0 peminjaman</span>
    </div>
    <input id="luRange" type="range" min="0" max="1000" value="0" aria-label="Timeline">
    <div class="lu-date-row"><span id="luStart">—</span><span id="luEnd">—</span></div>
  </div>
  <div id="luTooltip" class="lu-tooltip"></div>
</div>
<script type="importmap">{"imports":{"three":"<?=SWB?>plugins/library_universe/assets/vendor/three/build/three.module.js","three/addons/":"<?=SWB?>plugins/library_universe/assets/vendor/three/examples/jsm/"}}</script>
<script>
window.LIBRARY_UNIVERSE={
  api: <?=json_encode(SWB.'index.php?p=library_universe_api',JSON_UNESCAPED_SLASHES)?>,
  detail: <?=json_encode(SWB.'index.php?p=show_detail&id=',JSON_UNESCAPED_SLASHES)?>
};
</script>
<script type="module" src="<?=SWB?>plugins/library_universe/assets/js/universe.js?v=105"></script>
</body></html>
<?php exit; ?>
