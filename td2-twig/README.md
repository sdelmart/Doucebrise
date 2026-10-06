# R5A.05 – TD2 Twig : corrigé

```
td2-twig/
├── README.md          ← réponses de l'exercice 1 + explications
├── templates/         ← templates Twig (exercices 2 à 7)
├── data/              ← données PHP de chaque exercice (= ce que le contrôleur passe à render())
├── output/            ← pages HTML générées
└── render.php         ← génère output/*.html
```

Pour regénérer les pages : `composer install && php render.php` (PHP ≥ 8.1, Twig 3).
Tout a été vérifié avec Twig 3.30.

Rappel des 3 syntaxes Twig :

| Syntaxe | Rôle |
|---|---|
| `{{ ... }}` | **affiche** le résultat d'une expression |
| `{% ... %}` | **tag** : exécute une instruction (`set`, `if`, `for`, `do`…), n'affiche rien par lui-même |
| `{# ... #}` | commentaire (jamais envoyé au navigateur) |

Un **filtre** s'applique avec `|` (`valeur|filtre(args)`) ; une **fonction** s'appelle directement (`range(1, 3)`).

---

## Exercice 1 – Tags, filtres et fonctions

**1. `{{ 'ceci est un texte' }}`**
- Pas de tag, de filtre ni de fonction : seulement l'affichage (`{{ }}`) d'une chaîne littérale.
- Sortie : `ceci est un texte`

**2. `{% set online = 'true' %}` … `{% if online == false %}` …**
- Tags : `set` (affectation), `if` / `endif` (condition).
- `online` contient la **chaîne** `'true'`, pas le booléen `true`. Une chaîne non vide est « vraie », donc `'true' == false` vaut `false`.
- Sortie : **rien**, le paragraphe « maintenance » n'est pas affiché. (Piège : avec `set online = 'false'` il ne s'afficherait pas non plus, car `'false'` est aussi une chaîne non vide. Il faut écrire `set online = false`, sans guillemets.)

