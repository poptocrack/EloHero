# EloHero

Une application mobile de classement ELO communautaire basée sur Firebase et React Native.

## 🎯 Fonctionnalités

- **Classement ELO dynamique** pour groupes de joueurs
- **Gestion des groupes** avec codes d'invitation
- **Saisie de parties** avec drag & drop pour l'ordre
- **Saisons** (Premium) avec reset ELO
- **Authentification** Firebase (email, Google, Apple)
- **Abonnements** Stripe (Free/Premium)

## 🏗️ Architecture

### Stack Technique

- **Mobile**: React Native + Expo (TypeScript)
- **Backend**: Firebase Functions
- **Base de données**: Firestore
- **Auth**: Firebase Auth
- **Paiement**: Stripe (Extension Firebase)
- **État**: Zustand + React Query

### Structure Firestore

```
users/{uid}
groups/{groupId}
members/{uid}
seasons/{seasonId}
ratings/{seasonId_uid}
games/{gameId}
participants/{uid}
ratingChanges/{gameId_uid}
invites/{code}
subscriptions/{uid}
```

## 🚀 Installation

### Prérequis

- Node.js 18+
- Expo CLI
- Compte Firebase
- Compte Stripe (pour les paiements)

### 1. Cloner le projet

```bash
git clone <repository-url>
cd EloHero
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration Firebase

1. Créer un projet Firebase
2. Activer Authentication, Firestore, Functions
3. Configurer les providers d'auth (Email, Google, Apple)
4. Créer un fichier `.env` :

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 4. Configuration Stripe (Optionnel)

1. Créer un compte Stripe
2. Installer l'extension Firebase Stripe
3. Configurer les webhooks

### 5. Déployer les Cloud Functions

Les Cloud Functions suivantes doivent être déployées :

- `createGroup` - Créer un groupe
- `joinGroupWithCode` - Rejoindre avec code
- `createSeason` - Créer une saison (Premium)
- `reportMatch` - Enregistrer une partie et calculer ELO
- `stripeWebhook` - Gérer les abonnements
- `scheduledCleanups` - Nettoyage automatique

### 6. Lancer l'application

```bash
npm start
```

## 📱 Utilisation

### Plan Gratuit

- 2 groupes maximum
- 5 membres par groupe
- Fonctions de base

### Plan Premium (4,99€/mois)

- Groupes illimités
- Membres illimités
- Saisons et reset ELO
- Statistiques avancées
- Export de données

## 🔒 Sécurité

- **Aucune écriture directe** côté client
- Toutes les mutations passent par des Cloud Functions
- Vérification des limites Free/Premium côté backend
- Règles Firestore restrictives

## 🧮 Algorithme ELO

- Système multi-joueurs avec placements
- Conversion en duels virtuels
- Ajustement progressif selon le nombre de parties
- K-factor adaptatif : `K_eff = K_base * (1 / (1 + gamesPlayed / n0))`

## 📁 Structure du projet

```
src/
├── components/          # Composants réutilisables
├── screens/            # Écrans de l'application
├── navigation/         # Configuration de navigation
├── services/           # Services (Firebase, Auth, etc.)
├── store/              # État global (Zustand)
├── types/              # Types TypeScript
├── utils/              # Utilitaires
└── config/             # Configuration
```

## 🚀 Déploiement

### Expo EAS Build

```bash
# Installer EAS CLI
npm install -g @expo/eas-cli

# Configurer le projet
eas build:configure

# Build pour iOS
eas build --platform ios

# Build pour Android
eas build --platform android
```

### OTA Updates

```bash
eas update --branch production --message "Bug fixes"
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

Pour toute question ou problème :

- Email : support@elohero.app
- Issues GitHub : [Créer une issue](https://github.com/your-repo/issues)

## 🔮 Roadmap

### V2

- Types de jeux (1v1, équipes)
- Graphiques de progression
- Succès et badges
- Export CSV
- Intégration Discord
- Notifications push
- Mode offline avancé
