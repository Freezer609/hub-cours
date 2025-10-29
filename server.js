/**
 * @file Serveur backend pour le Hub des Cours.
 * @description Ce serveur Express gère une API RESTful simple pour les opérations CRUD sur les ressources et les catégories,
 * ainsi que le service des fichiers statiques pour le front-end.
 * Il utilise Multer pour la gestion des uploads de fichiers.
 */

// Dépendances
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Initialisation de l'application Express
const app = express();
const port = 3000;

// Configuration du stockage pour Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage: storage });

// --- Middleware --- 

// Sert les fichiers statiques du répertoire racine (le front-end).
app.use(express.static(__dirname));
// Expose le répertoire 'uploads' publiquement pour que les PDF soient accessibles.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// --- Endpoints de l'API ---

/**
 * @route   POST /upload
 * @desc    Upload un fichier PDF et crée une ressource correspondante.
 * @access  Public
 */
app.post('/upload', upload.single('pdf-file'), (req, res) => {
    const newFile = req.file;
    if (!newFile) {
        return res.status(400).send('Aucun fichier uploadé.');
    }

    const resourcesPath = path.join(__dirname, 'resources.json');

    fs.readFile(resourcesPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur lors de la lecture de resources.json.');
        }

        let resources = JSON.parse(data);
        const newId = resources.length > 0 ? Math.max(...resources.map(r => r.id)) + 1 : 1;
        const newResource = {
            id: newId,
            title: path.parse(newFile.originalname).name,
            description: `PDF - ${newFile.originalname}`,
            url: `uploads/${newFile.originalname}`,
            icon: 'fas fa-file-pdf',
            category: 'pdfs',
            type: 'recent'
        };

        resources.push(newResource);

        fs.writeFile(resourcesPath, JSON.stringify(resources, null, 4), 'utf8', (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Erreur lors de la mise à jour de resources.json.');
            }
            res.send('Fichier uploadé et ressource ajoutée avec succès !');
        });
    });
});

/**
 * @route   GET /api/categories
 * @desc    Récupère la liste des catégories.
 * @access  Public
 */
app.get('/api/categories', (req, res) => {
    const categoriesPath = path.join(__dirname, 'categories.json');
    fs.readFile(categoriesPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur lors de la lecture de categories.json.');
        }
        res.json(JSON.parse(data));
    });
});

/**
 * @route   GET /get-resources
 * @desc    Récupère la liste des ressources, avec un filtrage optionnel par catégorie.
 * @access  Public
 */
app.get('/get-resources', (req, res) => {
    const resourcesPath = path.join(__dirname, 'resources.json');
    fs.readFile(resourcesPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur lors de la lecture de resources.json.');
        }
        let resources = JSON.parse(data);
        const category = req.query.category;
        if (category && category !== 'all') {
            resources = resources.filter(resource => resource.category === category);
        }
        res.json(resources);
    });
});

/**
 * @route   POST /api/categories
 * @desc    Crée une nouvelle catégorie.
 * @access  Public
 * @payload { name: string, image: string }
 */
app.post('/api/categories', express.json(), (req, res) => {
    const { name, image } = req.body;

    if (!name || !image) {
        return res.status(400).send('Le nom et l\'image de la catégorie sont requis.');
    }

    const categoriesPath = path.join(__dirname, 'categories.json');

    fs.readFile(categoriesPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur lors de la lecture de categories.json.');
        }

        let categories = JSON.parse(data);
        
        const newId = name.toLowerCase().replace(/\s+/g, '-');
        if (categories.some(c => c.id === newId)) {
            return res.status(400).send('Une catégorie avec cet ID existe déjà.');
        }

        const newCategory = {
            id: newId,
            name: name,
            image: image
        };

        categories.push(newCategory);

        fs.writeFile(categoriesPath, JSON.stringify(categories, null, 2), 'utf8', (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Erreur lors de la mise à jour de categories.json.');
            }
            res.status(200).json(newCategory);
        });
    });
});

/**
 * @route   POST /add-resource
 * @desc    Crée une nouvelle ressource de type lien.
 * @access  Public
 * @payload { title: string, url: string, description: string, category: string }
 */
app.post('/add-resource', express.json(), (req, res) => {
    const { title, url, description, category } = req.body;

    if (!title || !url || !category) {
        return res.status(400).send('Le titre, l\'URL et la catégorie sont requis.');
    }

    const resourcesPath = path.join(__dirname, 'resources.json');

    fs.readFile(resourcesPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur lors de la lecture de resources.json.');
        }

        let resources = JSON.parse(data);
        const newId = resources.length > 0 ? Math.max(...resources.map(r => r.id)) + 1 : 1;
        
        const newResource = {
            id: newId,
            title: title,
            description: description || '',
            url: url,
            icon: 'fas fa-link',
            category: category,
            type: 'recent'
        };

        resources.push(newResource);

        fs.writeFile(resourcesPath, JSON.stringify(resources, null, 4), 'utf8', (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Erreur lors de la mise à jour de resources.json.');
            }
            res.status(200).send('Ressource ajoutée avec succès !');
        });
    });
});

// --- Endpoints non utilisés (potentiel pour futures fonctionnalités) ---

app.post('/delete-category', express.json(), (req, res) => {
    const { categoryName } = req.body;
    // ... logique de suppression
});

app.post('/edit-category', express.json(), (req, res) => {
    const { oldCategoryName, newCategoryName } = req.body;
    // ... logique d'édition
});


// --- Démarrage du Serveur ---
app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});