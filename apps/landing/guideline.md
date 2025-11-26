# EloHero Landing Page — Setup & Spec

## 1. Goal

Create a simple, fast, bilingual (EN/FR) landing page for **EloHero**, focused on:

- Explaining clearly what the app does (track results & rankings in any group)
- Showing concrete use cases (board games, sports, gaming, office)
- Driving clicks to:
  - iOS App Store
  - Google Play
  - Possibly a “Contact / Feedback” action

Tech constraints:

- **React** (SPA or CSR)
- **TypeScript**
- **shadcn/ui** for components
- **i18n** with EN + FR (switcher)
- **Netlify** for hosting (static build)

---

## 2. Tech Stack

- **Framework**: React 18 + TypeScript
- **Bundler**: Vite (recommandé) ou CRA, mais Vite de préférence
- **UI**: shadcn/ui + TailwindCSS
- **i18n**: `react-i18next` (ou `next-i18next` si on bascule vers Next.js plus tard)
- **State**: simple `useState`/`useEffect` (pas de gros state management)
- **Deployment**: Netlify (build command + dist directory)

### 2.1 Project structure (suggestion)

```text
src/
  components/
    Header.tsx
    Footer.tsx
    LanguageSwitcher.tsx
    Hero.tsx
    Features.tsx
    UseCases.tsx
    Screenshots.tsx
    StoreButtons.tsx
  i18n/
    en.json
    fr.json
  pages/
    Home.tsx
  assets/
    logo.png
    app-icon.png
    screenshots/
      screen1.png
      screen2.png
      screen3.png
  main.tsx
  App.tsx
index.html
```

## 3. Content & Sections

### 3.1 Hero section

Objective: en 3 secondes, l’utilisateur comprend “à quoi ça sert”.

**EN**

- Title: Track results and rankings in your group
- Subtitle: For board games, sports, video games or office matches. Record your results, and let EloHero keep the ranking.
- Primary CTA: Get the app
- Secondary CTA: How it works

**FR**

- Title: Suivez les résultats et le classement de votre groupe
- Subtitle: Jeux de société, sport, jeux vidéo ou matchs au bureau. Enregistrez vos résultats et laissez EloHero gérer le classement.
- Primary CTA: Télécharger l’app
- Secondary CTA: Comment ça marche

Visuel: capture d’écran principale de l’app (classement de groupe) + mockup mobile possible.

### 3.2 Use cases (3 blocs)

- Section title EN: Use it for any kind of game
- Section title FR: Utilisez-la pour tous vos jeux

Cartes (icône + texte) :

1. **Board games / Jeux de société**
   - EN: Track your Catan, Carcassonne, Splendor, 7 Wonders, and more.
   - FR: Suivez vos parties de Catan, Carcassonne, Splendor, 7 Wonders, et bien plus.
2. **Sports & office games / Sports et jeux au bureau**
   - EN: Perfect for foosball, ping-pong, padel, darts, or any friendly match.
   - FR: Parfait pour le babyfoot, le ping-pong, le padel, les fléchettes ou tout match amical.
3. **Video games / Jeux vidéo**
   - EN: Keep long-term rankings for Mario Kart, Smash, FIFA, and more.
   - FR: Gardez un classement sur la durée pour Mario Kart, Smash, FIFA, etc.

### 3.3 Features section

- Section title EN: What EloHero does for your group
- Section title FR: Ce que EloHero apporte à votre groupe

Feature bullets :

1. EN: Track results after each match / FR: Enregistrez le résultat après chaque match
2. EN: Automatic rankings for your group / FR: Classement automatique de votre groupe
3. EN: Support for multiple groups (friends, club, office) / FR: Gérez plusieurs groupes (amis, club, bureau)
4. EN: Stats over time (who’s rising, who’s falling) / FR: Statistiques dans le temps (qui monte, qui descend)
5. EN: Simple and fast: record in a few seconds / FR: Simple et rapide : quelques secondes par match

### 3.4 Screenshots

- Section avec 3–4 captures (classement, match entry, groupe, profil)
- Title EN: A quick look inside
- Title FR: Un aperçu de l’app

### 3.5 Store links

Composant `StoreButtons` avec deux boutons :

- iOS — Download on the App Store → <https://apps.apple.com/fr/app/elohero/id6754299081>
- Android — Get it on Google Play → <https://play.google.com/store/apps/details?id=com.elohero.app>

Texte global : EN "Available on iOS and Android" / FR "Disponible sur iOS et Android".

### 3.6 Footer

Inclure :

- Logo / nom EloHero
- Liens: Privacy Policy / Politique de confidentialité, Terms of Use / Conditions d’utilisation
- Mention: Made by Tristan Debroise
- Language switcher dupliqué ici ou lien vers le header

## 4. i18n Setup

Objectif : tout le texte passe par les fichiers de traduction.

### 4.1 Fichiers de traduction

`/src/i18n/en.json`

