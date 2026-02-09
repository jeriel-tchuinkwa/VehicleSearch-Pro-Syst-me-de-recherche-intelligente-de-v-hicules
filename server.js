// server.js - Backend Node.js pour VehicleSearch Pro
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const path = require('path');
// Pas besoin d'importer fetch, il est natif dans Node.js 18+

const app = express();
const PORT = process.env.PORT || 3000;
const ML_SERVICE_URL = 'http://localhost:5000/api/ml'; // Service Python ML

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuration MongoDB Atlas
const MONGODB_URI = 'mongodb+srv://jerieltchuinkwatandu:Tandu2001@cluster0.591fmzr.mongodb.net/';
const DATABASE_NAME = 'sommeil';
const COLLECTION_NAME = 'vehicule';

let db, collection;

// Connexion à MongoDB
async function connectToMongoDB() {
    try {
        const client = await MongoClient.connect(MONGODB_URI);
        console.log(' Connecté à MongoDB Atlas avec succès');
        
        db = client.db(DATABASE_NAME);
        collection = db.collection(COLLECTION_NAME);
        
        return true;
    } catch (error) {
        console.error(' Erreur de connexion MongoDB:', error);
        return false;
    }
}

// ============================================
// 1. RECHERCHE CLASSIQUE (5 points)
// ============================================

// Route: Recherche de véhicules par Brand et/ou Model
app.get('/api/vehicles/search', async (req, res) => {
    try {
        const { query } = req.query;
        
        let filter = {};
        
        // Si query est vide ou contient seulement des espaces, retourner les 10 premiers
        if (!query || query.trim() === '') {
            const vehicles = await collection.find({}).limit(10).toArray();
            return res.json({
                success: true,
                count: vehicles.length,
                message: 'Les 10 premiers véhicules',
                data: vehicles
            });
        }
        
        // Recherche par Brand ou Model (auto-complétion)
        filter = {
            $or: [
                { Brand: { $regex: query, $options: 'i' } },
                { Model: { $regex: query.toString(), $options: 'i' } }
            ]
        };
        
        const vehicles = await collection.find(filter).limit(50).toArray();
        
        res.json({
            success: true,
            count: vehicles.length,
            data: vehicles
        });
        
    } catch (error) {
        console.error('Erreur de recherche:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la recherche',
            error: error.message
        });
    }
});

// Route: Obtenir un véhicule par ID
app.get('/api/vehicles/:id', async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const vehicle = await collection.findOne({ _id: new ObjectId(req.params.id) });
        
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: 'Véhicule non trouvé'
            });
        }
        
        res.json({
            success: true,
            data: vehicle
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération',
            error: error.message
        });
    }
});

// ============================================
// 2. CRUD OPERATIONS (5 points)
// ============================================

// CREATE - Créer un nouveau véhicule
app.post('/api/vehicles', async (req, res) => {
    try {
        const vehicleData = req.body;
        
        // Validation basique
        if (!vehicleData.Brand || !vehicleData.Model) {
            return res.status(400).json({
                success: false,
                message: 'Brand et Model sont requis'
            });
        }
        
        const result = await collection.insertOne(vehicleData);
        
        res.status(201).json({
            success: true,
            message: 'Véhicule créé avec succès',
            data: {
                _id: result.insertedId,
                ...vehicleData
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création',
            error: error.message
        });
    }
});

// UPDATE - Mettre à jour un véhicule
app.put('/api/vehicles/:id', async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const { _id, ...updateData } = req.body;
        
        const result = await collection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Véhicule non trouvé'
            });
        }
        
        res.json({
            success: true,
            message: 'Véhicule mis à jour avec succès',
            data: { _id: req.params.id, ...updateData }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour',
            error: error.message
        });
    }
});

// DELETE - Supprimer un véhicule
app.delete('/api/vehicles/:id', async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        
        const result = await collection.deleteOne({
            _id: new ObjectId(req.params.id)
        });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Véhicule non trouvé'
            });
        }
        
        res.json({
            success: true,
            message: 'Véhicule supprimé avec succès'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression',
            error: error.message
        });
    }
});

// ============================================
// 3. RECHERCHE VECTORIELLE & ML (15 points)
// Ces routes font appel au service Python ML
// ============================================

// Route: Recherche vectorielle (déléguée au service Python)
app.post('/api/vehicles/vector-search', async (req, res) => {
    try {
        const { query, limit = 10 } = req.body;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Query est requis'
            });
        }
        
        // Appel au service Python ML
        const response = await fetch(`${ML_SERVICE_URL}/vector-search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, limit })
        });
        
        const data = await response.json();
        res.json(data);
        
    } catch (error) {
        console.error('Erreur recherche vectorielle:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la recherche vectorielle',
            error: error.message
        });
    }
});

// Route: Classification ML (Random Forest, XGBoost, K-Means)
app.post('/api/ml/classify', async (req, res) => {
    try {
        // Appel au service Python ML pour l'analyse complète
        const response = await fetch(`${ML_SERVICE_URL}/classify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        res.json(data);
        
    } catch (error) {
        console.error('Erreur ML:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la classification ML',
            error: error.message
        });
    }
});

