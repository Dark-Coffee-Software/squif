<?php

function getDirContents($dir, &$results = array()) {
    $files = scandir($dir);

    foreach ($files as $key => $value) {
        $path = realpath($dir . DIRECTORY_SEPARATOR . $value);
        if (!is_dir($path)) {
            $results[] = $path;
        } else if ($value != "." && $value != "..") {
            getDirContents($path, $results);
            $results[] = $path;
        }
    }

    return $results;
}

$FilesRaw = getDirContents( dirname(__FILE__) );

$fncs = [];

foreach($FilesRaw as $F)
{
    $parts = explode(".", $F);
    if(strtolower($parts[count($parts)-1]) == "sqf")
    {
        $contents = file_get_contents($F);

        $fnc = [];
        //$fnc['file'] = $F;

        preg_match("/@file (.*)/i", $contents, $matches);
        $fnc['filename'] = $matches[1];


        preg_match("/@(?:namespace|ns)(.*)/i", $contents, $matches);
        $fnc['namespace'] = $matches[1];

        preg_match("/@(?:class)(.*)/i", $contents, $matches);
        $fnc['class'] = $matches[1];

        preg_match("/@(?:method|func|function|call)(.*)/i", $contents, $matches);
        $fnc['call'] = $matches[1];

        preg_match("/@(?:desc|description|summary)(.*)/i", $contents, $matches);
        $fnc['summary'] = $matches[1];
        
        preg_match_all("/@(?:param)(.*)/i", $contents, $matches);

        $fnc['params'] = [];

        foreach($matches[1] ?? [] as $m)
        {
            $p = [];
            $parts = explode(" ", $m);
            $p['type'] = explode(" ", $m)[1] ?? "";
            $p['name'] = explode(" ", $m)[2] ?? "";
            $p['optional'] = $p['type'][0] == "?";

            unset($parts[0]);
            unset($parts[1]);
            unset($parts[2]);
            $p['summary'] = implode(" ", $parts);

            $fnc['params'][] = $p;
        }

        
        preg_match_all("/@(?:todo)(.*)/i", $contents, $matches);

        $fnc['todos'] = [];

        foreach($matches[1] ?? [] as $m)
        {
            $fnc['todos'][] = $m;
        }

        preg_match_all("/@notes(.*?)@endnotes/is", $contents, $matches);

        $fnc['notes'] = [];

        foreach($matches[1] ?? [] as $m)
        {
            $fnc['notes'][] = $m;
        }

        preg_match_all("/@(?:note)(.*)/i", $contents, $matches);

        foreach($matches[1] ?? [] as $m)
        {
            $fnc['notes'][] = $m;
        }
        
        preg_match_all("/@(?:return|returns)(.*)/i", $contents, $matches);
        $fnc['returns'] = [];

        foreach($matches[1] ?? [] as $m)
        {
            $p = [];
            $parts = explode(" ", $m);
            $p['type'] = explode(" ", $m)[1] ?? "";

            unset($parts[0]);
            unset($parts[1]);
            $p['summary'] = implode(" ", $parts);

            $fnc['returns'] = $p;
        }

        preg_match_all("/@(?:deprecated|dep)(.*)/i", $contents, $matches);
        $fnc['deprecated'] = [];

        foreach($matches[1] ?? [] as $m)
        {
            $p = [];
            $parts = explode(" ", $m);
            $p['version'] = explode(" ", $m)[1] ?? "";

            unset($parts[0]);
            unset($parts[1]);
            $p['summary'] = implode(" ", $parts);

            $fnc['deprecated'] = $p;
        }

        
        preg_match_all("/@usages(.*?)@endusages/is", $contents, $matches);

        $fnc['usage'] = [];

        foreach($matches[1] ?? [] as $m)
        {
            $fnc['usage'][] = $m;
        }

        preg_match_all("/@(?:\busage\b)(.*)/i", $contents, $matches);

        foreach($matches[1] ?? [] as $m)
        {
            $fnc['usage'][] = $m;
        }


        $fncs[] = $fnc;
    }
}

file_put_contents("saef_toolbox.json", str_replace("\\r", "",  json_encode( $fncs)));