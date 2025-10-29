/**
 * Attend que le contenu de la page soit entièrement chargé pour lancer le script.
 * C'est le point d'entrée de toute notre logique.
 */
document.addEventListener('DOMContentLoaded', () => {
    // On lance les requêtes pour les fichiers locaux essentiels.
    const categoriesPromise = fetch('categories.json').then(res => res.json());
    const resourcesPromise = fetch('resources.json').then(res => res.json());

    // En parallèle, on vérifie si le serveur est actif.
    const serverStatusPromise = fetch('/api/categories').then(res => res.ok)
                                                          .catch(() => false); // En cas d'échec réseau, le serveur est considéré comme inactif.

    // On attend que tout soit terminé.
    Promise.all([categoriesPromise, resourcesPromise, serverStatusPromise])
        .then(([categories, resources, isServerUp]) => {
            // Une fois qu'on a toutes les infos, on construit la page.
            initializePage(categories, resources, isServerUp);
        })
        .catch(error => {
            // Cette erreur ne devrait se produire que si resources.json ou categories.json est manquant ou invalide.
            console.error("Erreur critique: Impossible de charger les fichiers de données locaux.", error);
            document.body.innerHTML = "<h1>Erreur critique: Impossible de charger les données du site.</h1>";
        });
});

/**
 * C'est la fonction principale qui met en place toute la page.
 * Elle prend les données en entrée et décide quoi afficher.
 * @param {Array} categories - La liste des catégories (peut être vide si le serveur est inactif).
 * @param {Array} resources - La liste des ressources.
 * @param {boolean} isServerUp - Un drapeau pour savoir si le serveur est actif.
 */
