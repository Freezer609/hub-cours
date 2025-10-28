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

app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});