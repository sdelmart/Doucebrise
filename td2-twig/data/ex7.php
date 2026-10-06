<?php
// Variables attendues par le template : title, student (firstname, lastname,
// class), grades (subject, score, coefficient) et average.
$student = [
    'firstname' => 'Emma',
    'lastname' => 'Dubois',
    'class' => 'Terminale S',
];

$grades = [
    ['subject' => 'Maths', 'score' => 18, 'coefficient' => 4],
    ['subject' => 'Physique', 'score' => 1, 'coefficient' => 3],
    ['subject' => 'Français', 'score' => 12, 'coefficient' => 2],
    ['subject' => 'Histoire', 'score' => 14, 'coefficient' => 1],
];

// Moyenne pondérée = somme(note x coeff) / somme(coeff)
//                  = (18x4 + 1x3 + 12x2 + 14x1) / (4+3+2+1) = 113 / 10 = 11,3
$total = 0;
$coefficients = 0;
foreach ($grades as $grade) {
    $total += $grade['score'] * $grade['coefficient'];
    $coefficients += $grade['coefficient'];
}
$average = round($total / $coefficients, 2);

return ['student_dashboard.html.twig', [
    'title' => 'Tableau de bord - ' . $student['firstname'] . ' ' . $student['lastname'],
    'student' => $student,
    'grades' => $grades,
    'average' => $average,
]];
