<?php
/*
 * File: helper.php
 * Created on Thu Oct 01 2026
 * Last Updated: Thu Oct 01 2026 8:32:32 PM
 * Author: Erwan Setyo Budi
 * Email: erwans818@gmail.com
 * License: The GNU General Public License, Version 3 (GPL-3.0) - Copyright (C) 2026 Erwan Setyo Budi. This program is free software.
 */

if (!defined('INDEX_AUTH') || INDEX_AUTH != 1) die('can not access this file directly');

function lu_h($v): string { return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); }

function lu_cache_dir(): string {
    $root = dirname(__DIR__, 2);
    $dir = $root . DIRECTORY_SEPARATOR . 'files' . DIRECTORY_SEPARATOR . 'cache' . DIRECTORY_SEPARATOR . 'library_universe';
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
    return $dir;
}
function lu_cache_file(string $key): string { return lu_cache_dir().DIRECTORY_SEPARATOR.sha1($key).'.json'; }
function lu_cache_get(string $key, int $ttl=300) {
    $f=lu_cache_file($key);
    if (!is_file($f) || time()-(int)@filemtime($f)>$ttl) return null;
    $j=@file_get_contents($f); if (!$j) return null;
    $d=json_decode($j,true); return is_array($d)?$d:null;
}
function lu_cache_set(string $key, array $value): void {
    $f=lu_cache_file($key); $tmp=$f.'.'.uniqid('',true).'.tmp';
    if (@file_put_contents($tmp,json_encode($value,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),LOCK_EX)!==false) @rename($tmp,$f);
}
function lu_date(string $v,string $fallback): string {
    return preg_match('/^\d{4}-\d{2}-\d{2}$/',$v)?$v:$fallback;
}