function initializePage(categories, resources, isServerUp) {
    const uploadSection = document.getElementById('upload-form')?.parentElement;
    const addResourceSection = document.getElementById('add-resource-form')?.parentElement;
    const addCategorySection = document.getElementById('add-category-form')?.parentElement;
    const sidebarNavUl = document.querySelector('aside nav ul');
    const resourceCategorySelect = document.getElementById('resource-category');

    // On construit TOUJOURS la barre latérale et le menu déroulant si on a les données, peu importe le statut du serveur.
    if (categories && categories.length > 0) {
        const categoryLinksHtml = categories.map(category => `
            <li class="mb-4">
                <a href="#" data-category="${category.id}" class="flex items-center text-gray-300 hover:text-white">
                    <img src="${category.image}" alt="${category.name} Icon" class="h-5 w-5 mr-3">
                    ${category.name}
                </a>
            </li>
        `).join('');
        if (sidebarNavUl) {
            sidebarNavUl.innerHTML += categoryLinksHtml;
        }
        if (resourceCategorySelect) {
            resourceCategorySelect.innerHTML = '';
            categories.filter(c => c.id !== 'pdfs').forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                resourceCategorySelect.appendChild(option);
            });
        }
    }

    // La visibilité des formulaires est la SEULE chose qui dépend du serveur.
    if (isServerUp) {
        if (uploadSection) uploadSection.style.display = 'block';
        if (addResourceSection) addResourceSection.style.display = 'block';
        if (addCategorySection) addCategorySection.style.display = 'block';
    } else {
        if (uploadSection) uploadSection.style.display = 'none';
        if (addResourceSection) addResourceSection.style.display = 'none';
        if (addCategorySection) addCategorySection.style.display = 'none';
    }
    // --- Définition des variables et fonctions principales ---
    const quickAccessGrid = document.getElementById('quick-access-grid');
    const recentlyAddedGrid = document.getElementById('recently-added-grid');
    const favoritesGrid = document.getElementById('favorites-grid');
    const searchBar = document.getElementById('search-bar');
    const dashboardLink = document.getElementById('dashboard-link');
    const favoritesLink = document.getElementById('favorites-link');
    const mainContent = document.getElementById('main-content');
    const favoritesContent = document.getElementById('favorites-content');
    const pdfsContent = document.getElementById('pdfs-content');
    
    let currentCategory = 'all';
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

    /**
     * Crée une "carte" de ressource HTML à partir d'un objet ressource.
     * @param {object} resource - L'objet contenant les infos de la ressource.
     * @returns {HTMLElement} L'élément de la carte prêt à être ajouté au DOM.
     */
    function createResourceCard(resource) {
        const cardWrapper = document.createElement('div');
        cardWrapper.classList.add('card-wrapper', 'relative');
        const card = document.createElement('a');
        card.href = resource.url;
        card.target = "_blank";
        card.classList.add('card');
        card.dataset.category = resource.category;
        const iconClass = resource.category.toLowerCase() + '-icon';
        card.innerHTML = `
            <div class="card-icon ${iconClass}">
                <i class="${resource.icon}"></i>
            </div>
            <div>
                <h4 class="card-title">${resource.title}</h4>
                <p class="card-description">${resource.description}</p>
                <span class="card-link">Voir la Ressource &rarr;</span>
            </div>
        `;
        const favoriteIcon = document.createElement('i');
        favoriteIcon.classList.add('fas', 'fa-star', 'absolute', 'top-4', 'right-4', 'cursor-pointer', 'text-gray-500');
        if (favorites.includes(resource.id)) {
            favoriteIcon.classList.add('text-yellow-400');
        }
        favoriteIcon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(resource.id);
            favoriteIcon.classList.toggle('text-yellow-400');
        });
        cardWrapper.appendChild(card);
        cardWrapper.appendChild(favoriteIcon);
        return cardWrapper;
    }

    /**
     * Ajoute ou retire une ressource des favoris et sauvegarde dans le localStorage.
     * @param {number} id - L'ID de la ressource à gérer.
     */
    function toggleFavorite(id) {
        const index = favorites.indexOf(id);
        if (index > -1) {
            favorites.splice(index, 1);
        } else {
            favorites.push(id);
        }
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }

    /**
     * Affiche les ressources en fonction du terme de recherche et de la catégorie sélectionnée.
     * @param {string} searchTerm - Le texte de la barre de recherche.
     * @param {string} categoryFilter - La catégorie à afficher.
     */
    function displayResources(searchTerm = '', categoryFilter = 'all') {
        quickAccessGrid.innerHTML = '';
        recentlyAddedGrid.innerHTML = '';
        mainContent.classList.remove('hidden');
        favoritesContent.classList.add('hidden');
        if (pdfsContent) pdfsContent.classList.add('hidden');

        const filteredResources = resources.filter(resource => {
            const matchesSearch = searchTerm === '' || resource.title.toLowerCase().includes(searchTerm) || resource.description.toLowerCase().includes(searchTerm);
            if (!matchesSearch) return false;
            if (categoryFilter === 'all') return resource.category !== 'pdfs';
            return resource.category === categoryFilter;
        });

        filteredResources.forEach(resource => {
            const card = createResourceCard(resource);
            if (resource.type === 'quick') {
                quickAccessGrid.appendChild(card);
            } else if (resource.type === 'recent') {
                recentlyAddedGrid.appendChild(card);
            }
        });
    }

    /** Affiche uniquement les ressources marquées comme favorites. */
    function displayFavorites() {
        favoritesGrid.innerHTML = '';
        mainContent.classList.add('hidden');
        favoritesContent.classList.remove('hidden');
        if (pdfsContent) pdfsContent.classList.add('hidden');
        const favoriteResources = resources.filter(resource => favorites.includes(resource.id));
        favoriteResources.forEach(resource => {
            const card = createResourceCard(resource);
            favoritesGrid.appendChild(card);
        });
    }

    /** Crée une carte spécifique pour les fichiers PDF. */
    function createPdfCard(resource) {
        const card = document.createElement('div');
        card.classList.add('bg-gray-800', 'p-4', 'rounded-lg', 'flex', 'items-center', 'justify-between');
        card.innerHTML = `
            <div>
                <h4 class="text-lg font-bold text-white">${resource.title}</h4>
                <a href="${resource.url}" download class="text-blue-400 hover:text-blue-500">Télécharger</a>
            </div>
            <i class="fas fa-file-pdf text-red-500 text-2xl"></i>
        `;
        return card;
    }

    /** Affiche la page dédiée aux PDFs. */
    function displayPdfs() {
        mainContent.classList.add('hidden');
        favoritesContent.classList.add('hidden');
        if (pdfsContent) pdfsContent.classList.remove('hidden');
        const pdfsGrid = document.getElementById('pdfs-grid');
        if (pdfsGrid) {
            pdfsGrid.innerHTML = '';
            const pdfResources = resources.filter(resource => resource.category === 'pdfs');
            pdfResources.forEach(resource => {
                const card = createPdfCard(resource);
                pdfsGrid.appendChild(card);
            });
        }
    }

    // --- Écouteurs d'événements (Interactions de l'utilisateur) ---

    // Barre de recherche
    searchBar.addEventListener('input', () => {
        const searchTerm = searchBar.value.toLowerCase();
        displayResources(searchTerm, currentCategory);
    });

    // Navigation dans la barre latérale (utilise la délégation d'événement)
    const sidebarNav = document.querySelector('aside nav');
    sidebarNav.addEventListener('click', e => {
        const link = e.target.closest('a[data-category]');
        if (!link) return; // On s'assure qu'on a bien cliqué sur un lien de catégorie
        e.preventDefault();
        currentCategory = link.dataset.category;
        const allCategoryLinks = sidebarNav.querySelectorAll('a[data-category]');
        allCategoryLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        if (currentCategory === 'pdfs') {
            displayPdfs();
        } else {
            const searchTerm = searchBar.value.toLowerCase();
            displayResources(searchTerm, currentCategory);
        }
    });

    // Liens statiques de la barre latérale
    dashboardLink.addEventListener('click', (e) => {
        e.preventDefault();
        currentCategory = 'all';
        searchBar.value = '';
        const allCategoryLinks = document.querySelectorAll('aside nav a[data-category]');
        allCategoryLinks.forEach(l => l.classList.remove('active'));
        displayResources();
    });

    favoritesLink.addEventListener('click', (e) => {
        e.preventDefault();
        displayFavorites();
    });

    // Formulaire d'upload de PDF
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('pdf-file');
            const file = fileInput.files[0];
            if (file) {
                const formData = new FormData();
                formData.append('pdf-file', file);
                fetch('/upload', { method: 'POST', body: formData })
                    .then(response => response.text())
                    .then(result => {
                        console.log(result);
                        location.reload(); // On recharge la page pour voir le nouveau fichier
                    })
                    .catch(error => console.error('Error:', error));
            }
        });
    }

    // Formulaire pour ajouter une ressource (lien)
    const addResourceForm = document.getElementById('add-resource-form');
    if (addResourceForm) {
        addResourceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newResource = {
                title: document.getElementById('resource-title').value,
                url: document.getElementById('resource-url').value,
                description: document.getElementById('resource-description').value,
                category: resourceCategorySelect.value
            };
            fetch('/add-resource', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(newResource) 
            })
            .then(response => {
                if (response.ok) location.reload();
                else alert('Erreur lors de l\'ajout de la ressource.');
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Erreur de connexion au serveur.');
            });
        });
    }

    // Formulaire pour ajouter une catégorie
    const addCategoryForm = document.getElementById('add-category-form');
    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', e => {
            e.preventDefault();
            const categoryName = document.getElementById('category-name').value;
            const categoryImage = document.getElementById('category-image').value;
            if (!categoryName || !categoryImage) {
                alert('Veuillez remplir tous les champs.');
                return;
            }
            fetch('/api/categories', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ name: categoryName, image: categoryImage }) 
            })
            .then(response => {
                if (response.ok) location.reload();
                else alert('Erreur lors de la création de la catégorie.');
            })
            .catch(error => {
                console.error('Error adding category:', error);
                alert('Erreur de connexion au serveur.');
            });
        });
    }

    // Affiche les ressources par défaut au premier chargement.
    displayResources();

    // --- Logique pour le menu Hamburger sur mobile ---
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('aside');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('sidebar-open');
        });

        // Bonus : on ferme le menu si l'utilisateur clique en dehors.
        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target) && sidebar.classList.contains('sidebar-open')) {
                sidebar.classList.remove('sidebar-open');
            }
        });
    }
}
