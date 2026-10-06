<?php
// Tableau associatif : clé = jour, valeur = liste des cours du jour.
// Le template fait « for day, courses in schedule » : il faut donc des clés
// (les noms des jours) et, pour chaque cours, les clés start / end / subject /
// room / teacher. Un jour sans cours = tableau vide (test « is empty »).
$schedule = [
    'Lundi' => [
        ['start' => '8h00', 'end' => '10h00', 'subject' => 'Mathématiques', 'room' => 'A101', 'teacher' => 'M. Durant'],
        ['start' => '10h15', 'end' => '12h15', 'subject' => 'Physique-Chimie', 'room' => 'B205', 'teacher' => 'Mme Bernard'],
    ],
    'Mardi' => [],
    'Mercredi' => [
        ['start' => '14h00', 'end' => '16h00', 'subject' => 'Français', 'room' => 'C102', 'teacher' => 'M. Martin'],
    ],
    'Jeudi' => [
        ['start' => '9h00', 'end' => '11h00', 'subject' => 'Histoire-Géographie', 'room' => 'D203', 'teacher' => 'Mme Dubois'],
        ['start' => '14h00', 'end' => '15h00', 'subject' => 'Anglais', 'room' => 'E105', 'teacher' => 'M. Smith'],
    ],
    'Vendredi' => [
        ['start' => '8h00', 'end' => '12h00', 'subject' => 'TP Physique', 'room' => 'Labo B1', 'teacher' => 'Mme Bernard'],
        // Pas de professeur : teacher = null => le « if course.teacher » masque « - Prof. »
        ['start' => '13h30', 'end' => '15h30', 'subject' => 'Sport', 'room' => 'Gymnase', 'teacher' => null],
    ],
];

return ['planning.html.twig', [
    'title' => 'Planning - Semaine',
    'week_number' => 34,
    'schedule' => $schedule,
]];
