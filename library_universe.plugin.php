<?php
/**
 * Plugin Name: Library Universe
 * Description: Visualisasi pertumbuhan koleksi dan aktivitas peminjaman SLiMS sebagai universe interaktif.
 * Version: 1.0.5
 * Author: Erwan Setyo Budi
 */
use SLiMS\Plugins;
$plugins = Plugins::getInstance();
$plugins->registerMenu('opac', 'library_universe', __DIR__ . '/library_universe.inc.php');
$plugins->registerMenu('opac', 'library_universe_api', __DIR__ . '/api.inc.php');
