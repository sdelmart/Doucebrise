<?php
$article = [
    'title' => 'Mon voyage à Paris',
    'author' => 'Sophie Martin',
    'date' => '2024-03-15',
    'content' => 'Une expérience inoubliable dans la capitale française... A partir de la place de l’Opéra, direction la place Vendôme, une des places les plus prestigieuses de la capitale, où se trouvent …',
];

$comments = [
    ['author' => 'Pierre', 'message' => 'Super article !'],
    ['author' => 'Julie', 'message' => 'J\'aimerais y aller aussi'],
    ['author' => 'Marc', 'message' => 'Très inspirant, merci !'],
];

return ['blog_article.html.twig', [
    'article' => $article,
    'comments' => $comments,
    'title' => 'Blog - ' . $article['title'],
]];
