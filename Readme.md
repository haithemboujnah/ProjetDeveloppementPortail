# 🎮 Steam Clone - Plateforme de Distribution de Jeux Vidéo

[![Django](https://img.shields.io/badge/Django-4.2-green.svg)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg)](https://www.mysql.com/)
[![Stripe](https://img.shields.io/badge/Stripe-API-purple.svg)](https://stripe.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> Une plateforme complète de distribution de jeux vidéo inspirée de Steam, permettant aux joueurs d'acheter et de jouer à des jeux, et aux développeurs de publier et vendre leurs créations.

## 📋 Table des Matières

- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Technologies Utilisées](#-technologies-utilisées)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Démarrage Rapide](#-démarrage-rapide)
- [Structure du Projet](#-structure-du-projet)
- [API Documentation](#-api-documentation)
- [Déploiement](#-déploiement)
- [Contribution](#-contribution)
- [Licence](#-licence)

## ✨ Fonctionnalités

### 👤 **Utilisateurs (Gamers)**
- ✅ Inscription et connexion sécurisées (JWT)
- ✅ Profil personnalisable (avatar, bio)
- ✅ Bibliothèque de jeux personnelle
- ✅ Wishlist pour sauvegarder ses jeux favoris
- ✅ Historique des commandes
- ✅ Système de notation et commentaires
- ✅ Notifications en temps réel

### 👨‍💻 **Développeurs**
- ✅ Dashboard complet avec statistiques
- ✅ Gestion des jeux (CRUD)
- ✅ Upload de fichiers de jeu
- ✅ Gestion des versions (updates)
- ✅ Visualisation des revenus
- ✅ Réponses aux commentaires des joueurs
- ✅ Analytics par jeu (téléchargements, ventes)

### 🛡️ **Administrateurs**
- ✅ Dashboard avec statistiques globales
- ✅ Gestion des utilisateurs (ban, rôles)
- ✅ Modération des jeux (approbation/rejet)
- ✅ Modération des commentaires
- ✅ Gestion des commissions
- ✅ Analytics avancés

### 🎮 **Fonctionnalités Principales**
- 🔍 Recherche avancée de jeux
- 🏷️ Filtrage par catégories et prix
- 💳 Paiement sécurisé via Stripe
- 📥 Téléchargement de jeux
- ⭐ Système de notation 5 étoiles
- 💬 Réponses développeur aux reviews
- 📧 Notifications par email
- 📱 Interface responsive


## 🛠️ Technologies Utilisées

### Backend
| Technologie | Version | Description |
|-------------|---------|-------------|
| Django | 4.2 | Framework web Python |
| Django REST Framework | 3.14 | API RESTful |
| MySQL | 8.0 | Base de données relationnelle |
| JWT | 5.3 | Authentification par tokens |
| Stripe | 7.8 | Paiements en ligne |
| Celery | 5.3 | Tâches asynchrones |
| Redis | 5.0 | Cache et broker Celery |
| Django Filters | 23.5 | Filtrage avancé |

### Frontend
| Technologie | Version | Description |
|-------------|---------|-------------|
| React | 18.2 | Bibliothèque UI |
| React Router | 6.8 | Navigation |
| Axios | 1.4 | Requêtes HTTP |
| React Query | 3.39 | Gestion d'état serveur |
| Chart.js | 4.4 | Graphiques et visualisation |
| Stripe.js | - | Paiements Stripe |
| React Hot Toast | 2.4 | Notifications |

## 📦 Installation

### Prérequis

```bash
# Versions requises
Python >= 3.10
Node.js >= 18.0
MySQL >= 8.0
Redis >= 5.0 (optionnel pour Celery)
```

## 📄 Licence

### 👥 Auteurs
Haithem Boujnah - Développeur principal - haithemboujnah1@gmail.com