```json
{
  "app.name": "EloHero",
  "nav.home": "Home",
  "nav.howItWorks": "How it works",
  "nav.contact": "Contact",
  "hero.title": "Track results and rankings in your group",
  "hero.subtitle": "For board games, sports, video games or office matches. Record your results, and let EloHero keep the ranking.",
  "hero.ctaPrimary": "Get the app",
  "hero.ctaSecondary": "How it works",
  "useCases.title": "Use it for any kind of game",
  "useCases.boardgames.title": "Board games",
  "useCases.boardgames.text": "Track your Catan, Carcassonne, Splendor, 7 Wonders, and more.",
  "useCases.sports.title": "Sports & office games",
  "useCases.sports.text": "Perfect for foosball, ping-pong, padel, darts, or any friendly match.",
  "useCases.videogames.title": "Video games",
  "useCases.videogames.text": "Keep long-term rankings for Mario Kart, Smash, FIFA, and more.",
  "features.title": "What EloHero does for your group",
  "features.1.title": "Track results after each match",
  "features.2.title": "Automatic rankings for your group",
  "features.3.title": "Support for multiple groups",
  "features.4.title": "Stats over time",
  "features.5.title": "Simple and fast",
  "screenshots.title": "A quick look inside",
  "stores.title": "Available on iOS and Android",
  "stores.ios": "Download on the App Store",
  "stores.android": "Get it on Google Play",
  "footer.privacy": "Privacy Policy",
  "footer.terms": "Terms of Use",
  "footer.madeBy": "Made by Tristan Debroise"
}
```

`/src/i18n/fr.json`

```json
{
  "app.name": "EloHero",
  "nav.home": "Accueil",
  "nav.howItWorks": "Comment ça marche",
  "nav.contact": "Contact",
  "hero.title": "Suivez les résultats et le classement de votre groupe",
  "hero.subtitle": "Jeux de société, sport, jeux vidéo ou matchs au bureau. Enregistrez vos résultats et laissez EloHero gérer le classement.",
  "hero.ctaPrimary": "Télécharger l’app",
  "hero.ctaSecondary": "Comment ça marche",
  "useCases.title": "Utilisez-la pour tous vos jeux",
  "useCases.boardgames.title": "Jeux de société",
  "useCases.boardgames.text": "Suivez vos parties de Catan, Carcassonne, Splendor, 7 Wonders, et bien plus.",
  "useCases.sports.title": "Sports et jeux au bureau",
  "useCases.sports.text": "Parfait pour le babyfoot, le ping-pong, le padel, les fléchettes ou tout match amical.",
  "useCases.videogames.title": "Jeux vidéo",
  "useCases.videogames.text": "Gardez un classement sur la durée pour Mario Kart, Smash, FIFA, etc.",
  "features.title": "Ce que EloHero apporte à votre groupe",
  "features.1.title": "Enregistrez le résultat après chaque match",
  "features.2.title": "Classement automatique de votre groupe",
  "features.3.title": "Gérez plusieurs groupes",
  "features.4.title": "Statistiques dans le temps",
  "features.5.title": "Simple et rapide",
  "screenshots.title": "Un aperçu de l’app",
  "stores.title": "Disponible sur iOS et Android",
  "stores.ios": "Disponible sur l’App Store",
  "stores.android": "Disponible sur Google Play",
  "footer.privacy": "Politique de confidentialité",
  "footer.terms": "Conditions d’utilisation",
  "footer.madeBy": "Créé par Tristan Debroise"
}
```

### 4.2 Language switcher

- Stocker la langue dans `localStorage` (`"en"` par défaut, `"fr"` si choisi).
- Mettre à jour le contexte i18n + l’attribut `lang` du `<html>`.
- Comportement :
  - Si l’utilisateur arrive avec `navigator.language` en `fr-*` → pré-sélection FR.
  - Sinon → EN.

## 5. shadcn/ui Integration

Utilisations prévues :

- Header: `Button`, `DropdownMenu` (language switcher optionnel)
- Hero CTA: `Button` variant `default` + `outline`
- Cards: `Card`, `CardHeader`, `CardTitle`, `CardContent` pour features & use cases
- Layout: container custom + utilitaires Tailwind

Style général :

- Fond clair (ou gradient léger derrière le hero)
- Cartes radius `xl`, ombre légère
- Typographie simple (Inter ou system-ui)

## 6. Netlify Deployment

- Build command (Vite) : `npm run build`
- Publish directory : `dist`
- Redirect SPA (`_redirects`) :

```text
/* /index.html 200
```

Étapes Netlify :

1. Connecter le repo Git.
2. Configurer les build settings.
3. Ajouter le domaine custom `elohero.app`.
4. Forcer HTTPS.

## 7. Todo / Checklist

1. Setup React + TS + Vite + Tailwind + shadcn/ui
2. Ajouter i18n (`react-i18next`) + fichiers `en.json` et `fr.json`
3. Implémenter `LanguageSwitcher`
4. Créer les sections : Hero, UseCases, Features, Screenshots, StoreButtons, Footer
5. Intégrer les liens iOS / Android
6. Tester FR / EN (SEO title/description à terme)
7. Déployer sur Netlify (prod domain: `elohero.app`)
