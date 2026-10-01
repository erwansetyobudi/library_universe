<?php
/*
 * File: api.inc.php
 * Created on Thu Oct 01 2026
 * Last Updated: Thu Oct 01 2026 8:32:50 PM
 * Author: Erwan Setyo Budi
 * Email: erwans818@gmail.com
 * License: The GNU General Public License, Version 3 (GPL-3.0) - Copyright (C) 2026 Erwan Setyo Budi. This program is free software.
 */

if (!defined('INDEX_AUTH') || INDEX_AUTH != 1) die('can not access this file directly');
require __DIR__.'/helper.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function lu_stmt(mysqli $db, string $sql, string $types='', array $params=[]): mysqli_stmt {
    $st=$db->prepare($sql);
    if(!$st) throw new RuntimeException($db->error);
    if($types!=='' && $params) $st->bind_param($types, ...$params);
    if(!$st->execute()) throw new RuntimeException($st->error);
    return $st;
}

try {
    global $dbs;
    if (!isset($dbs) || !($dbs instanceof mysqli)) {
        throw new RuntimeException('Koneksi database SLiMS ($dbs) tidak tersedia.');
    }

    $action=$_GET['action']??'bootstrap';
    $today=date('Y-m-d');

    // Hindari perbandingan DATETIME dengan nilai zero-date karena MySQL/MariaDB strict mode
    // dapat melempar error "Incorrect DATETIME value".
    $rs=$dbs->query("SELECT DATE(MIN(input_date)) AS min_date
                     FROM biblio
                     WHERE input_date IS NOT NULL
                       AND YEAR(input_date) > 0");
    if(!$rs) throw new RuntimeException($dbs->error);
    $row=$rs->fetch_assoc();
    $minDate=$row['min_date'] ?: date('Y-m-d',strtotime('-10 years'));

    $start=lu_date($_GET['start']??'', $minDate);
    $end=lu_date($_GET['end']??'', $today);
    if($start>$end){$t=$start;$start=$end;$end=$t;}
    $limit=max(100,min(12000,(int)($_GET['limit']??5000)));

    $cacheKey=$action.'|'.$start.'|'.$end.'|'.$limit.(isset($_GET['id'])?'|'.(int)$_GET['id']:'');
    if(($cached=lu_cache_get($cacheKey,300))!==null){
        $cached['cache']=true;
        echo json_encode($cached,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); exit;
    }

    if($action==='bootstrap'){
        $st=lu_stmt($dbs,"SELECT COUNT(*) c FROM biblio WHERE input_date>=? AND input_date<DATE_ADD(?,INTERVAL 1 DAY)",'ss',[$start,$end]);
        $biblio=(int)$st->get_result()->fetch_assoc()['c'];

        $st=lu_stmt($dbs,"SELECT COUNT(*) c FROM item i JOIN biblio b ON b.biblio_id=i.biblio_id WHERE b.input_date>=? AND b.input_date<DATE_ADD(?,INTERVAL 1 DAY)",'ss',[$start,$end]);
        $items=(int)$st->get_result()->fetch_assoc()['c'];

        $st=lu_stmt($dbs,"SELECT COUNT(*) c FROM loan l JOIN item i ON i.item_code=l.item_code JOIN biblio b ON b.biblio_id=i.biblio_id WHERE l.loan_date>=? AND l.loan_date<DATE_ADD(?,INTERVAL 1 DAY)",'ss',[$start,$end]);
        $loans=(int)$st->get_result()->fetch_assoc()['c'];

        $out=['ok'=>true,'min_date'=>$minDate,'max_date'=>$today,'start'=>$start,'end'=>$end,
              'counts'=>['biblio'=>$biblio,'items'=>$items,'loans'=>$loans]];
    }
    elseif($action==='events'){
        $sql="SELECT b.biblio_id,b.title,b.input_date,COUNT(i.item_id) item_count
              FROM biblio b LEFT JOIN item i ON i.biblio_id=b.biblio_id
              WHERE b.input_date>=? AND b.input_date<DATE_ADD(?,INTERVAL 1 DAY)
              GROUP BY b.biblio_id,b.title,b.input_date ORDER BY b.input_date ASC LIMIT $limit";
        $st=lu_stmt($dbs,$sql,'ss',[$start,$end]); $rs=$st->get_result(); $nodes=[];
        while($r=$rs->fetch_assoc()){
            $nodes[]=['id'=>(int)$r['biblio_id'],'title'=>$r['title']?:'Tanpa judul',
                'date'=>substr((string)$r['input_date'],0,19),'items'=>(int)$r['item_count']];
        }

        $loanLimit=max(100,min(15000,$limit*2));
        $sql="SELECT l.loan_id,l.member_id,l.item_code,l.loan_date,i.biblio_id,m.member_name,b.title
              FROM loan l
              JOIN item i ON i.item_code=l.item_code
              JOIN biblio b ON b.biblio_id=i.biblio_id
              LEFT JOIN member m ON m.member_id=l.member_id
              WHERE l.loan_date>=? AND l.loan_date<DATE_ADD(?,INTERVAL 1 DAY)
              ORDER BY l.loan_date ASC LIMIT $loanLimit";
        $st=lu_stmt($dbs,$sql,'ss',[$start,$end]); $rs=$st->get_result(); $loans=[];
        while($r=$rs->fetch_assoc()){
            $loans[]=['id'=>(int)$r['loan_id'],'member_id'=>(string)$r['member_id'],
                'member_name'=>$r['member_name']?:$r['member_id'],'item_code'=>(string)$r['item_code'],
                'biblio_id'=>(int)$r['biblio_id'],'title'=>$r['title']?:'Tanpa judul',
                'date'=>substr((string)$r['loan_date'],0,19)];
        }
        $out=['ok'=>true,'start'=>$start,'end'=>$end,'nodes'=>$nodes,'loans'=>$loans,
              'truncated'=>count($nodes)>=$limit || count($loans)>=$loanLimit];
    }
    elseif($action==='detail'){
        $id=(int)($_GET['id']??0);
        $sql="SELECT b.biblio_id,b.title,b.input_date,b.publish_year,
                     COUNT(DISTINCT i.item_id) item_count,COUNT(l.loan_id) loan_count
              FROM biblio b
              LEFT JOIN item i ON i.biblio_id=b.biblio_id
              LEFT JOIN loan l ON l.item_code=i.item_code
              WHERE b.biblio_id=?
              GROUP BY b.biblio_id,b.title,b.input_date,b.publish_year";
        $st=lu_stmt($dbs,$sql,'i',[$id]); $r=$st->get_result()->fetch_assoc();
        if(!$r) throw new RuntimeException('Bibliografi tidak ditemukan.');

        $st=lu_stmt($dbs,"SELECT item_code FROM item WHERE biblio_id=? ORDER BY item_id DESC LIMIT 20",'i',[$id]);
        $rs=$st->get_result(); $items=[]; while($x=$rs->fetch_assoc()) $items[]=$x['item_code'];

        $out=['ok'=>true,'data'=>['id'=>(int)$r['biblio_id'],'title'=>$r['title'],
            'input_date'=>$r['input_date'],'publish_year'=>$r['publish_year'],
            'item_count'=>(int)$r['item_count'],'loan_count'=>(int)$r['loan_count'],'items'=>$items]];
    } else {
        throw new RuntimeException('Action tidak dikenal.');
    }

    lu_cache_set($cacheKey,$out);
    echo json_encode($out,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
} catch(Throwable $e){
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
}
exit;
