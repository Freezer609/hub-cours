const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/upload', upload.single('pdf-file'), (req, res) => {
    const newFile = req.file;
    if (!newFile) {
        return res.status(400).send('Aucun fichier uploadé.');
    }

    const resourcesPath = path.join(__dirname, 'resources.json');

    fs.readFile(resourcesPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur lors de la lecture du fichier resources.json.');
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
                return res.status(500).send('Erreur lors de la mise à jour du fichier resources.json.');
            }
            res.send('Fichier uploadé et ressource ajoutée avec succès !');
        });
    });
});

app.get('/get-categories', (req, res) => {
    const resourcesPath = path.join(__dirname, 'resources.json');
    fs.readFile(resourcesPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur lors de la lecture du fichier resources.json.');
        }
        const resources = JSON.parse(data);
        const categories = [...new Set(resources.map(resource => resource.category))];
        res.json(categories);
    });
});

app.get('/get-resources', (req, res) => {
    const resourcesPath = path.join(__dirname, 'resources.json');
    fs.readFile(resourcesPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur lors de la lecture du fichier resources.json.');
        }
        let resources = JSON.parse(data);
        const category = req.query.category;
        if (category && category !== 'all') {
            resources = resources.filter(resource => resource.category === category);
        }
        res.json(resources);
    });
});

app.post('/add-category', express.json(), (req, res) => {
    const { categoryName } = req.body;
    const resourcesPath = path.join(__dirname, 'resources.json');

    fs.readFile(resourcesPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur lors de la lecture du fichier resources.json.');
        }

        let resources = JSON.parse(data);
        const newId = resources.length > 0 ? Math.max(...resources.map(r => r.id)) + 1 : 1;
        const newResource = {
            id: newId,
            title: `Nouvelle catégorie: ${categoryName}`,
            description: `Ressource pour la catégorie ${categoryName}`,
            url: '#',
            icon: 'fas fa-folder',
            category: categoryName,
            type: 'recent'
        };

        resources.push(newResource);

        fs.writeFile(resourcesPath, JSON.stringify(resources, null, 4), 'utf8', (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Erreur lors de la mise à jour du fichier resources.json.');
            }
            res.status(200).send('Catégorie ajoutée avec succès !');
        });
    });
});

app.post('/delete-category', express.json(), (req, res) => {
    const { categoryName } = req.body;
    const resourcesPath = path.join(__dirname, 'resources.json');

    fs.readFile(resourcesPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur lors de la lecture du fichier resources.json.');
        }

        let resources = JSON.parse(data);
        const initialLength = resources.length;
        resources = resources.filter(resource => resource.category !== categoryName);

        if (resources.length === initialLength) {
            return res.status(404).send('Catégorie non trouvée ou aucune ressource associée.');
        }

        fs.writeFile(resourcesPath, JSON.stringify(resources, null, 4), 'utf8', (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Erreur lors de la mise à jour du fichier resources.json.');
            }
            res.status(200).send('Catégorie et ressources associées supprimées avec succès !');
        });
    });
});

app.post('/edit-category', express.json(), (req, res) => {
    const { oldCategoryName, newCategoryName } = req.body;
    const resourcesPath = path.join(__dirname, 'resources.json');

    fs.readFile(resourcesPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur lors de la lecture du fichier resources.json.');
        }

        let resources = JSON.parse(data);
        let categoryFound = false;
        resources = resources.map(resource => {
            if (resource.category === oldCategoryName) {
                categoryFound = true;
                return { ...resource, category: newCategoryName };
            }
            return resource;
        });

        if (!categoryFound) {
            return res.status(404).send('Ancienne catégorie non trouvée.');
        }

        fs.writeFile(resourcesPath, JSON.stringify(resources, null, 4), 'utf8', (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Erreur lors de la mise à jour du fichier resources.json.');
            }
            res.status(200).send('Catégorie mise à jour avec succès !');
        });
    });
});

app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});