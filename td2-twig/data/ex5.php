<?php
$user = [
    'name' => 'thomas leblanc',
    'email' => 'THOMAS.LEBLANC@EXAMPLE.COM',
    // Les utilisateurs « premium » ont les frais de port offerts
    'premium' => true,
    // Date d'inscription de l'utilisateur
    'registration_date' => '2023-05-15',
];

$cart = [
    [
        'name' => 'T-shirt Premium Bio',
        'price' => 25.99,
        'quantity' => 2,
        'description' => 'Un t-shirt de qualité supérieure en coton biologique.',
    ],
    [
        'name' => 'Jean Slim Délavé',
        'price' => 79.99,
        'quantity' => 1,
        'description' => 'Jean moderne avec effet délavé vintage.',
    ],
    [
        'name' => 'Baskets Sport Pro',
        'price' => 129.99,
        'quantity' => 1,
        'description' => 'Chaussures de sport haute performance pour tous terrains.',
    ],
];

$shipping = 5.99; // frais de port (s'appliquent si utilisateur non premium)
$current_date = '2025-10-03';

return ['cart.html.twig', [
    'user' => $user,
    'cart' => $cart,
    'shipping' => $shipping,
    'current_date' => $current_date,
    'title' => 'Mon Panier - ' . count($cart) . ' articles',
]];