**3. `{{ "Bonjour,"|nl2br }}` / `{{ "Date d'aujourd'hui : "}}{{"now"|date("d/m/Y") }}`**
- Filtres : `nl2br` (remplace les retours à la ligne par `<br />` ; ici il n'y en a pas, donc aucun effet) et `date` (convertit `"now"` en date et la formate en jour/mois/année).
- Sortie (par exemple le 06/10/2026) :
  ```
  Bonjour,
  Date d'aujourd'hui : 06/10/2026
  ```

**4. `{{ 2+2 }}`**
- Pas de tag/filtre/fonction : une expression arithmétique évaluée puis affichée.
- Sortie : `4`

**5. `{% do 2 + 2 %}`**
- Tag : `do`. Il **évalue** une expression **sans rien afficher** (utile pour appeler une méthode dont on ignore le résultat).
- Sortie : **rien**.

**6. `{% set items = "elem1 elem2 elem4 elem3"|split(' ') %}` / `{{ items.1 }}`**
- Tag : `set`. Filtre : `split(' ')`, qui découpe la chaîne sur les espaces → `['elem1', 'elem2', 'elem4', 'elem3']`.
- `items.1` = l'élément d'indice 1 (les indices commencent à 0).
- Sortie : `elem2`

**7. `{% for i in range(1, 3) %} {{ i }} {% endfor %}`**
- Tag : `for` / `endfor`. Fonction : `range(1, 3)`, qui génère `[1, 2, 3]` (**bornes incluses**).
- Sortie : `1 2 3` (un nombre par ligne)

**8. Liste des membres (`for user in users`)**
- Tag : `for` / `endfor`. Filtres : `e` (alias de `escape`, échappe les caractères HTML pour éviter les failles XSS ; Twig le fait déjà par défaut grâce à l'autoescape) et `date('d/m/Y')`.
- Sortie avec le JSON :
  ```html
  <h1>Members</h1>
  <ul>
      <li>DUPONT</li>
      <li>01/10/1970</li>
      <li>DURAND</li>
      <li>14/05/1960</li>
  </ul>
  ```

**9. `{% set numbers = [1, 2, 3, 5, 8] %}` / `{{ numbers[0] }}` / `{{ numbers.4 }}`**
- Tag : `set` (création d'un tableau). `[0]` et `.4` sont deux syntaxes équivalentes pour accéder à un élément.
- Sortie :
  ```
  1
  8
  ```

**10. `{{ numbers[5] }}`**
- Le tableau n'a que les indices 0 à 4 : l'indice 5 n'existe pas.
- Sortie : **dépend de la configuration**
  - `strict_variables = false` (production) : rien n'est affiché (valeur `null`).
  - `strict_variables = true` (mode debug, comme en `dev` dans Symfony) : **erreur** `Key "5" for sequence/mapping with keys "0, 1, 2, 3, 4" does not exist`.

---

## Exercice 2 – Article voyage Paris

Template : [`templates/blog_article.html.twig`](templates/blog_article.html.twig)

Trous à compléter, dans l'ordre :

| Trou | Réponse |
|---|---|
| `<title>` | `{{ title }}` |
| `<h1>` | `{{ article.title }}` |
| Par … | `{{ article.author }}` |
| le … | `{{ article.date\|date('d/m/Y') }}` → `15/03/2024` |
| `<div>` | `{{ article.content }}` |
| nb de commentaires | `{{ comments\|length }}` |
| boucle | `{% for comment in comments %}` |
| auteur | `{{ comment.author }}` |
| message | `{{ comment.message }}` |
| fin de boucle | `{% endfor %}` |

À noter : `title` vaut `'Blog - Mon voyage à Paris'` (variable séparée passée par le contrôleur), alors que le `<h1>` affiche `article.title`.
Dans le message `J\'aimerais`, le `\'` est l'échappement PHP : la page affiche `J'aimerais`.

## Exercice 3 – Profil et produits d'Alice

Template : [`templates/user_profile.html.twig`](templates/user_profile.html.twig). Données : [`data/ex3.php`](data/ex3.php).

Points clés : `{{ user.name }}` pour accéder à une clé d'un tableau associatif, `{% for product in products %}` pour la liste. Le `{% else %}` dans le `for` est un bonus : il s'affiche si la liste est vide.

## Exercice 4 – Catalogue produits

Template : [`templates/catalog.html.twig`](templates/catalog.html.twig). Données : [`data/ex4.php`](data/ex4.php).

Points clés :
- deux boucles **imbriquées** : `for category in categories` puis `for product in category.products` ;
- une condition `{% if product.stock == 0 %}En rupture{% else %}En stock ({{ product.stock }} unités){% endif %}`.

## Exercice 5 – Panier e-commerce (filtres Twig)

Template : [`templates/cart.html.twig`](templates/cart.html.twig). Données : [`data/ex5.php`](data/ex5.php).

Utilité de chaque filtre :

| Filtre | Utilisation dans le panier | Utilité |
|---|---|---|
| `title` | `user.name\|title` → `Thomas Leblanc` | Met une majuscule au début de chaque mot (noms propres, titres). |
| `lower` | `user.email\|lower` → `thomas.leblanc@example.com` | Met tout en minuscules (normaliser un email saisi en majuscules). |
| `length` | `cart\|length` → `3` | Nombre d'éléments d'un tableau (ou de caractères d'une chaîne). |
| `first` / `last` | `(cart\|first).name`, `(cart\|last).name` | Premier / dernier élément d'un tableau (ou caractère d'une chaîne). Les parenthèses sont nécessaires pour lire `.name` sur le résultat du filtre. |
| `number_format(2, ',', ' ')` | `1234.56` → `1 234,56` | Formate un nombre : 2 décimales, virgule décimale, espace pour les milliers (format français). |
| `slice(0, 50)` | description tronquée | Extrait une partie d'une chaîne ou d'un tableau (début, longueur). On ajoute `...` seulement si le texte dépassait 50 caractères. |
| `date('d/m/Y')` | `2023-05-15` → `15/05/2023` | Convertit une chaîne/un timestamp en date et la formate. |
| `round(2)` | `(item.price * item.quantity)\|round(2)` | Arrondit un calcul : les flottants donnent parfois `51.980000000001`. |
| `map(...)` + `join(', ')` | `cart\|map(item => item.name)\|join(', ')` | `map` transforme chaque élément (ici : ne garder que le nom) ; `join` colle les éléments en une chaîne avec un séparateur. |

Calculs :
- Sous-total : `cart|reduce((sum, item) => sum + item.price * item.quantity, 0)` = 51,98 + 79,99 + 129,99 = **261,96 €** (`reduce` accumule une valeur sur tout le tableau ; on peut aussi faire un `{% set subtotal = subtotal + ... %}` dans la boucle).
- Frais de port : `user.premium` vaut `true`, donc **GRATUIT**. Sinon on ajouterait `shipping` (5,99 €).
- Total final : **261,96 €**.

Remarques sur l'énoncé :
- La capture affiche « Mon Panier - **4** articles » mais `count($cart)` vaut **3** (le panier contient 3 articles) : la page générée affiche « 3 articles ».
- Dans `$current_date = '2025-10-03;` il manque l'apostrophe fermante : `'2025-10-03';` (corrigé dans `data/ex5.php`). Cette variable n'est pas utilisée par la page attendue.
- La capture ajoute `...` même à « Jean moderne avec effet délavé vintage. » (moins de 50 caractères) ; ici les `...` ne s'ajoutent que si le texte est vraiment tronqué.

## Exercice 6 – Planning de cours

Données à créer : [`data/ex6.php`](data/ex6.php) (template donné : [`templates/planning.html.twig`](templates/planning.html.twig)).

Réflexion à partir du template :
- `{{ title }} {{ week_number }}` → `title = 'Planning - Semaine'`, `week_number = 34`.
- `{% for day, courses in schedule %}` → `schedule` est un tableau **associatif** : la clé est le nom du jour, la valeur la liste des cours.
- `courses is empty` → un jour sans cours = **tableau vide** (`'Mardi' => []`).
- Chaque cours a les clés `start`, `end`, `subject`, `room`, `teacher`.
- `{% if course.teacher %}` → pour le sport, `'teacher' => null` : « - Prof. » n'est pas affiché.

Jeudi et vendredi sont remplis comme sur la capture (Histoire-Géographie, Anglais, TP Physique, Sport).

## Exercice 7 – Tableau de bord étudiant

Données à créer : [`data/ex7.php`](data/ex7.php) (template donné : [`templates/student_dashboard.html.twig`](templates/student_dashboard.html.twig)).

Variables identifiées dans le template : `title`, `student` (`firstname`, `lastname`, `class`), `grades` (liste de `subject`, `score`, `coefficient`) et `average`.

Moyenne pondérée (calculée **en PHP**, dans le contrôleur, pas dans le template) :

```
(18×4 + 1×3 + 12×2 + 14×1) / (4 + 3 + 2 + 1) = (72 + 3 + 24 + 14) / 10 = 113 / 10 = 11,3
```

Résultat : moyenne **11,3/20** (< 12) → « Continue tes efforts ! ».
Appréciations : Maths 18 → Excellent, Physique 1 → À améliorer, Français 12 → Assez bien, Histoire 14 → Bien.
