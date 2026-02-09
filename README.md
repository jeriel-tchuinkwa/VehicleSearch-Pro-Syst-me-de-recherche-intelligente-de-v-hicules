# VehicleSearch Pro – Système de recherche intelligente de véhicules

## Description

VehicleSearch Pro est une application web full-stack qui combine la gestion de données de véhicules avec des techniques avancées de Machine Learning et de recherche vectorielle. Le projet utilise MongoDB comme base de données principale, Node.js/Express pour l'API REST backend, et Python/Flask pour le service de Machine Learning. L'application permet aux utilisateurs de rechercher des véhicules de manière intelligente grâce à la recherche vectorielle basée sur TF-IDF, qui comprend le contexte et la sémantique des requêtes plutôt que de simples correspondances de mots-clés.

Le système intègre plusieurs modèles de Machine Learning pour fournir des analyses approfondies : Random Forest pour la classification des types de véhicules (voitures vs SUV), K-Means pour le clustering et la segmentation des véhicules selon leurs caractéristiques (prix, kilométrage), et XGBoost pour la prédiction des prix basée sur l'année, le kilométrage et d'autres attributs. L'interface utilisateur offre des visualisations interactives des résultats d'analyse, permettant aux utilisateurs de comprendre facilement les tendances du marché automobile.

L'architecture du projet suit une approche microservices avec deux serveurs distincts : le serveur Node.js (port 3000) qui gère les opérations CRUD standard sur les véhicules et la logique métier, et le serveur Python Flask (port 5000) dédié exclusivement aux opérations de Machine Learning et d'analyse de données. Cette séparation permet une meilleure scalabilité et maintenabilité du code. Le système utilise des bibliothèques modernes comme scikit-learn pour les algorithmes ML classiques, PyTorch et Transformers pour les embeddings avancés, et propose une API RESTful complète avec des endpoints documentés pour chaque fonctionnalité.

## Objectifs

- Implémenter une recherche vectorielle sémantique pour véhicules
- Développer des modèles ML de classification, clustering et prédiction
- Créer une architecture microservices scalable (Node.js + Python)
- Intégrer MongoDB pour la gestion efficace des données
- Fournir des visualisations interactives des analyses ML

## Technologies utilisées

**Backend & Base de données**
- Node.js
- Express
- Python
- Flask
- MongoDB

**Machine Learning & Data Science**
- scikit-learn
- XGBoost
- PyTorch
- Transformers
- NumPy
- Pandas

**Frontend**
- HTML5
- CSS3
- JavaScript

## Auteur

Jériel Tchuinkwa Tandu
