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

app.get('/api/categories', (req, res) => {
    const categoriesPath = path.join(__dirname, 'categories.json');
    fs.readFile(categoriesPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur lors de la lecture du fichier categories.json.');
        }
        res.json(JSON.parse(data));
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

app.post('/api/categories', express.json(), (req, res) => {
    const { name, image } = req.body;

    if (!name || !image) {
        return res.status(400).send('Le nom et l\'image de la catégorie sont requis.');
    }

    const categoriesPath = path.join(__dirname, 'categories.json');

    fs.readFile(categoriesPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur lors de la lecture du fichier categories.json.');
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
                return res.status(500).send('Erreur lors de la mise à jour du fichier categories.json.');
            }
            res.status(200).json(newCategory);
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

app.post('/add-resource', express.json(), (req, res) => {
    const { title, url, description, category } = req.body;

    if (!title || !url || !category) {
        return res.status(400).send('Le titre, l\'URL et la catégorie sont requis.');
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
                return res.status(500).send('Erreur lors de la mise à jour du fichier resources.json.');
            }
            res.status(200).send('Ressource ajoutée avec succès !');
        });
    });
});

app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});