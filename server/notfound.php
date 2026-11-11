<?php
/**
 * The real 404 for an unknown address (V1.2 item 5).
 *
 * server/.htaccess sends here any path that is not a file, a directory, a
 * prerendered page or one of the browser app's own first segments (app, login,
 * set-password, p, verify, work, services, resources, in any case). Before that rule an
 * unknown address got the app page with 200, which Search Console reports as a
 * soft 404.
 *
 * It answers 404 with the site's own not-found page, dist/404.html, which the
 * release puts in the document root beside this file. If that file is missing
 * (dist/ not yet released), a short page says the same. Deliberately no
 * _bootstrap.php: no database, no session, no JSON headers. The API's own JSON
 * "not found" replies never come here, because this is not an ErrorDocument.
 * The Content-Security-Policy is the public pages' one, set in .htaccess.
 */
http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex');
header('Cache-Control: no-store');
header_remove('X-Powered-By');

$page = __DIR__ . '/404.html';
if (is_file($page) && is_readable($page)) {
  readfile($page);
  exit;
}
?>
<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Page not found · Gideon Akinlotan</title>
</head>
<body>
<h1>That page is not here.</h1>
<p>It may have moved. <a href="/">Back to the start</a> or <a href="/work">see the work</a>.</p>
</body>
</html>
