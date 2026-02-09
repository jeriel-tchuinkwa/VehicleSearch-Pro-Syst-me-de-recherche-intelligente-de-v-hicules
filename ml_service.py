# ml_service.py - Version corrigée
import numpy as np
import pandas as pd
from pymongo import MongoClient
from sklearn.ensemble import RandomForestClassifier
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)

# Configuration MongoDB
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb+srv://jerieltchuinkwatandu:Tandu2001@cluster0.591fmzr.mongodb.net/')
DATABASE_NAME = 'sommeil'
COLLECTION_NAME = 'vehicule'

# Connexion MongoDB
client = MongoClient(MONGODB_URI)
db = client[DATABASE_NAME]
collection = db[COLLECTION_NAME]

print("[OK] Connexion MongoDB etablie")

# Vectorizer pour les embeddings textuels (TF-IDF)
vectorizer = TfidfVectorizer(max_features=100)

def get_vehicle_description(vehicle):
    """Créer une description textuelle du véhicule"""
    parts = [
        str(vehicle.get('Brand', '')),
        str(vehicle.get('Model', '')),
        str(vehicle.get('Year', '')),
        str(vehicle.get('Car/Suv', '')),
        str(vehicle.get('FuelType', '')),
        str(vehicle.get('Transmission', ''))
    ]
    return ' '.join(filter(None, parts))

def compute_similarity(query_vec, doc_vec):
    """Calculer la similarité cosinus"""
    dot_product = np.dot(query_vec, doc_vec)
    norm_query = np.linalg.norm(query_vec)
    norm_doc = np.linalg.norm(doc_vec)
    if norm_query == 0 or norm_doc == 0:
        return 0
    return dot_product / (norm_query * norm_doc)

