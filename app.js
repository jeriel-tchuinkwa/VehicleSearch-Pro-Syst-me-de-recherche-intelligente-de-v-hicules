// ============================================
// app.js - Logique frontend pour véhicules
// ============================================

let currentVehicleId = null;
let mlCharts = {};

// ============================================
// STATISTIQUES GLOBALES
// ============================================

async function loadGlobalStats() {
    try {
        const response = await fetch('/api/global-stats');
        const data = await response.json();
        
        if (data.success) {
            const banner = document.getElementById('statsBanner');
            const stats = data.stats;
            
            banner.innerHTML = `
                <div class="stat-box">
                    <div class="stat-value">${stats.totalVehicles.toLocaleString()}</div>
                    <div class="stat-label">Total Véhicules</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${stats.uniqueBrands}</div>
                    <div class="stat-label">Marques Uniques</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${stats.topBrands[0]?.brand || 'N/A'}</div>
                    <div class="stat-label">Top Marque (${stats.topBrands[0]?.count || 0})</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erreur stats globales:', error);
    }
}

// ============================================
// 1. RECHERCHE CLASSIQUE
// ============================================

const searchInput = document.getElementById('searchInput');
let searchTimeout;

searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        performSearch(this.value);
    }, 300);
});

searchInput.addEventListener('keydown', function(e) {
    if (e.key === ' ' && this.value === '') {
        e.preventDefault();
        performSearch('');
    }
});

async function performSearch(query) {
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.success) {
            displayVehicles(data.vehicles, 'vehiclesList');
        }
    } catch (error) {
        console.error('Erreur recherche:', error);
    }
}

function displayVehicles(vehicles, containerId) {
    const container = document.getElementById(containerId);
    
    if (vehicles.length === 0) {
        container.innerHTML = '<div class="loading">❌ Aucun véhicule trouvé</div>';
        return;
    }

    container.innerHTML = vehicles.map(vehicle => {
        return `
        <div class="vehicle-card" onclick="openEditModal('${vehicle._id}')">
            <span class="vehicle-badge">${vehicle.Year || 'N/A'}</span>
            <h3>${vehicle.Brand || 'Unknown'} ${vehicle.Model || 'Unknown'}</h3>
            <div class="vehicle-info">
                <div><strong>🏭 Marque:</strong> ${vehicle.Brand || 'N/A'}</div>
                <div><strong>🚗 Modèle:</strong> ${vehicle.Model || 'N/A'}</div>
                <div><strong>📅 Année:</strong> ${vehicle.Year || 'N/A'}</div>
                <div><strong>⚙️ Moteur:</strong> ${vehicle.Engine || 'N/A'}</div>
                <div><strong>⛽ Carburant:</strong> ${vehicle['Fuel Type'] || 'N/A'}</div>
                <div><strong>🔧 Transmission:</strong> ${vehicle.Transmission || 'N/A'}</div>
            </div>
        </div>
    `}).join('');
}

// ============================================
// 2. CRUD OPERATIONS
// ============================================

async function openEditModal(vehicleId) {
    try {
        const response = await fetch(`/api/vehicles/${vehicleId}`);
        const data = await response.json();

        if (data.success) {
            currentVehicleId = vehicleId;
            const vehicle = data.vehicle;

            // Changer le titre du modal
            document.getElementById('modalTitle').textContent = 'Modifier Véhicule';

            // Remplir les champs avec les données du véhicule
            document.getElementById('inputBrand').value = vehicle.Brand || '';
            document.getElementById('inputModel').value = vehicle.Model || '';
            document.getElementById('inputYear').value = vehicle.Year || '';
            document.getElementById('inputPrice').value = vehicle.Price || '';
            document.getElementById('inputKilometres').value = vehicle.Kilometres || '';
            document.getElementById('inputCarSuv').value = vehicle.Car_SUV || '';
            document.getElementById('inputFuelType').value = vehicle['Fuel Type'] || '';
            document.getElementById('inputTransmission').value = vehicle.Transmission || '';

            // Afficher le bouton supprimer
            document.getElementById('btnDelete').classList.remove('hidden');

            document.getElementById('crudModal').classList.add('active');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur lors du chargement du véhicule');
    }
}

// Ouvrir le modal pour créer un nouveau véhicule
function openCreateModal() {
    currentVehicleId = null;
    
    // Changer le titre du modal
    document.getElementById('modalTitle').textContent = 'Nouveau Véhicule';
    
    // Réinitialiser tous les champs
    document.getElementById('inputBrand').value = '';
    document.getElementById('inputModel').value = '';
    document.getElementById('inputYear').value = '';
    document.getElementById('inputPrice').value = '';
    document.getElementById('inputKilometres').value = '';
    document.getElementById('inputCarSuv').value = '';
    document.getElementById('inputFuelType').value = '';
    document.getElementById('inputTransmission').value = '';
    
    // Cacher le bouton supprimer pour la création
    document.getElementById('btnDelete').classList.add('hidden');
    
    document.getElementById('crudModal').classList.add('active');
}

// Sauvegarder les modifications (création ou mise à jour)
async function updateVehicle() {
    const vehicleData = {
        Brand: document.getElementById('inputBrand').value,
        Model: document.getElementById('inputModel').value,
        Year: parseInt(document.getElementById('inputYear').value) || null,
        Price: parseFloat(document.getElementById('inputPrice').value) || null,
        Kilometres: parseInt(document.getElementById('inputKilometres').value) || null,
        Car_SUV: document.getElementById('inputCarSuv').value || null,
        'Fuel Type': document.getElementById('inputFuelType').value || null,
        Transmission: document.getElementById('inputTransmission').value || null
    };
    
    // Validation basique
    if (!vehicleData.Brand || !vehicleData.Model) {
        alert('⚠️ Veuillez remplir au moins la marque et le modèle');
        return;
    }
    
    try {
        const isCreating = !currentVehicleId;
        
        const response = await fetch(
            isCreating ? '/api/vehicles' : `/api/vehicles/${currentVehicleId}`,
            {
                method: isCreating ? 'POST' : 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vehicleData)
            }
        );
        
        const data = await response.json();
        
        if (data.success) {
            alert(isCreating ? '✅ Véhicule créé avec succès !' : '✅ Véhicule mis à jour avec succès !');
            closeModal();
            performSearch(searchInput.value);
            loadGlobalStats(); // Rafraîchir les stats
        } else {
            alert('❌ Erreur: ' + (data.error || 'Erreur inconnue'));
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur lors de la sauvegarde');
    }
}

async function deleteVehicle() {
    if (!currentVehicleId) return;

    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer ce véhicule ?')) {
        return;
    }

    try {
        const response = await fetch(`/api/vehicles/${currentVehicleId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            alert('✅ Véhicule supprimé avec succès !');
            closeModal();
            performSearch(searchInput.value);
            loadGlobalStats(); // Rafraîchir les stats
        } else {
            alert('❌ Erreur: ' + data.error);
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur lors de la suppression');
    }
}

function closeModal() {
    document.getElementById('crudModal').classList.remove('active');
    currentVehicleId = null;
}

// ============================================
// 3. RECHERCHE VECTORIELLE
// ============================================

async function performVectorSearch() {
    const query = document.getElementById('vectorSearchInput').value;
    
    if (!query.trim()) {
        alert('⚠️ Veuillez entrer une requête');
        return;
    }

    try {
        const response = await fetch('/api/vector-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        const data = await response.json();

        if (data.success) {
            displayVehicles(data.vehicles, 'vectorResultsList');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur lors de la recherche vectorielle');
    }
}

// ============================================
// 4. MACHINE LEARNING
// ============================================

async function performMLAnalysis() {
    const mlResults = document.getElementById('mlResults');
    mlResults.style.display = 'grid';
    
    // Afficher un message de chargement
    document.getElementById('kmeansResult').innerHTML = '<p>⏳ Chargement des données...</p>';
    document.getElementById('classificationResult').innerHTML = '<p>⏳ Analyse en cours...</p>';
    document.getElementById('regressionResult').innerHTML = '<p>⏳ Calcul...</p>';
    
    try {
        // Récupérer les données
        const response = await fetch('/api/ml-data');
        const result = await response.json();
        
        if (!result.success) {
            alert('Erreur lors de la récupération des données');
            return;
        }
        
        const data = result.data;
        
        // Préparer les features (extraction des années)
        const features = data.map(v => {
            const yearMatch = v.Year ? v.Year.toString().match(/\d{4}/) : null;
            const year = yearMatch ? parseFloat(yearMatch[0]) : 2000;
            
            return [
                year,
                Math.random() * 100, // Feature simulée
                Math.random() * 50,  // Feature simulée
                Math.random() * 200  // Feature simulée
            ];
        });
        
        // 1. K-MEANS CLUSTERING
        const kmeansResult = performKMeans(features, 4);
        displayKMeansResults(kmeansResult, data);
        
        // 2. CLASSIFICATION
        const classificationResult = performClassification(data);
        displayClassificationResults(classificationResult);
        
        // 3. RÉGRESSION
        const regressionResult = performRegression(features, data);
        displayRegressionResults(regressionResult);
        
    } catch (error) {
        console.error('Erreur ML:', error);
        alert('❌ Erreur lors de l\'analyse ML');
    }
}

// K-Means simplifié
function performKMeans(data, k) {
    const n = data.length;
    
    // Initialiser les centroides aléatoirement
    let centroids = [];
    for (let i = 0; i < k; i++) {
        centroids.push(data[Math.floor(Math.random() * n)].slice());
    }
    
    let assignments = new Array(n).fill(0);
    let iterations = 0;
    const maxIterations = 50;
    
    while (iterations < maxIterations) {
        let changed = false;
        
        // Assigner chaque point au centroide le plus proche
        for (let i = 0; i < n; i++) {
            let minDist = Infinity;
            let minCluster = 0;
            
            for (let j = 0; j < k; j++) {
                const dist = euclideanDistance(data[i], centroids[j]);
                if (dist < minDist) {
                    minDist = dist;
                    minCluster = j;
                }
            }
            
            if (assignments[i] !== minCluster) {
                assignments[i] = minCluster;
                changed = true;
            }
        }
        
        if (!changed) break;
        
        // Recalculer les centroides
        for (let j = 0; j < k; j++) {
            const clusterPoints = data.filter((_, idx) => assignments[idx] === j);
            if (clusterPoints.length > 0) {
                centroids[j] = clusterPoints[0].map((_, d) => {
                    return clusterPoints.reduce((sum, p) => sum + p[d], 0) / clusterPoints.length;
                });
            }
        }
        
        iterations++;
    }
    
    // Compter les éléments par cluster
    const clusterCounts = {};
    assignments.forEach(c => {
        clusterCounts[c] = (clusterCounts[c] || 0) + 1;
    });
    
    return { assignments, centroids, clusterCounts, iterations };
}

function euclideanDistance(a, b) {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

function displayKMeansResults(result, data) {
    const container = document.getElementById('kmeansResult');
    container.innerHTML = `
        <p><strong>✅ Convergence:</strong> ${result.iterations} itérations</p>
        <p><strong>📊 Clusters identifiés:</strong></p>
        <ul style="margin-left: 20px; margin-top: 10px;">
            ${Object.entries(result.clusterCounts).map(([cluster, count]) => 
                `<li>Cluster ${parseInt(cluster) + 1}: ${count} véhicules (${((count/data.length)*100).toFixed(1)}%)</li>`
            ).join('')}
        </ul>
    `;
    
    // Créer le graphique
    const ctx = document.getElementById('kmeansChart');
    if (mlCharts.kmeans) mlCharts.kmeans.destroy();
    
    mlCharts.kmeans = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(result.clusterCounts).map(c => `Cluster ${parseInt(c) + 1}`),
            datasets: [{
                data: Object.values(result.clusterCounts),
                backgroundColor: ['#1e3c72', '#3498db', '#2ecc71', '#f39c12', '#9b59b6']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                title: { display: true, text: 'Distribution des Clusters K-Means' }
            }
        }
    });
}

// Classification simple par marque
function performClassification(data) {
    const brandCount = {};
    
    data.forEach(v => {
        const brand = v.Brand || 'Unknown';
        brandCount[brand] = (brandCount[brand] || 0) + 1;
    });
    
    // Top 5 marques
    const topBrands = Object.entries(brandCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    return { brandCount, topBrands };
}

function displayClassificationResults(result) {
    const container = document.getElementById('classificationResult');
    const total = Object.values(result.brandCount).reduce((a, b) => a + b, 0);
    
    container.innerHTML = `
        <p><strong>📊 Top 5 des marques:</strong></p>
        <ul style="margin-left: 20px; margin-top: 10px;">
            ${result.topBrands.map(([brand, count]) => 
                `<li>${brand}: ${count} véhicules (${((count/total)*100).toFixed(1)}%)</li>`
            ).join('')}
        </ul>
    `;
    
    const ctx = document.getElementById('classificationChart');
    if (mlCharts.classification) mlCharts.classification.destroy();
    
    mlCharts.classification = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: result.topBrands.map(([brand]) => brand),
            datasets: [{
                label: 'Nombre de véhicules',
                data: result.topBrands.map(([, count]) => count),
                backgroundColor: ['#1e3c72', '#3498db', '#2ecc71', '#f39c12', '#e74c3c']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Classification par Marque (Top 5)' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Régression simple sur les années
function performRegression(features, data) {
    const yearData = {};
    
    data.forEach((v, i) => {
        const year = Math.floor(features[i][0]);
        if (year >= 1980 && year <= 2025) {
            yearData[year] = (yearData[year] || 0) + 1;
        }
    });
    
    return yearData;
}

function displayRegressionResults(yearData) {
    const avgCount = Object.values(yearData).reduce((a, b) => a + b, 0) / Object.keys(yearData).length;
    
    const container = document.getElementById('regressionResult');
    container.innerHTML = `
        <p><strong>📈 Années couvertes:</strong> ${Math.min(...Object.keys(yearData))} - ${Math.max(...Object.keys(yearData))}</p>
        <p><strong>📊 Moyenne par année:</strong> ${avgCount.toFixed(0)} véhicules</p>
        <p><strong>🎯 Modèle:</strong> Distribution temporelle</p>
    `;
    
    // Trier par année
    const sortedYears = Object.entries(yearData).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    
    const ctx = document.getElementById('regressionChart');
    if (mlCharts.regression) mlCharts.regression.destroy();
    
    mlCharts.regression = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedYears.map(([year]) => year),
            datasets: [{
                label: 'Nombre de véhicules',
                data: sortedYears.map(([, count]) => count),
                borderColor: '#1e3c72',
                backgroundColor: 'rgba(30, 60, 114, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true },
                title: { display: true, text: 'Distribution des Véhicules par Année' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// ============================================
// 5. STATISTIQUES EDF/CDF
// ============================================

async function loadStatistics() {
    const field = document.getElementById('statField').value;
    
    try {
        const response = await fetch(`/api/statistics?field=${encodeURIComponent(field)}`);
        const data = await response.json();

        if (data.success) {
            displayStatistics(data, field);
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur lors du chargement des statistiques');
    }
}

function displayStatistics(data, field) {
    const resultsDiv = document.getElementById('statsResults');
    const stats = data.statistics;
    
    resultsDiv.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.mean}</div>
                <div class="stat-label">Moyenne</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.median}</div>
                <div class="stat-label">Médiane</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.min}</div>
                <div class="stat-label">Minimum</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.max}</div>
                <div class="stat-label">Maximum</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.stdDev}</div>
                <div class="stat-label">Écart-type</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.count}</div>
                <div class="stat-label">Nombre</div>
            </div>
        </div>
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 10px;">
            <strong>💡 Interprétation:</strong> ${getInterpretation(data, field)}
        </div>
    `;

    drawEDFChart(data.edf, field);
}

function getInterpretation(data, field) {
    const percentile80 = data.edf[Math.floor(data.edf.length * 0.8)];
    
    if (field === 'Year') {
        return `80% des véhicules sont de l'année ${Math.floor(percentile80.x)} ou antérieure`;
    }
    return `80% des valeurs sont inférieures à ${percentile80.x.toFixed(2)}`;
}

function drawEDFChart(edfData, fieldName) {
    const container = document.querySelector('#statsChart').parentElement;
    container.style.display = 'block';
    
    const ctx = document.getElementById('statsChart');
    if (mlCharts.stats) mlCharts.stats.destroy();
    
    mlCharts.stats = new Chart(ctx, {
        type: 'line',
        data: {
            labels: edfData.map((d, i) => i % Math.ceil(edfData.length / 20) === 0 ? d.x.toFixed(0) : ''),
            datasets: [{
                label: 'EDF (Distribution Empirique)',
                data: edfData.map(d => ({ x: d.x, y: d.y })),
                borderColor: '#1e3c72',
                backgroundColor: 'rgba(30, 60, 114, 0.1)',
                fill: true,
                tension: 0,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top' },
                title: { 
                    display: true, 
                    text: `Fonction de Distribution Empirique (EDF) - ${fieldName}`,
                    font: { size: 16 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1,
                    title: { display: true, text: 'F(x) - Probabilité cumulée' }
                },
                x: {
                    type: 'linear',
                    title: { display: true, text: fieldName }
                }
            }
        }
    });
}

// ============================================
// 6. DISTRIBUTION PAR CATÉGORIE
// ============================================

async function loadDistribution() {
    const field = document.getElementById('distField').value;
    
    try {
        const response = await fetch(`/api/distribution?field=${encodeURIComponent(field)}`);
        const data = await response.json();

        if (data.success) {
            displayDistribution(data.distribution, field);
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur lors du chargement de la distribution');
    }
}

function displayDistribution(distribution, fieldName) {
    const container = document.querySelector('#distChart').parentElement;
    container.style.display = 'block';
    
    const ctx = document.getElementById('distChart');
    if (mlCharts.dist) mlCharts.dist.destroy();
    
    mlCharts.dist = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: distribution.map(d => d.label),
            datasets: [{
                label: 'Nombre de véhicules',
                data: distribution.map(d => d.count),
                backgroundColor: ['#1e3c72', '#2a5298', '#3498db', '#5dade2', '#85c1e9', '#aed6f1', '#d4e6f1', '#2ecc71', '#f39c12', '#e74c3c']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { 
                    display: true, 
                    text: `Distribution - ${fieldName} (Top 10)`,
                    font: { size: 16 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Nombre de véhicules' }
                }
            }
        }
    });
}

// ============================================
// INITIALISATION
// ============================================

window.addEventListener('load', () => {
    performSearch('');
    loadGlobalStats();
    
    // Gestionnaire de soumission du formulaire
    const vehicleForm = document.getElementById('vehicleForm');
    if (vehicleForm) {
        vehicleForm.addEventListener('submit', (e) => {
            e.preventDefault();
            updateVehicle();
        });
    }
});