<?php
$shop = [
    'name' => 'TechStore',
    'slogan' => 'La technologie à portée de main',
];

$categories = [
    [
        'name' => 'Smartphones',
        'products' => [
            ['name' => 'iPhone 15', 'price' => 999, 'stock' => 5],
            ['name' => 'Samsung Galaxy S24', 'price' => 899, 'stock' => 0],
            ['name' => 'Google Pixel 8', 'price' => 699, 'stock' => 12],
        ],
    ],
    [
        'name' => 'Laptops',
        'products' => [
            ['name' => 'MacBook Pro', 'price' => 2499, 'stock' => 3],
            ['name' => 'Dell XPS 13', 'price' => 1299, 'stock' => 8],
        ],
    ],
];

return ['catalog.html.twig', [
    'shop' => $shop,
    'categories' => $categories,
    'title' => $shop['name'] . ' - Catalogue',
]];