// Route: Random Forest spécifique
app.post('/api/ml/random-forest', async (req, res) => {
    try {
        const response = await fetch(`${ML_SERVICE_URL}/random-forest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        res.json(data);
        
    } catch (error) {
        console.error('Erreur Random Forest:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur Random Forest',
            error: error.message
        });
    }
});

// Route: XGBoost spécifique
app.post('/api/ml/xgboost', async (req, res) => {
    try {
        const response = await fetch(`${ML_SERVICE_URL}/xgboost`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        res.json(data);
        
    } catch (error) {
        console.error('Erreur XGBoost:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur XGBoost',
            error: error.message
        });
    }
});

// Route: K-Means spécifique
app.post('/api/ml/kmeans', async (req, res) => {
    try {
        const { n_clusters = 3 } = req.body;
        
        const response = await fetch(`${ML_SERVICE_URL}/kmeans`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ n_clusters })
        });
        
        const data = await response.json();
        res.json(data);
        
    } catch (error) {
        console.error('Erreur K-Means:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur K-Means',
            error: error.message
        });
    }
});

// ============================================
// 4. ANALYSE STATISTIQUE - EDF/CDF (5 points)
// ============================================

// Route: Calculer EDF et CDF pour une variable
app.get('/api/statistics/edf', async (req, res) => {
    try {
        const { variable = 'Price' } = req.query;
        
        // Récupérer tous les véhicules
        const vehicles = await collection.find({}).toArray();
        
        // Extraire et trier les valeurs de la variable
        let values = vehicles
            .map(v => v[variable])
            .filter(val => val !== undefined && val !== null && !isNaN(val))
            .sort((a, b) => a - b);
        
        if (values.length === 0) {
            return res.status(400).json({
                success: false,
                message: `Aucune donnée valide pour la variable ${variable}`
            });
        }
        
        const n = values.length;
        const mean = values.reduce((a, b) => a + b, 0) / n;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);
        
        // Calculer EDF (Empirical Distribution Function)
        const edfData = values.map((value, index) => {
            const edf = (index + 1) / n;
            
            // CDF théorique (loi normale)
            const z = (value - mean) / stdDev;
            const cdf = 0.5 * (1 + erf(z / Math.sqrt(2)));
            
            return {
                value: value,
                edf: parseFloat(edf.toFixed(4)),
                cdf: parseFloat(cdf.toFixed(4))
            };
        });
        
        // Calcul des percentiles
        const percentiles = {
            p25: values[Math.floor(n * 0.25)],
            p50: values[Math.floor(n * 0.50)], // Médiane
            p75: values[Math.floor(n * 0.75)],
            p80: values[Math.floor(n * 0.80)],
            p90: values[Math.floor(n * 0.90)]
        };
        
        res.json({
            success: true,
            variable: variable,
            statistics: {
                count: n,
                mean: parseFloat(mean.toFixed(2)),
                stdDev: parseFloat(stdDev.toFixed(2)),
                min: values[0],
                max: values[n - 1],
                percentiles
            },
            data: edfData,
            interpretation: `80% des véhicules ont un ${variable} inférieur à ${percentiles.p80.toLocaleString()}`
        });
        
    } catch (error) {
        console.error('Erreur EDF:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du calcul EDF/CDF',
            error: error.message
        });
    }
});

// Fonction d'erreur (erf) pour calculer la CDF normale
function erf(x) {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
}

// ============================================
// ROUTES SUPPLÉMENTAIRES
// ============================================

// Route de santé
app.get('/api/health', async (req, res) => {
    try {
        // Vérifier la connexion au service ML Python
        const mlHealth = await fetch('http://localhost:5000/health');
        const mlStatus = await mlHealth.json();
        
        res.json({
            success: true,
            message: 'Serveur opérationnel',
            database: db ? 'Connecté' : 'Déconnecté',
            ml_service: mlStatus.success ? 'Connecté' : 'Déconnecté'
        });
    } catch (error) {
        res.json({
            success: true,
            message: 'Serveur opérationnel',
            database: db ? 'Connecté' : 'Déconnecté',
            ml_service: 'Déconnecté (démarrer python ml_service.py)'
        });
    }
});

// Route pour obtenir les statistiques générales
app.get('/api/statistics/general', async (req, res) => {
    try {
        const totalVehicles = await collection.countDocuments();
        
        const avgPrice = await collection.aggregate([
            { $group: { _id: null, avgPrice: { $avg: '$Price' } } }
        ]).toArray();
        
        const brandCount = await collection.aggregate([
            { $group: { _id: '$Brand', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]).toArray();
        
        res.json({
            success: true,
            data: {
                totalVehicles,
                averagePrice: Math.round(avgPrice[0]?.avgPrice || 0),
                topBrands: brandCount
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors du calcul des statistiques',
            error: error.message
        });
    }
});

// Route principale - Servir l'interface
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrer le serveur
async function startServer() {
    const connected = await connectToMongoDB();
    
    if (!connected) {
        console.error('❌ Impossible de démarrer le serveur sans connexion MongoDB');
        process.exit(1);
    }
    
    app.listen(PORT, () => {
        console.log(`
╔═══════════════════════════════════════════════════════╗
║     VehicleSearch Pro - Serveur démarré               ║
╠═══════════════════════════════════════════════════════╣
║  Port: ${PORT}                                        ║
║  URL: http://localhost:${PORT}                        ║
║  Base de données: ${DATABASE_NAME}                    ║
║  Collection: ${COLLECTION_NAME}                       ║
║                                                       ║
║   Serveur Node.js prêt !                            ║
║    Démarrez le service ML Python:                   ║
║     python ml_service.py                              ║
╚═══════════════════════════════════════════════════════╝
        `);
    });
}

// Gestion des erreurs
process.on('unhandledRejection', (error) => {
    console.error(' Erreur non gérée:', error);
});

// Démarrage
startServer();