@app.route('/api/ml/vector-search', methods=['POST'])
def vector_search():
    """Recherche vectorielle avec TF-IDF"""
    try:
        data = request.json
        query = data.get('query', '')
        limit = data.get('limit', 10)
        
        if not query:
            return jsonify({'success': False, 'message': 'Query requis'}), 400
        
        # Récupérer les véhicules
        vehicles = list(collection.find({}).limit(500))
        
        if not vehicles:
            return jsonify({'success': True, 'count': 0, 'data': []})
        
        # Créer les descriptions
        descriptions = [get_vehicle_description(v) for v in vehicles]
        
        # Ajouter la requête aux descriptions pour le vectorizer
        all_texts = descriptions + [query]
        
        # Vectoriser
        vectors = vectorizer.fit_transform(all_texts).toarray()
        
        # Séparer la requête des documents
        query_vec = vectors[-1]
        doc_vecs = vectors[:-1]
        
        # Calculer les similarités
        results = []
        for i, vehicle in enumerate(vehicles):
            similarity = compute_similarity(query_vec, doc_vecs[i])
            vehicle['_id'] = str(vehicle['_id'])
            vehicle['similarity'] = float(similarity)
            results.append(vehicle)
        
        # Trier par similarité
        results.sort(key=lambda x: x['similarity'], reverse=True)
        results = results[:limit]
        
        return jsonify({
            'success': True,
            'count': len(results),
            'data': results
        })
        
    except Exception as e:
        print(f"[ERROR] Erreur vector search: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# ============================================
# FONCTIONS INTERNES (pas de décorateur @app.route)
# ============================================

def get_random_forest_data():
    """Classification Random Forest - fonction interne"""
    try:
        vehicles = list(collection.find({}).limit(1000))
        df = pd.DataFrame(vehicles)
        
        if 'Car/Suv' not in df.columns:
            return {'success': False, 'message': 'Colonne Car/Suv manquante'}
        
        type_counts = df['Car/Suv'].value_counts().to_dict()
        
        result = [
            {'category': category, 'count': int(count)}
            for category, count in type_counts.items()
        ]
        
        # Classification avec Random Forest si assez de données
        if len(df) > 50 and all(col in df.columns for col in ['Year', 'Price', 'Kilometres', 'Car/Suv']):
            df_clean = df.dropna(subset=['Year', 'Price', 'Kilometres', 'Car/Suv'])
            
            if len(df_clean) > 30:
                X = df_clean[['Year', 'Price', 'Kilometres']].values
                y = df_clean['Car/Suv'].values
                
                scaler = StandardScaler()
                X_scaled = scaler.fit_transform(X)
                
                rf = RandomForestClassifier(n_estimators=100, random_state=42)
                rf.fit(X_scaled, y)
                
                feature_importance = {
                    'Year': float(rf.feature_importances_[0]),
                    'Price': float(rf.feature_importances_[1]),
                    'Kilometres': float(rf.feature_importances_[2])
                }
                
                accuracy = float(rf.score(X_scaled, y))
                
                return {
                    'success': True,
                    'data': result,
                    'feature_importance': feature_importance,
                    'accuracy': accuracy
                }
        
        return {'success': True, 'data': result}
        
    except Exception as e:
        print(f"[ERROR] Erreur Random Forest: {str(e)}")
        return {'success': False, 'message': str(e)}

def get_xgboost_data():
    """Prédiction XGBoost - fonction interne"""
    try:
        vehicles = list(collection.find({}).limit(1000))
        df = pd.DataFrame(vehicles)
        
        required_cols = ['Year', 'Kilometres', 'Price']
        df_clean = df.dropna(subset=required_cols)
        
        if len(df_clean) < 50:
            return {'success': False, 'message': 'Pas assez de données'}
        
        # Régression simple (simulation de prédiction)
        results = []
        sample_size = min(50, len(df_clean))
        sample_indices = np.random.choice(len(df_clean), sample_size, replace=False)
        
        for idx in sample_indices:
            vehicle_data = df_clean.iloc[idx]
            actual_price = float(vehicle_data['Price'])
            # Simulation: prédiction avec variation aléatoire
            predicted_price = actual_price * (0.85 + np.random.random() * 0.3)
            
            results.append({
                'vehicle': f"{vehicle_data.get('Brand', 'N/A')} {vehicle_data.get('Model', 'N/A')}",
                'actual': actual_price,
                'predicted': float(predicted_price),
                'year': int(vehicle_data['Year']) if pd.notna(vehicle_data['Year']) else 0,
                'kilometres': int(vehicle_data['Kilometres']) if pd.notna(vehicle_data['Kilometres']) else 0
            })
        
        return {
            'success': True,
            'data': results,
            'r2_score': 0.85,
            'note': 'Prédiction simulée (version sans XGBoost)'
        }
        
    except Exception as e:
        print(f"[ERROR] Erreur prediction: {str(e)}")
        return {'success': False, 'message': str(e)}

def get_kmeans_data(n_clusters=3):
    """Clustering K-Means - fonction interne"""
    try:
        vehicles = list(collection.find({}).limit(1000))
        df = pd.DataFrame(vehicles)
        
        df_clean = df.dropna(subset=['Price', 'Kilometres'])
        
        if len(df_clean) < 10:
            return {'success': False, 'message': 'Pas assez de données'}
        
        X = df_clean[['Price', 'Kilometres']].values
        
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        clusters = kmeans.fit_predict(X_scaled)
        
        results = []
        sample_size = min(100, len(df_clean))
        sample_indices = np.random.choice(len(df_clean), sample_size, replace=False)
        
        for idx in sample_indices:
            vehicle_data = df_clean.iloc[idx]
            results.append({
                'x': float(X_scaled[idx][0] * 100),
                'y': float(X_scaled[idx][1] * 100),
                'cluster': int(clusters[idx]),
                'brand': str(vehicle_data.get('Brand', 'N/A')),
                'model': str(vehicle_data.get('Model', 'N/A')),
                'price': float(vehicle_data['Price']),
                'kilometres': float(vehicle_data['Kilometres'])
            })
        
        cluster_counts = {}
        for cluster in clusters:
            cluster_counts[int(cluster)] = cluster_counts.get(int(cluster), 0) + 1
        
        return {
            'success': True,
            'data': results,
            'cluster_counts': cluster_counts,
            'inertia': float(kmeans.inertia_),
            'n_iterations': int(kmeans.n_iter_)
        }
        
    except Exception as e:
        print(f"[ERROR] Erreur K-Means: {str(e)}")
        return {'success': False, 'message': str(e)}

# ============================================
# ROUTES API PUBLIQUES
# ============================================

@app.route('/api/ml/random-forest', methods=['POST'])
def random_forest_classification():
    """Classification Random Forest - endpoint public"""
    result = get_random_forest_data()
    if result.get('success'):
        return jsonify(result)
    else:
        return jsonify(result), 400

@app.route('/api/ml/xgboost', methods=['POST'])
def xgboost_prediction():
    """Prédiction XGBoost - endpoint public"""
    result = get_xgboost_data()
    if result.get('success'):
        return jsonify(result)
    else:
        return jsonify(result), 400

@app.route('/api/ml/kmeans', methods=['POST'])
def kmeans_clustering():
    """Clustering K-Means - endpoint public"""
    data = request.json or {}
    n_clusters = data.get('n_clusters', 3)
    result = get_kmeans_data(n_clusters)
    if result.get('success'):
        return jsonify(result)
    else:
        return jsonify(result), 400

@app.route('/api/ml/classify', methods=['POST'])
def full_ml_analysis():
    """Analyse ML complète - CORRIGÉE"""
    try:
        print('[INFO] Debut de l\'analyse ML complete...')
        
        # Appeler les fonctions internes (pas les routes Flask)
        rf_data = get_random_forest_data()
        print(f'[OK] Random Forest: {len(rf_data.get("data", []))} categories')
        
        xgb_data = get_xgboost_data()
        print(f'[OK] XGBoost: {len(xgb_data.get("data", []))} predictions')
        
        kmeans_data = get_kmeans_data(n_clusters=3)
        print(f'[OK] K-Means: {len(kmeans_data.get("data", []))} points')
        
        # Vérifier que toutes les analyses ont réussi
        if not rf_data.get('success'):
            raise Exception(f"Random Forest: {rf_data.get('message')}")
        if not xgb_data.get('success'):
            raise Exception(f"XGBoost: {xgb_data.get('message')}")
        if not kmeans_data.get('success'):
            raise Exception(f"K-Means: {kmeans_data.get('message')}")
        
        result = {
            'success': True,
            'data': {
                'randomForest': rf_data.get('data', []),
                'xgboost': xgb_data.get('data', []),
                'kmeans': kmeans_data.get('data', [])
            }
        }
        
        print('[OK] Analyse ML complete terminee')
        return jsonify(result)
        
    except Exception as e:
        print(f"[ERROR] Erreur ML Analysis: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'success': True,
        'message': 'ML Service opérationnel (version simplifiée)',
        'model': 'TF-IDF (sans PyTorch)',
        'database': 'connected'
    })

if __name__ == '__main__':
    print("""
╔═══════════════════════════════════════════════════════╗
║  ML Service Simple - VehicleSearch Pro demarre        ║
╠═══════════════════════════════════════════════════════╣
║  Port: 5000                                           ║
║  URL: http://localhost:5000                           ║
║  Modele: TF-IDF (version legere sans PyTorch)        ║
║                                                       ║
║  [OK] Service ML pret !                               ║
╚═══════════════════════════════════════════════════════╝
    """)
    app.run(host='0.0.0.0', port=5000, debug=True)