<?php
// Génère les pages HTML de chaque exercice dans output/.
// Usage : composer install && php render.php
require __DIR__ . '/vendor/autoload.php';

use Twig\Environment;
use Twig\Loader\FilesystemLoader;

$twig = new Environment(new FilesystemLoader(__DIR__ . '/templates'), [
    'strict_variables' => true, // erreur si une variable/clé n'existe pas
]);

foreach (glob(__DIR__ . '/data/ex*.php') as $file) {
    [$template, $context] = require $file;
    $output = __DIR__ . '/output/' . basename($file, '.php') . '.html';
    file_put_contents($output, $twig->render($template, $context));
    echo basename($file) . ' -> output/' . basename($output) . "\n";
}
