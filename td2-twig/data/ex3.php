<?php
$user = [
    'name' => 'Alice',
    'age' => 25,
    'email' => 'alice@example.com',
];

$products = [
    ['name' => 'Laptop', 'price' => 999],
    ['name' => 'Souris', 'price' => 25],
];

return ['user_profile.html.twig', [
    'user' => $user,
    'products' => $products,
    'title' => 'Profil utilisateur',
]];
